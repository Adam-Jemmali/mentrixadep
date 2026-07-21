import { describe, expect, it } from "vitest";
import {
  guideMasteryGridDrawerMessage,
  mentrixaDrawerMessage,
  questToolsDrawerMessage,
} from "@/shared/ui/drawer-messages-pure";

describe("drawer messages", () => {
  it("pairs quest tools verdict with next action", () => {
    const msg = questToolsDrawerMessage();
    expect(msg.title).toBe("Quest tools");
    expect(msg.verdict).toMatch(/first answer/i);
    expect(msg.nextAction).toMatch(/swipe/i);
  });

  it("includes student and course in guide context description", () => {
    const msg = guideMasteryGridDrawerMessage("Alex", "AP Calculus AB");
    expect(msg.title).toBe("Student context");
    expect(msg.description).toBe("Alex · AP Calculus AB");
    expect(msg.nextAction).toMatch(/target nodes/i);
  });

  it("falls back when mastery grid context is missing", () => {
    const msg = mentrixaDrawerMessage("guide_mastery_grid");
    expect(msg.description).toBe("Student · Course");
  });
});
