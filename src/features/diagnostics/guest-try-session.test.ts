import { describe, expect, it } from "vitest";
import {
  buildGuestTrySessionPayload,
  openGuestTrySession,
  sealGuestTrySession,
  type GuestTrySessionPayload,
} from "@/features/diagnostics/guest-try-session";

const basePayload: Omit<GuestTrySessionPayload, "v" | "issuedAt" | "expiresAt"> = {
  itemId: "item-1",
  prompt: "Find the derivative.",
  stepSequence: [
    {
      step_number: 1,
      prompt: "Which rule?",
      options: ["Power rule", "Product rule"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: { "Product rule": "confuses product" },
    },
    {
      step_number: 2,
      prompt: "Apply it.",
      options: ["$6x$", "$3x$"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: { "$3x$": "drops power" },
    },
  ],
  skillNodeId: "node-1",
  nodeName: "Power rule",
  unitNumber: 2,
  unitName: "Differentiation",
};

describe("guest-try-session", () => {
  it("seals and opens a valid session token", () => {
    process.env.CRON_SECRET = "test-secret";
    const payload = buildGuestTrySessionPayload(basePayload);
    const token = sealGuestTrySession(payload);
    const opened = openGuestTrySession(token);
    expect(opened?.itemId).toBe("item-1");
    expect(opened?.stepSequence).toHaveLength(2);
  });

  it("rejects tampered tokens", () => {
    process.env.CRON_SECRET = "test-secret";
    const token = sealGuestTrySession(buildGuestTrySessionPayload(basePayload));
    const tampered = `${token}x`;
    expect(openGuestTrySession(tampered)).toBeNull();
  });
});
