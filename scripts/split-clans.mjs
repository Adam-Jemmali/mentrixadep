#!/usr/bin/env node
/** Split clan-crud.ts and clan-dashboard.ts into smaller capability files. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CLANS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/features/clans");

function read(name) {
  return fs.readFileSync(path.join(CLANS, name), "utf8").split("\n");
}

function slice(lines, start, end) {
  return lines.slice(start - 1, end).join("\n");
}

// ─── clan-crud split ───
const crud = read("clan-crud.ts");

const clanInternal = `const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return s;
}

function normalizeTag(raw: string): string {
  return sanitizeString(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
`;

const clanMembership = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/shared/integrations/analytics";
import {
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  parseUUID,
  sanitizeString,
  assertNoBlockedLanguage,
} from "@/shared/core/security";
import { randomInviteCode, normalizeTag } from "@/features/clans/clan-internal";

${slice(crud, 33, 626)}
`;

const clanCustomization = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  parseUUID,
} from "@/shared/core/security";

${slice(crud, 627, crud.length)}
`;

const clanInternalFull = `import { sanitizeString } from "@/shared/core/security";

${clanInternal}`;

// ─── clan-dashboard split ───
const dash = read("clan-dashboard.ts");

const clanDashboardInternal = `import { createAdminClient } from "@/shared/integrations/supabase/admin";

${slice(dash, 55, 146)}
`.replace(/^async function assertClanMember/m, "export async function assertClanMember")
  .replace(/^async function buildPublicClanBrowseRows/m, "export async function buildPublicClanBrowseRows")
  .replace(/^type ClanBrowseSource/m, "type ClanBrowseSource");

const clanReads = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { parseUUID } from "@/shared/core/security";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import {
  CLAN_QUEST_CHALLENGE_BONUS_XP,
  CLAN_QUEST_CHALLENGE_TARGET,
} from "@/features/clans/clan-constants";
import { assertClanMember, buildPublicClanBrowseRows } from "@/features/clans/clan-dashboard-internal";

${slice(dash, 13, 53)}

${slice(dash, 69, 90)}

${slice(dash, 148, 430)}
`;

const clanMessages = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertNoBlockedLanguage, parseUUID } from "@/shared/core/security";
import { assertClanMember } from "@/features/clans/clan-dashboard-internal";

${slice(dash, 431, 539)}
`;

const clanEvents = `"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import {
  CLAN_QUEST_CHALLENGE_BONUS_XP,
  CLAN_QUEST_CHALLENGE_TARGET,
} from "@/features/clans/clan-constants";

${slice(dash, 541, 659)}
`;

const clanJoinRequests = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID } from "@/shared/core/security";

${slice(dash, 661, dash.length)}
`;

const writes = {
  "clan-internal.ts": clanInternalFull,
  "clan-membership.ts": clanMembership,
  "clan-customization.ts": clanCustomization,
  "clan-dashboard-internal.ts": clanDashboardInternal,
  "clan-reads.ts": clanReads,
  "clan-messages.ts": clanMessages,
  "clan-events.ts": clanEvents,
  "clan-join-requests.ts": clanJoinRequests,
};

for (const [name, content] of Object.entries(writes)) {
  fs.writeFileSync(path.join(CLANS, name), content.endsWith("\n") ? content : content + "\n");
  console.log("wrote", name);
}

fs.unlinkSync(path.join(CLANS, "clan-crud.ts"));
fs.unlinkSync(path.join(CLANS, "clan-dashboard.ts"));
console.log("removed clan-crud.ts and clan-dashboard.ts");
