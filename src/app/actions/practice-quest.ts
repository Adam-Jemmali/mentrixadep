"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generatePracticeQuestPack,
  gradePracticeWrittenAnswer,
  generateMistakeReview,
} from "@/lib/ai";
import { getAccountLevelFromTotalXp } from "@/lib/levels";
import { applyXpAward } from "@/app/actions/xp";
import { recordClanQuestCompletion } from "@/app/actions/clan-dashboard";
import { getDivisionKeyForCourse } from "@/app/actions/quest";
import { XP } from "@/lib/xp-constants";
import { sanitizeString } from "@/lib/security";
import { updateKnowledgeGraph } from "@/app/actions/knowledge-graph";
import type {
  PracticeDifficulty,
  PracticePackMetadata,
  PracticePackResult,
  PracticePackType,
  PracticeQuestion,
  PracticeQuestionMcq,
  PracticeSessionAnswer,
  PracticeSessionState,
} from "@/lib/practice-quest-types";

const PRACTICE_PACKS_DAILY = 10;
const DEFAULT_TIME_SEC = 15 * 60;

function isPracticeHardLimitMessage(input: unknown): boolean {
  const msg =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : input && typeof input === "object" && "message" in input
          ? String((input as { message: unknown }).message ?? "")
          : "";
  const lower = msg.toLowerCase();
  return lower.includes("daily limit reached") || lower.includes("too many requests");
}

function normalizeFallbackAnswer(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:()[\]{}]/g, "")
    .replace(/\s*=\s*/g, "=")
    .trim();
}

function fallbackGradeWritten(
  userAnswer: string,
  referenceAnswer: string,
): { pass: boolean; feedback: string } {
  const u = normalizeFallbackAnswer(userAnswer);
  const r = normalizeFallbackAnswer(referenceAnswer);
  if (!u || !r) {
    return {
      pass: false,
      feedback: "Please provide a clearer final answer so it can be graded.",
    };
  }
  if (u === r || r.includes(u) || u.includes(r)) {
    return {
      pass: true,
      feedback: "Looks correct. Your final answer matches the expected result.",
    };
  }
  const eqIdx = u.lastIndexOf("=");
  if (eqIdx >= 0) {
    const right = u.slice(eqIdx + 1).trim();
    if (right && (right === r || r.includes(right) || right.includes(r))) {
      return {
        pass: true,
        feedback: "Looks correct. Your final simplified value matches.",
      };
    }
  }
  return {
    pass: false,
    feedback: "Not quite yet. Re-check your final simplified answer and submit again.",
  };
}

