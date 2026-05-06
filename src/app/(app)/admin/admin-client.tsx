"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gsap } from "gsap";
import {
  approveRegistrationRequest,
  rejectRegistrationRequest,
  toggleAutoApproveRegistrations,
  approveAllPendingRegistrations,
  verifyTutorCourse,
  type AdminUser,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import type { RegistrationRequest } from "@/lib/database.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminIllustration } from "@/components/illustrations";

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getUserDashboardHref(role: string, userId: string): string {
  if (role === "tutor") return `/tutor/${userId}/dashboard`;
  if (role === "student") return `/admin/student/${userId}`;
  if (role === "admin") return `/admin`;
  return `/student`;
}

function getRoleLabel(role: string): string {
  if (role === "tutor") return "View dashboard";
  if (role === "student") return "View dashboard";
  if (role === "admin") return "Admin panel";
  return "View";
}

type UnverifiedCourseEntry = {
  id: string;
  tutor_id: string;
  course_name: string;
  proof_description: string;
  verified: boolean;
  created_at: string;
  tutor_email: string | null;
};

function splitProofAndEvidence(raw: string): { proof: string; evidence: string | null } {
  const marker = /\n?Evidence:\s*/i;
  const parts = raw.split(marker);
  if (parts.length < 2) return { proof: raw, evidence: null };
  return { proof: parts[0]?.trim() ?? raw, evidence: parts.slice(1).join(" ").trim() || null };
}

interface AdminClientProps {
  pendingRequests: RegistrationRequest[];
  allRequests: RegistrationRequest[];
  users: AdminUser[];
  defaultTab?: "pending" | "users" | "courses";
  autoApproveRegistrations?: boolean;
  unverifiedCourses?: UnverifiedCourseEntry[];
}

export function AdminClient({
  pendingRequests: initialPending,
  users: initialUsers,
  defaultTab = "pending",
  autoApproveRegistrations: initialAutoApprove = false,
  unverifiedCourses: initialUnverifiedCourses = [],
}: AdminClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState<RegistrationRequest[]>(initialPending);
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "tutor" | "admin">("all");
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [unverifiedCourses, setUnverifiedCourses] = useState<UnverifiedCourseEntry[]>(initialUnverifiedCourses);
  const [courseLoadingId, setCourseLoadingId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isFirstSearchRender = useRef(true);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.email?.toLowerCase().includes(q) || u.role.toLowerCase().includes(q),
      );
    }
    return result;
  }, [users, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts = { student: 0, tutor: 0, admin: 0 };
    users.forEach((u) => {
      if (u.role in counts) counts[u.role as keyof typeof counts]++;
    });
    return counts;
  }, [users]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setPending(initialPending);
  }, [initialPending]);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const rows = document.querySelectorAll(".users-row");
    if (!rows.length) return;
    gsap.fromTo(
      rows,
      { opacity: 0, y: 2 },
      { opacity: 1, y: 0, stagger: 0.025, duration: 0.2, ease: "power2.out" },
    );
  }, [search, roleFilter]);

  useEffect(() => {
    const rows = document.querySelectorAll(".pending-row");
    if (!rows.length) return;
    gsap.fromTo(
      rows,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, stagger: 0.04, duration: 0.22, ease: "power2.out" },
    );
  }, []);

  const collapseRow = useCallback((id: string, onDone: () => void) => {
    const row = rowRefs.current.get(id);
    if (!row) {
      onDone();
      return;
    }
    gsap.to(row, {
      height: 0,
      opacity: 0,
      paddingTop: 0,
      paddingBottom: 0,
      borderWidth: 0,
      duration: 0.28,
      ease: "power2.in",
      onComplete: onDone,
    });
  }, []);

  const handleApprove = useCallback(
    async (id: string) => {
      if (loadingId) return;
      setLoadingId(id);
      try {
        await approveRegistrationRequest(id);
        collapseRow(id, () => {
          setPending((prev) => prev.filter((r) => r.id !== id));
          setLoadingId(null);
        });
      } catch {
        setLoadingId(null);
      }
    },
    [loadingId, collapseRow],
  );

  const handleReject = useCallback(
    async (id: string) => {
      if (loadingId) return;
      setLoadingId(id);
      try {
        await rejectRegistrationRequest(id);
        collapseRow(id, () => {
          setPending((prev) => prev.filter((r) => r.id !== id));
          setLoadingId(null);
          router.refresh();
        });
      } catch {
        setLoadingId(null);
      }
    },
    [loadingId, collapseRow, router],
  );

  const handleToggleAutoApprove = async () => {
    setAutoApproveLoading(true);
    try {
      const result = await toggleAutoApproveRegistrations();
      setAutoApprove(result.enabled);
    } catch {
      // ignore
    }
    setAutoApproveLoading(false);
  };

  const handleApproveAll = async () => {
    if (pending.length === 0) return;
    setApproveAllLoading(true);
    try {
      await approveAllPendingRegistrations();
      setPending([]);
      router.refresh();
    } catch {
      // ignore
    }
    setApproveAllLoading(false);
  };

  const handleVerifyCourse = async (courseId: string) => {
    setCourseLoadingId(courseId);
    try {
      await verifyTutorCourse(courseId);
      setUnverifiedCourses((prev) => prev.filter((c) => c.id !== courseId));
      router.refresh();
    } catch {
      // ignore
    }
    setCourseLoadingId(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      )
        return;
      if (!focusedRowId) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        void handleApprove(focusedRowId);
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        void handleReject(focusedRowId);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusedRowId, handleApprove, handleReject]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 relative">
      <AdminIllustration />

      <div className="flex items-center justify-between mb-6 border-b border-[#E2E8F0] pb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">
            Admin Panel
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage registrations, users, and platform settings
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-3 text-sm text-slate-400">
            <span>{roleCounts.student} students</span>
            <span>{roleCounts.tutor} tutors</span>
            <span>{roleCounts.admin} admins</span>
          </div>
        </div>
      </div>

      {/* Auto-approve setting */}
      <div className="mb-6 flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Auto-approve new registrations
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            When enabled, new students and tutors are approved instantly without manual review.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleAutoApprove}
          disabled={autoApproveLoading}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-400/50 disabled:opacity-50 ${
            autoApprove ? "bg-mentrixa-600" : "bg-slate-200"
          }`}
          role="switch"
          aria-checked={autoApprove}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
              autoApprove ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <Tabs
        value={defaultTab}
        onValueChange={(v) => router.push(`/admin?tab=${v}`)}
        className="w-full"
      >
        <TabsList className="h-auto bg-transparent border-b border-slate-200 rounded-none px-0 mb-5">
          <TabsTrigger
            value="pending"
            className="rounded-none bg-transparent px-0 mr-6 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
          >
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-none bg-transparent px-0 mr-6 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
          >
            All users ({users.length})
          </TabsTrigger>
          <TabsTrigger
            value="courses"
            className="rounded-none bg-transparent px-0 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
          >
            Course verifications ({unverifiedCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="mt-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">
              A = approve, R = reject on focused row
            </p>
            {pending.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={approveAllLoading}
                onClick={handleApproveAll}
              >
                {approveAllLoading ? "Approving..." : `Approve all (${pending.length})`}
              </Button>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {autoApprove
                ? "Auto-approve is on — new users are approved instantly."
                : "No pending registrations."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="mentrixa-table w-full">
                <thead>
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Email
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Role
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Submitted
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((req) => (
                    <tr
                      key={req.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(req.id, el);
                        else rowRefs.current.delete(req.id);
                      }}
                      tabIndex={0}
                      onFocus={() => setFocusedRowId(req.id)}
                      onBlur={() =>
                        setFocusedRowId((prev) => (prev === req.id ? null : prev))
                      }
                      className="pending-row border-b border-slate-100 last:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BFDBFE] focus-visible:bg-slate-50 hover:bg-slate-50 overflow-hidden"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {req.email}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 capitalize">
                        {req.role}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {relativeTime(req.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={loadingId === req.id}
                            onClick={() => void handleApprove(req.id)}
                          >
                            {loadingId === req.id ? "..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === req.id}
                            onClick={() => void handleReject(req.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ALL USERS TAB */}
        <TabsContent value="users" className="mt-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="h-9 text-sm flex-1"
            />
            <div className="flex gap-1">
              {(["all", "student", "tutor", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    roleFilter === r
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {r === "all"
                    ? `All (${users.length})`
                    : `${r.charAt(0).toUpperCase() + r.slice(1)}s (${roleCounts[r]})`}
                </button>
              ))}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No users match your filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="mentrixa-table w-full">
                <thead>
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Email
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Role
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Status
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Joined
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="users-row border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {u.email ?? "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                            u.role === "admin"
                              ? "bg-violet-50 text-violet-700"
                              : u.role === "tutor"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {u.approved ? (
                          <span className="text-green-700">Active</span>
                        ) : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={getUserDashboardHref(u.role, u.id)}
                          className="text-xs text-mentrixa-600 hover:underline font-medium"
                        >
                          {getRoleLabel(u.role)} →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* COURSE VERIFICATIONS TAB */}
        <TabsContent value="courses" className="mt-0">
          {unverifiedCourses.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No pending course verifications.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="mentrixa-table w-full">
                <thead>
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Tutor
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Course
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Qualifications
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Evidence
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Submitted
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unverifiedCourses.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {c.tutor_email ?? c.tutor_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        <div className="flex items-center gap-1.5">
                          {c.course_name}
                          {c.verified && (
                            <Badge variant="default" className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {splitProofAndEvidence(c.proof_description).proof}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs">
                        {(() => {
                          const evidence = splitProofAndEvidence(c.proof_description).evidence;
                          if (!evidence) return <span className="text-slate-400">—</span>;
                          return (
                            <a
                              href={evidence}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Open evidence
                            </a>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {relativeTime(c.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          disabled={courseLoadingId === c.id}
                          onClick={() => void handleVerifyCourse(c.id)}
                        >
                          {courseLoadingId === c.id ? "..." : "Verify"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
