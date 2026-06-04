"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeTutorQualityScore,
  type TutorQualityScore,
  type TutorQualityInput,
} from "@/lib/tutor-quality";
import { captureUnexpectedError } from "@/lib/observability";

export async function getTutorQualityScore(tutorId: string): Promise<TutorQualityScore | null> {
  const admin = createAdminClient();

  try {
    const [ratingsResult, sessionsResult, requestsResult] = await Promise.all([
      admin
        .from("ratings")
        .select("rating")
        .eq("tutor_id", tutorId),
      admin
        .from("sessions")
        .select("id, status, completed")
        .eq("tutor_id", tutorId),
      admin
        .from("session_requests")
        .select("status")
        .eq("tutor_id", tutorId)
        .in("status", ["approved", "rejected", "cancelled"]),
    ]);

    const ratings = ratingsResult.data ?? [];
    const sessions = sessionsResult.data ?? [];
    const requests = requestsResult.data ?? [];

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : null;

    const completed = sessions.filter(
      (s) => s.completed || s.status === "completed"
    ).length;
    const cancelled = sessions.filter((s) => s.status === "cancelled").length;

    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;

    const input: TutorQualityInput = {
      avgRating,
      ratingCount: ratings.length,
      sessionsCompleted: completed,
      sessionsApproved: approved,
      sessionsRejected: rejected,
      sessionsCancelled: cancelled,
    };

    return computeTutorQualityScore(input);
  } catch (err) {
    captureUnexpectedError("tutor-quality-score", err);
    return null;
  }
}
