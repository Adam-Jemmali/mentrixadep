import { describe, expect, it } from "vitest";
import {
  formatItemBankNextAction,
  formatItemBankVerdict,
  ITEM_BANK_MIN_APPROVED,
  ITEM_BANK_MIN_PER_NODE,
} from "@/features/quest/item-bank-constants";

describe("item bank coverage constants", () => {
  it("reports gap to minimum when under target", () => {
    const verdict = formatItemBankVerdict(100, 5);
    expect(verdict).toContain("100");
    expect(verdict).toContain(String(ITEM_BANK_MIN_APPROVED));
    expect(verdict).toContain(String(ITEM_BANK_MIN_APPROVED - 100));
  });

  it("reports per-node gaps when global minimum met", () => {
    const verdict = formatItemBankVerdict(ITEM_BANK_MIN_APPROVED, 2);
    expect(verdict).toContain("2 skill nodes");
    expect(verdict).toContain(String(ITEM_BANK_MIN_PER_NODE));
  });

  it("reports complete bank when thresholds met", () => {
    const verdict = formatItemBankVerdict(ITEM_BANK_MIN_APPROVED, 0);
    expect(verdict).toContain("live");
    expect(verdict).toContain(String(ITEM_BANK_MIN_PER_NODE));
  });

  it("suggests generate when incomplete", () => {
    expect(formatItemBankNextAction(0, 10)).toContain("item-bank:generate");
  });

  it("suggests maintenance when complete", () => {
    expect(formatItemBankNextAction(ITEM_BANK_MIN_APPROVED, 0)).toContain("refreshing");
  });
});
