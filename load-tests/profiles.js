/**
 * Shared load-test profiles for Hobby / free CI.
 *
 * PROFILE=smoke  → cheap workflow_dispatch (default). Safe on Vercel Hobby.
 * PROFILE=full   → prompt targets. Run manually against staging when ready.
 *
 * At ~1k users on a single Vercel instance, smoke catches regressions;
 * full is for rare capacity checks, not every dispatch.
 */
export function resolveProfile(kind, env = __ENV) {
  const profile = String(env.PROFILE || "smoke").toLowerCase();
  const isFull = profile === "full" || profile === "stress";

  if (kind === "arena") {
    return {
      name: isFull ? "full" : "smoke",
      vus: Number(env.VUS || (isFull ? 200 : 8)),
      duration: env.DURATION || (isFull ? "5m" : "45s"),
      /** p95 time to first useful arena payload */
      p95Ms: Number(env.P95_MS || (isFull ? 1000 : 1500)),
    };
  }

  if (kind === "symbolic") {
    return {
      name: isFull ? "full" : "smoke",
      vus: Number(env.VUS || (isFull ? 50 : 5)),
      duration: env.DURATION || (isFull ? "3m" : "30s"),
      p95Ms: Number(env.P95_MS || (isFull ? 2000 : 2500)),
    };
  }

  throw new Error(`Unknown load profile kind: ${kind}`);
}