function buildPracticeFallbackQuestions(
  subject: string,
  packType: PracticePackType,
  count: number,
): PracticeQuestion[] {
  const n = Math.min(10, Math.max(5, Math.floor(count)));
  const s = subject.trim() || "General";
  if (packType === "mcq") {
    const bank: PracticeQuestion[] = [
      {
        id: "q0",
        kind: "mcq",
        prompt: `${s} — Scenario sketch: a graph rises steadily, then flattens. Which statement is most consistent with this trend?`,
        options: ["Rate is positive but slowing", "Rate is negative and accelerating", "Value is constant throughout", "Trend is purely random"],
        correctIndex: 0,
        explanation: "A rising curve that flattens indicates continued growth with a smaller slope.",
      },
      {
        id: "q1",
        kind: "mcq",
        prompt: `${s} — Which step is best before applying a formula to a new problem?`,
        options: ["Define knowns and target unknown", "Skip straight to substitution", "Memorize one example only", "Ignore units"],
        correctIndex: 0,
        explanation: "Setting knowns/unknowns first avoids formula misuse and sign mistakes.",
      },
      {
        id: "q2",
        kind: "mcq",
        prompt: `${s} — If two choices look similar, what is the strongest discriminator?`,
        options: ["Check boundary conditions", "Pick the longest option", "Pick the first option", "Choose by wording style"],
        correctIndex: 0,
        explanation: "Boundary checks often expose almost-correct distractors.",
      },
      {
        id: "q3",
        kind: "mcq",
        prompt: `${s} — A quantity doubles each step. After three steps, the multiplier is:`,
        options: ["8", "6", "3", "9"],
        correctIndex: 0,
        explanation: "Doubling three times is 2 × 2 × 2 = 8.",
      },
      {
        id: "q4",
        kind: "mcq",
        prompt: `${s} — Best quick validation after solving:`,
        options: ["Plug result back into constraints", "Delete intermediate work", "Round everything to zero", "Assume first attempt is right"],
        correctIndex: 0,
        explanation: "Constraint checks catch arithmetic and logic slips quickly.",
      },
    ];
    const out: PracticeQuestion[] = [];
    for (let i = 0; i < n; i++) {
      const base = bank[i % bank.length] as PracticeQuestion;
      out.push({ ...base, id: `q${i}` });
    }
    return out;
  }

  if (packType === "short_answer") {
    const bank: PracticeQuestion[] = [
      {
        id: "q0",
        kind: "short_answer",
        prompt: `${s} — In one sentence, state the first step before solving a multi-step problem.`,
        referenceAnswer: "Identify known values and the target unknown",
        explanation: "Good solutions start by organizing givens and target.",
      },
      {
        id: "q1",
        kind: "short_answer",
        prompt: `${s} — What should you do after obtaining a final result to verify it?`,
        referenceAnswer: "Check the answer against constraints",
        explanation: "Verification prevents hidden sign/unit mistakes.",
      },
      {
        id: "q2",
        kind: "short_answer",
        prompt: `${s} — Name one reason distractor choices can look correct.`,
        referenceAnswer: "They encode common misconceptions",
        explanation: "Strong distractors mirror partial understanding.",
      },
      {
        id: "q3",
        kind: "short_answer",
        prompt: `${s} — If your result conflicts with given conditions, what should you do next?`,
        referenceAnswer: "Re-check assumptions and recompute key steps",
        explanation: "Conflicts indicate a step or assumption needs revision.",
      },
      {
        id: "q4",
        kind: "short_answer",
        prompt: `${s} — What does a clear final-answer line usually include?`,
        referenceAnswer: "The final value with correct units/context",
        explanation: "A complete final line improves correctness and grading clarity.",
      },
    ];
    const out: PracticeQuestion[] = [];
    for (let i = 0; i < n; i++) {
      const base = bank[i % bank.length] as PracticeQuestion;
      out.push({ ...base, id: `q${i}` });
    }
    return out;
  }

  const bank: PracticeQuestion[] = [
    {
      id: "q0",
      kind: "problem_solving",
      prompt: `${s} — Solve: simplify 3x + 2x and state the final expression.`,
      referenceAnswer: "5x",
      explanation: "Like terms add by coefficients.",
    },
    {
      id: "q1",
      kind: "problem_solving",
      prompt: `${s} — Solve for y: y + 7 = 15.`,
      referenceAnswer: "8",
      explanation: "Subtract 7 from both sides.",
    },
    {
      id: "q2",
      kind: "problem_solving",
      prompt: `${s} — Compute: 4^2 - 3.`,
      referenceAnswer: "13",
      explanation: "4 squared is 16, then subtract 3.",
    },
    {
      id: "q3",
      kind: "problem_solving",
      prompt: `${s} — Differentiate with respect to z: z^2.`,
      referenceAnswer: "2z",
      explanation: "Power rule: d/dz(z^n)=n z^(n-1).",
    },
    {
      id: "q4",
      kind: "problem_solving",
      prompt: `${s} — Evaluate: (6 + 2) / 4.`,
      referenceAnswer: "2",
      explanation: "Add first, then divide.",
    },
  ];
  const out: PracticeQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const base = bank[i % bank.length] as PracticeQuestion;
    out.push({ ...base, id: `q${i}` });
  }
  return out;
}

function utcDayStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function countPracticeQuestsToday(): Promise<number> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const { data } = await admin
    .from("quests")
    .select("metadata")
    .eq("creator_user_id", user.id)
    .gte("created_at", utcDayStartIso());
  const rows = data ?? [];
  return rows.filter(
    (r) => (r.metadata as PracticePackMetadata | null)?.questKind === "practice_pack",
  ).length;
}

export interface CreatePracticeQuestInput {
  subject: string;
  difficulty: PracticeDifficulty;
  packType: PracticePackType;
  /** 5–10; default random */
  questionCount?: number;
  timeLimitSec?: number;
}

