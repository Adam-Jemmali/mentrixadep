import { describe, expect, it } from "vitest";
import {
  canRenderUnlockBloom,
  canStartUnlockBloom,
} from "@/features/skill-tree/skill-tree-motion-pure";

describe("skill tree motion", () => {
  it("starts unlock bloom only when motion is allowed", () => {
    expect(canStartUnlockBloom(false, true, false)).toBe(true);
    expect(canStartUnlockBloom(false, true, true)).toBe(false);
    expect(canStartUnlockBloom(true, true, false)).toBe(false);
  });

  it("starts unlock bloom for an opened return highlight", () => {
    expect(canStartUnlockBloom(true, true, false, true)).toBe(true);
    expect(canStartUnlockBloom(true, true, true, true)).toBe(false);
  });

  it("stops rendering an active bloom when reduced motion becomes true", () => {
    expect(canRenderUnlockBloom(true, false)).toBe(true);
    expect(canRenderUnlockBloom(true, true)).toBe(false);
  });
});
