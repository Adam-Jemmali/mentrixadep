"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/lib/analytics";
import {
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  parseUUID,
  sanitizeString,
  assertNoBlockedLanguage,
} from "@/lib/security";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
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

export type CreateClanOptions = {
  description?: string;
  focusDivisionKey?: string | null;
  joinMode?: "open" | "approval";
  isPublic?: boolean;
  avatarPresetKey?: string;
};

export async function createClan(
  nameRaw: string,
  tagRaw: string,
  options?: CreateClanOptions
): Promise<{ success: true; clanId?: string } | { success: false; error: string }> {
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
    assertNoBlockedLanguage(name, "clan name");
    assertNoBlockedLanguage(tag, "clan tag");

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

    const desc = options?.description
      ? sanitizeString(options.description).slice(0, 500)
      : null;
    if (desc) {
      assertNoBlockedLanguage(desc, "clan description");
    }
    const focus =
      typeof options?.focusDivisionKey === "string" &&
      options.focusDivisionKey.trim()
        ? options.focusDivisionKey.trim()
        : null;
    const joinMode = options?.joinMode === "approval" ? "approval" : "open";
    const isPublic = options?.isPublic !== false;
    const preset =
      typeof options?.avatarPresetKey === "string" &&
      options.avatarPresetKey.trim()
        ? options.avatarPresetKey.trim().slice(0, 32)
        : "shield";

    if (focus) {
      const { data: divOk } = await admin
        .from("divisions")
        .select("key")
        .eq("key", focus)
        .eq("active", true)
        .maybeSingle();
      if (!divOk) {
        return { success: false, error: "Pick a valid subject for clan focus." };
      }
    }

    const { data: clan, error: insClan } = await admin
      .from("clans")
      .insert({
        name,
        tag,
        invite_code: invite,
        leader_id: user.id,
        description: desc,
        focus_division_key: focus,
        join_mode: joinMode,
        is_public: isPublic,
        avatar_kind: "preset",
        avatar_preset_key: preset,
      })
      .select("id")
      .single();

    if (insClan || !clan) {
      const msg = insClan?.message ?? "Could not create clan.";
      if (msg.includes("clans_name_unique_ci") || msg.includes("duplicate")) {
        return { success: false, error: "A clan with this name already exists." };
      }
      return {
        success: false,
        error: msg,
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

    void trackEvent("clan_created", {
      userId: user.id,
      properties: { clan_id: clan.id, name },
    });

    revalidatePath("/student/duel");
    revalidatePath("/student/clan");
    revalidatePath(`/student/clan/${clan.id}`);
    return { success: true, clanId: clan.id };
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
      .select("id, join_mode")
      .eq("invite_code", code)
      .maybeSingle();

    if (!clan) {
      return { success: false, error: "No clan found with that code." };
    }

    const clanId = clan.id as string;
    const joinMode = (clan as { join_mode?: string }).join_mode ?? "open";

    const { count } = await admin
      .from("clan_members")
      .select("user_id", { count: "exact", head: true })
      .eq("clan_id", clanId);

    if ((count ?? 0) >= 20) {
      return { success: false, error: "This clan is full (20 members)." };
    }

    if (joinMode === "approval") {
      const { data: pend } = await admin
        .from("clan_join_requests")
        .select("id")
        .eq("clan_id", clanId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pend) {
        return {
          success: false,
          error: "You already have a pending request for this clan.",
        };
      }

      const { error: reqErr } = await admin.from("clan_join_requests").insert({
        clan_id: clanId,
        user_id: user.id,
        status: "pending",
      });

      if (reqErr) {
        return { success: false, error: reqErr.message };
      }

      revalidatePath("/student/duel");
      revalidatePath(`/student/clan/${clanId}`);
      return { success: true };
    }

    const { error: memErr } = await admin.from("clan_members").insert({
      clan_id: clanId,
      user_id: user.id,
      role: "member",
    });

    if (memErr) {
      return { success: false, error: memErr.message };
    }

    revalidatePath("/student/duel");
    revalidatePath(`/student/clan/${clanId}`);
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
    revalidatePath("/student/clan");
    revalidatePath(`/student/clan/${clanId}`);
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
    revalidatePath("/student/clan");
    revalidatePath(`/student/clan/${membership.clan_id}`);
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

export async function requestJoinPublicClan(
  clanId: string
): Promise<
  { success: true; joined: boolean } | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can join." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.clanJoin,
      "join clan by id"
    );

    const cid = parseUUID(clanId);
    if (!cid.ok) return { success: false, error: "Invalid clan." };

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
      .select("id, join_mode, is_public")
      .eq("id", cid.id)
      .maybeSingle();

    if (!clan) {
      return { success: false, error: "Clan not found." };
    }
    if ((clan as { is_public?: boolean }).is_public === false) {
      return { success: false, error: "This clan is not open for discovery." };
    }

    const joinMode =
      ((clan as { join_mode?: string }).join_mode as "open" | "approval") ??
      "open";

    const { count } = await admin
      .from("clan_members")
      .select("user_id", { count: "exact", head: true })
      .eq("clan_id", cid.id);

    if ((count ?? 0) >= 20) {
      return { success: false, error: "This clan is full (20 members)." };
    }

    if (joinMode === "approval") {
      const { error: reqErr } = await admin.from("clan_join_requests").insert({
        clan_id: cid.id,
        user_id: user.id,
        status: "pending",
      });
      if (reqErr) {
        if (reqErr.code === "23505") {
          return {
            success: false,
            error: "You already have a pending request.",
          };
        }
        return { success: false, error: reqErr.message };
      }
      revalidatePath("/student/clan");
      revalidatePath(`/student/clan/${cid.id}`);
      return { success: true, joined: false };
    } else {
      const { error: memErr } = await admin.from("clan_members").insert({
        clan_id: cid.id,
        user_id: user.id,
        role: "member",
      });
      if (memErr) {
        return { success: false, error: memErr.message };
      }
    }

    revalidatePath("/student/clan");
    revalidatePath(`/student/clan/${cid.id}`);
    return { success: true, joined: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to join.",
    };
  }
}

