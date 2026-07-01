"use server";

import { recordDivisionWarQuestContribution } from "@/features/division-wars/contributions";
import { detectBreakthroughsAfterQuest } from "@/features/breakthrough-events/detect";
import type { BreakthroughCelebration } from "@/features/breakthrough-events/types";
import {
  getSessionBreakthroughLines,
  recordPostSessionTargetResults,
  type SessionBreakthroughLine,
} from "@/features/breakthrough-events/post-session-retest";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  gradePracticeWrittenAnswer,
} from "@/shared/integrations/ai";
import { shufflePracticePackMcqOptions } from "@/features/quest/practice-mcq-shuffle";
import {
  AP_CALC_AB_SUBJECT,
  AP_CALC_AB_UNAVAILABLE_MESSAGE,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";
import { selectItemBankQuestions, computePracticePackQuestionCount } from "@/features/quest/item-bank-selector";
import { applyXpAward } from "@/features/xp/xp-awards";

import { getDivisionKeyForCourse } from "@/features/divisions/leaderboard";
import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";
import { XP } from "@/features/xp/xp-constants";
import { sanitizeString } from "@/shared/core/security";
import { updateKnowledgeGraph } from "@/features/learning-path/knowledge-graph";
import { scheduleApCalcReviews } from "@/features/learning-path/schedule-ap-calc-reviews";
import {
  formatVerifiedRankNextAction,
  formatVerifiedRankVerdict,
  loadVerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import {
  ensureVerifiedFirstAttemptsFromSession,
  recordVerifiedFirstAttemptForNode,
} from "@/features/quest/record-verified-first-attempts";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { getVerdict } from "@/features/guidance/verdict-engine";
import { buildQuestSessionStatsFromPack } from "@/features/guidance/quest-session-stats";
import {
  pickQuestMasteryHighlight,
  snapshotPackNodesFromGrid,
} from "@/features/mastery-grid/mastery-grid-pure";
import { z } from "zod";
import { trackEvent } from "@/shared/integrations/analytics";
import type {
  PracticeDifficulty,
  PracticePackMetadata,
  PracticePackResult,
  PracticePackType,
  PracticeQuestion,
  PracticeQuestionMcq,
  PracticeSessionAnswer,
  PracticeSessionState,
} from "@/features/quest/practice-quest-types";

const PRACTICE_PACKS_DAILY = 10;
const DEFAULT_TIME_SEC = 15 * 60;

const finalizePracticeOptionsSchema = z.object({
  timedOut: z.boolean().optional(),
});

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
    if (!isApCalculusAbSubject(subject)) {
      return {
        success: false,
        error:
          "Only AP Calculus AB verified practice is available. Other subjects unlock after the same skill-tree and item-bank review.",
      };
    }

    const qc = input.questionCount ?? 5 + Math.floor(Math.random() * 6);
    const timeLimitSec = Math.min(60 * 60, Math.max(5 * 60, input.timeLimitSec ?? DEFAULT_TIME_SEC));
    const requiredCount = computePracticePackQuestionCount(qc);

    const bankQuestions = await selectItemBankQuestions(user.id, AP_CALC_AB_SUBJECT, qc);
    if (bankQuestions.length < requiredCount) {
      return { success: false, error: AP_CALC_AB_UNAVAILABLE_MESSAGE };
    }
    const questions = shufflePracticePackMcqOptions(bankQuestions);

    const meta: PracticePackMetadata = {
      questKind: "practice_pack",
      subject: AP_CALC_AB_SUBJECT,
      difficulty: input.difficulty,
      packType: "mcq",
      accountLevelTitle: "Mentrixer",
      questionCount: questions.length,
      timeLimitSec,
      course: AP_CALC_AB_SUBJECT,
      questions,
      mcqOptionsShuffled: true,
    };

    const supabase = await createClient();
    const title = `Practice: ${AP_CALC_AB_SUBJECT} — ${input.difficulty} (mcq)`;
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
      subtopicTag?: string;
      examStakes?: string;
    }
  | {
      index: number;
      total: number;
      kind: "short_answer" | "problem_solving";
      id: string;
      prompt: string;
      subtopicTag?: string;
      examStakes?: string;
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
      subtopicTag: q.subtopicTag,
      examStakes: q.examStakes,
    };
  }
  return {
    index,
    total,
    kind: q.kind,
    id: q.id,
    prompt: q.prompt,
    subtopicTag: "subtopicTag" in q && typeof q.subtopicTag === "string" ? q.subtopicTag : undefined,
    examStakes: "examStakes" in q && typeof q.examStakes === "string" ? q.examStakes : undefined,
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
    const { meta } = loaded;

    let masteryBeforePack = meta.masteryBeforePack;
    if (
      !masteryBeforePack &&
      isApCalculusAbSubject(meta.subject || meta.course)
    ) {
      const packNodeOrder = meta.questions
        .map((q) => (q as PracticeQuestionMcq).skillNodeId)
        .filter((id): id is string => Boolean(id));
      if (packNodeOrder.length > 0) {
        const grid = await loadMasteryGrid(user.id);
        masteryBeforePack = snapshotPackNodesFromGrid(grid, [...new Set(packNodeOrder)]);
      }
    }

    await patchPackMetadata(questId, (m) => {
      if (m.session?.startedAt) return m;
      const base = m.mcqOptionsShuffled
        ? m
        : {
            ...m,
            questions: shufflePracticePackMcqOptions(m.questions),
            mcqOptionsShuffled: true,
          };
      const session: PracticeSessionState = {
        startedAt: new Date().toISOString(),
        currentIndex: 0,
        answers: [],
      };
      return {
        ...base,
        session,
        ...(masteryBeforePack ? { masteryBeforePack } : {}),
      };
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

  const priorAnswer = meta.session?.answers.find((a) => a.index === questionIndex);
  if (priorAnswer) {
    return { error: "This answer is locked — first attempt only." };
  }

  const correct = selectedIndex === mcq.correctIndex;
  const ans: PracticeSessionAnswer = {
    questionId: q.id,
    index: questionIndex,
    correct,
  };

  if (isApCalculusAbSubject(meta.subject || meta.course) && mcq.skillNodeId) {
    await recordVerifiedFirstAttemptForNode(
      user.id,
      mcq.skillNodeId,
      q.id,
      correct
    );
  }

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
      breakthrough?: BreakthroughCelebration | null;
      sessionBreakthrough?: SessionBreakthroughLine[];
    }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const parsedOptions = finalizePracticeOptionsSchema.safeParse(options ?? {});
    const finalizeOptions = parsedOptions.success ? parsedOptions.data : {};
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

    if (finalizeOptions.timedOut && meta.session) {
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
      (await getDivisionKeyForCourse(meta.course)) ?? AP_CALC_AB_DIVISION_KEY;

    let rankVerdict: string | undefined;
    let rankNextAction: string | undefined;
    let newVerifiedSkills: number | undefined;

    if (isApCalculusAbSubject(meta.subject || meta.course)) {
      const verifiedBefore = await loadVerifiedFirstAttemptRankStats(user.id);
      const resultByIndex = qs.map((_, i) => byIndex.get(i)?.correct ?? false);
      const verifiedQuestions = qs.map((q) => {
        const qMeta = q as typeof q & { skillNodeId?: string };
        return { id: q.id, skillNodeId: qMeta.skillNodeId };
      });
      await ensureVerifiedFirstAttemptsFromSession(
        user.id,
        questId,
        meta.subject || meta.course || AP_CALC_AB_SUBJECT,
        verifiedQuestions,
        resultByIndex
      );
      const verifiedAfter = await loadVerifiedFirstAttemptRankStats(user.id);
      newVerifiedSkills = Math.max(0, verifiedAfter.verifiedCount - verifiedBefore.verifiedCount);
      rankVerdict = formatVerifiedRankVerdict(verifiedAfter) ?? undefined;
      rankNextAction = formatVerifiedRankNextAction(verifiedAfter);
    }

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
      void recordDivisionWarQuestContribution({
        studentId: user.id,
        divisionKey,
        correct,
        total,
      });
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

    let questVerdict: PracticePackResult["questVerdict"];
    if (isApCalculusAbSubject(meta.subject || meta.course)) {
      try {
        const sessionStats = await buildQuestSessionStatsFromPack(qs, byIndex);
        questVerdict = await getVerdict({
          type: "quest_result",
          userId: user.id,
          context: { sessionStats },
        });
      } catch {
        /* non-critical — verdict must not block completion */
      }
    }

    const result: PracticePackResult = {
      correct,
      total,
      perfect,
      xpAwarded,
      perfectBonus,
      mistakeReviews,
      rankVerdict,
      rankNextAction,
      newVerifiedSkills,
      questVerdict,
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
        const qMeta = q as typeof q & {
          subtopicTag?: string;
          topicTag?: string;
          skillNodeId?: string;
        };
        return {
          subject: sanitizeString(meta.subject || meta.course || "General").slice(0, 80),
          topic: sanitizeString(qMeta.topicTag || meta.course || "General").slice(0, 80),
          subtopic: sanitizeString(qMeta.subtopicTag || "General").slice(0, 80),
          correct: answer?.correct ?? false,
          skillNodeId: qMeta.skillNodeId,
        };
      });
      await updateKnowledgeGraph(user.id, questId, kgUpdates);
      if (isApCalculusAbSubject(meta.subject || meta.course)) {
        await scheduleApCalcReviews(user.id, kgUpdates);
      }
    } catch {
      // Non-critical — don't fail finalization if KG update errors
    }

    try {
      if (isApCalculusAbSubject(meta.subject || meta.course)) {
        const postSessionResults = qs.map((q, i) => {
          const qMeta = q as typeof q & { skillNodeId?: string };
          return {
            skillNodeId: qMeta.skillNodeId,
            correct: byIndex.get(i)?.correct ?? false,
          };
        });
        await recordPostSessionTargetResults(user.id, postSessionResults);
      }
    } catch {
      // Non-critical — post-session target recording must not block completion
    }

    let masteryGrid: PracticePackResult["masteryGrid"];
    let masteryHighlight: PracticePackResult["masteryHighlight"];
    if (isApCalculusAbSubject(meta.subject || meta.course) && meta.masteryBeforePack) {
      try {
        const packNodeOrder = qs
          .map((q) => (q as PracticeQuestionMcq).skillNodeId)
          .filter((id): id is string => Boolean(id));
        masteryGrid = await loadMasteryGrid(user.id);
        masteryHighlight =
          pickQuestMasteryHighlight(meta.masteryBeforePack, masteryGrid, packNodeOrder) ?? undefined;
        result.masteryGrid = masteryGrid;
        result.masteryHighlight = masteryHighlight;
        await patchPackMetadata(questId, (m) => ({
          ...m,
          result,
        }));
      } catch {
        /* non-critical — mastery receipt must not block completion */
      }
    }

    revalidatePath("/student/quest");
    revalidatePath("/student/division");

    if (meta.breakthroughEventId) {
      try {
        await admin
          .from("breakthrough_quest_queue")
          .update({ completed_at: new Date().toISOString() })
          .eq("breakthrough_event_id", meta.breakthroughEventId)
          .eq("quest_id", questId)
          .eq("student_id", user.id);
      } catch {
        /* non-critical */
      }
    }

    try {
      const { count: completedCount } = await admin
        .from("user_quest_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");
      if ((completedCount ?? 0) <= 1) {
        void trackEvent("first_quest_completed", { userId: user.id });
        void trackEvent("onboarding_quest_completed", {
          userId: user.id,
          properties: { questId, packType: meta.packType ?? "mcq" },
        });
      }
    } catch {
      /* non-critical */
    }

    let breakthrough: BreakthroughCelebration | null = null;
    let sessionBreakthrough: SessionBreakthroughLine[] = [];
    try {
      breakthrough = await detectBreakthroughsAfterQuest({
        studentId: user.id,
        questId,
        subject: meta.subject || meta.course || "General",
        triggeredBy: "quest",
      });
    } catch {
      /* non-critical */
    }

    try {
      if (isApCalculusAbSubject(meta.subject || meta.course)) {
        sessionBreakthrough = await getSessionBreakthroughLines(user.id);
      }
    } catch {
      /* non-critical */
    }

    return {
      success: true,
      result: {
        ...result,
        totalXp: xpFinal?.total_xp,
        streakDays: xpFinal?.streak_days,
      },
      breakthrough,
      sessionBreakthrough: sessionBreakthrough.length > 0 ? sessionBreakthrough : undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Finalize failed.",
    };
  }
}
