import { describe, expect, it } from "vitest";
import {
  arenaLeagueCardDescriptionFallback,
  arenaLeaguePageSubtitle,
  arenaLeaguePageTitle,
  arenaLeaguePanelHint,
} from "@/features/divisions/arena-hub-messages-pure";

const FOUR_WORD_MAX = /^\S+(?:\s+\S+){0,3}$/;

describe("arena hub messages", () => {
  it("keeps league hub copy at four words max", () => {
    for (const value of [
      arenaLeaguePageTitle(),
      arenaLeaguePageSubtitle(),
      arenaLeaguePanelHint(),
      arenaLeagueCardDescriptionFallback(),
    ]) {
      expect(value.trim()).toMatch(FOUR_WORD_MAX);
    }
    expect(arenaLeaguePageTitle()).toMatch(/AP Calculus AB/i);
    expect(arenaLeaguePageSubtitle()).toMatch(/verified XP/i);
  });
});
