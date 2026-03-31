"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  sanitizeString,
} from "@/lib/security";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return s;
}

function normalizeTag(raw: string): string {
  return sanitizeString(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export type ClanMemberRow = {
  user_id: string;
  role: "leader" | "member";
  joined_at: string;
  display_name: string | null;
};

export type MyClanResult =
  | {
      clan: {
        id: string;
        name: string;
        tag: string;
        invite_code: string;
        leader_id: string;
        created_at: string;
      };
      members: ClanMemberRow[];
      myRole: "leader" | "member";
    }
  | { clan: null };

export async function getMyClan(): Promise<MyClanResult> {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") {
    return { clan: null };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("clan_members")
    .select("clan_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.clan_id) {
    return { clan: null };
  }

  const { data: clan, error: cErr } = await admin
    .from("clans")
    .select("id, name, tag, invite_code, leader_id, created_at")
    .eq("id", membership.clan_id)
    .single();

  if (cErr || !clan) {
    return { clan: null };
  }

  const { data: memberRows } = await admin
    .from("clan_members")
    .select("user_id, role, joined_at")
    .eq("clan_id", clan.id)
    .order("joined_at", { ascending: true });

  const ids = (memberRows ?? []).map((m) => m.user_id);
  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", ids);

  const nameByUser = new Map(
    (settings ?? []).map((s) => [s.user_id, s.display_name as string | null])
  );

  const members: ClanMemberRow[] = (memberRows ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role as "leader" | "member",
    joined_at: m.joined_at,
    display_name: nameByUser.get(m.user_id) ?? null,
  }));

  return {
    clan: {
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      invite_code: clan.invite_code,
      leader_id: clan.leader_id,
      created_at: clan.created_at,
    },
    members,
    myRole: membership.role as "leader" | "member",
  };
}

export async function createClan(
  nameRaw: string,
  tagRaw: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can create a clan." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.clanCreate,
      "create clan"
    );

    const name = sanitizeString(nameRaw).slice(0, 60);
    const tag = normalizeTag(tagRaw);
    if (name.length < 2) {
      return { success: false, error: "Clan name must be at least 2 characters." };
    }
    if (tag.length < 2) {
      return { success: false, error: "Tag must be 2–8 letters or numbers." };
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("clan_members")
      .select("clan_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "You are already in a clan. Leave it first." };
    }

    const { data: tagTaken } = await admin
      .from("clans")
      .select("id")
      .eq("tag", tag)
      .maybeSingle();

    if (tagTaken) {
      return { success: false, error: "That tag is already taken." };
    }

    let invite = randomInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await admin
        .from("clans")
        .select("id")
        .eq("invite_code", invite)
        .maybeSingle();
      if (!clash) break;
      invite = randomInviteCode();
    }

    const { data: clan, error: insClan } = await admin
      .from("clans")
      .insert({
        name,
        tag,
        invite_code: invite,
        leader_id: user.id,
      })
      .select("id")
      .single();

    if (insClan || !clan) {
      return {
        success: false,
        error: insClan?.message ?? "Could not create clan.",
      };
    }

    const { error: memErr } = await admin.from("clan_members").insert({
      clan_id: clan.id,
      user_id: user.id,
      role: "leader",
    });

    if (memErr) {
      await admin.from("clans").delete().eq("id", clan.id);
      return { success: false, error: memErr.message };
    }

    revalidatePath("/student/duel");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create clan.",
    };
  }
}

export async function joinClanByCode(
  codeRaw: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can join a clan." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.clanJoin,
      "join clan"
    );

    const code = sanitizeString(codeRaw).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 4) {
      return { success: false, error: "Enter a valid invite code." };
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("clan_members")
      .select("clan_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "You are already in a clan. Leave it first." };
    }

    const { data: clan } = await admin
      .from("clans")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();

    if (!clan) {
      return { success: false, error: "No clan found with that code." };
    }

    const { error: memErr } = await admin.from("clan_members").insert({
      clan_id: clan.id,
      user_id: user.id,
      role: "member",
    });

    if (memErr) {
      return { success: false, error: memErr.message };
    }

    revalidatePath("/student/duel");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to join clan.",
    };
  }
}

export async function leaveClan(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can leave a clan." };
    }

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from("clan_members")
      .select("clan_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { success: false, error: "You are not in a clan." };
    }

    const clanId = membership.clan_id;

    if (membership.role === "leader") {
      const { data: others } = await admin
        .from("clan_members")
        .select("user_id")
        .eq("clan_id", clanId)
        .neq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1);

      const firstOther = others?.[0];
      if (firstOther?.user_id) {
        const nextLeader = firstOther.user_id;
        await admin
          .from("clan_members")
          .update({ role: "leader" })
          .eq("clan_id", clanId)
          .eq("user_id", nextLeader);
        await admin.from("clans").update({ leader_id: nextLeader }).eq("id", clanId);
      }
    }

    await admin.from("clan_members").delete().eq("clan_id", clanId).eq("user_id", user.id);

    const { count } = await admin
      .from("clan_members")
      .select("user_id", { count: "exact", head: true })
      .eq("clan_id", clanId);

    if ((count ?? 0) === 0) {
      await admin.from("clans").delete().eq("id", clanId);
    }

    revalidatePath("/student/duel");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to leave clan.",
    };
  }
}

export async function regenerateInviteCode(): Promise<
  { success: true; invite_code: string } | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can do this." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.clanRegenerateCode,
      "regenerate invite"
    );

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from("clan_members")
      .select("clan_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "leader") {
      return { success: false, error: "Only the clan leader can regenerate the code." };
    }

    let invite = randomInviteCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: clash } = await admin
        .from("clans")
        .select("id")
        .eq("invite_code", invite)
        .maybeSingle();
      if (!clash) break;
      invite = randomInviteCode();
    }

    const { data: updated, error } = await admin
      .from("clans")
      .update({ invite_code: invite, updated_at: new Date().toISOString() })
      .eq("id", membership.clan_id)
      .select("invite_code")
      .single();

    if (error || !updated) {
      return { success: false, error: error?.message ?? "Could not update code." };
    }

    revalidatePath("/student/duel");
    return { success: true, invite_code: updated.invite_code };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to regenerate code.",
    };
  }
}

/** True if both students are in the same clan (for duel validation). */
export async function areUsersInSameClan(
  aId: string,
  bId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: ma } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", aId)
    .maybeSingle();
  const { data: mb } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", bId)
    .maybeSingle();
  if (!ma?.clan_id || !mb?.clan_id) return false;
  return ma.clan_id === mb.clan_id;
}
