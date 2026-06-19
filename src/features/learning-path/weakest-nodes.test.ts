import { describe, expect, it } from "vitest";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

describe("getWeakestNodes integration guard", () => {
  it("only targets AP Calculus AB subjects", () => {
    expect(isApCalculusAbSubject("AP Calculus AB")).toBe(true);
    expect(isApCalculusAbSubject("Mathematics")).toBe(false);
  });
});
