import { describe, expect, it } from "vitest";
import {
  buildLoopClosureFunnel,
  lockedLoopPreviewCount,
} from "@/features/loop-report/loop-report-funnel-pure";
import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";

const baseRow: LoopReportRow = {
  id: "1",
  skillNodeId: "n1",
  nodeName: "Node",
  sourceType: "session",
  scheduledFor: new Date().toISOString(),
  completedAt: null,
  preAccuracy: null,
  postAccuracy: null,
  delta: null,
  isDue: false,
};

describe("buildLoopClosureFunnel", () => {
  it("counts scheduled, due, completed, and positive delta", () => {
    const funnel = buildLoopClosureFunnel([
      { ...baseRow, isDue: true },
      { ...baseRow, id: "2", completedAt: new Date().toISOString(), delta: 0.2 },
      { ...baseRow, id: "3", completedAt: new Date().toISOString(), delta: -0.1 },
    ]);

    expect(funnel).toEqual({
      scheduled: 3,
      due: 1,
      completed: 2,
      positiveDelta: 1,
    });
  });
});

describe("lockedLoopPreviewCount", () => {
  it("returns hidden row count for free preview", () => {
    expect(lockedLoopPreviewCount(12, 1)).toBe(11);
  });
});
