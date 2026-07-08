"use client";

import { StudentRouteError } from "@/features/student-profile/ui/student-route-error";

export default function QuestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StudentRouteError error={error} reset={reset} routeLabel="student/quest" />;
}
