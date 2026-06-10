"use client";

import { suspendUser, unsuspendUser } from "@/features/admin/admin-users";
import type { AdminUser } from "@/features/admin/admin-users";
import { verifyTutorCourse } from "@/features/admin/tutor-courses-admin";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  X,
} from "lucide-react";


import { Button } from "@/shared/ui/button";

type UnverifiedCourse = {
  id: string;
  tutor_id: string;
  course_name: string;
  proof_description: string;
  tutor_email: string | null;
  created_at: string;
};

function splitProofAndEvidence(raw: string): { proof: string; evidence: string | null } {
  const marker = /\n?Evidence:\s*/i;
  const parts = raw.split(marker);
  if (parts.length < 2) return { proof: raw, evidence: null };
  return { proof: parts[0]?.trim() ?? raw, evidence: parts.slice(1).join(" ").trim() || null };
}

interface Props {
  users: AdminUser[];
  unverifiedCourses: UnverifiedCourse[];
}

type RoleFilter = "all" | "student" | "tutor" | "admin";
type StatusFilter = "all" | "active" | "suspended";
type ActiveMenu = { userId: string; top: number; right: number } | null;

function relativeTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminUsersClient({ users: initialUsers, unverifiedCourses: initialCourses }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [courses, setCourses] = useState(initialCourses);
  const [courseLoadingId, setCourseLoadingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "courses">("users");
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let result = users;
    if (roleFilter !== "all") result = result.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") result = result.filter((u) => (u.status ?? (u.approved ? "approved" : "pending")) === "approved");
    if (statusFilter === "suspended") result = result.filter((u) => (u.status ?? (u.approved ? "approved" : "pending")) === "suspended");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.email?.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, roleFilter, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { student: 0, tutor: 0, admin: 0 };
    users.forEach((u) => {
      if (u.role in c) c[u.role as keyof typeof c]++;
    });
    return c;
  }, [users]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openMenu = useCallback((e: React.MouseEvent, userId: string) => {
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setActiveMenu({ userId, top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
  }, []);

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setLoadingId(userId);
    setActiveMenu(null);
    try {
      if (suspend) await suspendUser(userId);
      else await unsuspendUser(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, approved: !suspend } : u)));
    } catch { /* ignore */ }
    setLoadingId(null);
  };

  const handleVerifyCourse = async (courseId: string) => {
    setCourseLoadingId(courseId);
    try {
      await verifyTutorCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch { /* ignore */ }
    setCourseLoadingId(null);
  };

  const activeUser = activeMenu ? users.find((u) => u.id === activeMenu.userId) : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Users</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          {users.length} total · {counts.student} learners · {counts.tutor} guides · {counts.admin} admins
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#E5E7EB]">
        {(["users", "courses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t === "users" ? `All users (${users.length})` : `Course verifications (${courses.length})`}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email..."
                className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {(["all", "student", "tutor", "admin"] as RoleFilter[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                    roleFilter === r
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-[#E5E7EB] text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {r === "all" ? "All" : r === "student" ? "Learners" : r === "tutor" ? "Guides" : "Admins"}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(["all", "active", "suspended"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                    statusFilter === s
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-[#E5E7EB] text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-slate-400">No users match your filters.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">User</th>
                    <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Role</th>
                    <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Joined</th>
                    <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                    <th className="py-3 px-4 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors group">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-[13px] font-medium text-slate-900">{u.email ?? "—"}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.id.slice(0, 8)}…</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                          u.role === "admin"
                            ? "bg-violet-50 text-violet-700"
                            : u.role === "tutor"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {u.role === "student" ? "Learner" : u.role === "tutor" ? "Guide" : "Admin"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const status = u.status ?? (u.approved ? "approved" : "pending");
                          const dot = status === "approved" ? "bg-emerald-400" : status === "suspended" ? "bg-red-400" : "bg-amber-400";
                          const text = status === "approved" ? "text-emerald-700" : status === "suspended" ? "text-red-600" : "text-amber-600";
                          const label = status === "approved" ? "Approved" : status === "suspended" ? "Suspended" : "Pending";
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                              <span className={`text-[12px] ${text}`}>{label}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-[12px] text-slate-500">{relativeTime(u.created_at)}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={u.role === "tutor" ? `/tutor/${u.id}/dashboard` : u.role === "student" ? `/admin/student/${u.id}` : "/admin"}
                          className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" strokeWidth={2} />
                          View
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => openMenu(e, u.id)}
                          disabled={loadingId === u.id}
                          className="p-1 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                          aria-label="User actions"
                        >
                          {loadingId === u.id ? (
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4 text-slate-400" strokeWidth={2} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Showing {filtered.length} of {users.length} users</p>
        </>
      )}

      {tab === "courses" && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          {courses.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[13px] text-slate-500">All courses verified</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Guide</th>
                  <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Course</th>
                  <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Qualification notes</th>
                  <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Evidence</th>
                  <th className="py-3 px-4 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3 px-4 text-[13px] font-medium text-slate-900">{c.tutor_email ?? c.tutor_id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-[13px] text-slate-700">{c.course_name}</td>
                    <td className="py-3 px-4 text-[12px] text-slate-500 max-w-xs truncate">{splitProofAndEvidence(c.proof_description).proof}</td>
                    <td className="py-3 px-4 text-[12px] text-slate-500 max-w-xs">
                      {(() => {
                        const evidence = splitProofAndEvidence(c.proof_description).evidence;
                        if (!evidence) return <span className="text-slate-400">—</span>;
                        return (
                          <a
                            href={evidence}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            Open evidence
                          </a>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        disabled={courseLoadingId === c.id}
                        onClick={() => handleVerifyCourse(c.id)}
                        className="h-7 text-[12px] px-3"
                      >
                        {courseLoadingId === c.id ? "…" : "Verify"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Context menu */}
      {activeMenu && activeUser && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 w-48"
          style={{ top: activeMenu.top, right: activeMenu.right }}
        >
          {(activeUser.status ?? (activeUser.approved ? "approved" : "pending")) !== "suspended" ? (
            <button
              onClick={() => handleSuspend(activeUser.id, true)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <Ban className="w-3.5 h-3.5" strokeWidth={1.8} />
              Suspend account
            </button>
          ) : (
            <button
              onClick={() => handleSuspend(activeUser.id, false)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.8} />
              Reinstate account
            </button>
          )}
          <div className="my-1 border-t border-[#F3F4F6]" />
          <button
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-slate-400 hover:bg-slate-50 transition-colors text-left"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
            Close
          </button>
        </div>
      )}
    </div>
  );
}
