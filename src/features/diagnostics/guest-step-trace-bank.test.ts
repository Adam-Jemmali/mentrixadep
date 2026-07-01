import { describe, expect, it } from "vitest";
import {
  GUEST_STEP_TRACE_BANK,
  pickGuestStepTraceBankEntry,
} from "@/features/diagnostics/guest-step-trace-bank";
import { parseStepTraceSequence } from "@/features/diagnostics/step-trace-types";

describe("guest-step-trace-bank", () => {
  it("ships at least eight reviewed offline problems", () => {
    expect(GUEST_STEP_TRACE_BANK.length).toBeGreaterThanOrEqual(8);
  });

  it("keeps every entry schema valid", () => {
    for (const entry of GUEST_STEP_TRACE_BANK) {
      expect(parseStepTraceSequence(entry.stepSequence)).not.toBeNull();
      expect(entry.prompt.trim().length).toBeGreaterThan(4);
      expect(entry.nodeSlug.trim().length).toBeGreaterThan(2);
    }
  });

  it("picks a random bank entry", () => {
    expect(pickGuestStepTraceBankEntry()).not.toBeNull();
  });
});
