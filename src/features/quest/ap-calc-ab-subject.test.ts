import { describe, expect, it } from "vitest";
import {
  AP_CALC_AB_SUBJECT,
  AP_CALC_AB_UNAVAILABLE_MESSAGE,
  isApCalculusAbSubject,
  normalizeNodeKey,
} from "@/features/quest/ap-calc-ab-subject";

describe("isApCalculusAbSubject", () => {
  it("matches AP Calculus AB exactly", () => {
    expect(isApCalculusAbSubject("AP Calculus AB")).toBe(true);
    expect(isApCalculusAbSubject("ap calculus ab")).toBe(true);
    expect(isApCalculusAbSubject("AP Calculus AB Division")).toBe(true);
  });

  it("rejects other subjects", () => {
    expect(isApCalculusAbSubject("AP Calculus BC")).toBe(false);
    expect(isApCalculusAbSubject("Mathematics")).toBe(false);
    expect(isApCalculusAbSubject("General")).toBe(false);
  });
});

describe("normalizeNodeKey", () => {
  it("slugifies node labels", () => {
    expect(normalizeNodeKey("Chain rule")).toBe("chain-rule");
    expect(normalizeNodeKey("L Hopital rule")).toBe("l-hopital-rule");
  });
});

describe("constants", () => {
  it("exposes unavailable message", () => {
    expect(AP_CALC_AB_SUBJECT).toBe("AP Calculus AB");
    expect(AP_CALC_AB_UNAVAILABLE_MESSAGE).toBe(
      "AP Calculus AB practice is being prepared for this topic. Check back shortly."
    );
  });
});
