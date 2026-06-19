import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { addDaysIso } from "@/features/booking/booking-pricing";
import { getAppCache, setAppCache } from "@/shared/integrations/app-cache";
import {
  computeGuideMatchScore,
  rankMatchmakerGuides,
  type MatchmakerGuideResult,
} from "@/features/matchmaker/matchmaker-pure";

const MATCHMAKER_CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_IMPACT_SCORE = 70;

function matchmakerCacheKey(userId: string): string {
  return `matchmaker:ap-calc-ab:${userId}`;
}

async function loadGuideBreakthroughNodes(
  admin: ReturnType<typeof createAdminClient>,
  guideIds: string[],
  weakNodeIds: string[]
): Promise<Map<string, Set<string>>> {
  const byGuide = new Map<string, Set<string>>();
  if (guideIds.length === 0 || weakNodeIds.length === 0) return byGuide;

  const { data } = await admin
    .from("session_target_nodes")
    .select(
      "skill_node_id, sessions!inner(id, tutor_id, student_id, status, course)"
    )
    .in("skill_node_id", weakNodeIds)
    .eq("post_session_correct", true)
    .eq("sessions.status", "completed");

  for (const row of data ?? []) {
    const session = row.sessions as
      | { tutor_id?: string; course?: string }
      | { tutor_id?: string; course?: string }[]
      | null;
    const sessionRow = Array.isArray(session) ? session[0] : session;
    const tutorId = sessionRow?.tutor_id;
    const course = String(sessionRow?.course ?? "");
    if (!tutorId || !guideIds.includes(tutorId)) continue;
    if (course.trim().toLowerCase() !== AP_CALC_AB_SUBJECT.toLowerCase()) continue;

    const nodeId = row.skill_node_id as string;
    const set = byGuide.get(tutorId) ?? new Set<string>();
    set.add(nodeId);
    byGuide.set(tutorId, set);
  }

  return byGuide;
}

async function loadNextSlotsByGuide(
  admin: ReturnType<typeof createAdminClient>,
  guideIds: string[]
): Promise<Map<string, string>> {
  const slots = new Map<string, string>();
  if (guideIds.length === 0) return slots;

  const nowIso = new Date().toISOString();
  const windowEnd = addDaysIso(new Date(), 14);

  const { data, error } = await admin
    .from("availability")
    .select("tutor_id, start_time, active, booking_status")
    .in("tutor_id", guideIds)
    .eq("course", AP_CALC_AB_SUBJECT)
    .gte("start_time", nowIso)
    .lte("start_time", windowEnd)
    .order("start_time", { ascending: true });

  if (error) return slots;

  for (const row of data ?? []) {
    const tutorId = row.tutor_id as string;
    if (slots.has(tutorId)) continue;

    const active = (row as { active?: boolean }).active;
    if (active === false) continue;

    const bookingStatus = (row as { booking_status?: string | null }).booking_status;
    if (bookingStatus && bookingStatus !== "available") continue;

    slots.set(tutorId, row.start_time as string);
  }

  return slots;
}

export async function getMatchmakerGuides(userId: string): Promise<{
  guides: MatchmakerGuideResult[];
}> {
  const cacheKey = matchmakerCacheKey(userId);
  const cached = await getAppCache<{ guides: MatchmakerGuideResult[] }>(
    cacheKey,
    MATCHMAKER_CACHE_TTL_MS
  );
  if (cached) return cached;

  const admin = createAdminClient();
  const weakest = await getWeakestNodes(userId, AP_CALC_AB_SUBJECT, 3);
  if (weakest.length === 0) {
    const empty = { guides: [] as MatchmakerGuideResult[] };
    await setAppCache(cacheKey, empty, MATCHMAKER_CACHE_TTL_MS);
    return empty;
  }

  const weakNodeIds = weakest.map((node) => node.id);
  const nodeNameById = new Map(weakest.map((node) => [node.id, node.nodeName]));

  const { data: impactRows } = await admin
    .from("guide_impact_scores")
    .select("guide_id, impact_score")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .gte("impact_score", MIN_IMPACT_SCORE);

  const candidateGuideIds = (impactRows ?? []).map((row) => row.guide_id as string);
  if (candidateGuideIds.length === 0) {
    const empty = { guides: [] as MatchmakerGuideResult[] };
    await setAppCache(cacheKey, empty, MATCHMAKER_CACHE_TTL_MS);
    return empty;
  }

  const { data: approvedGuides } = await admin
    .from("users")
    .select("id")
    .in("id", candidateGuideIds)
    .eq("role", "tutor")
    .eq("approved", true)
    .eq("status", "approved");

  const approvedIds = new Set((approvedGuides ?? []).map((row) => row.id as string));
  const eligibleImpact = (impactRows ?? []).filter((row) => approvedIds.has(row.guide_id as string));

  if (eligibleImpact.length === 0) {
    const empty = { guides: [] as MatchmakerGuideResult[] };
    await setAppCache(cacheKey, empty, MATCHMAKER_CACHE_TTL_MS);
    return empty;
  }

  const guideIds = eligibleImpact.map((row) => row.guide_id as string);
  const breakthroughByGuide = await loadGuideBreakthroughNodes(admin, guideIds, weakNodeIds);
  const nextSlotByGuide = await loadNextSlotsByGuide(admin, guideIds);

  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", guideIds);

  const settingsByGuide = new Map(
    (settings ?? []).map((row) => [
      row.user_id as string,
      {
        displayName:
          typeof row.display_name === "string" && row.display_name.trim()
            ? row.display_name.trim()
            : "Guide",
        avatarUrl:
          typeof row.avatar_url === "string" && row.avatar_url.trim()
            ? row.avatar_url.trim()
            : null,
      },
    ])
  );

  const scored = eligibleImpact.map((row) => {
    const guideId = row.guide_id as string;
    const impactScore = Number(row.impact_score);
    const breakthroughNodes = breakthroughByGuide.get(guideId) ?? new Set<string>();
    const { matchScore, matchedNodeIds } = computeGuideMatchScore(
      weakNodeIds,
      breakthroughNodes,
      impactScore
    );
    const profile = settingsByGuide.get(guideId);
    return {
      guideId,
      displayName: profile?.displayName ?? "Guide",
      avatarUrl: profile?.avatarUrl ?? null,
      impactScore,
      matchScore,
      matchedNodeNames: matchedNodeIds.map((id) => nodeNameById.get(id) ?? "Skill node"),
      nextAvailableSlot: nextSlotByGuide.get(guideId) ?? null,
    };
  });

  const result = { guides: rankMatchmakerGuides(scored, 3) };
  await setAppCache(cacheKey, result, MATCHMAKER_CACHE_TTL_MS);
  return result;
}
