"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { addDaysIso } from "@/features/booking/booking-pricing";
import { isMissingAvailabilityColumnsError } from "@/features/booking/booking-internal";
import { cacheKeys, cacheTtl, withCache } from "@/shared/core/redis";

export async function getTutorAvailability(course?: string) {
  await requireRole(["student", "admin"]);
  const courseKey = (course?.trim() || "all").toLowerCase().slice(0, 80);
  return withCache(cacheKeys.availabilityBrowse(courseKey), cacheTtl.availabilityBrowse, () =>
    loadTutorAvailability(course),
  );
}

async function loadTutorAvailability(course?: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const windowEnd = addDaysIso(new Date(), 14);
  const nowIso = new Date().toISOString();
  const runQuery = (withAvailabilityFilters: boolean) => {
    let query = supabase
      .from("availability")
      .select("*")
      .gte("start_time", nowIso)
      .lte("start_time", windowEnd)
      .order("start_time", { ascending: true });

    if (withAvailabilityFilters) {
      query = query.eq("active", true).or("booking_status.eq.available,booking_status.is.null");
    }

    if (course) {
      query = query.eq("course", course);
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

  if (!data || data.length === 0) {
    return [];
  }

  const tutorIds = Array.from(new Set(data.map((a) => a.tutor_id)));

  if (tutorIds.length === 0) {
    return [];
  }

  // Fetch only the relevant tutors (not all users)
  const { data: tutors } = await adminClient
    .from("users")
    .select("id, role, approved")
    .in("id", tutorIds)
    .eq("approved", true);

  const approvedTutorIds = new Set(tutors?.map((t) => t.id) || []);

  const { data: tutorSettings } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url, bio")
    .in("user_id", tutorIds);

  const settingsByTutorId = new Map(
    (tutorSettings ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
        bio: typeof row.bio === "string" ? row.bio.trim() || null : null,
      },
    ])
  );

  // Fetch tutor emails in parallel batches using optimized batching
  const tutorEmails = new Map<string, string>();
  const tutorMetaAvatar = new Map<string, string | null>();

  if (approvedTutorIds.size > 0) {
    const tutorIdArray = Array.from(approvedTutorIds);
    const { batchQueries } = await import("@/shared/core/performance");
    
    const emailQueries = tutorIdArray.map((tutorId) => async () => {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(tutorId);
        if (!userError && userData?.user?.email) {
          const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
          const avatarRaw = meta?.avatar_url ?? meta?.picture;
          const avatar = typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null;
          return [tutorId, userData.user.email, avatar] as [string, string, string | null];
        }
      } catch (err) {
        console.error(`Error fetching email for tutor ${tutorId}:`, err);
      }
      return null;
    });

    const results = await batchQueries(emailQueries, 10);
    results.forEach((result) => {
      if (result) {
        tutorEmails.set(result[0], result[1]);
        tutorMetaAvatar.set(result[0], result[2] ?? null);
      }
    });
  }

  const result = data
    .filter((avail) => approvedTutorIds.has(avail.tutor_id))
    .map((avail) => {
      const tutor = tutors?.find((t) => t.id === avail.tutor_id);
      const email = tutorEmails.get(avail.tutor_id) || "";
      const settings = settingsByTutorId.get(avail.tutor_id);
      const avatar_url = settings?.avatar_url ?? tutorMetaAvatar.get(avail.tutor_id) ?? null;
      const display_name = settings?.display_name ?? (email ? email.split("@")[0] : null);
      const bio = settings?.bio ?? null;

      return {
        ...avail,
        tutor: tutor
          ? {
              id: tutor.id,
              role: tutor.role,
              approved: tutor.approved,
              email,
              display_name,
              avatar_url,
              bio,
            }
          : undefined,
      };
    })
    .filter((avail) => avail.tutor !== undefined);

  return result;
}

/** Keyset cursor for availability rows (tutor browse at scale — offset is O(n)). */
export type TutorAvailabilityCursor = { start_time: string; id: string };

/**
 * Paginated open slots in the booking window. Uses (start_time, id) keyset — same filters as getTutorAvailability.
 */
