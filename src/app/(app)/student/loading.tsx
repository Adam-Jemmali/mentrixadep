"use client";

import { useEffect } from "react";
import { playMentrixaLoadingOnce } from "@/shared/integrations/mentrixa-sounds";
import { StudentDashboardSkeleton } from "@/shared/ui/skeleton-patterns";

export default function StudentDashboardLoading() {
  useEffect(() => {
    playMentrixaLoadingOnce();
  }, []);

  return <StudentDashboardSkeleton />;
}
