import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { emailSchema } from "@/shared/core/security";

export async function findAuthUserByEmail(email: string) {
  emailSchema.parse(email);
  const adminClient = createAdminClient();
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[admin] listUsers failed while searching by email:", error.message);
      return null;
    }

    const found = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === target);
    if (found) return found;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
