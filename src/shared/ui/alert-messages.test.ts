import { describe, expect, it } from "vitest";
import {
  practiceLockedAttemptAlertMessage,
  subscriptionAlertMessage,
  verifiedFirstAttemptAlertMessage,
} from "@/shared/ui/alert-messages-pure";

describe("alert messages", () => {
  it("states verified first attempt verdict and next action for onboarding", () => {
    const message = verifiedFirstAttemptAlertMessage("onboarding", "AP Calculus AB");
    expect(message.status).toBe("accent");
    expect(message.title).toContain("Verified first attempt");
    expect(message.nextAction).toContain("percentile");
  });

  it("states subscription success with confirmation next action", () => {
    const message = subscriptionAlertMessage("success");
    expect(message.status).toBe("success");
    expect(message.nextAction).toMatch(/activate|confirmation/i);
  });

  it("surfaces checkout errors with retry guidance", () => {
    const message = subscriptionAlertMessage("checkout_error", "Card declined");
    expect(message.status).toBe("danger");
    expect(message.description).toBe("Card declined");
    expect(message.nextAction).toMatch(/retry/i);
  });

  it("explains locked practice attempts without moving rank", () => {
    const message = practiceLockedAttemptAlertMessage();
    expect(message.status).toBe("warning");
    expect(message.nextAction).toMatch(/rank will not move/i);
  });
});
