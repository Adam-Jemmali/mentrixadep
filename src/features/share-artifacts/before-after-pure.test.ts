import { describe, expect, it } from "vitest";
import {
  beforeAfterShareNotificationBody,
  formatShareAccuracy,
  shouldCreateBeforeAfterShare,
} from "@/features/share-artifacts/before-after-pure";

describe("shouldCreateBeforeAfterShare", () => {
  it("requires delta of at least 15", () => {
    expect(shouldCreateBeforeAfterShare(14.9)).toBe(false);
    expect(shouldCreateBeforeAfterShare(15)).toBe(true);
  });
});

describe("beforeAfterShareNotificationBody", () => {
  it("is brief and factual", () => {
    expect(beforeAfterShareNotificationBody("Chain Rule", 37)).toBe(
      "You improved Chain Rule by 37 percentage points. One tap to share.",
    );
  });
});

describe("formatShareAccuracy", () => {
  it("rounds to whole percent", () => {
    expect(formatShareAccuracy(41.2)).toBe("41%");
  });
});
