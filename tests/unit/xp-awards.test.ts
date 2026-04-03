import { describe, expect, it, vi, beforeEach } from "vitest";
import { createApplyXpAdminMock } from "./helpers/supabase-xp-mock";
import { XP } from "@/lib/xp-constants";

const mockAdmin = createApplyXpAdminMock();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdmin,
}));

vi.mock("@/lib/division-week", () => ({
  getUtcWeekMondayString: () => "2025-01-06",
}));

import { applyXpAward } from "@/app/actions/xp";

describe("XP constants (product rules)", () => {
  it("uses expected amounts for session, rating, quest", () => {
    expect(XP.SESSION_COMPLETE).toBe(100);
    expect(XP.SESSION_RATE).toBe(50);
    expect(XP.QUEST_COMPLETE).toBe(75);
  });
});

describe("applyXpAward (mocked Supabase)", () => {
  const userId = "00000000-0000-4000-8000-000000000001";

  beforeEach(() => {
    mockAdmin.reset();
  });

  it("awards session-sized XP on first grant and updates total", async () => {
    const r = await applyXpAward(userId, XP.SESSION_COMPLETE, "session_complete:test-1", null);
    expect(r.awarded).toBe(true);
    expect(r.skipped).toBe(false);
    expect(r.totalXp).toBe(100);
    expect(mockAdmin.getUserXp()?.total_xp).toBe(100);
  });

  it("does not double-award the same award_key (idempotent)", async () => {
    const key = "session_complete:idem-1";
    const first = await applyXpAward(userId, XP.SESSION_COMPLETE, key, null);
    expect(first.awarded).toBe(true);
    const second = await applyXpAward(userId, XP.SESSION_COMPLETE, key, null);
    expect(second.awarded).toBe(false);
    expect(second.skipped).toBe(true);
    expect(second.totalXp).toBe(100);
  });

  it("rate-session amount matches XP.SESSION_RATE", async () => {
    const r = await applyXpAward(userId, XP.SESSION_RATE, "session_rate:xyz", null);
    expect(r.awarded).toBe(true);
    expect(r.totalXp).toBe(50);
  });

  it("quest completion amount matches XP.QUEST_COMPLETE", async () => {
    const r = await applyXpAward(userId, XP.QUEST_COMPLETE, "quest:done:1", null);
    expect(r.totalXp).toBe(75);
  });

  it("returns levelUp when crossing a level boundary", async () => {
    mockAdmin.setUserXp({
      total_xp: 95,
      streak_days: 0,
      last_activity_date: null,
      last_activity_at: null,
      division_xp: {},
    });
    const r = await applyXpAward(userId, 10, "boundary:test", null);
    expect(r.totalXp).toBe(105);
    expect(r.levelUp).toEqual({ fromLevel: 1, toLevel: 2, title: "Learner" });
  });
});
