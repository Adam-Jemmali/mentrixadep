import { describe, expect, it } from "vitest";
import {
  arenaAvatarAccent,
  arenaAvatarInitial,
  normalizeArenaAvatarUrl,
} from "@/features/live-board/live-board-avatar-pure";

describe("live board avatar pure", () => {
  it("derives stable initials from display name", () => {
    expect(arenaAvatarInitial("Trapdime")).toBe("T");
    expect(arenaAvatarInitial("Alex Kim")).toBe("AK");
  });

  it("normalizes avatar urls", () => {
    expect(normalizeArenaAvatarUrl("  https://x.test/p.jpg  ")).toBe("https://x.test/p.jpg");
    expect(normalizeArenaAvatarUrl("")).toBeNull();
  });

  it("picks deterministic accent colors per name", () => {
    const a = arenaAvatarAccent("Trapdime");
    const b = arenaAvatarAccent("Trapdime");
    const c = arenaAvatarAccent("Mentrixer");
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
