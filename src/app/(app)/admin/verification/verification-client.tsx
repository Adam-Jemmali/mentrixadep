"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  approveVerification,
  rejectVerification,
  blacklistUser,
  requestVerificationInfo,
  startVerificationReview,
  type VerificationRecord,
  type VerificationStatus,
} from "@/features/verification/verification-queue";

interface VerificationStats {
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  blacklisted: number;
  infoRequested: number;
  overdue: number;
}

interface VerificationClientProps {
  initialQueue: VerificationRecord[];
  stats: VerificationStats;
  currentAdminId: string;
}

type ActiveModal =
  | { type: "approve"; record: VerificationRecord }
  | { type: "reject"; record: VerificationRecord }
  | { type: "blacklist"; record: VerificationRecord }
  | { type: "info"; record: VerificationRecord }
  | { type: "detail"; record: VerificationRecord }
  | null;

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  in_review: {
    label: "In Review",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
  },
  blacklisted: {
    label: "Blacklisted",
    color: "text-slate-900",
    bg: "bg-slate-100 border-slate-300",
    dot: "bg-slate-700",
  },
  info_requested: {
    label: "Info Needed",
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.bg} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CountdownBadge({
  hoursRemaining,
  isOverdue,
  status,
}: {
  hoursRemaining: number;
  isOverdue: boolean;
  status: VerificationStatus;
}) {
  const active = ["pending", "in_review", "info_requested"].includes(status);
  if (!active) return null;
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 border border-red-200 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Overdue
      </span>
    );
  }
  const urgent = hoursRemaining <= 4;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
        urgent
          ? "bg-orange-50 border-orange-200 text-orange-600"
          : "bg-slate-50 border-slate-200 text-slate-500"
      }`}
    >
      {hoursRemaining}h left
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col gap-0.5">
      <span className={`text-2xl font-semibold tracking-tight ${accent ?? "text-slate-900"}`}>
        {value}
      </span>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}

function formatVerificationDate(input: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(input));
}

// ─── Modal components ─────────────────────────────────────────────────────────

function ModalBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      onClick={onClose}
    />
  );
}

function ModalContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-900/10 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ApproveModal({
  record,
  onClose,
  onDone,
}: {
  record: VerificationRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    startTransition(async () => {
      try {
        await approveVerification({ verificationId: record.id, adminNotes: notes });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve");
      }
    });
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <ModalContainer>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Approve verification</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {record.user_email} · {record.role}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Internal notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note for the audit trail..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-700 placeholder:text-slate-300"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="px-4 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {isPending ? "Approving..." : "Approve & notify"}
          </button>
        </div>
      </ModalContainer>
    </>
  );
}

function RejectModal({
  record,
  onClose,
  onDone,
}: {
  record: VerificationRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }
    startTransition(async () => {
      try {
        await rejectVerification({ verificationId: record.id, reason, adminNotes: notes });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject");
      }
    });
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <ModalContainer>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Reject verification</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {record.user_email} · {record.role}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why verification failed — this is sent to the user..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 text-slate-700 placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Internal notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Private notes for the audit trail..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder:text-slate-300"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="px-4 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {isPending ? "Rejecting..." : "Reject & notify"}
          </button>
        </div>
      </ModalContainer>
    </>
  );
}

function BlacklistModal({
  record,
  onClose,
  onDone,
}: {
  record: VerificationRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!confirm) {
      setError("You must confirm this action");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }
    startTransition(async () => {
      try {
        await blacklistUser({ verificationId: record.id, reason });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to blacklist");
      }
    });
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <ModalContainer>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Blacklist account</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {record.user_email} · This is permanent and cannot be undone from the UI.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 font-medium">
              The user will be permanently suspended, notified by email, and blocked from re-registering.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Reason for blacklist <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe the fraudulent or fake information found..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-slate-700 placeholder:text-slate-300"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            <span className="text-xs text-slate-600">
              I confirm this account contains false or fraudulent information and should be permanently blacklisted
            </span>
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending || !confirm}
            className="px-4 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-40"
          >
            {isPending ? "Processing..." : "Blacklist account"}
          </button>
        </div>
      </ModalContainer>
    </>
  );
}

function InfoRequestModal({
  record,
  onClose,
  onDone,
}: {
  record: VerificationRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (message.trim().length < 10) {
      setError("Message must be at least 10 characters");
      return;
    }
    startTransition(async () => {
      try {
        await requestVerificationInfo({ verificationId: record.id, message });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send request");
      }
    });
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <ModalContainer>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Request information</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            This message will be emailed to {record.user_email}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              What do you need? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="e.g. Please provide a government-issued ID and proof of teaching credentials..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-slate-700 placeholder:text-slate-300"
            />
          </div>
          <p className="text-xs text-slate-400">
            The user retains full app access while awaiting their response. Status will change to &quot;Info Needed&quot;.
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="px-4 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Send request"}
          </button>
        </div>
      </ModalContainer>
    </>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────────

function VerificationRow({
  record,
  onModal,
  onStartReview,
  isSelf,
}: {
  record: VerificationRecord;
  onModal: (modal: ActiveModal) => void;
  onStartReview: (id: string) => void;
  isSelf: boolean;
}) {
  const isActive = ["pending", "in_review", "info_requested"].includes(record.status);
  const userName = record.user_display_name
    ? `${record.user_display_name}`
    : record.user_email?.split("@")[0] ?? "—";

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors group">
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900 leading-snug">{userName}</span>
          <span className="text-xs text-slate-400 font-mono">{record.user_email ?? "—"}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
            record.role === "tutor"
              ? "bg-blue-50 border border-blue-200 text-blue-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}
        >
          {record.role === "tutor" ? "Guide" : "Learner"}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          <StatusBadge status={record.status as VerificationStatus} />
          {isActive && (
            <CountdownBadge
              hoursRemaining={record.hours_remaining ?? 0}
              isOverdue={record.is_overdue ?? false}
              status={record.status as VerificationStatus}
            />
          )}
        </div>
      </td>
      <td className="py-3 px-4 font-mono text-xs text-slate-400">
        {formatVerificationDate(record.submitted_at)}
      </td>
      <td className="py-3 px-4">
        {isSelf ? (
          <span className="text-xs text-slate-500 font-medium">Your account</span>
        ) : isActive ? (
          <div className="flex items-center gap-1.5">
            {record.status === "pending" && (
              <button
                onClick={() => onStartReview(record.id)}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                Review
              </button>
            )}
            <button
              onClick={() => onModal({ type: "approve", record })}
              className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onModal({ type: "info", record })}
              className="px-2.5 py-1 text-[11px] font-medium bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-md transition-colors"
            >
              Ask info
            </button>
            <button
              onClick={() => onModal({ type: "reject", record })}
              className="px-2.5 py-1 text-[11px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => onModal({ type: "blacklist", record })}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-700 text-white rounded-md transition-colors"
            >
              Ban
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {record.outcome_reason && (
              <button
                onClick={() => onModal({ type: "detail", record })}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                View reason
              </button>
            )}
            {record.status === "approved" && (
              <span className="text-xs text-emerald-600 font-medium">✓ Verified</span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  record,
  onClose,
}: {
  record: VerificationRecord;
  onClose: () => void;
}) {
  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <ModalContainer>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Verification details</h3>
          <p className="text-xs text-slate-400 mt-0.5">{record.user_email}</p>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Role</span>
              <span className="font-medium text-slate-900 capitalize">{record.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Status</span>
              <StatusBadge status={record.status as VerificationStatus} />
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Submitted</span>
              <span className="font-medium text-slate-700">
                {new Date(record.submitted_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Deadline</span>
              <span className="font-medium text-slate-700">
                {new Date(record.deadline_at).toLocaleString()}
              </span>
            </div>
            {record.reviewed_at && (
              <div>
                <span className="text-slate-400 block mb-0.5">Reviewed at</span>
                <span className="font-medium text-slate-700">
                  {new Date(record.reviewed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          {record.outcome_reason && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-400 block mb-1">Outcome reason</span>
              <p className="text-sm text-slate-700">{record.outcome_reason}</p>
            </div>
          )}
          {record.admin_notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-400 block mb-1">Admin notes</span>
              <p className="text-sm text-slate-700">{record.admin_notes}</p>
            </div>
          )}
          {record.info_request_message && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <span className="text-xs text-violet-500 block mb-1">Info requested</span>
              <p className="text-sm text-slate-700">{record.info_request_message}</p>
              {record.info_response && (
                <>
                  <span className="text-xs text-slate-400 block mt-2 mb-1">User response</span>
                  <p className="text-sm text-slate-700">{record.info_response}</p>
                </>
              )}
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </ModalContainer>
    </>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function VerificationClient({ initialQueue, stats, currentAdminId }: VerificationClientProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<VerificationRecord[]>(initialQueue);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all" | "active">("active");
  const [roleFilter, setRoleFilter] = useState<"all" | "tutor" | "student">("all");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let result = queue.filter((r) => r.user_id !== currentAdminId);
    if (statusFilter === "active") {
      result = result.filter((r) =>
        ["pending", "in_review", "info_requested"].includes(r.status)
      );
    } else if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((r) => r.role === roleFilter);
    }
    return result;
  }, [queue, statusFilter, roleFilter, currentAdminId]);

  const closeModal = () => setActiveModal(null);

  const handleDone = useCallback(() => {
    closeModal();
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleStartReview = useCallback(
    (id: string) => {
      startTransition(async () => {
        await startVerificationReview(id);
        setQueue((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "in_review" as VerificationStatus } : r))
        );
      });
    },
    []
  );

  const activeCount = stats.pending + stats.inReview + stats.infoRequested;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
              Identity Verification
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Guides verify within 24h · Learners verify within 48h · Full app access throughout
            </p>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600">
                {stats.overdue} overdue
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-6">
        <StatCard label="Pending" value={stats.pending} accent="text-amber-600" />
        <StatCard label="In Review" value={stats.inReview} accent="text-blue-600" />
        <StatCard label="Info Needed" value={stats.infoRequested} accent="text-violet-600" />
        <StatCard label="Approved" value={stats.approved} accent="text-emerald-600" />
        <StatCard label="Rejected" value={stats.rejected} accent="text-rose-600" />
        <StatCard label="Blacklisted" value={stats.blacklisted} accent="text-slate-900" />
        <StatCard label="Overdue" value={stats.overdue} accent={stats.overdue > 0 ? "text-red-600" : "text-slate-400"} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {(
            [
              { v: "active", l: `Active (${activeCount})` },
              { v: "all", l: "All" },
              { v: "pending", l: "Pending" },
              { v: "in_review", l: "In Review" },
              { v: "info_requested", l: "Info Needed" },
              { v: "approved", l: "Approved" },
              { v: "rejected", l: "Rejected" },
              { v: "blacklisted", l: "Blacklisted" },
            ] as { v: VerificationStatus | "all" | "active"; l: string }[]
          ).map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setStatusFilter(v)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === v
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {(["all", "tutor", "student"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                roleFilter === r
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {r === "all" ? "All roles" : r === "tutor" ? "Guides" : "Learners"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center border border-slate-200 rounded-xl bg-white">
          <p className="text-sm text-slate-400">No verifications match your filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">User</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Role</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Submitted</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <VerificationRow
                  key={record.id}
                  record={record}
                  onModal={setActiveModal}
                  onStartReview={handleStartReview}
                  isSelf={record.user_id === currentAdminId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {activeModal?.type === "approve" && (
        <ApproveModal record={activeModal.record} onClose={closeModal} onDone={handleDone} />
      )}
      {activeModal?.type === "reject" && (
        <RejectModal record={activeModal.record} onClose={closeModal} onDone={handleDone} />
      )}
      {activeModal?.type === "blacklist" && (
        <BlacklistModal record={activeModal.record} onClose={closeModal} onDone={handleDone} />
      )}
      {activeModal?.type === "info" && (
        <InfoRequestModal record={activeModal.record} onClose={closeModal} onDone={handleDone} />
      )}
      {activeModal?.type === "detail" && (
        <DetailModal record={activeModal.record} onClose={closeModal} />
      )}
    </div>
  );
}
