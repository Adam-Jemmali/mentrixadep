"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  createAvailabilitySlotsSchema,
  setAvailabilityActiveSchema,
  SESSION_PRICE_CAD_MAX,
  SESSION_PRICE_CAD_MIN,
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
} from "@/shared/core/security";
import { isMissingAvailabilityColumnsError } from "@/features/tutor/tutor-internal";

export async function getTutorAvailability() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const runQuery = async (withAvailabilityFilters: boolean) => {
    let query = supabase
      .from("availability")
      .select("*")
      .eq("tutor_id", user.id)
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true });

    // Tutors manage inactive (“hidden”) slots too — do not filter on active here.
    // Treat bookable-ish rows only (exclude fully booked); migration default is `available`.
    if (withAvailabilityFilters) {
      query = query.in("booking_status", ["available", "pending_payment"]);
    }

    return query;
  };

  let { data, error } = await runQuery(true);

  if (error && isMissingAvailabilityColumnsError(error)) {
    const fallback = await runQuery(false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Failed to fetch availability: ${error.message}`);
  }

  const rows = data || [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: pendingRows, error: pendingErr } = await supabase
    .from("session_requests")
    .select("availability_id")
    .in("availability_id", ids)
    .eq("status", "pending");

  if (pendingErr) {
    console.warn("[tutor] getTutorAvailability: pending request counts skipped:", pendingErr.message);
  }

  const count = new Map<string, number>();
  for (const p of pendingRows ?? []) {
    const aid = p.availability_id as string;
    count.set(aid, (count.get(aid) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    pending_booking_count: count.get(r.id) ?? 0,
  }));
}

function windowsOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): boolean {
  return a0 < b1 && b0 < a1;
}

/** Invalidate tutor dashboard, public guide profile slots, and learner marketplace-ish surfaces. */
function revalidateTutorAvailabilitySurfaces(tutorUserId: string) {
  revalidatePath("/tutor");
  revalidatePath(`/tutor/${tutorUserId}`);
  revalidatePath("/student");
}

async function assertAvailabilityWindowAllowed(
  adminClient: ReturnType<typeof createAdminClient>,
  actingAsId: string,
  course: string,
  start: Date,
  end: Date,
): Promise<void> {
  await assertBatchAvailabilityWindows(adminClient, actingAsId, course, [
    { startUtc: start, endUtc: end, ymd: "" },
  ]);
}

async function assertTutorCourseApproved(
  adminClient: ReturnType<typeof createAdminClient>,
  tutorId: string,
  courseName: string,
): Promise<void> {
  const { data: row, error } = await adminClient
    .from("tutor_courses")
    .select("id, verified")
    .eq("tutor_id", tutorId)
    .eq("course_name", courseName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify course: ${error.message}`);
  }
  if (!row) {
    throw new Error("Add this subject under My expertise before creating open slots.");
  }
  if (!row.verified) {
    throw new Error(
      "This subject is pending admin review. Your proficiency is established only after approval.",
    );
  }
}

/** One DB read for existing rows + O(n) checks — avoids N round-trips when creating many recurring slots. */
async function assertBatchAvailabilityWindows(
  adminClient: ReturnType<typeof createAdminClient>,
  actingAsId: string,
  course: string,
  candidates: SlotCandidate[],
): Promise<void> {
  if (candidates.length === 0) return;

  const nowIso = new Date().toISOString();
  const { data: allAvailability, error: fetchError } = await adminClient
    .from("availability")
    .select("start_time, end_time")
    .eq("tutor_id", actingAsId)
    .eq("course", course)
    .gte("end_time", nowIso);

  if (fetchError) {
    throw new Error(`Could not verify your calendar: ${fetchError.message}`);
  }

  const { data: upcomingSessions, error: sessionCheckError } = await adminClient
    .from("sessions")
    .select("start_time, end_time")
    .eq("tutor_id", actingAsId)
    .eq("status", "scheduled")
    .gte("end_time", nowIso);

  if (sessionCheckError) {
    throw new Error(`Could not verify booked sessions: ${sessionCheckError.message}`);
  }

  const existingWindows = (allAvailability ?? []).map((a) => ({
    s: new Date(a.start_time).getTime(),
    e: new Date(a.end_time).getTime(),
  }));
  const sessionWindows = (upcomingSessions ?? []).map((s) => ({
    s: new Date(s.start_time).getTime(),
    e: new Date(s.end_time).getTime(),
  }));

  const sorted = [...candidates].sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
  const batchAccepted: { s: number; e: number }[] = [];

  for (const c of sorted) {
    const ws = c.startUtc.getTime();
    const we = c.endUtc.getTime();

    for (const w of existingWindows) {
      if (windowsOverlap(ws, we, w.s, w.e)) {
        throw new Error(
          "One or more slots overlap an existing opening for this subject. Refresh the page or pick different times.",
        );
      }
    }
    for (const w of sessionWindows) {
      if (windowsOverlap(ws, we, w.s, w.e)) {
        throw new Error(
          "One or more slots overlap a session you already have booked. Remove the conflict or choose other times.",
        );
      }
    }
    for (const w of batchAccepted) {
      if (windowsOverlap(ws, we, w.s, w.e)) {
        throw new Error("The same batch includes overlapping slots — try a shorter repeat or different days.");
      }
    }
    batchAccepted.push({ s: ws, e: we });
  }
}

