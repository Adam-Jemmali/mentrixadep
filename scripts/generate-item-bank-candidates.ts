#!/usr/bin/env npx tsx
/**
 * Offline AP Calculus AB item bank authoring via Gemini.
 * Each question is structurally checked, then independently verified by a second
 * Gemini pass. Passing items are inserted as approved (student visible immediately).
 *
 * Usage:
 *   npx tsx scripts/generate-item-bank-candidates.ts
 *   npx tsx scripts/generate-item-bank-candidates.ts --limit 5
 *   npx tsx scripts/generate-item-bank-candidates.ts --force
 *   npx tsx scripts/generate-item-bank-candidates.ts --node-slug estimating-limits-from-graphs
 */

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  AI_GLOBAL_GUARD,
  extractGeminiResponseText,
  normalizeQuestion,
  validateStructure,
  verifyQuestionWithGemini,
  type ItemBankQuestionInput,
  type SkillNodeRef,
} from "./lib/item-bank-auto-verify";

const SUBJECT = "AP Calculus AB";
const MODEL = "gemini-2.5-flash";
const NODE_DELAY_MS = 1000;
const GENERATION_TIMEOUT_MS = 90_000;
const REVIEWED_BY = "gemini-auto";

const questionSchema = z.object({
  prompt: z.string().min(10),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correct_answer: z.string().min(1),
  explanation: z.string().min(20),
  distractor_tags: z.record(z.string(), z.string()),
});

const responseSchema = z.object({
  questions: z.array(questionSchema).min(4).max(5),
});

type SkillNodeRow = SkillNodeRef & { id: string };

function loadEnv(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function stripMarkdownJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildSystemPrompt(node: SkillNodeRow): string {
  const misconceptions = (node.common_misconceptions ?? []).join("; ") || "none listed";
  const description = node.description?.trim() || "No description provided.";

  return `${AI_GLOBAL_GUARD}

You write AP Calculus AB exam style multiple choice questions. Write 4-5 questions testing ONLY this skill: ${node.node_name}. Description: ${description}.
For each question write 4 answer options. Exactly one is correct. For each WRONG option write which misconception causes a student to pick it, using these known misconceptions where relevant: ${misconceptions}.
Write a 2-3 sentence explanation for the correct answer.
Match the rigor and phrasing of real AP Calculus AB exam questions. Return ONLY valid JSON with shape:
{"questions":[{"prompt":"...","options":["A","B","C","D"],"correct_answer":"...","explanation":"...","distractor_tags":{"wrong option text":"misconception tag"}}]}`;
}

async function generateForNode(
  apiKey: string,
  node: SkillNodeRow
): Promise<ItemBankQuestionInput[]> {
  const client = new GoogleGenAI({ apiKey });
  let lastError = "Unknown generation error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini request timed out")), GENERATION_TIMEOUT_MS);
      });

      const requestPromise = client.models.generateContent({
        model: MODEL,
        contents: `Generate 4-5 multiple choice questions for skill node: ${node.node_name}. Each correct_answer must exactly equal one string in options.`,
        config: {
          systemInstruction: buildSystemPrompt(node),
          responseMimeType: "application/json",
        },
      });

      const result = await Promise.race([requestPromise, timeoutPromise]);
      const raw = extractGeminiResponseText(result);
      if (!raw) throw new Error("Empty Gemini response");

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripMarkdownJson(raw));
      } catch {
        throw new Error("Gemini returned invalid JSON");
      }

      const validated = responseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(`Response schema invalid: ${validated.error.message}`);
      }

      const questions = validated.data.questions.map(normalizeQuestion);
      for (const question of questions) {
        const issue = validateStructure(question);
        if (issue) throw new Error(issue);
      }

      return questions;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }

  throw new Error(lastError);
}

