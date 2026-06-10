"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getCurrentUser } from "@/shared/core/auth";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import { REFERRAL_COOKIE_NAME } from "@/features/referrals/referral-constants";
import { getSiteUrl } from "@/shared/core/site";

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase().trim();
}

function hashIp(ip: string): string {
  const salt = process.env.REFERRAL_IP_SALT ?? "mentrixa-referral-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Public site URL for /auth/signup?ref= */
export async function getReferralInviteUrl(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("referral_code").eq("id", user.id).maybeSingle();
  const code = data?.referral_code;
  if (!code || typeof code !== "string") return null;
  const base = getSiteUrl();
  return `${base}/auth/signup?ref=${encodeURIComponent(code)}`;
}

export type ReferralListItem = {
  referredId: string;
  /** Redacted label for privacy */
  label: string;
  signedUpAt: string;
  status: "signed_up" | "booked_first_session";
  xpEarnedByReferrer: number;
};

export type ReferralDashboardData = {
  inviteUrl: string;
  referralCode: string;
  totalXpFromReferrals: number;
  referrals: ReferralListItem[];
};

/**
 * One-shot: attribute `referred_by` from cookie (OAuth / missed metadata), grant +100 welcome XP, clear cookie.
 * Idempotent when already attributed.
 */
export async function finalizeReferralAttribution(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("users")
    .select("referred_by, referral_flagged, referral_code")
    .eq("id", user.id)
    .maybeSingle();

  const store = await cookies();
  const cookieCode = store.get(REFERRAL_COOKIE_NAME)?.value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) ?? "";

  const { data: authRow } = await admin.auth.admin.getUserById(user.id);
  const myEmail = authRow?.user?.email ?? "";

  if (row?.referred_by) {
    await applyXpAward(user.id, XP.REFERRAL_WELCOME_SIGNUP, `referral_welcome:${user.id}`, null);
    store.delete(REFERRAL_COOKIE_NAME);
    return { ok: true };
  }

  if (!cookieCode || cookieCode.length !== 8) {
    return { ok: false };
  }

  if (cookieCode === row?.referral_code?.toUpperCase()) {
    store.delete(REFERRAL_COOKIE_NAME);
    return { ok: false };
  }

  const { data: referrer } = await admin
    .from("users")
    .select("id, referral_last_ip_hash")
    .eq("referral_code", cookieCode)
    .maybeSingle();

  if (!referrer?.id || referrer.id === user.id) {
    store.delete(REFERRAL_COOKIE_NAME);
    return { ok: false };
  }

  const { data: refAuth } = await admin.auth.admin.getUserById(referrer.id);
  const refEmail = refAuth?.user?.email ?? "";
  if (myEmail && refEmail && emailDomain(myEmail) === emailDomain(refEmail)) {
    await admin.from("users").update({ referral_flagged: true }).eq("id", user.id);
    store.delete(REFERRAL_COOKIE_NAME);
    return { ok: false };
  }

  const h = await getClientIpHash();
  if (h && referrer.referral_last_ip_hash && referrer.referral_last_ip_hash === h) {
    await admin.from("users").update({ referral_flagged: true }).eq("id", user.id);
    store.delete(REFERRAL_COOKIE_NAME);
    return { ok: false };
  }

  const { error: updErr } = await admin
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", user.id)
    .is("referred_by", null);

  if (!updErr && h) {
    await admin.from("users").update({ referral_last_ip_hash: h }).eq("id", referrer.id);
  }

  store.delete(REFERRAL_COOKIE_NAME);
  revalidatePath("/student", "layout");
  revalidatePath(`/student/${user.id}`, "layout");

  await applyXpAward(user.id, XP.REFERRAL_WELCOME_SIGNUP, `referral_welcome:${user.id}`, null);
  return { ok: true };
}

async function getClientIpHash(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  if (!raw) return null;
  return hashIp(raw);
}

export async function getReferralDashboardData(): Promise<ReferralDashboardData | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return null;

  const admin = createAdminClient();
  const [{ data: me }, inviteUrl] = await Promise.all([
    admin.from("users").select("referral_code").eq("id", user.id).maybeSingle(),
    getReferralInviteUrl(),
  ]);

  const code = me?.referral_code ?? "";
  if (!inviteUrl) return null;

  const { data: referredUsers } = await admin
    .from("users")
    .select("id, created_at")
    .eq("referred_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const ids = (referredUsers ?? []).map((r) => r.id);
  let rewards: { referred_id: string; reward_xp: number; reward_credited: boolean; created_at: string }[] = [];
  if (ids.length > 0) {
    const { data: rrows } = await admin
      .from("referral_rewards")
      .select("referred_id, reward_xp, reward_credited, created_at")
      .eq("referrer_id", user.id)
      .in("referred_id", ids);
    rewards = rrows ?? [];
  }

  const rewardByReferred = new Map(rewards.map((r) => [r.referred_id, r]));

  let totalXpFromReferrals = 0;
  for (const r of rewards) {
    if (r.reward_credited) totalXpFromReferrals += r.reward_xp;
  }

  const referredRows = referredUsers ?? [];
  const authResults = await Promise.all(
    referredRows.map((u) => admin.auth.admin.getUserById(u.id)),
  );

  const referrals: ReferralListItem[] = referredRows.map((u, i) => {
    const email = authResults[i]?.data?.user?.email ?? "";
    const local = email.split("@")[0] ?? "?";
    const domain = emailDomain(email);
    const label =
      local.length > 2 ? `${local.slice(0, 2)}···@${domain || "email"}` : `···@${domain || "email"}`;

    const rr = rewardByReferred.get(u.id);
    const booked = !!rr?.reward_credited;
    return {
      referredId: u.id,
      label,
      signedUpAt: u.created_at,
      status: booked ? ("booked_first_session" as const) : ("signed_up" as const),
      xpEarnedByReferrer: booked ? (rr?.reward_xp ?? XP.REFERRAL_FIRST_BOOKING) : 0,
    };
  });

  return {
    inviteUrl,
    referralCode: code,
    totalXpFromReferrals,
    referrals,
  };
}

