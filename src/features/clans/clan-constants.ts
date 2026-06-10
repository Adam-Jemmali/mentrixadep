/** Clan UX and weekly challenge defaults (server + client). */
export const CLAN_MAX_MEMBERS = 20;
export const CLAN_QUEST_CHALLENGE_TARGET = 20;
export const CLAN_QUEST_CHALLENGE_BONUS_XP = 2000;
export const CLAN_AVATAR_PRESETS = [
  "shield",
  "book",
  "flame",
  "trophy",
  "users",
  "zap",
] as const;

export type ClanAvatarPreset = (typeof CLAN_AVATAR_PRESETS)[number];
