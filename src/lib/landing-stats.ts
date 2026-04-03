import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type LandingStatItem = {
  value: number;
  label: string;
  suffix?: string;
};

const FALLBACK_GRID: LandingStatItem[] = [
  { value: 500, label: "Expert Guides", suffix: "+" },
  { value: 2400, label: "Sessions delivered" },
  { value: 5, label: "Average rating", suffix: "★" },
  { value: 89, label: "Students improved", suffix: "%" },
];

function tickerFromGrid(grid: LandingStatItem[]): { v: string; l: string }[] {
  return grid.map((s) => {
    let v: string;
    if (s.suffix === "+") v = `${s.value.toLocaleString()}+`;
    else if (s.suffix === "★" || s.suffix?.endsWith("★")) v = `${Number(s.value).toFixed(1)}★`;
    else if (s.suffix === "%") v = `${Math.round(s.value)}%`;
    else v = s.value.toLocaleString();
    return { v, l: s.label };
  });
}

/** Avoid hanging forever on slow/blocked DB — `app/loading.tsx` would never resolve. */
const STATS_FETCH_TIMEOUT_MS = 4000;

async function loadLandingStatsFromDb(): Promise<{
  grid: LandingStatItem[];
  ticker: { v: string; l: string }[];
}> {
  const admin = createAdminClient();
  const [{ count: tutorCount }, { count: sessionCount }, avgRes] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }).eq("role", "tutor").eq("approved", true),
    admin.from("sessions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("ratings").select("rating").limit(2000),
  ]);

  const ratings = avgRes.data?.map((r) => r.rating) ?? [];
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 5;

  const guides = Math.max(500, tutorCount ?? 0);
  const sessions = Math.max(2400, sessionCount ?? 0);

  const grid: LandingStatItem[] = [
    { value: guides, label: "Expert Guides", suffix: "+" },
    { value: sessions, label: "Sessions delivered" },
    { value: Math.round(avgRating * 10) / 10, label: "Average rating", suffix: "★" },
    { value: 89, label: "Students improved", suffix: "%" },
  ];

  return { grid, ticker: tickerFromGrid(grid) };
}

async function loadLandingStats(): Promise<{
  grid: LandingStatItem[];
  ticker: { v: string; l: string }[];
}> {
  const fallback = () => ({ grid: FALLBACK_GRID, ticker: tickerFromGrid(FALLBACK_GRID) });
  try {
    const result = await Promise.race([
      loadLandingStatsFromDb(),
      new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), STATS_FETCH_TIMEOUT_MS);
      }),
    ]);
    if (result === "timeout") return fallback();
    return result;
  } catch {
    return fallback();
  }
}

const getLandingStatsCached = unstable_cache(loadLandingStats, ["landing-stats-v1"], {
  revalidate: 3600,
});

/** Production uses ISR cache; dev calls DB directly so HMR and `next dev` stay predictable. */
export async function getLandingStats() {
  if (process.env.NODE_ENV === "development") {
    return loadLandingStats();
  }
  return getLandingStatsCached();
}
