export type LiveBoardEventType = "verified_attempt" | "rank_advance" | "breakthrough";

export type LiveBoardEventRow = {
  id: string;
  event_type: LiveBoardEventType;
  user_id: string;
  display_name: string;
  skill_node_id: string | null;
  node_name: string;
  unit_name: string;
  accuracy_pct: number | null;
  new_rank_tier: string | null;
  is_first_attempt: boolean;
  occurred_at: string;
};

export type ArenaLeaderRow = {
  userId: string;
  displayName: string;
  rankTier: string;
  rankLevel: number;
  accuracyPercent: number;
  verifiedCount: number;
};
