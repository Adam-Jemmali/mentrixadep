"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { approveSessionRequest, rejectSessionRequest } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { Button } from "@/components/ui/button";

interface SessionRequest {
  id: string;
  student_id: string;
  student_email?: string | null;
  status: string;
  created_at: string;
  availability?: {
    course: string;
    start_time: string;
    end_time: string;
    price_per_session?: number | null;
    price?: number | null;
  };
}

interface SessionRequestsListProps {
  sessionRequests: SessionRequest[];
}

export function SessionRequestsList({ sessionRequests }: SessionRequestsListProps) {
  const [rows, setRows] = useState(sessionRequests);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  useEffect(() => {
    setRows(sessionRequests);
  }, [sessionRequests]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!focusedId) return;
      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        handleApprove(focusedId);
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleReject(focusedId);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusedId, rows]);

  const handleApprove = async (id: string) => {
    const rowEl = rowRefs.current[id];
    if (!rowEl) {
      await approveSessionRequest(id, viewingAsUserId ?? undefined);
      router.refresh();
      return;
    }
    gsap.to(rowEl, {
      height: 0,
      opacity: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        setRows((current) => current.filter((r) => r.id !== id));
        approveSessionRequest(id, viewingAsUserId ?? undefined).then(() => router.refresh());
      },
    });
  };

  const handleReject = async (id: string) => {
    const rowEl = rowRefs.current[id];
    if (!rowEl) {
      await rejectSessionRequest(id, viewingAsUserId ?? undefined);
      router.refresh();
      return;
    }
    gsap.to(rowEl, {
      height: 0,
      opacity: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        setRows((current) => current.filter((r) => r.id !== id));
        rejectSessionRequest(id, viewingAsUserId ?? undefined).then(() => router.refresh());
      },
    });
  };

  return (
    <div>
      <div className="text-xs text-slate-400 text-right mb-2 space-y-0.5">
        <p>A = approve, R = reject</p>
        <p className="text-slate-500">
          Rejecting a paid request refunds the student automatically (Stripe).
        </p>
      </div>

      <div className="mentrixa-table overflow-x-auto border border-slate-200 rounded-md bg-white">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-2 px-3 text-left font-normal">Learner</th>
              <th className="py-2 px-3 text-left font-normal">Course</th>
              <th className="py-2 px-3 text-left font-normal">Requested time</th>
              <th className="py-2 px-3 text-left font-normal">Price</th>
              <th className="py-2 px-3 text-left font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 px-3 text-center text-xs text-slate-400"
                >
                  No pending session requests.
                </td>
              </tr>
            ) : (
              rows.map((request) => {
                const availability = request.availability;
                const priceCents =
                  (availability as { price_per_session?: number; price?: number } | undefined)
                    ?.price_per_session ??
                  (availability as { price_per_session?: number; price?: number } | undefined)
                    ?.price ??
                  null;
                const learnerName =
                  request.student_email?.split("@")[0] ?? request.student_email ?? `Student ${request.student_id.slice(0, 8)}`;

                return (
                  <tr
                    key={request.id}
                    ref={(el) => {
                      rowRefs.current[request.id] = el;
                    }}
                    tabIndex={0}
                    onFocus={() => setFocusedId(request.id)}
                    onBlur={() => setFocusedId((current) => (current === request.id ? null : current))}
                    className={`border-b border-slate-100 text-sm transition-colors ${
                      focusedId === request.id
                        ? "bg-[#F8FAFC] outline outline-2 outline-[#BFDBFE]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 px-3 align-middle">
                      <span className="text-sm font-medium text-slate-900">
                        {learnerName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="font-mono text-xs text-slate-400">
                        {availability?.course ?? "Unknown"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      {availability ? (
                        <span className="text-sm text-slate-500">
                          {formatDate(availability.start_time)} ·{" "}
                          {formatTimeRange(availability.start_time, availability.end_time)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">–</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="text-sm font-semibold text-slate-900">
                        {priceCents != null ? `$${(priceCents / 100).toFixed(2)}` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

