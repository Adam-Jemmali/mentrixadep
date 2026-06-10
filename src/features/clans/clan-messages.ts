"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertNoBlockedLanguage, parseUUID } from "@/shared/core/security";
import { assertClanMember } from "@/features/clans/clan-dashboard-internal";

export async function postClanMessage(
  clanId: string,
  bodyRaw: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }
    const id = parseUUID(clanId);
    if (!id.ok) return { success: false, error: "Invalid clan." };

    const body = bodyRaw.trim().slice(0, 2000);
    if (body.length < 1) {
      return { success: false, error: "Message cannot be empty." };
    }
    assertNoBlockedLanguage(body, "clan chat message");

    const admin = createAdminClient();
    if (!(await assertClanMember(admin, user.id, id.id))) {
      return { success: false, error: "Not a member." };
    }

    const { error } = await admin.from("clan_messages").insert({
      clan_id: id.id,
      user_id: user.id,
      body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/student/clan/${id.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to send.",
    };
  }
}

export type ClanMessageRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function listClanMessages(
  clanId: string,
  limit = 80
): Promise<ClanMessageRow[] | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { error: "Not allowed." };
    }
    const id = parseUUID(clanId);
    if (!id.ok) return { error: "Invalid clan." };

    const admin = createAdminClient();
    if (!(await assertClanMember(admin, user.id, id.id))) {
      return { error: "Not a member." };
    }

    const { data: rows, error } = await admin
      .from("clan_messages")
      .select("id, user_id, body, created_at")
      .eq("clan_id", id.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(120, Math.max(10, limit)));

    if (error) return { error: error.message };

    const uids = Array.from(
      new Set((rows ?? []).map((r) => r.user_id as string))
    );
    const { data: settings } = await admin
      .from("user_settings")
      .select("user_id, display_name, avatar_url")
      .in("user_id", uids);

    const names = new Map(
      (settings ?? []).map((s) => [s.user_id, s.display_name as string | null])
    );
    const avatars = new Map(
      (settings ?? []).map((s) => [s.user_id, (s as { avatar_url?: string | null }).avatar_url ?? null])
    );

    const list: ClanMessageRow[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      body: r.body as string,
      created_at: r.created_at as string,
      display_name: names.get(r.user_id as string) ?? null,
      avatar_url: avatars.get(r.user_id as string) ?? null,
    }));

    return list.reverse();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}


