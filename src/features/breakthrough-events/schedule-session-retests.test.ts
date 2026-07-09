import { describe, expect, it } from "vitest";
import {
  addStudioRetestDelay,
  formatStudioRetestConfirmationLine,
  isStudioRetestDue,
  resolveCoveredSkillNodeIds,
  STUDIO_RETEST_DELAY_MS,
  topicMatchesSkillNode,
} from "@/features/breakthrough-events/schedule-session-retests-pure";

const skillNodes = [
  { id: "a", node_name: "Chain rule", node_slug: "chain-rule" },
  { id: "b", node_name: "Limits at infinity", node_slug: "limits-at-infinity" },
];

describe("schedule-session-retests pure", () => {
  it("schedules retest forty-eight hours after publish", () => {
    const publishedAt = new Date("2026-06-01T12:00:00.000Z");
    const scheduled = addStudioRetestDelay(publishedAt);
    expect(scheduled.getTime() - publishedAt.getTime()).toBe(STUDIO_RETEST_DELAY_MS);
  });

  it("matches follow-up topics to skill nodes", () => {
    expect(topicMatchesSkillNode("chain rule practice", skillNodes[0]!)).toBe(true);
    expect(resolveCoveredSkillNodeIds(["a"], ["Limits at infinity"], skillNodes)).toEqual([
      "a",
      "b",
    ]);
  });

  it("treats missing schedule as due for legacy rows", () => {
    expect(isStudioRetestDue(null)).toBe(true);
    expect(isStudioRetestDue("2026-06-01T00:00:00.000Z", Date.parse("2026-06-02T00:00:00.000Z"))).toBe(
      true,
    );
    expect(isStudioRetestDue("2026-06-03T00:00:00.000Z", Date.parse("2026-06-02T00:00:00.000Z"))).toBe(
      false,
    );
  });

  it("formats the Studio publish confirmation line", () => {
    const line = formatStudioRetestConfirmationLine(
      "Alex",
      "2026-06-03T12:00:00.000Z",
      3,
      () => "Jun 3, 2026",
    );
    expect(line).toBe(
      "Retest scheduled for Alex on Jun 3, 2026 across 3 skills. Your impact score will update when it completes.",
    );
  });
});