async function verifyBatch(
  apiKey: string,
  node: SkillNodeRow,
  questions: ItemBankQuestionInput[]
): Promise<ItemBankQuestionInput[]> {
  const approved: ItemBankQuestionInput[] = [];

  for (const question of questions) {
    const outcome = await verifyQuestionWithGemini(apiKey, node, question);
    if (outcome.approved) {
      approved.push(question);
      console.log(`  [verify pass] ${outcome.reason}`);
    } else {
      console.log(`  [verify fail] ${outcome.reason}`);
    }
    await sleep(250);
  }

  return approved;
}

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!url || !serviceKey || !apiKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY are required.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1]
    ?? (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : undefined);
  const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
  const nodeSlugArg = args.find((a) => a.startsWith("--node-slug="))?.split("=")[1]
    ?? (args.includes("--node-slug") ? args[args.indexOf("--node-slug") + 1] : undefined);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let nodeQuery = supabase
    .from("skill_nodes")
    .select("id, node_name, node_slug, description, common_misconceptions")
    .eq("subject", SUBJECT)
    .order("display_order");

  if (nodeSlugArg) {
    nodeQuery = nodeQuery.eq("node_slug", nodeSlugArg);
  }

  const { data: nodes, error: nodesError } = await nodeQuery;
  if (nodesError || !nodes?.length) {
    console.error("No skill nodes found:", nodesError?.message ?? "empty result");
    process.exit(1);
  }

  let queue = nodes as SkillNodeRow[];
  if (limit !== undefined && Number.isFinite(limit) && limit > 0) {
    queue = queue.slice(0, limit);
  }

  const { data: existingItems, error: existingError } = await supabase
    .from("item_bank")
    .select("skill_node_id, status")
    .in("skill_node_id", queue.map((n) => n.id))
    .in("status", ["approved", "pending_review"]);

  if (existingError) {
    console.error("Failed to check existing items:", existingError.message);
    process.exit(1);
  }

  const existingByNode = new Map<string, number>();
  for (const row of existingItems ?? []) {
    existingByNode.set(row.skill_node_id, (existingByNode.get(row.skill_node_id) ?? 0) + 1);
  }

  console.log(`Processing ${queue.length} skill nodes for "${SUBJECT}" with auto verification.`);

  let totalInserted = 0;
  let nodesProcessed = 0;
  const reviewedAt = new Date().toISOString();

  for (let i = 0; i < queue.length; i++) {
    const node = queue[i]!;
    const existingCount = existingByNode.get(node.id) ?? 0;

    if (existingCount > 0 && !force) {
      console.log(`[skip] ${node.node_name} (${existingCount} existing)`);
      continue;
    }

    if (i > 0) await sleep(NODE_DELAY_MS);

    try {
      const generated = await generateForNode(apiKey, node);
      const verified = await verifyBatch(apiKey, node, generated);

      if (verified.length === 0) {
        console.error(`${node.node_name}: no questions passed auto verification`);
        continue;
      }

      const rows = verified.map((q) => ({
        skill_node_id: node.id,
        question_type: "mcq",
        prompt: q.prompt.trim(),
        options: q.options,
        correct_answer: q.correct_answer.trim(),
        explanation: q.explanation.trim(),
        distractor_tags: q.distractor_tags,
        difficulty_rating: 1000,
        status: "approved",
        reviewed_by: REVIEWED_BY,
        reviewed_at: reviewedAt,
      }));

      const { error: insertError } = await supabase.from("item_bank").insert(rows);
      if (insertError) throw new Error(insertError.message);

      totalInserted += rows.length;
      nodesProcessed++;
      console.log(`${node.node_name}: ${rows.length} approved (${generated.length - verified.length} rejected by verifier)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${node.node_name}: failed — ${message}`);
    }
  }

  const { count: approvedCount, error: approvedError } = await supabase
    .from("item_bank")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  if (approvedError) {
    console.error("Failed to count approved items:", approvedError.message);
    process.exit(1);
  }

  console.log(`Done. Nodes processed: ${nodesProcessed}. Inserted this run: ${totalInserted}.`);
  console.log(`Total approved in item_bank: ${approvedCount ?? 0}.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
