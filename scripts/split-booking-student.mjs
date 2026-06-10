#!/usr/bin/env node
/** Split features/booking/student.ts into capability files. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKING = path.join(path.dirname(__dirname), "src/features/booking");
const PROFILE = path.join(path.dirname(__dirname), "src/features/student-profile");
const src = fs.readFileSync(path.join(BOOKING, "student.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const internal = `import { createAdminClient } from "@/shared/integrations/supabase/admin";

${slice(36, 132)}
`;

const sessionListsHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { enrichStudentSessionsWithTutorProfiles, type StudentSessionTutorProfile } from "@/features/booking/booking-internal";

export type { StudentSessionTutorProfile };

`;
const sessionLists = sessionListsHeader + slice(134, 288);

const hubHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cacheKeys, cacheTtl, redisDel, withCache } from "@/shared/core/redis";
import { enrichStudentSessionsWithTutorProfiles } from "@/features/booking/booking-internal";

`;
const hubSnapshot = hubHeader + slice(290, 438);

const cancelStudentHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError } from "@/shared/core/security";
import { isMissingCancelledSessionColumnsError } from "@/features/booking/booking-internal";

`;
const cancelStudent = cancelStudentHeader + slice(440, 494);

const browseHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { validateCourse, sanitizeCourseName, validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { withCache, cacheKeys, cacheTtl } from "@/shared/core/redis";
import { addDaysIso } from "@/features/booking/booking-pricing";
import { isMissingAvailabilityColumnsError, isMissingSessionHideColumnsError } from "@/features/booking/booking-internal";

`;
const browse = browseHeader + slice(495, 835);

const bookHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, validateRating, validateComment, validateCourse, sanitizeCourseName, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { trackEvent } from "@/shared/integrations/analytics";
import { getDivisionKeyForCourse } from "@/features/quest/quest";
import { applyXpAward } from "@/features/xp/xp-awards";
import { autoGenerateStudioPackagesForCompletedSessions } from "@/features/studio-ai/auto-pilot";
import { XP } from "@/features/xp/xp-constants";
import { sendSessionBookedEmail, type SessionEmailDetails } from "@/shared/integrations/email";
import { getVerifiedPaymentIntentForBooking, refundPaidCheckoutSession } from "@/shared/integrations/stripe/session-booking";
import { claimAvailabilityForPaidCheckout } from "@/shared/integrations/stripe/booking-sync";
import type { Session, SessionAiPackage } from "@/shared/types/database";

`;
const bookSession = bookHeader + slice(836, 1116);

const rateHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUUID, validateRating, validateComment, sanitizeError } from "@/shared/core/security";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";

`;
const rateSession = rateHeader + slice(1117, 1279);

const adminHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

`;
const studentAdmin = adminHeader + slice(1280, 1475);

const coursesHeader = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { validateCourse, sanitizeCourseName, sanitizeError } from "@/shared/core/security";
import { revalidatePath } from "next/cache";

`;
const studentCourses = coursesHeader + slice(1476, src.length);

fs.writeFileSync(path.join(BOOKING, "booking-internal.ts"), internal);
fs.writeFileSync(path.join(BOOKING, "session-lists.ts"), sessionLists);
fs.writeFileSync(path.join(PROFILE, "hub-snapshot.ts"), hubSnapshot);
fs.writeFileSync(path.join(BOOKING, "cancel-session-student.ts"), cancelStudent);
fs.writeFileSync(path.join(BOOKING, "browse-availability.ts"), browse);
fs.writeFileSync(path.join(BOOKING, "book-session.ts"), bookSession);
fs.writeFileSync(path.join(BOOKING, "rate-session.ts"), rateSession);
fs.writeFileSync(path.join(PROFILE, "student-admin-reads.ts"), studentAdmin);
fs.writeFileSync(path.join(BOOKING, "student-courses.ts"), studentCourses);
fs.unlinkSync(path.join(BOOKING, "student.ts"));

const IMPORT_MAP = [
  ["@/features/booking/student", "@/features/booking/book-session"],
  ["getStudentHubSnapshot", "from '@/features/student-profile/hub-snapshot'"],
  ["getStudentSessionsHubBundle", "from '@/features/student-profile/hub-snapshot'"],
  ["invalidateStudentHubCache", "from '@/features/student-profile/hub-snapshot'"],
  ["getHasPendingSessionRequests", "from '@/features/student-profile/hub-snapshot'"],
  ["StudentHubSnapshot", "from '@/features/student-profile/hub-snapshot'"],
  ["StudentSessionTutorProfile", "from '@/features/booking/session-lists'"],
  ["getUpcomingSessions", "booking/session-lists"],
  ["getPastSessions", "booking/session-lists"],
  ["getSessionRequests", "booking/session-lists"],
  ["getTutorAvailabilityKeysetPage", "booking/browse-availability"],
  ["getTutorAvailability", "booking/browse-availability"],
  ["getAvailableCourses", "booking/browse-availability"],
  ["getTutorExpertiseMap", "booking/browse-availability"],
  ["TutorAvailabilityCursor", "booking/browse-availability"],
  ["bookSessionAsUser", "booking/book-session"],
  ["bookSession", "booking/book-session"],
  ["BookSessionAsUserOptions", "booking/book-session"],
  ["rateSession", "booking/rate-session"],
  ["canRateSession", "booking/rate-session"],
  ["getStudentDashboardForAdmin", "student-profile/student-admin-reads"],
  ["getStudentCourses", "booking/student-courses"],
  ["addStudentCourse", "booking/student-courses"],
  ["removeStudentCourse", "booking/student-courses"],
  ["cancelSession", "booking/cancel-session-student"],
];

console.log("Split student.ts — run import fix script next");
