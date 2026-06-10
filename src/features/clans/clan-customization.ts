"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  parseUUID,
  assertNoBlockedLanguage,
  sanitizeString,
} from "@/shared/core/security";

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

