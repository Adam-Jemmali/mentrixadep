import { requireRole } from "@/shared/core/auth";
import { loadStudentHome } from "@/features/student-home/load-student-home";
import { StudentHomeClient } from "@/features/student-home/student-home-client";
import { getWeekRangeUTC } from "@/shared/core/time-format";

interface StudentPageProps {
  searchParams: Promise<{
    booking?: string;
    openStudyPackage?: string;
    sessionsTab?: string;
  }>;
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const query = await searchParams;
  const user = await requireRole(["student", "admin"]);
  const data = await loadStudentHome(user.id);
  const weekRange = getWeekRangeUTC(new Date());

  const initialSessionsTab =
    query.booking === "success"
      ? ("upcoming" as const)
      : query.sessionsTab === "past"
        ? ("past" as const)
        : query.sessionsTab === "upcoming"
          ? ("upcoming" as const)
          : undefined;

  return (
    <StudentHomeClient
      userId={user.id}
      data={data}
      weekRange={weekRange}
      initialOpenStudyPackageId={
        typeof query.openStudyPackage === "string" ? query.openStudyPackage : ""
      }
      initialSessionsTab={initialSessionsTab}
      momentumActive={data.hubDashboard.momentumSubscriber}
    />
  );
}
