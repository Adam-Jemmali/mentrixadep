"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Search, Shield } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { addInstitutionMemberByEmail, removeInstitutionMember } from "@/features/institutions/institution";
import type { InstitutionMemberRow } from "@/features/institutions/institution";
import type { InstitutionPlan } from "@/shared/types/database";

const PLAN_LIMITS: Record<InstitutionPlan, number | null> = {
  free: 10,
  basic: 50,
  pro: null,
};

export function InstitutionMembersClient({
  institutionId,
  plan,
  members: initialMembers,
}: {
  institutionId: string;
  plan: InstitutionPlan;
  members: InstitutionMemberRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const limit = PLAN_LIMITS[plan];
  const studentCount = members.filter((m) => m.role === "student").length;
  const atLimit = limit !== null && studentCount >= limit;

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.email.toLowerCase().includes(q) ||
      (m.display_name ?? "").toLowerCase().includes(q)
    );
  });

  const handleAdd = () => {
    if (!email.trim()) return;
    setAddError(null);
    setAddSuccess(null);
    startTransition(async () => {
      const res = await addInstitutionMemberByEmail(institutionId, email);
      if ("error" in res) {
        setAddError(res.error);
      } else {
        setAddSuccess(`${email} added successfully.`);
        setEmail("");
        router.refresh();
      }
    });
  };

  const handleRemove = (userId: string) => {
    setRemovingId(userId);
    startTransition(async () => {
      const res = await removeInstitutionMember(institutionId, userId);
      setRemovingId(null);
      if ("error" in res) {
        setAddError(res.error);
      } else {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Members</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {studentCount} student{studentCount !== 1 ? "s" : ""}
            {limit !== null ? ` · ${limit} seat limit` : " · Unlimited"}
          </p>
        </div>
      </div>

      {/* Add member */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <p className="text-[13px] font-medium text-slate-800 mb-3">Add student by email</p>
        {atLimit && (
          <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
            You&apos;ve reached the {limit}-student limit for your plan. Upgrade to add more.
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="student@university.edu"
            disabled={isPending || atLimit}
            className="flex-1 h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !email.trim() || atLimit}
            className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
            Add
          </button>
        </div>
        {addError && <p className="text-[12px] text-red-600 mt-2">{addError}</p>}
        {addSuccess && <p className="text-[12px] text-emerald-600 mt-2">{addSuccess}</p>}
      </div>

      {/* Member list */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full h-8 pl-8 pr-3 text-[12px] border border-[#E5E7EB] rounded-md bg-[#FAFAFA] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>
          <span className="text-[11px] text-slate-400">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[12px] text-slate-400">No members found.</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-4 px-5 py-2.5 bg-[#FAFAFA] border-b border-[#F1F5F9]">
              {["Member", "Sessions", "XP", "Role", ""].map((h) => (
                <p key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {h}
                </p>
              ))}
            </div>

            <div className="divide-y divide-[#F9FAFB]">
              {filtered.map((m) => (
                <div
                  key={m.user_id}
                  className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-4 px-5 py-3 items-center hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[11px] font-semibold text-slate-500 uppercase">
                      {(m.display_name ?? m.email).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-slate-800 truncate">
                        {m.display_name ?? m.email}
                      </p>
                      {m.display_name && (
                        <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-700 tabular-nums">{m.session_count}</p>
                  <p className="text-[12px] text-slate-700 tabular-nums">{m.total_xp.toLocaleString()}</p>
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                        m.role === "admin"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {m.role === "admin" && <Shield className="w-2.5 h-2.5" />}
                      {m.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(m.user_id)}
                    disabled={isPending || removingId === m.user_id || m.role === "admin"}
                    title={m.role === "admin" ? "Cannot remove institution admin" : "Remove member"}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