export async function uploadClanAvatar(
  clanId: string,
  formData: FormData
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }

    const cid = parseUUID(clanId);
    if (!cid.ok) return { success: false, error: "Invalid clan." };

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.clanCreate,
      "clan avatar"
    );

    const admin = createAdminClient();
    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", cid.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can change the avatar." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size < 10) {
      return { success: false, error: "Choose an image file." };
    }
    assertNoBlockedLanguage(file.name, "avatar filename");
    if (file.size > 900_000) {
      return { success: false, error: "Image must be under 900 KB." };
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/webp"
            ? "webp"
            : null;
    if (!ext) {
      return { success: false, error: "Use PNG, JPEG, or WebP." };
    }

    const path = `${cid.id}/${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from("clan-avatars")
      .upload(path, buf, {
        contentType: file.type,
        upsert: true,
      });

    if (upErr) {
      return {
        success: false,
        error:
          upErr.message.includes("Bucket") || upErr.message.includes("not found")
            ? "Avatar storage is not configured yet."
            : upErr.message,
      };
    }

    const { data: pub } = admin.storage.from("clan-avatars").getPublicUrl(path);
    const url = pub.publicUrl;

    await admin
      .from("clans")
      .update({
        avatar_kind: "custom",
        avatar_url: url,
        avatar_preset_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cid.id);

    revalidatePath(`/student/clan/${cid.id}`);
    return { success: true, url };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

export async function setClanAvatarPreset(
  clanId: string,
  presetKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }

    const cid = parseUUID(clanId);
    if (!cid.ok) return { success: false, error: "Invalid clan." };

    const admin = createAdminClient();
    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", cid.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can change the avatar." };
    }

    const key = sanitizeString(presetKey).slice(0, 32);
    if (!key) {
      return { success: false, error: "Invalid preset." };
    }

    await admin
      .from("clans")
      .update({
        avatar_kind: "preset",
        avatar_preset_key: key,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cid.id);

    revalidatePath(`/student/clan/${cid.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed.",
    };
  }
}

export async function setClanFocusDivision(
  clanId: string,
  focusDivisionKey: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }

    const cid = parseUUID(clanId);
    if (!cid.ok) return { success: false, error: "Invalid clan." };

    const admin = createAdminClient();
    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", cid.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can change clan focus." };
    }

    const keyRaw = typeof focusDivisionKey === "string" ? sanitizeString(focusDivisionKey).trim() : "";
    const key = keyRaw.length > 0 ? keyRaw.slice(0, 64) : null;

    if (key) {
      const { data: divOk } = await admin
        .from("divisions")
        .select("key")
        .eq("key", key)
        .eq("active", true)
        .maybeSingle();

      if (!divOk) {
        return { success: false, error: "Pick a valid active division." };
      }
    }

    await admin
      .from("clans")
      .update({
        focus_division_key: key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cid.id);

    revalidatePath("/student/clan");
    revalidatePath(`/student/clan/${cid.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update focus.",
    };
  }
}
