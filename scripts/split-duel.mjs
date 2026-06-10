#!/usr/bin/env node
/** Split features/duels/duel.ts into capability files per LEAN_ARCHITECTURE_PLAN. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUELS = path.join(path.dirname(__dirname), "src/features/duels");
const src = fs.readFileSync(path.join(DUELS, "duel.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const internal = `import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { generateDuelQuestions } from "@/shared/integrations/ai";
import type { SkillDuelQuestion } from "@/shared/types/database";
import { DUEL_QUESTION_COUNT } from "@/features/duels/duel-constants";
import { buildSkillDuelFallbackPack } from "@/features/duels/duel-fallback-questions";

${slice(24, 51)}

${slice(72, 133)}
`;

const createHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { areUsersInSameClan } from "@/features/clans/clan-crud";
import { insertPendingSkillDuel } from "@/features/duels/duel-internal";

`;
const duelCreate = createHeader + slice(139, 316);

const queueHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { trackEvent } from "@/shared/integrations/analytics";
import {
  bothSidesReady,
  isQueueStyleMatchSource,
  type DuelReadyRow,
} from "@/features/duels/duel-internal";
import { activateSkillDuelSession } from "@/features/duels/duel-gameplay";

${slice(53, 71)}

${slice(318, 335)}

`;
const duelQueue = queueHeader + slice(337, 765);

const gameplayHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/shared/integrations/analytics";
import {
  parseUUID,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/shared/core/security";
import type { SkillDuelQuestion } from "@/shared/types/database";
import { areUsersInSameClan } from "@/features/clans/clan-crud";
import { recordClanDuelWin } from "@/features/clans/clan-dashboard";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import { DUEL_QUESTION_COUNT } from "@/features/duels/duel-constants";
import { applyDuelMetaRewards } from "@/features/duels/duel-reward";
import {
  insertPendingSkillDuel,
  randomAiOpponentAnswers,
  resolveDuelQuestionPack,
  scoreAnswers,
} from "@/features/duels/duel-internal";

`;
const duelGameplay = gameplayHeader + slice(766, 1513);

const readsHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { parseUUID } from "@/shared/core/security";
import type { SkillDuelQuestion } from "@/shared/types/database";

`;
const duelReads = readsHeader + slice(1515, src.length);

fs.writeFileSync(path.join(DUELS, "duel-internal.ts"), internal);
fs.writeFileSync(path.join(DUELS, "duel-create.ts"), duelCreate);
fs.writeFileSync(path.join(DUELS, "duel-gameplay.ts"), duelGameplay);
fs.writeFileSync(path.join(DUELS, "duel-queue.ts"), duelQueue);
fs.writeFileSync(path.join(DUELS, "duel-reads.ts"), duelReads);
fs.unlinkSync(path.join(DUELS, "duel.ts"));

console.log("Split duel.ts into duel-internal, duel-create, duel-queue, duel-gameplay, duel-reads");
