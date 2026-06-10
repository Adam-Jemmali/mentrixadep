"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID } from "@/shared/core/security";

export async function approveJoinRequest(
  requestId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }
    const rid = parseUUID(requestId);
    if (!rid.ok) return { success: false, error: "Invalid request." };

    const admin = createAdminClient();
    const { data: req } = await admin
      .from("clan_join_requests")
      .select("id, clan_id, user_id, status")
      .eq("id", rid.id)
      .maybeSingle();

    if (!req || req.status !== "pending") {
      return { success: false, error: "Request not found." };
    }

    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", req.clan_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can approve." };
    }

    const { count } = await admin
      .from("clan_members")
      .select("user_id", { count: "exact", head: true })
      .eq("clan_id", req.clan_id as string);

    if ((count ?? 0) >= 20) {
      return { success: false, error: "Clan is full (20 members)." };
    }

    const { error: insErr } = await admin.from("clan_members").insert({
      clan_id: req.clan_id as string,
      user_id: req.user_id as string,
      role: "member",
    });

    if (insErr) {
      return { success: false, error: insErr.message };
    }

    await admin
      .from("clan_join_requests")
      .update({
        status: "approved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", rid.id);

    revalidatePath(`/student/clan/${req.clan_id as string}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed.",
    };
  }
}

export async function rejectJoinRequest(
  requestId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }
    const rid = parseUUID(requestId);
    if (!rid.ok) return { success: false, error: "Invalid request." };

    const admin = createAdminClient();
    const { data: req } = await admin
      .from("clan_join_requests")
      .select("clan_id, status")
      .eq("id", rid.id)
      .maybeSingle();

    if (!req || req.status !== "pending") {
      return { success: false, error: "Request not found." };
    }

    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", req.clan_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can reject." };
    }

    await admin
      .from("clan_join_requests")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", rid.id);

    revalidatePath(`/student/clan/${req.clan_id as string}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed.",
    };
  }
}

export async function listPendingJoinRequests(clanId: string) {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") return [];

  const id = parseUUID(clanId);
  if (!id.ok) return [];

  const admin = createAdminClient();
  const { data: mem } = await admin
    .from("clan_members")
    .select("role")
    .eq("clan_id", id.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mem?.role !== "leader") return [];

  const { data: rows } = await admin
    .from("clan_join_requests")
    .select("id, user_id, created_at")
    .eq("clan_id", id.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const uids = (rows ?? []).map((r) => r.user_id as string);
  if (uids.length === 0) return [];

  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", uids);

  const names = new Map(
    (settings ?? []).map((s) => [s.user_id, s.display_name as string | null])
  );

  return (rows ?? []).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    display_name: names.get(r.user_id as string) ?? null,
    created_at: r.created_at as string,
  }));
}

