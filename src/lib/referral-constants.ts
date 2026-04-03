/** Cookie set by middleware when visiting with ?ref=CODE (also readable client-side for email signup). */
export const REFERRAL_COOKIE_NAME = "mentrixa_ref";
export const REFERRAL_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

/** Max completed referral payouts (referrer +500 XP) per referrer per calendar month. */
export const MAX_REFERRAL_REWARDS_PER_MONTH = 50;
