"use client";

import { StudentRouteError } from "@/features/student-profile/ui/student-route-error";

export default function DivisionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StudentRouteError error={error} reset={reset} routeLabel="student/division" />;
}
