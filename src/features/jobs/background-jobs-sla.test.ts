import { describe, expect, it } from "vitest";
import {
  BACKGROUND_JOB_MAX_LAG_MS,
  backgroundJobLagMs,
  isBackgroundJobWithinSla,
} from "@/features/jobs/background-jobs-sla-pure";

describe("background job worker SLA", () => {
  it("allows completion within 20 minutes of created_at", () => {
    const createdAt = "2026-07-11T12:00:00.000Z";
    const completedAt = "2026-07-11T12:18:00.000Z";
    expect(backgroundJobLagMs(createdAt, completedAt)).toBe(18 * 60 * 1000);
    expect(isBackgroundJobWithinSla(createdAt, completedAt)).toBe(true);
  });

  it("rejects completion lag beyond the 15-minute cron buffer", () => {
    const createdAt = "2026-07-11T12:00:00.000Z";
    const completedAt = "2026-07-11T12:25:00.000Z";
    expect(isBackgroundJobWithinSla(createdAt, completedAt)).toBe(false);
  });

  it("uses a 20-minute SLA window", () => {
    expect(BACKGROUND_JOB_MAX_LAG_MS).toBe(20 * 60 * 1000);
  });
});
