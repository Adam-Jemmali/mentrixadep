"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Users, CreditCard, TrendingUp, ArrowRight, Building2 } from "lucide-react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { cn } from "@/shared/core/utils";
import type { Institution } from "@/shared/types/database";
import type { InstitutionMemberRow } from "@/features/institutions/institution";

const PLAN_LIMITS: Record<string, number> = { free: 10, basic: 50, pro: Infinity };
const PLAN_NEXT: Record<string, string> = {
  free: "Upgrade to Basic — $299/mo, 50 students, all features",
  basic: "Upgrade to Pro — $999/mo, unlimited students",
  pro: "",
};

function StatCard({
  icon: Icon,
  vocabIcon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon?: React.ElementType;
  vocabIcon?: VocabIconName;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-5", accent ? "border-slate-900 bg-slate-900 text-white" : "border-[#E5E7EB] bg-white")}>
      <div className="flex items-start justify-between mb-3">
        <p className={cn("text-[11px] font-medium uppercase tracking-wider", accent ? "text-slate-400" : "text-slate-400")}>
          {label}
        </p>
        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", accent ? "bg-white/10" : "bg-slate-100")}>
          {vocabIcon ? (
            <MentrixaVocabIcon
              name={vocabIcon}
              size={16}
              surface="light"
              title={label}
            />
          ) : Icon ? (
            <Icon className={cn("w-4 h-4", accent ? "text-slate-300" : "text-slate-500")} strokeWidth={1.8} />
          ) : null}
        </div>
      </div>
      <p className={cn("text-2xl font-semibold tabular-nums", accent ? "text-white" : "text-slate-900")}>
        {value}
      </p>
      {sub && (
        <p className={cn("text-[11px] mt-1", accent ? "text-slate-400" : "text-slate-400")}>{sub}</p>
      )}
    </div>
  );
}

export function InstitutionOverviewClient({
  institution,
  usage,
  memberCount,
  recentMembers,
}: {
  institution: Institution;
  usage: { sessionsThisMonth: number; creditsRemaining: number };
  memberCount: number;
  recentMembers: InstitutionMemberRow[];
}) {
  const { institutionId } = useParams<{ institutionId: string }>();
  const limit = PLAN_LIMITS[institution.plan] ?? 10;
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((memberCount / limit) * 100));
  const upgradeNote = PLAN_NEXT[institution.plan];

  return (
    <div className="space-y-8 max-w-[960px]">
      {/* Header */}
      <div className="flex items-start gap-4">
        {institution.logo_url ? (
          <Image
            src={institution.logo_url}
            alt={institution.name}
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-lg object-contain border border-slate-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
        )}
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">{institution.name}</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">{institution.domain}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Members"
          value={memberCount}
          sub={limit === Infinity ? "Unlimited plan" : `${limit} seat limit`}
        />
        <StatCard
          vocabIcon="session"
          label="Sessions this month"
          value={usage.sessionsThisMonth}
          sub="Completed sessions"
        />
        <StatCard
          icon={CreditCard}
          label="Credits remaining"
          value={usage.creditsRemaining}
          sub="Prepaid sessions"
          accent={usage.creditsRemaining === 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg per student"
          value={memberCount > 0 ? (usage.sessionsThisMonth / memberCount).toFixed(1) : "—"}
          sub="Sessions / student"
        />
      </div>

      {/* Seat usage bar */}
      {limit !== Infinity && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-medium text-slate-800">Seat usage</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {memberCount} of {limit} students enrolled
              </p>
            </div>
            <span className="text-[12px] font-semibold text-slate-900 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-slate-800"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {upgradeNote && pct >= 80 && (
            <p className="text-[11px] text-slate-500 mt-3">
              {upgradeNote} —{" "}
              <Link href={`/institution/${institutionId}/billing`} className="text-slate-800 underline underline-offset-2">
                view billing
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Recent members */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-slate-800">Recent members</h2>
          <Link
            href={`/institution/${institutionId}/members`}
            className="text-[12px] text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentMembers.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[12px] text-slate-400">No members yet.</p>
            <Link
              href={`/institution/${institutionId}/members`}
              className="mt-2 inline-block text-[12px] text-slate-600 underline underline-offset-2"
            >
              Add your first student
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {recentMembers.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[11px] font-semibold text-slate-500 uppercase">
                  {m.display_name?.charAt(0) ?? m.email.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-800 truncate">
                    {m.display_name ?? m.email}
                  </p>
                  {m.display_name && (
                    <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[11px] font-medium text-slate-700 tabular-nums">{m.session_count}</p>
                    <p className="text-[10px] text-slate-400">sessions</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-700 tabular-nums">{m.total_xp.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">XP</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    m.role === "admin" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
