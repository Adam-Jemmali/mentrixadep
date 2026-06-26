import { getAllUsers } from "@/features/admin/admin-users";

import { AdminUsersClient } from "./users-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users · Admin · Mentrixa" };

export default async function AdminUsersPage() {
  const users = await getAllUsers().catch(() => []);

  return <AdminUsersClient users={users} />;
}
