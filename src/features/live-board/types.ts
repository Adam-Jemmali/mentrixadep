import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";

/** Leaderboard row — same rank source as student hub (XP account rank). */
export type ArenaLeaderRow = ArenaLeaderProfile;

export type LiveBoardEventType = "verified_attempt" | "rank_advance" | "breakthrough";

export type LiveBoardEventRow = {
  id: string;
  event_type: LiveBoardEventType;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  skill_node_id: string | null;
  node_name: string;
  unit_name: string;
  accuracy_pct: number | null;
  new_rank_tier: string | null;
  is_first_attempt: boolean;
  occurred_at: string;
};
