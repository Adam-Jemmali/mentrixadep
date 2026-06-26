"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/shared/integrations/supabase/client";

async function loadTutorPendingRequestCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { data: availability, error: availabilityError } = await supabase
    .from("availability")
    .select("id")
    .eq("tutor_id", userId);

  if (availabilityError || !availability?.length) return 0;

  const availabilityIds = availability.map((row: any) => row.id);
  const { count, error } = await supabase
    .from("session_requests")
    .select("*", { count: "exact", head: true })
    .in("availability_id", availabilityIds)
    .eq("status", "pending");

  if (error) return 0;
  return count ?? 0;
}

async function loadStudentPendingRequestCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("session_requests")
    .select("*", { count: "exact", head: true })
    .eq("student_id", userId)
    .eq("status", "pending");

  if (error) return 0;
  return count ?? 0;
}

export function useProfileBadgeCount(
  userId: string | undefined,
  role: string | null | undefined,
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId || (role !== "tutor" && role !== "student")) {
      setCount(0);
      return;
    }

    let cancelled = false;

    async function refresh() {
      const next =
        role === "tutor"
          ? await loadTutorPendingRequestCount(userId!)
          : await loadStudentPendingRequestCount(userId!);
      if (!cancelled) setCount(next);
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId, role]);

  return count;
}
