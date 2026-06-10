import { getAllUsers } from "@/features/admin/admin-users";
import { getAllUnverifiedTutorCourses } from "@/features/admin/tutor-courses-admin";

import { AdminUsersClient } from "./users-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users · Admin · Mentrixa" };

export default async function AdminUsersPage() {
  const [users, unverifiedCourses] = await Promise.all([
    getAllUsers().catch(() => []),
    getAllUnverifiedTutorCourses().catch(() => []),
  ]);

  return <AdminUsersClient users={users} unverifiedCourses={unverifiedCourses} />;
}
