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

