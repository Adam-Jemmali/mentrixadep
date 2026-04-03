import { createAdminClient } from "@/lib/supabase/admin";

/** Completed referral reward rows this UTC month for the referrer (for XP cap). */
export async function countReferralRewardsThisMonth(referrerId: string): Promise<number> {
  const admin = createAdminClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await admin
    .from("referral_rewards")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("reward_credited", true)
    .gte("created_at", start.toISOString());

  if (error) return 0;
  return count ?? 0;
}
