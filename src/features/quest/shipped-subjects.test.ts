import { describe, expect, it } from "vitest";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  defaultShippedSubjectName,
  filterToShippedSubjects,
  isShippedSubject,
  isSingleShippedSubject,
  shippedSubjectCount,
} from "@/features/quest/shipped-subjects";
describe("shipped-subjects", () => {
  it("ships AP Calculus AB only today", () => {
    expect(shippedSubjectCount()).toBe(1);
    expect(isSingleShippedSubject()).toBe(true);
    expect(defaultShippedSubjectName()).toBe(AP_CALC_AB_SUBJECT);
  });

  it("recognizes shipped subject names", () => {
    expect(isShippedSubject("AP Calculus AB")).toBe(true);
    expect(isShippedSubject("PROB STATS")).toBe(false);
  });

  it("filters course lists to shipped subjects", () => {
    expect(filterToShippedSubjects(["AP Calculus AB", "PROB STATS", "General"])).toEqual([
      "AP Calculus AB",
    ]);
  });
});