function mapAvailabilityInsertError(err: { message?: string; code?: string } | null | undefined): string {
  const msg = (err?.message ?? "").toLowerCase();
  const code = err?.code ?? "";

  if (code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return "That time was already added (or just created). Refresh the page and skip duplicate times.";
  }
  if (msg.includes("overlapping availability") || msg.includes("overlap")) {
    return "Those times overlap another opening or a booked session. Refresh and adjust.";
  }
  if (msg.includes("availability_tutor_course_unique")) {
    return "A slot at exactly this time already exists.";
  }
  return err?.message ? `Could not save slots: ${err.message}` : "Could not save slots. Try again in a moment.";
}

export async function createAvailabilitySlots(
  raw: Record<string, unknown>,
  onBehalfOfUserId?: string,
) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      throw new Error(
        "Invalid admin context: open a tutor from the HR panel first, then add slots.",
      );
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.createAvailability,
      "create availability",
    );

    const parsed = createAvailabilitySlotsSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw new Error(msg || "Invalid availability payload");
    }
    const input = parsed.data;

    const validCourse = sanitizeCourseName(validateCourse(input.course));

    await assertTutorCourseApproved(adminClient, actingAsId, validCourse);

    const { data: tutorSettingsRow } = await adminClient
      .from("user_settings")
      .select("session_default_duration")
      .eq("user_id", actingAsId)
      .maybeSingle();

    const requiredSessionMinutes = normalizeTeachingDefaultDurationMinutes(
      tutorSettingsRow?.session_default_duration,
    );

    const [sh = 0, sm = 0] = input.startTime.split(":").map(Number);
    const [eh = 0, em = 0] = input.endTime.split(":").map(Number);
    const durMin = eh * 60 + em - (sh * 60 + sm);
    if (durMin !== requiredSessionMinutes) {
      throw new Error(
        `Each opening must be exactly ${requiredSessionMinutes} minutes — your Teaching Default (Profile → Teaching Defaults).`,
      );
    }

    const nowCreate = new Date();
    const firstStartUtc = earliestFirstOccurrenceStartUtc(
      nowCreate,
      input.timezone,
      input.weekdays,
      input.startTime,
      input.endTime,
    );
    if (!firstStartUtc || firstStartUtc.getTime() < nowCreate.getTime()) {
      throw new Error(
        "That start time is already in the past for your next opening. Pick a later start time.",
      );
    }

    const recurringWeeks = input.recurring ? (input.recurringWeeks ?? 12) : 1;
    const weeks = Math.min(52, Math.max(1, recurringWeeks));

    const candidates = buildSlotCandidates(
      new Date(),
      input.timezone,
      input.weekdays,
      input.startTime,
      input.endTime,
      weeks,
    );

    if (candidates.length === 0) {
      throw new Error("No future slots matched your selections. Try different days or times.");
    }

    const MAX_SLOTS_PER_CREATE = 400;
    if (candidates.length > MAX_SLOTS_PER_CREATE) {
      throw new Error(`Too many slots at once (max ${MAX_SLOTS_PER_CREATE}). Reduce weeks or fewer days.`);
    }

    await assertBatchAvailabilityWindows(adminClient, actingAsId, validCourse, candidates);

    const pricePerSession = Math.round(input.priceCad * 100);
    const seriesId = randomUUID();

    const rows: Array<{
      tutor_id: string;
      course: string;
      start_time: string;
      end_time: string;
      price_per_session: number;
      active: boolean;
      max_students: number;
      series_id: string;
      booking_status: "available";
      locked_until: null;
      locked_by: null;
    }> = [];

    const legacyRows: Array<{
      tutor_id: string;
      course: string;
      start_time: string;
      end_time: string;
      price_per_session: number;
    }> = [];

    const seenStart = new Set<string>();
    for (const c of candidates) {
      const startKey = c.startUtc.toISOString();
      if (seenStart.has(startKey)) continue;
      seenStart.add(startKey);
      rows.push({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: c.startUtc.toISOString(),
        end_time: c.endUtc.toISOString(),
        price_per_session: pricePerSession,
        active: true,
        max_students: input.maxStudents,
        series_id: seriesId,
        booking_status: "available",
        locked_until: null,
        locked_by: null,
      });
      legacyRows.push({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: c.startUtc.toISOString(),
        end_time: c.endUtc.toISOString(),
        price_per_session: pricePerSession,
      });
    }

    if (rows.length === 0) {
      throw new Error("No unique slots to create after removing duplicates.");
    }

    const { error: insertError } = await adminClient.from("availability").insert(rows);

    if (insertError) {
      if (isMissingAvailabilityColumnsError(insertError) || insertError.message?.includes("schema cache")) {
        const { error: legacyInsertError } = await adminClient.from("availability").insert(legacyRows);
        if (legacyInsertError) {
          throw new Error(mapAvailabilityInsertError(legacyInsertError));
        }
      } else {
        throw new Error(mapAvailabilityInsertError(insertError));
      }
    }

    revalidateTutorAvailabilitySurfaces(actingAsId);
    return { success: true, created: rows.length };
  } catch (error) {
    return { success: false as const, error: sanitizeError(error) };
  }
}

