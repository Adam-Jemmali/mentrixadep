import { AP_CALC_AB_DIVISION_NAME } from "@/features/divisions/ap-calc-ab-division";

function atMostFourWords(text: string): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
}

export function arenaLeaguePageTitle(): string {
  return atMostFourWords(`${AP_CALC_AB_DIVISION_NAME} league`);
}

export function arenaLeaguePageSubtitle(): string {
  return "Climb weekly verified XP";
}

export function arenaLeaguePanelEyebrow(): string {
  return "Weekly board";
}

export function arenaLeaguePanelHint(): string {
  return "Indigo outline marks focus";
}

export function arenaLeagueCardDescriptionFallback(): string {
  return "Climb the weekly board";
}
