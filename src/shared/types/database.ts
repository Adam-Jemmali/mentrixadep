import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "student" | "tutor" | "admin";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type SessionRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface User {
  id: string;
  role: UserRole;
  status?: "pending" | "approved" | "suspended";
  approved: boolean;
  /** Unique 8-character code; generated on insert if omitted */
  referral_code: string;
  /** FK to the referring user, when this account was referred */
  referred_by: string | null;
  referral_flagged?: boolean;
  referral_last_ip_hash?: string | null;
  /** Legacy Stripe Connect Express connected account id (`acct_...`). */
  stripe_account_id?: string | null;
  /** Stripe Connect Express connected account id for test mode (`acct_...`). */
  stripe_account_id_test?: string | null;
  /** Stripe Connect Express connected account id for live mode (`acct_...`). */
  stripe_account_id_live?: string | null;
  stripe_payouts_enabled?: boolean;
  stripe_onboarding_at?: string | null;
  /** Guide teaching rank ladder (tutors only). */
  guide_rank?: string;
  guide_rank_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationRequest {
  id: string;
  email: string;
  role: "student" | "tutor";
  status: RegistrationStatus;
  /** Set when this email was tied to an auth account (signup or approve while user exists). */
  account_linked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  created_at: string;
  price_per_session?: number;
  active?: boolean;
  max_students?: number;
  series_id?: string | null;
}

export interface SessionRequest {
  id: string;
  student_id: string;
  tutor_id: string;
  availability_id: string;
  status: SessionRequestStatus;
  created_at: string;
  updated_at: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_refund_id?: string | null;
  /** Connect destination charge: net settled on connected account at charge time */
  stripe_destination_charge?: boolean | null;
}

export interface Session {
  id: string;
  student_id: string;
  tutor_id: string;
  availability_id?: string | null;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: "scheduled" | "cancelled" | "completed";
  created_at: string;
  price_per_session?: number | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_refund_id?: string | null;
  stripe_refund_reason?: string | null;
  platform_fee_cents?: number | null;
  /** Connect destination charge: funds split at PaymentIntent; no separate Transfer */
  stripe_destination_charge?: boolean | null;
  /** Set when status becomes cancelled */
  cancelled_at?: string | null;
  cancelled_by_role?: "student" | "tutor" | "admin" | null;
  /** Tutor hid this session from their Studio / history lists only (see supabase/057). */
  tutor_hidden_at?: string | null;
  /** Set when tutor removes the AI package; student must not see "pending" copy (see supabase/078). */
  studio_package_withdrawn_at?: string | null;
  /** Student hid this session from their history list only. */
  student_hidden_at?: string | null;
}

export interface Rating {
  id: string;
  session_id: string;
  student_id: string;
  tutor_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface VideoRoom {
  id: string;
  session_id: string;
  room_token: string;
  active: boolean;
  created_at: string;
  expires_at: string;
}

export interface CallParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: "student" | "tutor";
  joined_at: string;
  left_at: string | null;
}

export interface VideoRecording {
  id: string;
  session_id: string;
  room_id: string;
  tutor_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  duration_seconds: number | null;
  mime_type: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface Quest {
  id: string;
  creator_user_id: string | null;
  prompt: string;
  solution: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type UserQuestProgressStatus = "not_started" | "in_progress" | "completed";
export type UserQuestProgressMode = "coach" | "exam";

export interface UserQuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  status: UserQuestProgressStatus;
  mode: UserQuestProgressMode | null;
  num_attempts: number;
  last_attempt_at: string | null;
}

export interface UserXp {
  user_id: string;
  total_xp: number;
  division_xp: Record<string, unknown>;
  streak_days: number;
  last_activity_date: string | null;
  /** Last XP-eligible action (streak at-risk = 18h+) */
  last_activity_at?: string | null;
}

export interface XpAwardLedgerRow {
  id: string;
  user_id: string;
  award_key: string;
  xp_amount: number;
  created_at: string;
}

export interface UserAchievementRow {
  id: string;
  user_id: string;
  achievement_type: string;
  from_level: number | null;
  to_level: number | null;
  title: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface ProgressSnapshotDbRow {
  id: string;
  student_id: string;
  snapshot_data: Record<string, unknown>;
  generated_at: string;
  email_sent_at: string | null;
  clicked_at: string | null;
}

export interface GuideImpactScoreDbRow {
  id: string;
  guide_id: string;
  subject: string;
  impact_score: number;
  sessions_counted: number;
  last_calculated: string;
}

export interface GuideImpactNodeScoreDbRow {
  id: string;
  guide_id: string;
  skill_node_id: string;
  node_name: string;
  subject: string;
  impact_score: number;
  students_counted: number;
  after_accuracy: number;
  before_accuracy: number;
  impact_lift: number;
  last_calculated: string;
}

export interface GuideImpactHistoryDbRow {
  id: string;
  guide_id: string;
  subject: string;
  impact_score: number;
  recorded_at: string;
}

export interface SessionAiPackage {
  session_id: string;
  summary: string | null;
  key_points: string[] | null;
  followup_quests: { prompt: string; difficulty: string }[];
  flashcards: { q: string; a: string }[];
  /** Structured post-session practice (title + prompt + optional hint). */
  practice_exercises?: {
    title: string;
    prompt: string;
    hint?: string;
  }[] | null;
  follow_up_topics?: string[] | null;
  /** Tutor-initiated regenerations (max 3 per session). */
  studio_regenerate_count?: number;
  /** Learner-visible only when set (tutor can draft until publish). */
  package_published_at?: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionAiContext {
  session_id: string;
  tutor_id: string;
  chat_transcript: {
    authorId: string;
    authorLabel: string;
    text: string;
    sentAt: number;
  }[];
  whiteboard_summary: {
    drawEvents?: number;
    clearEvents?: number;
    byTool?: Record<string, number>;
    recentEvents?: Array<{ tool: string; at: number; source: "local" | "remote" }>;
  } | null;
  whiteboard_snapshot_data_url: string | null;
  screen_share_timeline: Array<{
    state: "start" | "end";
    at: number;
    actorId: string;
  }>;
  recording_hints: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecordingTranscriptionJob {
  id: string;
  session_id: string;
  recording_id: string;
  tutor_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  status: "queued" | "retry" | "processing" | "completed" | "failed";
  attempt_count: number;
  max_attempts: number;
  not_before: string;
  locked_at: string | null;
  locked_by: string | null;
  gemini_file_name: string | null;
  gemini_file_uri: string | null;
  transcript_excerpt: string | null;
  screen_share_summary: string | null;
  key_topics: string[];
  learner_questions: string[];
  last_error: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A subject-based community. Students accumulate XP per division.
 * `key` is used as the JSON key in user_xp.division_xp.
 */
export interface Division {
  id: string;
  key: string;       // slug, e.g. 'algorithms', 'calculus'
  name: string;      // display name, e.g. 'Algorithms Division'
  description: string | null;
  active: boolean;
  created_at: string;
}

/**
 * Maps a free-text course name (sessions.course) to a Division.
 * `course` is the primary key and must match sessions.course exactly.
 */
export interface CourseDivisionMap {
  course: string;       // e.g. 'Calculus'
  division_id: string;  // FK → divisions.id
}

export interface SystemSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface UserSettingsRow {
  user_id: string;
  display_name: string | null;
  /** Short public bio for student profile */
  bio: string | null;
  /** When false, profile is hidden from tutors (owner and admin still see). */
  profile_visible_to_tutors: boolean;
  /** Public URL for avatar (Supabase Storage). */
  avatar_url: string | null;
  timezone: string;
  email_session_reminders: boolean;
  email_session_booked: boolean;
  email_session_cancelled: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
  session_default_duration: number;
  session_buffer_minutes: number;
  /** Optional divisions.key — student leaderboard focus */
  focused_division_key: string | null;
  /** Student: allow skill duel challenges from peers */
  duel_opt_in: boolean;
  /** Public slug for mentrixa.one/rank/[username] */
  rank_card_username: string | null;
  /** When false, /rank/[username] shows a private notice */
  rank_card_public: boolean;
  updated_at: string;
}

/** Duel question — quiz MCQ, true/false, or flashcard-style (term → pick meaning). correctIndex hidden until completed. */
export interface SkillDuelQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Defaults to mcq when omitted (4 choices). */
  type?: "mcq" | "tf" | "flashcard";
  /** When set, duel loss schedules a closed-loop retest on this node. */
  skillNodeId?: string;
}

export interface SkillDuel {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  /** Who created the pending challenge (opponent accepts). */
  initiator_id: string | null;
  division_key: string;
  status: "pending" | "active" | "completed" | "declined" | "cancelled";
  questions: SkillDuelQuestion[];
  student_answers: number[] | null;
  opponent_answers: number[] | null;
  student_score: number | null;
  opponent_score: number | null;
  winner: "student" | "opponent" | "tie" | null;
  reward_amount_cents: number;
  /** How the duel was started */
  match_source: "queue" | "direct" | "ai_queue" | null;
  /** Simulated opponent (no human peer row) */
  is_ai_opponent: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  challenger_hidden_at: string | null;
  opponent_hidden_at: string | null;
  /** Set when student_id accepts a queue / ai_queue match preview. */
  student_ready_at: string | null;
  /** Set when opponent accepts, or when the sparring bot is ready. */
  opponent_ready_at: string | null;
}

export interface DuelQueueRow {
  user_id: string;
  division_key: string;
  queued_at: string;
  queue_level: number;
}

export interface TutorCourse {
  id: string;
  tutor_id: string;
  course_name: string;
  proof_description: string;
  verified: boolean;
  created_at: string;
}

export interface StudentCourse {
  id: string;
  student_id: string;
  course_name: string;
  created_at: string;
}

// ─── Referrals (public.users referral columns + referral_rewards) ───────────

/**
 * Referral identity and chain fields on `public.users` (no separate `referrals` table).
 * Matches `users.id`, `users.referral_code`, `users.referred_by`.
 */
export interface Referral {
  id: string;
  referral_code: string;
  referred_by: string | null;
}

/** Ledger row for XP rewards earned through referrals. */
export interface UserDivisionRow {
  user_id: string;
  division_key: string;
  joined_at: string;
}

export interface DivisionWeeklyXpRow {
  user_id: string;
  division_key: string;
  week_start: string;
  xp_earned: number;
  updated_at: string;
}

export interface DivisionMessageRow {
  id: string;
  division_key: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface DivisionWinnerRow {
  id: string;
  week_start: string;
  division_key: string;
  rank: number;
  user_id: string;
  weekly_xp: number;
  bonus_xp: number;
  created_at: string;
}

export interface BreakthroughEventRow {
  id: string;
  student_id: string;
  subject: string;
  concept: string;
  accuracy_before: number;
  accuracy_after: number;
  session_id: string | null;
  triggered_by: "quest" | "session" | "duel";
  detected_at: string;
  shared_at: string | null;
}

export interface BreakthroughQuestQueueRow {
  id: string;
  breakthrough_event_id: string;
  student_id: string;
  subject: string;
  topic: string;
  target_subtopic: string;
  sort_order: number;
  quest_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DivisionWarRow {
  id: string;
  division_a_id: string;
  division_b_id: string;
  subject: string;
  week_start: string;
  week_end: string;
  status: "active" | "completed";
  winner_division_id: string | null;
  created_at: string;
}

export interface DivisionWarContributionRow {
  id: string;
  war_id: string;
  student_id: string;
  division_id: string;
  quests_completed: number;
  total_accuracy_points: number;
  last_updated: string;
}

export interface DivisionWarBadgeRow {
  id: string;
  user_id: string;
  war_id: string;
  division_id: string;
  division_name: string;
  expires_at: string;
  created_at: string;
}

/** Web Push subscription (VAPID) per device endpoint. */
export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSubmissionRow {
  id: string;
  user_id: string;
  user_role: UserRole | null;
  message: string;
  page_path: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ReferralReward {
  id: string;
  referrer_id: string;
  referred_id: string;
  reward_xp: number;
  reward_credited: boolean;
  created_at: string;
}

/** Supabase `referral_rewards` row type (alias for `ReferralReward`). */
export type ReferralRewardRow = ReferralReward;

export type ReferralRewardInsert = Omit<ReferralReward, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type ReferralRewardUpdate = Partial<ReferralReward>;

/**
 * A `users` row with the optional referring user joined via `referred_by`
 * (shape returned by `referralWithUserQuery`).
 */
export interface ReferralWithUser extends User {
  referrer: User | null;
}

/**
 * A `referral_rewards` row with both FK `users` rows joined
 * (shape returned by `referralRewardsWithUsersQuery`).
 */
export type ReferralRewardWithUsers = ReferralReward & {
  referrer: User;
  referred: User;
};

/** Subset of `users` columns repeated in referral join selects. */
export const REFERRAL_USER_COLUMNS =
  "id, role, approved, created_at, updated_at, referral_code, referred_by" as const;

/** Select `referral_rewards` with `referrer` and `referred` `users` joined. */
export const REFERRAL_REWARDS_WITH_USERS_SELECT = `
  *,
  referrer:users!referrer_id (${REFERRAL_USER_COLUMNS}),
  referred:users!referred_id (${REFERRAL_USER_COLUMNS})
` as const;

/** Select `users` with the referring `users` row joined via `referred_by`. */
export const USERS_WITH_REFERRER_SELECT = `
  *,
  referrer:users!referred_by (${REFERRAL_USER_COLUMNS})
` as const;

/**
 * Typed query builder: `referral_rewards` with both related users.
 * Narrow `data` with `ReferralRewardWithUsers[]` after the request resolves.
 */
export function referralRewardsWithUsersQuery(client: SupabaseClient<Database>) {
  return client.from("referral_rewards").select(REFERRAL_REWARDS_WITH_USERS_SELECT);
}

/**
 * Typed query builder: `users` with optional `referrer` (parent user in the referral chain).
 * Narrow `data` with `ReferralWithUser[]` after the request resolves.
 */
export function referralWithUserQuery(client: SupabaseClient<Database>) {
  return client.from("users").select(USERS_WITH_REFERRER_SELECT);
}

export type UserInsert = Omit<User, "created_at" | "updated_at" | "referral_code" | "referred_by"> & {
  created_at?: string;
  updated_at?: string;
  referral_code?: string;
  referred_by?: string | null;
};

export type UserUpdate = Partial<Omit<User, "id">>;

// ─── Supabase Database (for `createClient<Database>()`) ────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      registration_requests: {
        Row: RegistrationRequest;
        Insert: Omit<RegistrationRequest, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<RegistrationRequest>;
      };
      availability: {
        Row: Availability;
        Insert: Omit<Availability, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Availability>;
      };
      session_requests: {
        Row: SessionRequest;
        Insert: Omit<SessionRequest, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SessionRequest>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Session>;
      };
      ratings: {
        Row: Rating;
        Insert: Omit<Rating, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Rating>;
      };
      video_rooms: {
        Row: VideoRoom;
        Insert: Omit<VideoRoom, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<VideoRoom>;
      };
      call_participants: {
        Row: CallParticipant;
        Insert: Omit<CallParticipant, "id" | "joined_at"> & { id?: string; joined_at?: string };
        Update: Partial<CallParticipant>;
      };
      video_recordings: {
        Row: VideoRecording;
        Insert: Omit<VideoRecording, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<VideoRecording>;
      };
      quests: {
        Row: Quest;
        Insert: Omit<Quest, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Quest>;
      };
      user_quest_progress: {
        Row: UserQuestProgress;
        Insert: Omit<UserQuestProgress, "id"> & { id?: string };
        Update: Partial<UserQuestProgress>;
      };
      user_xp: {
        Row: UserXp;
        Insert: Omit<UserXp, "total_xp" | "division_xp" | "streak_days"> & {
          total_xp?: number;
          division_xp?: Record<string, unknown>;
          streak_days?: number;
          last_activity_at?: string | null;
        };
        Update: Partial<UserXp>;
      };
      xp_award_ledger: {
        Row: XpAwardLedgerRow;
        Insert: Omit<XpAwardLedgerRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<XpAwardLedgerRow>;
      };
      user_achievements: {
        Row: UserAchievementRow;
        Insert: Omit<UserAchievementRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<UserAchievementRow>;
      };
      progress_snapshots: {
        Row: ProgressSnapshotDbRow;
        Insert: Omit<ProgressSnapshotDbRow, "id" | "generated_at" | "email_sent_at" | "clicked_at"> & {
          id?: string;
          generated_at?: string;
          email_sent_at?: string | null;
          clicked_at?: string | null;
        };
        Update: Partial<ProgressSnapshotDbRow>;
      };
      guide_impact_scores: {
        Row: GuideImpactScoreDbRow;
        Insert: Omit<GuideImpactScoreDbRow, "id" | "last_calculated"> & {
          id?: string;
          last_calculated?: string;
        };
        Update: Partial<GuideImpactScoreDbRow>;
      };
      guide_impact_node_scores: {
        Row: GuideImpactNodeScoreDbRow;
        Insert: Omit<GuideImpactNodeScoreDbRow, "id" | "last_calculated"> & {
          id?: string;
          last_calculated?: string;
        };
        Update: Partial<GuideImpactNodeScoreDbRow>;
      };
      guide_impact_history: {
        Row: GuideImpactHistoryDbRow;
        Insert: Omit<GuideImpactHistoryDbRow, "id"> & { id?: string };
        Update: Partial<GuideImpactHistoryDbRow>;
      };
      session_ai_packages: {
        Row: SessionAiPackage;
        Insert: Omit<SessionAiPackage, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SessionAiPackage>;
      };
      session_ai_context: {
        Row: SessionAiContext;
        Insert: Omit<SessionAiContext, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SessionAiContext>;
      };
      session_recording_transcription_jobs: {
        Row: SessionRecordingTranscriptionJob;
        Insert: Omit<
          SessionRecordingTranscriptionJob,
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SessionRecordingTranscriptionJob>;
      };
      divisions: {
        Row: Division;
        Insert: Omit<Division, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Division>;
      };
      course_division_map: {
        Row: CourseDivisionMap;
        Insert: CourseDivisionMap;
        Update: Partial<CourseDivisionMap>;
      };
      system_settings: {
        Row: SystemSetting;
        Insert: Omit<SystemSetting, "updated_at"> & { updated_at?: string };
        Update: Partial<SystemSetting>;
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Omit<UserSettingsRow, "updated_at"> & { updated_at?: string };
        Update: Partial<UserSettingsRow>;
      };
      skill_duels: {
        Row: SkillDuel;
        Insert: Omit<SkillDuel, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SkillDuel>;
      };
      duel_queue: {
        Row: DuelQueueRow;
        Insert: DuelQueueRow;
        Update: Partial<DuelQueueRow>;
      };
      tutor_courses: {
        Row: TutorCourse;
        Insert: Omit<TutorCourse, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<TutorCourse>;
      };
      student_courses: {
        Row: StudentCourse;
        Insert: Omit<StudentCourse, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<StudentCourse>;
      };
      referral_rewards: {
        Row: ReferralRewardRow;
        Insert: ReferralRewardInsert;
        Update: ReferralRewardUpdate;
      };
      user_divisions: {
        Row: UserDivisionRow;
        Insert: Omit<UserDivisionRow, "joined_at"> & { joined_at?: string };
        Update: Partial<UserDivisionRow>;
      };
      division_weekly_xp: {
        Row: DivisionWeeklyXpRow;
        Insert: Omit<DivisionWeeklyXpRow, "updated_at"> & { updated_at?: string };
        Update: Partial<DivisionWeeklyXpRow>;
      };
      division_messages: {
        Row: DivisionMessageRow;
        Insert: Omit<DivisionMessageRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<DivisionMessageRow>;
      };
      division_winners: {
        Row: DivisionWinnerRow;
        Insert: Omit<DivisionWinnerRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<DivisionWinnerRow>;
      };
      breakthrough_events: {
        Row: BreakthroughEventRow;
        Insert: Omit<
          BreakthroughEventRow,
          "id" | "detected_at" | "shared_at" | "triggered_by" | "session_id"
        > & {
          id?: string;
          session_id?: string | null;
          triggered_by?: "quest" | "session" | "duel";
          detected_at?: string;
          shared_at?: string | null;
        };
        Update: Partial<BreakthroughEventRow>;
      };
      breakthrough_quest_queue: {
        Row: BreakthroughQuestQueueRow;
        Insert: Omit<
          BreakthroughQuestQueueRow,
          "id" | "created_at" | "quest_id" | "completed_at"
        > & {
          id?: string;
          quest_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<BreakthroughQuestQueueRow>;
      };
      division_wars: {
        Row: DivisionWarRow;
        Insert: Omit<DivisionWarRow, "id" | "created_at" | "status" | "winner_division_id"> & {
          id?: string;
          status?: "active" | "completed";
          winner_division_id?: string | null;
          created_at?: string;
        };
        Update: Partial<DivisionWarRow>;
      };
      division_war_contributions: {
        Row: DivisionWarContributionRow;
        Insert: Omit<DivisionWarContributionRow, "id" | "last_updated"> & {
          id?: string;
          last_updated?: string;
        };
        Update: Partial<DivisionWarContributionRow>;
      };
      division_war_badges: {
        Row: DivisionWarBadgeRow;
        Insert: Omit<DivisionWarBadgeRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<DivisionWarBadgeRow>;
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Omit<PushSubscriptionRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PushSubscriptionRow>;
      };
      feedback_submissions: {
        Row: FeedbackSubmissionRow;
        Insert: Omit<FeedbackSubmissionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FeedbackSubmissionRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// ─── Security events ───────────────────────────────────────────────────────────

export interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Institution B2B ──────────────────────────────────────────────────────────

export type InstitutionPlan = "free" | "basic" | "pro";

export interface Institution {
  id: string;
  name: string;
  domain: string;
  admin_user_id: string | null;
  plan: InstitutionPlan;
  session_credits: number;
  logo_url: string | null;
  negotiated_rate_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface InstitutionMember {
  institution_id: string;
  user_id: string;
  role: "student" | "admin";
  added_at: string;
}

