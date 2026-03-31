export type UserRole = "student" | "tutor" | "admin";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type SessionRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface User {
  id: string;
  role: UserRole;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegistrationRequest {
  id: string;
  email: string;
  role: "student" | "tutor";
  status: RegistrationStatus;
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
}

export interface SessionRequest {
  id: string;
  student_id: string;
  tutor_id: string;
  availability_id: string;
  status: SessionRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  student_id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: "scheduled" | "cancelled" | "completed";
  created_at: string;
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
}

export interface SessionAiPackage {
  session_id: string;
  summary: string | null;
  key_points: string[] | null;
  followup_quests: { prompt: string; difficulty: string }[];
  flashcards: { q: string; a: string }[];
  generated_by: string | null;
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
  updated_at: string;
}

/** Duel question — quiz MCQ, true/false, or flashcard-style (term → pick meaning). correctIndex hidden until completed. */
export interface SkillDuelQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Defaults to mcq when omitted (4 choices). */
  type?: "mcq" | "tf" | "flashcard";
}

export interface SkillDuel {
  id: string;
  student_id: string;
  opponent_student_id: string;
  /** Who created the pending challenge (opponent accepts). */
  initiator_id: string | null;
  division_key: string;
  status: "pending" | "active" | "completed" | "declined";
  questions: SkillDuelQuestion[];
  student_answers: number[] | null;
  opponent_answers: number[] | null;
  student_score: number | null;
  opponent_score: number | null;
  winner: "student" | "opponent" | "tie" | null;
  reward_amount_cents: number;
  /** How the duel was started: queue, clan, direct, or legacy null */
  match_source: "queue" | "clan" | "direct" | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  invite_code: string;
  leader_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClanMember {
  clan_id: string;
  user_id: string;
  role: "leader" | "member";
  joined_at: string;
}

export interface DuelQueueRow {
  user_id: string;
  division_key: string;
  queued_at: string;
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

