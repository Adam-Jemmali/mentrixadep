import type { createAdminClient } from "@/shared/integrations/supabase/admin";

export async function resolveDisplayNames(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds));
  const settingsNameByUser = new Map<string, string>();
  if (unique.length > 0) {
    const { data: settingsRows } = await admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", unique);
    for (const s of settingsRows ?? []) {
      const raw = typeof s.display_name === "string" ? s.display_name.trim() : "";
      if (raw) settingsNameByUser.set(s.user_id, raw.slice(0, 100));
    }
  }

  const displayNames: Record<string, string> = {};
  await Promise.all(
    unique.map(async (uid) => {
      const fromSettings = settingsNameByUser.get(uid);
      if (fromSettings) {
        displayNames[uid] = fromSettings;
        return;
      }
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        const u = data?.user;
        const fullName = (u?.user_metadata?.full_name as string) || (u?.user_metadata?.name as string);
        if (fullName && typeof fullName === "string") {
          const parts = fullName.trim().split(/\s+/);
          const first = parts[0];
          const last = parts[parts.length - 1];
          if (parts.length >= 2 && first && last) {
            displayNames[uid] = `${first} ${last.charAt(0)}.`;
          } else if (first) {
            displayNames[uid] = `${first.slice(0, 2)}.`;
          }
        } else if (u?.email) {
          const local = u.email.split("@")[0];
          displayNames[uid] = local ? `${local.slice(0, 3)}***` : "Member";
        } else {
          displayNames[uid] = "Member";
        }
      } catch {
        displayNames[uid] = "Member";
      }
    }),
  );
  return displayNames;
}

export async function resolveAvatarUrls(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(userIds));
  const avatarUrls: Record<string, string | null> = {};
  if (unique.length === 0) return avatarUrls;

  const { data: settingsRows } = await admin
    .from("user_settings")
    .select("user_id, avatar_url")
    .in("user_id", unique);

  for (const row of settingsRows ?? []) {
    avatarUrls[row.user_id] =
      typeof row.avatar_url === "string" && row.avatar_url.trim().length > 0
        ? row.avatar_url.trim()
        : null;
  }
  return avatarUrls;
}
