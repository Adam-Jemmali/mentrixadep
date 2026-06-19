import { describe, expect, it } from "vitest";
import {
  isGuaranteeEvaluationReady,
  preSessionWasNotCorrect,
  shouldRefundAccuracyGuarantee,
} from "@/features/breakthrough-events/post-session-retest";

describe("post-session retest guarantee helpers", () => {
  it("treats null and false pre-session as not correct", () => {
    expect(preSessionWasNotCorrect(null)).toBe(true);
    expect(preSessionWasNotCorrect(false)).toBe(true);
    expect(preSessionWasNotCorrect(true)).toBe(false);
  });

  it("evaluates guarantee when all post results are set", () => {
    const ready = isGuaranteeEvaluationReady(
      [
        { post_session_correct: true },
        { post_session_correct: false },
        { post_session_correct: true },
      ],
      "2026-01-01T00:00:00.000Z",
      Date.parse("2026-01-02T00:00:00.000Z")
    );
    expect(ready).toBe(true);
  });

  it("evaluates guarantee after seven days when posts are incomplete", () => {
    const end = "2026-01-01T00:00:00.000Z";
    const before = Date.parse("2026-01-07T23:59:59.000Z");
    const after = Date.parse("2026-01-08T00:00:00.000Z");
    const targets = [
      { post_session_correct: true },
      { post_session_correct: null },
      { post_session_correct: false },
    ];
    expect(isGuaranteeEvaluationReady(targets, end, before)).toBe(false);
    expect(isGuaranteeEvaluationReady(targets, end, after)).toBe(true);
  });

  it("refunds when no pre-gap nodes improved post-session", () => {
    const refund = shouldRefundAccuracyGuarantee([
      { pre_session_correct: false, post_session_correct: false },
      { pre_session_correct: null, post_session_correct: false },
      { pre_session_correct: true, post_session_correct: true },
    ]);
    expect(refund).toBe(true);
  });

  it("does not refund when at least one pre-gap node improved", () => {
    const refund = shouldRefundAccuracyGuarantee([
      { pre_session_correct: false, post_session_correct: true },
      { pre_session_correct: null, post_session_correct: false },
      { pre_session_correct: true, post_session_correct: true },
    ]);
    expect(refund).toBe(false);
  });

  it("does not refund when every node was already correct pre-session", () => {
    const refund = shouldRefundAccuracyGuarantee([
      { pre_session_correct: true, post_session_correct: false },
      { pre_session_correct: true, post_session_correct: false },
      { pre_session_correct: true, post_session_correct: false },
    ]);
    expect(refund).toBe(false);
  });
});
