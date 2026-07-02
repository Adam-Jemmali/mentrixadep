export type BackgroundJobType =
  | "email.send"
  | "ai.studio_package"
  | "ai.brief"
  | "ai.transcription"
  | "payout.ledger"
  | "analytics.track"
  | "booking.fulfill";

export type BackgroundJobStatus = "queued" | "retry" | "processing" | "completed" | "failed";

export type BackgroundJobRow = {
  id: string;
  job_type: BackgroundJobType;
  idempotency_key: string;
  payload: Record<string, unknown>;
  status: BackgroundJobStatus;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  not_before: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailJobPayload = {
  template:
    | "session_reminder_tutor"
    | "session_reminder_student"
    | "pre_session_brief"
    | "progress_snapshot"
    | "movement_receipt"
    | "movement_receipt_monthly_rollup"
    | "credit_escalation"
    | "breakthrough_guide"
    | "raw";
  to: string;
  /** Template-specific data or raw email fields */
  data: Record<string, unknown>;
};

export type StudioPackageJobPayload = {
  sessionId: string;
};

export type BriefJobPayload = {
  sessionId: string;
  studentId: string;
  studentEmail: string;
  studentDisplayName: string | null;
  course: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sendEmail: boolean;
};

export type TranscriptionJobPayload = {
  recordingJobId: string;
};

export type PayoutLedgerJobPayload = {
  sessionId: string;
};

export type AnalyticsJobPayload = {
  eventName: string;
  userId?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
};

export type BookingFulfillJobPayload = {
  checkoutSessionId: string;
  userId: string;
};

export type ProcessJobsResult = {
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
};
