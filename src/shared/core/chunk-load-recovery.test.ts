import { describe, expect, it, vi } from "vitest";
import { isChunkLoadError, reloadOnceOnChunkError } from "@/shared/core/chunk-load-recovery";

describe("chunk-load-recovery", () => {
  it("detects ChunkLoadError by name and message", () => {
    expect(isChunkLoadError(new Error("Loading chunk app/(app)/layout failed."))).toBe(true);
    const named = new Error("timeout");
    named.name = "ChunkLoadError";
    expect(isChunkLoadError(named)).toBe(true);
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Something else"))).toBe(false);
  });

  it("reloads once per cooldown window", () => {
    const reload = vi.fn();
    vi.stubGlobal("window", {
      location: { reload },
    } as unknown as Window);
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: vi.fn(),
    } as unknown as Storage);

    expect(reloadOnceOnChunkError()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    vi.stubGlobal("sessionStorage", {
      getItem: () => String(Date.now()),
      setItem: vi.fn(),
    } as unknown as Storage);
    expect(reloadOnceOnChunkError()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
