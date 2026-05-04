"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import {
  approveRegistrationRequest,
  rejectRegistrationRequest,
  reinstateRejectedRegistrationRequest,
  toggleAutoApproveRegistrations,
  approveAllPendingRegistrations,
} from "@/app/actions/admin";
import type { RegistrationRequest } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Props {
  requests: RegistrationRequest[];
  autoApprove: boolean;
}

type TabFilter = "pending" | "approved" | "rejected" | "all";

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const m = Math.floor(delta / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminRegistrationsClient({ requests: initialRequests, autoApprove: initialAutoApprove }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<TabFilter>("pending");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "tutor">("all");
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const filtered = useMemo(() => {
    let result = requests;
    if (filter !== "all") result = result.filter((r) => r.status === filter);
    if (roleFilter !== "all") result = result.filter((r) => r.role === roleFilter);
    return result;
  }, [requests, filter, roleFilter]);

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    all: requests.length,
  }), [requests]);

  const showActionsColumn = filter !== "approved";

  useEffect(() => {
    const rows = document.querySelectorAll(".reg-row");
    if (!rows.length) return;
    gsap.fromTo(rows, { opacity: 0, y: 6 }, { opacity: 1, y: 0, stagger: 0.035, duration: 0.25, ease: "power2.out" });
  }, [filter, roleFilter]);

  const collapseRow = useCallback((id: string, onDone: () => void) => {
    const row = rowRefs.current.get(id);
    if (!row) { onDone(); return; }
    gsap.to(row, {
      height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0,
      duration: 0.25, ease: "power2.in", onComplete: onDone,
    });
  }, []);

  const handleApprove = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    try {
      await approveRegistrationRequest(id);
      collapseRow(id, () => {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" as const } : r));
        setLoadingId(null);
      });
    } catch { setLoadingId(null); }
  };

  const handleReject = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    setRejectDialogId(null);
    try {
      await rejectRegistrationRequest(id);
      collapseRow(id, () => {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" as const } : r));
        setLoadingId(null);
        router.refresh();
      });
    } catch { setLoadingId(null); }
  };

  const handleReinstateRejected = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    try {
      await reinstateRejectedRegistrationRequest(id);
      const applySuccess = () => {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)),
        );
        setLoadingId(null);
        router.refresh();
      };
      if (filter === "rejected") {
        collapseRow(id, applySuccess);
      } else {
        applySuccess();
      }
    } catch {
      setLoadingId(null);
    }
  };

  const handleToggleAutoApprove = async () => {
    setAutoApproveLoading(true);
    try {
      const result = await toggleAutoApproveRegistrations();
      setAutoApprove(result.enabled);
    } catch { /* ignore */ }
    setAutoApproveLoading(false);
  };

  const handleApproveAll = async () => {
    const pending = requests.filter((r) => r.status === "pending");
    if (!pending.length) return;
    setApproveAllLoading(true);
    try {
      await approveAllPendingRegistrations();
      setRequests((prev) => prev.map((r) => r.status === "pending" ? { ...r, status: "approved" as const } : r));
      router.refresh();
    } catch { /* ignore */ }
    setApproveAllLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Registrations</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            This queue is also used for landing-page waitlist approvals.
          </p>
        </div>

        {/* Auto-approve toggle */}
        <div className="flex items-center gap-3 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
          <div className="text-right">
            <p className="text-[12px] font-medium text-slate-800">Auto-approve</p>
            <p className="text-[10px] text-slate-400">Skip manual review</p>
          </div>
          <button
            onClick={handleToggleAutoApprove}
            disabled={autoApproveLoading}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:opacity-50 ${
              autoApprove ? "bg-slate-900" : "bg-slate-200"
            }`}
            role="switch"
            aria-checked={autoApprove}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                autoApprove ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1">
          {(["pending", "approved", "rejected", "all"] as TabFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-[#E5E7EB] text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && <span className="ml-1 text-[10px] opacity-70">({counts[f]})</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["all", "student", "tutor"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                roleFilter === r
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-[#E5E7EB] text-slate-500 hover:border-slate-300"
              }`}
            >
              {r === "all" ? "All roles" : r === "student" ? "Learners" : "Guides"}
            </button>
          ))}
        </div>
        {counts.pending > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={approveAllLoading}
            onClick={handleApproveAll}
            className="ml-auto h-9 text-[12px]"
          >
            {approveAllLoading ? "Approving…" : `Approve all pending (${counts.pending})`}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-slate-500">
              {filter === "pending" ? (autoApprove ? "Auto-approve is on — new users approved instantly." : "Queue is empty.") : "No records match this filter."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Email</th>
                <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Role</th>
                <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Submitted</th>
                {showActionsColumn && (
                  <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(req.id, el);
                    else rowRefs.current.delete(req.id);
                  }}
                  className="reg-row hover:bg-[#FAFAFA] transition-colors overflow-hidden"
                >
                  <td className="py-3 px-4 text-[13px] font-medium text-slate-900">{req.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                      req.role === "tutor" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {req.role === "tutor" ? "Guide" : "Learner"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        req.status === "approved" ? "bg-emerald-400" :
                        req.status === "rejected" ? "bg-red-400" : "bg-amber-400"
                      }`} />
                      <span className={`text-[12px] capitalize ${
                        req.status === "approved" ? "text-emerald-700" :
                        req.status === "rejected" ? "text-red-600" : "text-amber-600"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[12px] text-slate-500">{relativeTime(req.created_at)}</td>
                  {showActionsColumn && (
                    <td className="py-3 px-4">
                      {(filter === "pending" || filter === "all") && req.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={loadingId === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectDialogId(req.id)}
                            disabled={loadingId === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-white border border-[#E5E7EB] text-slate-600 rounded-lg hover:border-slate-300 hover:text-slate-900 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3 h-3" strokeWidth={2} />
                            Reject
                          </button>
                        </div>
                      )}
                      {(filter === "rejected" || filter === "all") && req.status === "rejected" && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={false}
                            disabled={loadingId === req.id}
                            onCheckedChange={(on) => {
                              if (on) void handleReinstateRejected(req.id);
                            }}
                            aria-label={`Allow waitlist access for ${req.email}`}
                          />
                          <span className="text-[11px] text-slate-500 whitespace-nowrap">Approve access</span>
                        </div>
                      )}
                      {filter === "all" && req.status === "approved" && (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject confirmation dialog */}
      {rejectDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" strokeWidth={1.8} />
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">Reject registration?</h3>
            <p className="text-[13px] text-slate-500 mb-6">
              {requests.find((r) => r.id === rejectDialogId)?.email} — this action will mark the request as rejected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectDialogId(null)}
                className="flex-1 py-2.5 text-[13px] font-medium border border-[#E5E7EB] text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectDialogId)}
                className="flex-1 py-2.5 text-[13px] font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
