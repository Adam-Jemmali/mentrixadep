import { requireRole } from "@/shared/core/auth";
import { loadStudentHome } from "@/features/student-home/load-student-home";
import { StudentHomeClient } from "@/features/student-home/student-home-client";

interface StudentPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function StudentPage(_props: StudentPageProps) {
  const user = await requireRole(["student", "admin"]);
  const data = await loadStudentHome(user.id);
  return <StudentHomeClient userId={user.id} data={data} />;
}