export async function createPracticeQuest(
  input: CreatePracticeQuestInput,
): Promise<
  | { success: true; questId: string; questionCount: number; timeLimitSec: number }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    const nToday = await countPracticeQuestsToday();
    if (nToday >= PRACTICE_PACKS_DAILY) {
      return {
        success: false,
        error: `Daily limit reached (${PRACTICE_PACKS_DAILY} practice packs per day). Try again tomorrow.`,
      };
    }

    const subject = sanitizeString(input.subject).slice(0, 120);
    if (subject.length < 2) {
      return { success: false, error: "Please enter a subject." };
    }

    const qc = input.questionCount ?? 5 + Math.floor(Math.random() * 6);
    const timeLimitSec = Math.min(60 * 60, Math.max(5 * 60, input.timeLimitSec ?? DEFAULT_TIME_SEC));

    const admin = createAdminClient();
    const { data: xpRow } = await admin
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", user.id)
      .maybeSingle();
    const totalXp = xpRow?.total_xp ?? 0;
    const levelInfo = getAccountLevelFromTotalXp(totalXp);

    const gen = await generatePracticeQuestPack(
      {
        subject,
        difficulty: input.difficulty,
        packType: input.packType,
        accountLevelTitle: levelInfo.title,
        questionCount: qc,
      },
      user.id,
    );

    const questions =
      "error" in gen && gen.error
        ? isPracticeHardLimitMessage(gen.message)
          ? null
          : buildPracticeFallbackQuestions(subject, input.packType, qc)
        : (gen as { questions: PracticeQuestion[] }).questions;

    if (!questions || !questions.length) {
      return {
        success: false,
        error:
          "error" in gen && gen.error ? gen.message : "Could not generate practice pack.",
      };
    }
    const meta: PracticePackMetadata = {
      questKind: "practice_pack",
      subject,
      difficulty: input.difficulty,
      packType: input.packType,
      accountLevelTitle: levelInfo.title,
      questionCount: questions.length,
      timeLimitSec,
      course: subject,
      questions,
    };

    const supabase = await createClient();
    const title = `Practice: ${subject} — ${input.difficulty} (${input.packType})`;
    const { data: quest, error: insErr } = await supabase
      .from("quests")
      .insert({
        creator_user_id: user.id,
        prompt: title,
        solution: "",
        metadata: meta as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (insErr || !quest) {
      return { success: false, error: insErr?.message ?? "Could not save quest." };
    }

    await supabase.from("user_quest_progress").upsert(
      {
        user_id: user.id,
        quest_id: quest.id,
        status: "in_progress",
        mode: "exam",
        num_attempts: 0,
      },
      { onConflict: "user_id,quest_id" },
    );

    revalidatePath("/student/quest");
    return {
      success: true,
      questId: quest.id,
      questionCount: questions.length,
      timeLimitSec,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create practice pack.",
    };
  }
}

/** Safe payload for one question (no answers). */
export type PracticeQuestionPublic =
  | {
      index: number;
      total: number;
      kind: "mcq";
      id: string;
      prompt: string;
      options: string[];
    }
  | {
      index: number;
      total: number;
      kind: "short_answer" | "problem_solving";
      id: string;
      prompt: string;
    };

async function loadPackForUser(
  questId: string,
  userId: string,
): Promise<
  | { ok: true; meta: PracticePackMetadata; questId: string }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const { data: quest, error } = await admin
    .from("quests")
    .select("metadata, creator_user_id")
    .eq("id", questId)
    .maybeSingle();
  if (error || !quest) return { ok: false, error: "Quest not found." };
  if (quest.creator_user_id !== userId) return { ok: false, error: "Not your quest." };
  const meta = quest.metadata as PracticePackMetadata;
  if (meta.questKind !== "practice_pack" || !Array.isArray(meta.questions)) {
    return { ok: false, error: "Invalid practice pack." };
  }
  return { ok: true, meta, questId };
}

export async function getPracticeQuestionPublic(
  questId: string,
  index: number,
): Promise<PracticeQuestionPublic | { error: string }> {
  const user = await requireRole(["student", "admin"]);
  const loaded = await loadPackForUser(questId, user.id);
  if (!loaded.ok) return { error: loaded.error };
  const { meta } = loaded;
  const qs = meta.questions;
  const q = qs[index];
  if (!q) return { error: "Question not found." };

  const total = qs.length;
  if (q.kind === "mcq") {
    return {
      index,
      total,
      kind: "mcq",
      id: q.id,
      prompt: q.prompt,
      options: q.options,
    };
  }
  return {
    index,
    total,
    kind: q.kind,
    id: q.id,
    prompt: q.prompt,
  };
}

async function patchPackMetadata(
  questId: string,
  fn: (meta: PracticePackMetadata) => PracticePackMetadata,
): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("quests").select("metadata").eq("id", questId).single();
  const prev = (row?.metadata as PracticePackMetadata) ?? ({} as PracticePackMetadata);
  const next = fn(prev);
  await admin.from("quests").update({ metadata: next as unknown as Record<string, unknown> }).eq("id", questId);
}