export async function getTutorAvailabilityKeysetPage(opts: {
  course?: string;
  limit?: number;
  cursor?: TutorAvailabilityCursor | null;
}) {
  await requireRole(["student", "admin"]);

  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const windowEnd = addDaysIso(new Date(), 14);
  const nowIso = new Date().toISOString();

  const runQuery = (withAvailabilityFilters: boolean) => {
    let q = supabase
      .from("availability")
      .select("*")
      .gte("start_time", nowIso)
      .lte("start_time", windowEnd)
      .order("start_time", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit + 1);

    if (withAvailabilityFilters) {
      q = q.eq("active", true).or("booking_status.eq.available,booking_status.is.null");
    }

    if (opts.course) {
      q = q.eq("course", opts.course);
    }

    if (opts.cursor) {
      const c = opts.cursor;
      q = q.or(`start_time.gt.${c.start_time},and(start_time.eq.${c.start_time},id.gt.${c.id})`);
    }

    return q;
  };

  let { data, error } = await runQuery(true);

  if (error && isMissingAvailabilityColumnsError(error)) {
    const fallback = await runQuery(false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Failed to fetch availability page: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor: TutorAvailabilityCursor | null =
    hasMore && page.length > 0
      ? {
          start_time: page[page.length - 1]!.start_time,
          id: page[page.length - 1]!.id,
        }
      : null;

  if (page.length === 0) {
    return { rows: [], nextCursor: null };
  }

  const tutorIds = Array.from(new Set(page.map((a) => a.tutor_id)));
  const { data: tutors } = await adminClient
    .from("users")
    .select("id, role, approved")
    .in("id", tutorIds)
    .eq("approved", true);

  const { data: tutorSettings } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", tutorIds);

  const settingsByTutorId = new Map(
    (tutorSettings ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
      },
    ])
  );

  const approvedTutorIds = new Set(tutors?.map((t) => t.id) || []);
  const tutorIdArray = Array.from(approvedTutorIds);
  const tutorEmails = new Map<string, string>();
  const tutorMetaAvatar = new Map<string, string | null>();

  if (tutorIdArray.length > 0) {
    const { batchQueries } = await import("@/shared/core/performance");
    const emailQueries = tutorIdArray.map((tutorId) => async () => {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(tutorId);
        if (!userError && userData?.user?.email) {
          const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
          const avatarRaw = meta?.avatar_url ?? meta?.picture;
          const avatar = typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null;
          return [tutorId, userData.user.email, avatar] as [string, string, string | null];
        }
      } catch {
        /* ignore */
      }
      return null;
    });
    const results = await batchQueries(emailQueries, 10);
    results.forEach((result) => {
      if (result) {
        tutorEmails.set(result[0], result[1]);
        tutorMetaAvatar.set(result[0], result[2] ?? null);
      }
    });
  }

  const result = page
    .filter((avail) => approvedTutorIds.has(avail.tutor_id))
    .map((avail) => {
      const tutor = tutors?.find((t) => t.id === avail.tutor_id);
      const email = tutorEmails.get(avail.tutor_id) || "";
      const settings = settingsByTutorId.get(avail.tutor_id);
      const avatar_url = settings?.avatar_url ?? tutorMetaAvatar.get(avail.tutor_id) ?? null;
      const display_name = settings?.display_name ?? (email ? email.split("@")[0] : null);
      return {
        ...avail,
        tutor: tutor
          ? {
              id: tutor.id,
              role: tutor.role,
              approved: tutor.approved,
              email,
              display_name,
              avatar_url,
            }
          : undefined,
      };
    })
    .filter((avail) => avail.tutor !== undefined);

  return { rows: result, nextCursor };
}

export async function getAvailableCourses() {
  await requireRole(["student", "admin"]);
  
  // Check cache first (2 minute TTL for course list)
  const cacheKey = "available-courses";
   
  const cached = (await import("@/shared/core/cache")).cache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability")
    .select("course")
    .eq("active", true)
    .gte("start_time", new Date().toISOString())
    .order("course", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  const courses = Array.from(new Set((data || []).map((a) => a.course))).sort();
  
  // Cache for 2 minutes
  (await import("@/shared/core/cache")).cache.set(cacheKey, courses, 2 * 60 * 1000);
  
  return courses;
}

export async function getTutorExpertiseMap() {
  await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tutor_courses")
    .select("tutor_id, course_name, proof_description, verified");

  if (error) return {};

  const map: Record<string, { course_name: string; proof_description: string; verified: boolean }[]> = {};
  for (const row of data ?? []) {
    if (!map[row.tutor_id]) map[row.tutor_id] = [];
    map[row.tutor_id]!.push({
      course_name: row.course_name,
      proof_description: row.proof_description,
      verified: row.verified,
    });
  }
  return map;
}
