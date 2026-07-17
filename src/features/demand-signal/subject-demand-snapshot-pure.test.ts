import { describe, expect, it } from "vitest";
import {
  formatSubjectDemandRowLine,
  isDemandSnapshotStale,
} from "@/features/demand-signal/subject-demand-snapshot-pure";

describe("subject demand snapshot pure", () => {
  it("marks missing or old snapshots stale after one hour", () => {
    const now = new Date("2026-07-17T12:00:00.000Z");
    expect(isDemandSnapshotStale(null, now)).toBe(true);
    expect(isDemandSnapshotStale("2026-07-17T11:30:00.000Z", now)).toBe(false);
    expect(isDemandSnapshotStale("2026-07-17T10:59:00.000Z", now)).toBe(true);
  });

  it("keeps row copy brief", () => {
    expect(formatSubjectDemandRowLine("Chain Rule", 4)).toBe(
      "Chain Rule weak for 4 students",
    );
    expect(formatSubjectDemandRowLine("Limits", 1)).toBe(
      "Limits weak for 1 student",
    );
  });
});
