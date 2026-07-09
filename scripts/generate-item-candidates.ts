#!/usr/bin/env npx tsx
/**
 * Offline AP Calculus AB item candidate generation for the admin review queue.
 * Inserts pending_review rows only. Nothing is student visible until approved.
 *
 * Usage:
 *   npm run item-bank:generate-candidates
 *   npm run item-bank:generate-candidates -- --limit 5
 *   npm run item-bank:generate-candidates -- --node-slug power-rule
 *   npm run item-bank:generate-candidates -- --dry-run
 */

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  extractGeminiResponseText,
  normalizeQuestion,
  validateStructure,
  type ItemBankQuestionInput,
} from "./lib/item-bank-auto-verify";
import {
  NODE_DELAY_MS,
  SUBJECT,
  buildNodeGenerationPrompt,
  getNodeCoverage,
  planNodeGeneration,
  stripMarkdownJson,
  validateGeneratedStepSequence,
  type NodeGenerationPlan,
  type SkillNodeRow,
} from "./lib/generate-item-candidates-pure";

const MODEL = "gemini-2.5-flash";
const GENERATION_TIMEOUT_MS = 90_000;

const stepTraceStepSchema = z.object({
  step_number: z.number().int().positive(),
  prompt: z.string().min(4),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_option_index: z.number().int().min(0),
  misconception_tag_per_wrong_option: z.record(z.string(), z.string()),
});

const questionSchema = z.object({
  prompt: z.string().min(10),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correct_answer: z.string().min(1),
  explanation: z.string().min(20),
  distractor_tags: z.record(z.string(), z.string()),
  step_sequence: z.array(stepTraceStepSchema).min(2).max(12).optional(),
});

const responseSchema = z.object({
  questions: z.array(questionSchema).min(1).max(3),
});

type GeneratedQuestion = ItemBankQuestionInput & {
  step_sequence?: unknown;
};

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

function validateQuestionBatch(
  plan: NodeGenerationPlan,
  questions: GeneratedQuestion[],
): string | null {
  if (questions.length !== plan.questions_to_generate) {
    return `expected ${plan.questions_to_generate} question(s), got ${questions.length}`;
  }

  if (plan.include_step_sequence) {
    const withStepTrace = questions.filter((question) => question.step_sequence !== undefined);
    if (withStepTrace.length === 0) {
      return "first question must include step_sequence for this node";
    }
    if (!validateGeneratedStepSequence(withStepTrace[0]!.step_sequence)) {
      return "step_sequence failed schema validation";
    }
  }

  for (const question of questions) {
    if (question.step_sequence !== undefined && !validateGeneratedStepSequence(question.step_sequence)) {
      return "step_sequence failed schema validation";
    }
  }

  return null;
}

async function generateForNode(
  apiKey: string,
  plan: NodeGenerationPlan,
): Promise<GeneratedQuestion[]> {
  const client = new GoogleGenAI({ apiKey });
  let lastError = "Unknown generation error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini request timed out")), GENERATION_TIMEOUT_MS);
      });

      const requestPromise = client.models.generateContent({
        model: MODEL,
        contents: `Generate ${plan.questions_to_generate} AP Calculus AB MCQ candidate(s) for ${plan.node.node_name}.`,
        config: {
          systemInstruction: buildNodeGenerationPrompt(plan),
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

      const questions: GeneratedQuestion[] = [];
      for (const row of validated.data.questions) {
        const normalized = normalizeQuestion(row);
        const issue = validateStructure(normalized);
        if (issue) throw new Error(issue);
        questions.push({
          ...normalized,
          step_sequence: row.step_sequence,
        });
      }

      const batchIssue = validateQuestionBatch(plan, questions);
      if (batchIssue) throw new Error(batchIssue);

      return questions;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }

  throw new Error(lastError);
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
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((entry) => entry.startsWith("--limit="))?.split("=")[1]
    ?? (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : undefined);
  const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
  const nodeSlugArg = args.find((entry) => entry.startsWith("--node-slug="))?.split("=")[1]
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

  const skillNodes = nodes as SkillNodeRow[];
  const nodeIds = skillNodes.map((node) => node.id);

  const { data: items, error: itemsError } = await supabase
    .from("item_bank")
    .select("skill_node_id, status, step_sequence")
    .in("skill_node_id", nodeIds);

  if (itemsError) {
    console.error("Failed to load item_bank rows:", itemsError.message);
    process.exit(1);
  }

  const plans = skillNodes
    .map((node) => planNodeGeneration(node, getNodeCoverage(node.id, items ?? [])))
    .filter((plan): plan is NodeGenerationPlan => plan !== null)
    .sort(
      (left, right) =>
        left.node.node_name.localeCompare(right.node.node_name),
    );

  let queue = plans;
  if (limit !== undefined && Number.isFinite(limit) && limit > 0) {
    queue = queue.slice(0, limit);
  }

  console.log(
    `Queued ${queue.length} node(s) for offline candidate generation (${SUBJECT}). Inserts status=pending_review only.`,
  );
  console.log("Review queue: /admin/item-review");

  if (queue.length === 0) {
    console.log("Nothing to generate. Every node already has 3 approved or queued items.");
    return;
  }

  let totalInserted = 0;

  for (let index = 0; index < queue.length; index++) {
    const plan = queue[index]!;
    if (index > 0) await sleep(NODE_DELAY_MS);

    try {
      if (dryRun) {
        console.log(
          `[dry-run] ${plan.node.node_name}: would generate ${plan.questions_to_generate} pending item(s)${plan.include_step_sequence ? " with step_sequence" : ""}`,
        );
        continue;
      }

      const generated = await generateForNode(apiKey, plan);
      const rows = generated.map((question) => ({
        skill_node_id: plan.node.id,
        question_type: "mcq",
        prompt: question.prompt,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        distractor_tags: question.distractor_tags,
        difficulty_rating: 1000,
        status: "pending_review" as const,
        step_sequence: question.step_sequence ?? null,
      }));

      const { error: insertError } = await supabase.from("item_bank").insert(rows);
      if (insertError) throw new Error(insertError.message);

      totalInserted += rows.length;
      console.log(
        `[done] ${plan.node.node_name}: generated ${rows.length} pending item(s)${plan.include_step_sequence ? " (includes step_sequence)" : ""}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[fail] ${plan.node.node_name}: ${message}`);
    }
  }

  console.log(
    `Finished. Nodes processed: ${queue.length}. Inserted this run: ${totalInserted}${dryRun ? " (dry run)" : ""}.`,
  );
  console.log("Next action: review pending items at /admin/item-review before students can see them.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
