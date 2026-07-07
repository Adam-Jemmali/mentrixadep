import { describe, expect, it } from "vitest";
import {
  pickStudentHubDoNext,
  pickStudentHubMoreSteps,
} from "@/features/student-profile/student-hub-do-next-pure";

describe("pickStudentHubDoNext", () => {
  it("prefers playbook over queue", () => {
    const next = pickStudentHubDoNext({
      playbook: {
        rank: "retest_due",
        primary: {
          verdict: "Retest due.",
          label: "Start retest",
          href: "/student/quest",
          chips: { dreamOutcome: "", perceivedLikelihood: "", timeDelay: "", effort: "" },
          nextAction: "",
        },
      },
      queueItems: [{ kind: "session_credit", priority: 3, headline: "Credit", evidence: "", ctaHref: "/", ctaLabel: "Book" }],
      beatLine: null,
    });
    expect(next?.verdict).toBe("Retest due.");
  });
});

describe("pickStudentHubMoreSteps", () => {
  it("shows up to two queue rows when playbook owns do-next", () => {
    const items = pickStudentHubMoreSteps(
      [
        { kind: "retest_due", priority: 1, headline: "A", evidence: "", ctaHref: "/", ctaLabel: "Go" },
        { kind: "session_credit", priority: 3, headline: "B", evidence: "", ctaHref: "/", ctaLabel: "Book" },
      ],
      true,
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.headline).toBe("A");
  });
});
