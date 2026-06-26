import { describe, expect, it } from "vitest";
import {
  cancelBookingConfirmMessage,
  clearAvatarConfirmMessage,
} from "@/shared/ui/alert-dialog-messages-pure";

describe("alert dialog messages", () => {
  it("states cancel booking verdict and refund next action when eligible", () => {
    const message = cancelBookingConfirmMessage(true);
    expect(message.status).toBe("warning");
    expect(message.title).toMatch(/cancel/i);
    expect(message.nextAction).toMatch(/refund/i);
    expect(message.confirmLabel).toBe("Cancel session");
  });

  it("warns when refund may not apply", () => {
    const message = cancelBookingConfirmMessage(false);
    expect(message.nextAction).toMatch(/refund eligibility/i);
  });

  it("states clear avatar verdict without touching rank", () => {
    const message = clearAvatarConfirmMessage();
    expect(message.status).toBe("warning");
    expect(message.nextAction).toMatch(/rank/i);
    expect(message.confirmLabel).toBe("Remove photo");
  });
});
