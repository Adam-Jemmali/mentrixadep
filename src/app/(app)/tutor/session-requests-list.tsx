"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { runGsapAction } from "@/shared/core/gsap-lazy";
import { Building2 } from "lucide-react";
import { approveSessionRequest, rejectSessionRequest } from "@/features/tutor/session-requests";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatSlotRangeInZone } from "@/shared/core/time-format";
import { Button } from "@/shared/ui/button";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

interface SessionRequest {
  id: string;
  student_id: string;
  student_email?: string | null;
  student_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  status: string;
  created_at: string;
  institution?: { institutionName: string; logoUrl: string | null } | null;
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
  displayTimezone: string;
}

export function SessionRequestsList({ sessionRequests, displayTimezone }: SessionRequestsListProps) {

  const [rows, setRows] = useState(sessionRequests);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pendingActionById, setPendingActionById] = useState<Record<string, "approve" | "reject">>({});
  const [isRefreshing, startTransition] = useTransition();
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const weekScheduleHash = "/tutor#week-schedule";

  const goToWeekSchedule = () => {
    router.replace(weekScheduleHash);
    // Ensure hash navigation always applies even when staying on the same route.
    if (typeof window !== "undefined") {
      window.location.hash = "week-schedule";
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks declared below; focusedId/rows drive subscription changes
  }, [focusedId, rows]);

  const handleApprove = async (id: string) => {
    setPendingActionById((current) => ({ ...current, [id]: "approve" }));
    const rowEl = rowRefs.current[id];
    if (!rowEl) {
      try {
        await approveSessionRequest(id, viewingAsUserId ?? undefined);
        goToWeekSchedule();
        startTransition(() => router.refresh());
      } finally {
        setPendingActionById((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
      return;
    }
    runGsapAction((gsap) => {
      gsap.to(rowEl, {
      height: 0,
      opacity: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        setRows((current) => current.filter((r) => r.id !== id));
        approveSessionRequest(id, viewingAsUserId ?? undefined)
          .then(() => {
            goToWeekSchedule();
            startTransition(() => router.refresh());
          })
          .finally(() => {
            setPendingActionById((current) => {
              const next = { ...current };
              delete next[id];
              return next;
            });
          });
      },
    });
    });
  };

  const handleReject = async (id: string) => {
    setPendingActionById((current) => ({ ...current, [id]: "reject" }));
    const rowEl = rowRefs.current[id];
    if (!rowEl) {
      try {
        await rejectSessionRequest(id, viewingAsUserId ?? undefined);
        startTransition(() => router.refresh());
      } finally {
        setPendingActionById((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
      return;
    }
    runGsapAction((gsap) => {
      gsap.to(rowEl, {
      height: 0,
      opacity: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        setRows((current) => current.filter((r) => r.id !== id));
        rejectSessionRequest(id, viewingAsUserId ?? undefined)
          .then(() => startTransition(() => router.refresh()))
          .finally(() => {
            setPendingActionById((current) => {
              const next = { ...current };
              delete next[id];
              return next;
            });
          });
      },
    });
    });
  };

  return (
    <div>
      <div className="text-xs text-slate-400 text-right mb-2 space-y-0.5">
        {isRefreshing ? <p className="text-slate-400">Syncing updates…</p> : null}
        <p className="text-slate-500">
          Declining a paid request refunds the Mentrixer
        </p>
      </div>

      <div className="mentrixa-table overflow-x-auto border border-slate-200 rounded-md bg-white">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-2 px-3 text-left font-normal">
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name="profile" size={14} title="Learner" />
                  Learner
                </span>
              </th>
              <th className="py-2 px-3 text-left font-normal">
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name="skills" size={14} title="Course" />
                  Course
                </span>
              </th>
              <th className="py-2 px-3 text-left font-normal">
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name="booking" size={14} title="Requested time" />
                  Requested time
                </span>
              </th>
              <th className="py-2 px-3 text-left font-normal">
                <span className="inline-flex items-center gap-1.5">
                <MentrixaVocabIcon name="breakthrough" size={14} surface="light" title="Price" />
                  Price
                </span>
              </th>
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
                const fallbackEmail = request.student_email ?? request.student_profile?.email ?? null;
                const learnerName =
                  request.student_profile?.display_name?.trim() ||
                  fallbackEmail?.split("@")[0] ||
                  `Student ${request.student_id.slice(0, 8)}`;
                const learnerEmail = fallbackEmail;
                const learnerAvatar = request.student_profile?.avatar_url ?? null;

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
                      <div className="flex items-start gap-2.5">
                        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                          {learnerAvatar ? (
                            <Image
                              src={learnerAvatar}
                              alt={learnerName}
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-600">
                              {learnerName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium text-slate-900">{learnerName}</span>
                          {learnerEmail ? <span className="truncate text-xs text-slate-500">{learnerEmail}</span> : null}
                        </div>
                        {request.institution && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded w-fit">
                            {request.institution.logoUrl ? (
                              <Image
                                src={request.institution.logoUrl}
                                alt=""
                                width={12}
                                height={12}
                                unoptimized
                                className="object-contain rounded-sm"
                              />
                            ) : (
                              <Building2 className="w-2.5 h-2.5" strokeWidth={2} />
                            )}
                            {request.institution.institutionName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="font-mono text-xs text-slate-400">
                        {availability?.course ?? "Unknown"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      {availability ? (
                        <span className="text-sm text-slate-500">
                          {formatSlotRangeInZone(availability.start_time, availability.end_time, displayTimezone)}
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
                        {pendingActionById[request.id] ? (
                          <span className="text-[11px] font-medium text-slate-500">
                            {pendingActionById[request.id] === "approve" ? "Accepting…" : "Declining…"}
                          </span>
                        ) : null}
                        <Button
                          size="sm"
                          disabled={Boolean(pendingActionById[request.id])}
                          onClick={() => handleApprove(request.id)}
                        >
                          <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(pendingActionById[request.id])}
                          onClick={() => handleReject(request.id)}
                        >
                          <img src="/icons/mentrixer.svg" alt="" width={16} height={16} className="shrink-0" />
                          Decline
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

