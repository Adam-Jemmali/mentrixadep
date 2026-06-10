#!/usr/bin/env node
/**
 * Split features/tutor/tutor.ts into capability files per LEAN_ARCHITECTURE_PLAN.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TUTOR = path.join(ROOT, "src/features/tutor");
const src = fs.readFileSync(path.join(TUTOR, "tutor.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const internalHeader = `"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";

`;

const internalBody = slice(46, 150);
const internal = `${internalHeader}${internalBody}

export {
  utcStartOfWeekMonday,
  logTutorLoader,
  loadTutorSection,
  isMissingCancelledSessionColumnsError,
  isMissingSessionHideColumnsError,
  isMissingAvailabilityColumnsError,
  enrichTutorRowsWithStudentProfiles,
};
`;

// Fix: internal needs to export functions that were not exported - change to export in slice
// The slice has private functions - rewrite internal file properly

const internalFull = `"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";

/** Monday 00:00:00 UTC for the week containing \`d\`. */
export function utcStartOfWeekMonday(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export const STRIPE_PAYOUT_CAPTION = "";

const TUTOR_LOADER_DEBUG = true;
export function logTutorLoader(stage: string, details?: Record<string, unknown>): void {
  if (!TUTOR_LOADER_DEBUG) return;
  console.log(\`[tutor-loader] \${stage}\`, details ?? {});
}

export async function loadTutorSection<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(\`[tutor] \${label} failed:\`, e);
    return fallback;
  }
}

export function isMissingCancelledSessionColumnsError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return m.includes("does not exist") && (m.includes("cancelled_at") || m.includes("cancelled_by_role"));
}

export function isMissingSessionHideColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return m.includes("does not exist") && (m.includes("student_hidden_at") || m.includes("tutor_hidden_at"));
}

export function isMissingAvailabilityColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("active") || m.includes("booking_status") || m.includes("max_students") || m.includes("series_id"))
  );
}

export type TutorSessionStudentProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export async function enrichTutorRowsWithStudentProfiles<T extends { student_id: string }>(
  rows: T[],
): Promise<Array<T & { student: { id: string }; student_email: string | null; student_profile: TutorSessionStudentProfile }>> {
  if (rows.length === 0) return [];
  const adminClient = createAdminClient();
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)));
  const { data: settingsRows } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", studentIds);
  const settingsById = new Map(
    (settingsRows ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
      },
    ]),
  );
  const emailById = new Map<string, string>();
  return rows.map((row) => {
    const settings = settingsById.get(row.student_id);
    const email = emailById.get(row.student_id) ?? "Learner";
    return {
      ...row,
      student: { id: row.student_id },
      student_email: email,
      student_profile: {
        id: row.student_id,
        email,
        display_name: settings?.display_name ?? "Learner",
        avatar_url: settings?.avatar_url ?? null,
      },
    };
  });
}
`;

const availabilityHeader = `"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  createAvailabilitySlotsSchema,
  setAvailabilityActiveSchema,
} from "@/features/booking/availability-schemas";
import { buildSlotCandidates, earliestFirstOccurrenceStartUtc, type SlotCandidate } from "@/features/booking/availability-slot-builder";
import { normalizeTeachingDefaultDurationMinutes } from "@/features/tutor/teaching-defaults";
import {
  validateCourse,
  validateUUID,
  validateTimeSlot,
  validateFutureDate,
  sanitizeCourseName,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  assertNoBlockedLanguage,
  validateUploadedFile,
} from "@/shared/core/security";
import { isMissingAvailabilityColumnsError } from "@/features/tutor/tutor-internal";

`;

const availability = availabilityHeader + slice(505, 1083);

const sessionRequestsHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendSessionApprovedEmail, sendSessionConfirmedTutorEmail, type SessionEmailDetails } from "@/shared/integrations/email";
import { createRefundForRejectedRequest } from "@/shared/integrations/stripe/session-booking";
import { validateUUID, sanitizeError } from "@/shared/core/security";
import { enrichTutorRowsWithStudentProfiles } from "@/features/tutor/tutor-internal";

`;

const sessionRequests = sessionRequestsHeader + slice(1211, 1615);

const tutorSessionsHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { createPayoutLedgerForSession } from "@/features/payments/stripe-connect";
import { autoGenerateStudioPackagesForCompletedSessions } from "@/features/studio-ai/auto-pilot";
import type { Session } from "@/shared/types/database";
import { validateUUID } from "@/shared/core/security";
import {
  isMissingCancelledSessionColumnsError,
  isMissingSessionHideColumnsError,
  enrichTutorRowsWithStudentProfiles,
} from "@/features/tutor/tutor-internal";

`;

const tutorSessions = tutorSessionsHeader + slice(1085, 1209) + "\n\n" + slice(1468, 1579);

const publicProfileHeader = `"use server";

import { requireAuth, requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUserSettings } from "@/features/settings/user-settings";
import { normalizeTeachingDefaultDurationMinutes } from "@/features/tutor/teaching-defaults";

`;

const publicProfile = publicProfileHeader + slice(1617, 1912);

const coursesHeader = `"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  validateCourse,
  sanitizeCourseName,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  assertNoBlockedLanguage,
  validateUploadedFile,
  validateUUID,
} from "@/shared/core/security";

`;

const courses = coursesHeader + slice(1918, 2086);

const commandCenterHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUserSettings } from "@/features/settings/user-settings";
import { normalizeTeachingDefaultDurationMinutes } from "@/features/tutor/teaching-defaults";
import type { PayoutDashboardData } from "@/features/payments/stripe-connect";
import { sanitizeForRsc } from "@/shared/core/rsc-serialize";
import {
  utcStartOfWeekMonday,
  logTutorLoader,
  loadTutorSection,
  STRIPE_PAYOUT_CAPTION,
  type TutorSessionStudentProfile,
} from "@/features/tutor/tutor-internal";
import { getTutorAvailability } from "@/features/tutor/availability";
import { getSessionRequests } from "@/features/tutor/session-requests";
import { getUpcomingSessions, getPastSessions } from "@/features/tutor/tutor-sessions";
import { getTutorCourses } from "@/features/tutor/courses";

`;

// Replace ReturnType references in command center slice - lines 152-503
let commandCenterBody = slice(152, 503);
commandCenterBody = commandCenterBody.replace(
  /sessionRequests: Awaited<ReturnType<typeof getSessionRequests>>;/,
  "sessionRequests: Awaited<ReturnType<typeof import('@/features/tutor/session-requests').getSessionRequests>>;",
);
commandCenterBody = commandCenterBody.replace(
  /availability: Awaited<ReturnType<typeof getTutorAvailability>>;/,
  "availability: Awaited<ReturnType<typeof import('@/features/tutor/availability').getTutorAvailability>>;",
);
commandCenterBody = commandCenterBody.replace(
  /upcomingSessions: Awaited<ReturnType<typeof getUpcomingSessions>>;/,
  "upcomingSessions: Awaited<ReturnType<typeof import('@/features/tutor/tutor-sessions').getUpcomingSessions>>;",
);
commandCenterBody = commandCenterBody.replace(
  /pastSessions: Awaited<ReturnType<typeof getPastSessions>>;/,
  "pastSessions: Awaited<ReturnType<typeof import('@/features/tutor/tutor-sessions').getPastSessions>>;",
);
commandCenterBody = commandCenterBody.replace(
  /tutorCourses: Awaited<ReturnType<typeof getTutorCourses>>;/,
  "tutorCourses: Awaited<ReturnType<typeof import('@/features/tutor/courses').getTutorCourses>>;",
);

const commandCenter = commandCenterHeader + commandCenterBody;

fs.writeFileSync(path.join(TUTOR, "tutor-internal.ts"), internalFull);
fs.writeFileSync(path.join(TUTOR, "availability.ts"), availability);
fs.writeFileSync(path.join(TUTOR, "session-requests.ts"), sessionRequests);
fs.writeFileSync(path.join(TUTOR, "tutor-sessions.ts"), tutorSessions);
fs.writeFileSync(path.join(TUTOR, "public-profile.ts"), publicProfile);
fs.writeFileSync(path.join(TUTOR, "courses.ts"), courses);
fs.writeFileSync(path.join(TUTOR, "command-center.ts"), commandCenter);
fs.unlinkSync(path.join(TUTOR, "tutor.ts"));

console.log("Split tutor.ts → tutor-internal, availability, session-requests, tutor-sessions, command-center, public-profile, courses");