export async function setAvailabilityActive(
  raw: Record<string, unknown>,
  onBehalfOfUserId?: string,
) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      throw new Error(
        "Invalid admin context: open a tutor from the HR panel first, then manage slots.",
      );
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    const parsed = setAvailabilityActiveSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw new Error(msg || "Invalid input");
    }
    const { availabilityId, active } = parsed.data;

    const client =
      user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

    const { data: row, error: fetchErr } = await client
      .from("availability")
      .select("tutor_id")
      .eq("id", availabilityId)
      .single();

    if (fetchErr || !row) {
      throw new Error("Availability not found");
    }
    if (row.tutor_id !== actingAsId && user.role !== "admin") {
      throw new Error("You don't have permission to update this slot");
    }

    const { error: updateErr } = await client
      .from("availability")
      .update({ active })
      .eq("id", availabilityId)
      .eq("tutor_id", actingAsId);

    if (updateErr) {
      if (isMissingAvailabilityColumnsError(updateErr) || updateErr.message?.includes("schema cache")) {
        revalidateTutorAvailabilitySurfaces(actingAsId);
        return { success: true };
      }
      throw new Error(`Failed to update slot: ${updateErr.message}`);
    }

    revalidateTutorAvailabilitySurfaces(actingAsId);
    return { success: true };
  } catch (error) {
    return { success: false as const, error: sanitizeError(error) };
  }
}

export async function createAvailability(
  course: string,
  startTime: string,
  priceDollars?: number,
  onBehalfOfUserId?: string,
  durationMinutes?: number,
) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      throw new Error(
        "Invalid admin context: open a tutor from the HR panel first, then add slots.",
      );
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    // Service role avoids RLS/JWT claim mismatches (approved/role in JWT vs users row).
    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.createAvailability,
      "create availability",
    );

    const validCourse = sanitizeCourseName(validateCourse(course));
    await assertTutorCourseApproved(adminClient, actingAsId, validCourse);
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new Error("Invalid date/time");
    }
    validateFutureDate(start);
    validateTimeSlot(start);

    const rawDuration =
      typeof durationMinutes === "number" && Number.isFinite(durationMinutes)
        ? Math.round(durationMinutes)
        : 30;
    const duration = Math.min(480, Math.max(15, rawDuration));
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const rawDollars =
      typeof priceDollars === "number" && Number.isFinite(priceDollars) ? priceDollars : 25;
    const clampedDollars = Math.min(
      SESSION_PRICE_CAD_MAX,
      Math.max(SESSION_PRICE_CAD_MIN, rawDollars),
    );
    const pricePerSession = Math.round(clampedDollars * 100);

    await assertAvailabilityWindowAllowed(adminClient, actingAsId, validCourse, start, end);

    let { data, error } = await adminClient
      .from("availability")
      .insert({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        price_per_session: pricePerSession,
        active: true,
        max_students: 1,
      })
      .select()
      .single();

    if (error && (isMissingAvailabilityColumnsError(error) || error.message?.includes("schema cache"))) {
      ({ data, error } = await adminClient
        .from("availability")
        .insert({
          tutor_id: actingAsId,
          course: validCourse,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          price_per_session: pricePerSession,
        })
        .select()
        .single());
    }

    if (error) {
      const detail =
        typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : String(error);
      throw new Error(`Failed to create availability: ${detail}`);
    }

    revalidateTutorAvailabilitySurfaces(actingAsId);
    return { success: true, availability: data };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function deleteAvailability(availabilityId: string, onBehalfOfUserId?: string) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
    const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

    const validAvailabilityId = validateUUID(availabilityId);

    const { data: availability, error: checkError } = await client
      .from("availability")
      .select("tutor_id")
      .eq("id", validAvailabilityId)
      .single();

    if (checkError || !availability) {
      throw new Error("Availability not found");
    }

    if (availability.tutor_id !== actingAsId && user.role !== "admin") {
      throw new Error("You don't have permission to delete this availability");
    }

    const { count: pendingCount, error: pendingErr } = await client
      .from("session_requests")
      .select("*", { count: "exact", head: true })
      .eq("availability_id", validAvailabilityId)
      .eq("status", "pending");

    if (pendingErr) {
      throw new Error(`Failed to check pending bookings: ${pendingErr.message}`);
    }
    if (pendingCount && pendingCount > 0) {
      throw new Error(
        "This slot has pending learner requests. Decline them in Command center before deleting.",
      );
    }

    const { error } = await client
      .from("availability")
      .delete()
      .eq("id", validAvailabilityId);

    if (error) {
      throw new Error(`Failed to delete availability: ${sanitizeError(error)}`);
    }

    revalidateTutorAvailabilitySurfaces(actingAsId);
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}