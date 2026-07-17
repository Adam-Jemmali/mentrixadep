/**
 * Minimal Supabase admin mock for `applyXpAward` (ledger + user_xp + achievements + analytics).
 */

export type MockUserXpRow = {
  total_xp: number;
  streak_days: number;
  last_activity_date: string | null;
  last_activity_at: string | null;
  division_xp: Record<string, number>;
};

export function createApplyXpAdminMock() {
  const ledger = new Set<string>();
  let userXp: MockUserXpRow | null = null;

  const api = {
    reset() {
      ledger.clear();
      userXp = null;
    },
    getLedgerKeys: () => [...ledger],
    getUserXp: () => userXp,
    setUserXp(row: MockUserXpRow | null) {
      userXp = row;
    },
    from(table: string) {
      if (table === "xp_award_ledger") {
        return {
          insert: async (row: { award_key: string }) => {
            if (ledger.has(row.award_key)) {
              return { error: { code: "23505", message: "duplicate key" } };
            }
            ledger.add(row.award_key);
            return { error: null };
          },
        };
      }
      if (table === "user_xp") {
        return {
          select: (_cols: string) => ({
            eq: (_c: string, _uid: string) => ({
              maybeSingle: async () => ({ data: userXp }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              if (userXp) {
                userXp = { ...userXp, ...patch } as MockUserXpRow;
              }
              return { error: null };
            },
          }),
          insert: async (row: Record<string, unknown>) => {
            userXp = {
              total_xp: row.total_xp as number,
              streak_days: row.streak_days as number,
              last_activity_date: row.last_activity_date as string | null,
              last_activity_at: row.last_activity_at as string | null,
              division_xp: (row.division_xp as Record<string, number>) ?? {},
            };
            return { error: null };
          },
        };
      }
      if (table === "user_achievements") {
        return {
          insert: async () => ({ error: null }),
        };
      }
      if (table === "analytics_events") {
        return {
          insert: async () => ({ error: null }),
        };
      }
      if (table === "division_weekly_xp") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        };
      }
      if (table === "security_events") {
        return {
          insert: async () => ({ error: null }),
        };
      }
      throw new Error(`Unexpected table in applyXp mock: ${table}`);
    },
  };
  return api;
}
