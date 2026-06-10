import { createAdminClient } from "@/shared/integrations/supabase/admin";

export async function assertClanMember(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  clanId: string
): Promise<boolean> {
  const { data } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .eq("clan_id", clanId)
    .maybeSingle();
  return !!data?.clan_id;
}

type ClanBrowseSource = {
  id: string;
  name: string;
  tag: string;
  leader_id: string;
  focus_division_key: string | null;
};

export type PublicClanBrowseRow = {
  id: string;
  name: string;
  tag: string;
  member_count: number;
  leader_name: string;
  focus_division_key: string | null;
  focus_label: string;
};

export async function buildPublicClanBrowseRows(
  admin: ReturnType<typeof createAdminClient>,
  clans: ClanBrowseSource[],
): Promise<PublicClanBrowseRow[]> {
  if (!clans.length) return [];

  const ids = clans.map((c) => c.id);
  const leaderIds = [...new Set(clans.map((c) => c.leader_id))];

  const [{ data: memberRows }, { data: settings }, { data: divisions }] = await Promise.all([
    admin.from("clan_members").select("clan_id").in("clan_id", ids),
    admin.from("user_settings").select("user_id, display_name").in("user_id", leaderIds),
    admin.from("divisions").select("key, name").eq("active", true),
  ]);

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    const cid = row.clan_id as string;
    memberCounts.set(cid, (memberCounts.get(cid) ?? 0) + 1);
  }

  const leaderNames = new Map<string, string>();
  for (const row of settings ?? []) {
    const name = (row.display_name as string | null)?.trim();
    leaderNames.set(row.user_id as string, name || "Mentrixer");
  }

  const divisionNames = new Map<string, string>();
  for (const row of divisions ?? []) {
    divisionNames.set(row.key as string, row.name as string);
  }

  return clans.map((c) => {
    const focusKey = (c.focus_division_key as string | null) ?? null;
    return {
      id: c.id,
      name: c.name,
      tag: c.tag,
      member_count: memberCounts.get(c.id) ?? 0,
      leader_name: leaderNames.get(c.leader_id) ?? "Mentrixer",
      focus_division_key: focusKey,
      focus_label: focusKey
        ? divisionNames.get(focusKey) ?? focusKey.replace(/-/g, " ")
        : "Any subject",
    };
  });
}
