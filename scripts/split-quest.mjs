#!/usr/bin/env node
/** Split features/quest/quest.ts into capability files per LEAN_ARCHITECTURE_PLAN. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEST = path.join(path.dirname(__dirname), "src/features/quest");
const DIVISIONS = path.join(path.dirname(__dirname), "src/features/divisions");
const src = fs.readFileSync(path.join(QUEST, "quest.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const internal = `${slice(26, 210)}
`;

const classicHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  generateExplanation,
  generateVariants,
  evaluateAnswer,
  type QuestExplanationResponse,
  type QuestVariant,
  type EvaluateAnswerResponse,
} from "@/shared/integrations/ai";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/shared/integrations/analytics";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import { recordClanQuestCompletion } from "@/features/clans/clan-dashboard";
import { getDivisionKeyForCourse } from "@/features/divisions/leaderboard";
import {
  buildQuestFallbackResponse,
  buildQuestFallbackVariants,
  fallbackEvaluateQuestAnswer,
  isQuestHardLimitMessage,
  normalizeQuestSolverErrorMessage,
  submitAnswerSchema,
  submitQuestSchema,
} from "@/features/quest/quest-internal";

${slice(39, 53)}

`;
const classicQuest = classicHeader + slice(251, 565);

const leaderboardHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { cacheKeys, cacheTtl, withCache } from "@/shared/core/redis";
import { getCachedUserMeta } from "@/shared/core/user-meta-cache";
import { withSupabaseQuerySpan } from "@/shared/integrations/observability";
import { getDivisionTierFromXp } from "@/features/xp/levels";

`;
const leaderboard = leaderboardHeader + slice(220, 244) + "\n\n" + slice(592, 1047);

const readsHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { UserXp } from "@/shared/types/database";
import { XP } from "@/features/xp/xp-constants";
import type { QuestGoal, QuestMode } from "@/features/quest/classic-quest";

`;
const questReads = readsHeader + slice(567, 584) + "\n\n" + slice(1049, src.length);

// Export helpers from quest-internal
const internalWithExports = internal
  .replace(/^const submitQuestSchema/m, "export const submitQuestSchema")
  .replace(/^const submitAnswerSchema/m, "export const submitAnswerSchema")
  .replace(/^const QUEST_AI_UNAVAILABLE_MESSAGE/m, "export const QUEST_AI_UNAVAILABLE_MESSAGE")
  .replace(/^function normalizeQuestSolverErrorMessage/m, "export function normalizeQuestSolverErrorMessage")
  .replace(/^function isQuestHardLimitMessage/m, "export function isQuestHardLimitMessage")
  .replace(/^function buildQuestFallbackResponse/m, "export function buildQuestFallbackResponse")
  .replace(/^function normalizeAnswerForFallback/m, "function normalizeAnswerForFallback")
  .replace(/^function extractFallbackAnswerCandidates/m, "function extractFallbackAnswerCandidates")
  .replace(/^function fallbackEvaluateQuestAnswer/m, "export function fallbackEvaluateQuestAnswer")
  .replace(/^function buildQuestFallbackVariants/m, "export function buildQuestFallbackVariants");

fs.writeFileSync(path.join(QUEST, "quest-internal.ts"), internalWithExports);
fs.writeFileSync(path.join(QUEST, "classic-quest.ts"), classicQuest);
fs.writeFileSync(path.join(DIVISIONS, "leaderboard.ts"), leaderboard);
fs.writeFileSync(path.join(QUEST, "quest-reads.ts"), questReads);
fs.unlinkSync(path.join(QUEST, "quest.ts"));

console.log("Split quest.ts into quest-internal, classic-quest, divisions/leaderboard, quest-reads");