export async function startPracticeSession(questId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const loaded = await loadPackForUser(questId, user.id);
    if (!loaded.ok) return { success: false, error: loaded.error };
    await patchPackMetadata(questId, (m) => {
      if (m.session?.startedAt) return m;
      const session: PracticeSessionState = {
        startedAt: new Date().toISOString(),
        currentIndex: 0,
        answers: [],
      };
      return { ...m, session };
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function submitPracticeMcq(
  questId: string,
  questionIndex: number,
  selectedIndex: number,
): Promise<
  | {
      correct: boolean;
      explanation: string;
      finished: boolean;
      correctIndex: number;
    }
  | { error: string }
> {
  const user = await requireRole(["student", "admin"]);
  const loaded = await loadPackForUser(questId, user.id);
  if (!loaded.ok) return { error: loaded.error };
  const { meta } = loaded;
  const q = meta.questions[questionIndex] as PracticeQuestion | undefined;
  if (!q || q.kind !== "mcq") return { error: "Invalid question." };
  const mcq = q as PracticeQuestionMcq;
  const correct = selectedIndex === mcq.correctIndex;
  const ans: PracticeSessionAnswer = {
    questionId: q.id,
    index: questionIndex,
    correct,
  };
  await patchPackMetadata(questId, (m) => {
    const session = m.session ?? {
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      answers: [],
    };
    const answers = [...session.answers.filter((a) => a.index !== questionIndex), ans];
    const nextIndex = questionIndex + 1;
    return {
      ...m,
      session: {
        ...session,
        answers,
        currentIndex: Math.max(session.currentIndex, nextIndex),
      },
    };
  });
  const finished = questionIndex + 1 >= meta.questions.length;
  return {
    correct,
    explanation: mcq.explanation,
    finished,
    correctIndex: mcq.correctIndex,
  };
}

export async function submitPracticeWritten(
  questId: string,
  questionIndex: number,
  userAnswer: string,
): Promise<
  | { correct: boolean; feedback: string; explanation: string; finished: boolean }
  | { error: string }
> {
  const user = await requireRole(["student", "admin"]);
  const loaded = await loadPackForUser(questId, user.id);
  if (!loaded.ok) return { error: loaded.error };
  const { meta } = loaded;
  const q = meta.questions[questionIndex];
  if (!q || (q.kind !== "short_answer" && q.kind !== "problem_solving")) {
    return { error: "Invalid question." };
  }
  const g = await gradePracticeWrittenAnswer(
    {
      prompt: q.prompt,
      referenceAnswer: q.referenceAnswer,
      userAnswer,
      kind: q.kind,
    },
    user.id,
  );
  const graded =
    "error" in g && g.error
      ? isPracticeHardLimitMessage(g.message)
        ? null
        : fallbackGradeWritten(userAnswer, q.referenceAnswer)
      : (g as { pass: boolean; feedback: string });
  if (!graded) return { error: "error" in g && g.error ? g.message : "Could not grade answer." };
  const correct = graded.pass;
  const ans: PracticeSessionAnswer = {
    questionId: q.id,
    index: questionIndex,
    correct,
    userResponse: userAnswer.slice(0, 4000),
    feedback: graded.feedback,
  };
  await patchPackMetadata(questId, (m) => {
    const session = m.session ?? {
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      answers: [],
    };
    const answers = [...session.answers.filter((a) => a.index !== questionIndex), ans];
    const nextIndex = questionIndex + 1;
    return {
      ...m,
      session: {
        ...session,
        answers,
        currentIndex: Math.max(session.currentIndex, nextIndex),
      },
    };
  });
  const finished = questionIndex + 1 >= meta.questions.length;
  return {
    correct,
    feedback: graded.feedback,
    explanation: q.explanation,
    finished,
  };
}

export async function finalizePracticeQuest(
  questId: string,
  options?: { timedOut?: boolean },
): Promise<
  | {
      success: true;
      result: PracticePackResult & { totalXp?: number; streakDays?: number };
    }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const loaded = await loadPackForUser(questId, user.id);
    if (!loaded.ok) return { success: false, error: loaded.error };

    const { data: prog } = await admin
      .from("user_quest_progress")
      .select("status")
      .eq("user_id", user.id)
      .eq("quest_id", questId)
      .maybeSingle();
    if (prog?.status === "completed") {
      const { data: qrow } = await admin.from("quests").select("metadata").eq("id", questId).single();
      const metaDone = qrow?.metadata as PracticePackMetadata;
      if (metaDone?.result) {
        const r = metaDone.result;
        return {
          success: true,
          result: {
            ...r,
          },
        };
      }
      return { success: false, error: "Already completed." };
    }

    let { meta } = loaded;
    const qs = meta.questions;

    if (options?.timedOut && meta.session) {
      const have = new Set(meta.session.answers.map((a) => a.index));
      const extra: PracticeSessionAnswer[] = [];
      for (let i = 0; i < qs.length; i++) {
        if (!have.has(i)) {
          extra.push({
            questionId: qs[i]!.id,
            index: i,
            correct: false,
            feedback: "Time's up",
          });
        }
      }
      if (extra.length > 0) {
        await patchPackMetadata(questId, (m) => {
          const s = m.session ?? {
            startedAt: new Date().toISOString(),
            currentIndex: qs.length,
            answers: [],
          };
          return {
            ...m,
            session: { ...s, answers: [...s.answers, ...extra] },
          };
        });
        const reloaded = await loadPackForUser(questId, user.id);
        if (reloaded.ok) meta = reloaded.meta;
      }
    }

    const answers = meta.session?.answers ?? [];
    const byIndex = new Map(answers.map((a) => [a.index, a]));
    let correct = 0;
    for (let i = 0; i < qs.length; i++) {
      if (byIndex.get(i)?.correct) correct += 1;
    }

    const total = qs.length;
    const perfect = correct === total;
    const divisionKey =
      (await getDivisionKeyForCourse(meta.course)) ?? "general";

    let xpAwarded = 0;
    let perfectBonus = 0;

    const xp1 = await applyXpAward(
      user.id,
      XP.QUEST_COMPLETE,
      `quest_complete:${questId}`,
      divisionKey,
    );
    if (xp1.awarded) {
      xpAwarded = XP.QUEST_COMPLETE;
      await recordClanQuestCompletion(user.id);
    }

    if (perfect) {
      const xp2 = await applyXpAward(
        user.id,
        XP.QUEST_PERFECT_BONUS,
        `quest_perfect:${questId}`,
        divisionKey,
      );
      if (xp2.awarded) perfectBonus = XP.QUEST_PERFECT_BONUS;
    }

    const { data: xpFinal } = await admin
      .from("user_xp")
      .select("total_xp, streak_days")
      .eq("user_id", user.id)
      .maybeSingle();

    const mistakeReviews: NonNullable<PracticePackResult["mistakeReviews"]> = [];
    for (let i = 0; i < qs.length; i++) {
      const a = byIndex.get(i);
      if (a?.correct) continue;
      const qq = qs[i]!;
      const u =
        a?.userResponse ??
        (qq.kind === "mcq" ? "(no selection)" : "(no answer)");
      const ref =
        qq.kind === "mcq"
          ? (qq as PracticeQuestionMcq).options[(qq as PracticeQuestionMcq).correctIndex] ?? ""
          : qq.referenceAnswer;
      const rev = await generateMistakeReview(qq.prompt, ref, u, user.id);
      if (typeof rev === "string") {
        mistakeReviews.push({
          questionId: qq.id,
          prompt: qq.prompt.slice(0, 200),
          review: rev,
        });
      }
      if (mistakeReviews.length >= 8) break;
    }

    const result: PracticePackResult = {
      correct,
      total,
      perfect,
      xpAwarded,
      perfectBonus,
      mistakeReviews,
    };

    await admin
      .from("user_quest_progress")
      .update({
        status: "completed",
        num_attempts: total,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("quest_id", questId);

    await patchPackMetadata(questId, (m) => ({
      ...m,
      result,
    }));

    // Update knowledge graph with question-level mastery data
    try {
      const kgUpdates = qs.map((q, i) => {
        const answer = byIndex.get(i);
        const qMeta = q as typeof q & { subtopicTag?: string; topicTag?: string };
        return {
          subject: sanitizeString(meta.subject || meta.course || "General").slice(0, 80),
          topic: sanitizeString(qMeta.topicTag || meta.course || "General").slice(0, 80),
          subtopic: sanitizeString(qMeta.subtopicTag || "General").slice(0, 80),
          correct: answer?.correct ?? false,
        };
      });
      await updateKnowledgeGraph(user.id, questId, kgUpdates);
    } catch {
      // Non-critical — don't fail finalization if KG update errors
    }

    revalidatePath("/student/quest");
    revalidatePath("/student/learning-path");
    revalidatePath("/student/division");

    return {
      success: true,
      result: {
        ...result,
        totalXp: xpFinal?.total_xp,
        streakDays: xpFinal?.streak_days,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Finalize failed.",
    };
  }
}
