"use client";

import type { PlatformMetrics } from "@/features/admin/admin-dashboard";

import Link from "next/link";
import { MentrixaSeparatorStack } from "@/shared/ui/separator-patterns";
import {
  Users,
  BookOpen,
  DollarSign,
  Zap,
  Swords,
  Shield,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface Props {
  metrics: PlatformMetrics | null;
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group metric-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ?? "bg-slate-100"}`}>
          <Icon className="w-4 h-4 text-slate-600" strokeWidth={1.8} />
        </div>
        {href && (
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        )}
      </div>
      <p className="text-[24px] font-semibold text-slate-900 leading-none tracking-tight">{value}</p>
      <p className="text-[12px] text-slate-500 mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function AdminDashboardClient({ metrics }: Props) {
  const m = metrics;

  return (
    <div className="max-w-6xl mx-auto dash-animate-in">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Platform Overview</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Live snapshot for ops and revenue health
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total users"
          value={m?.totalUsers ?? "—"}
          sub={m ? `${m.studentCount} learners · ${m.tutorCount} guides` : undefined}
          icon={Users}
          accent="bg-blue-50"
          href="/admin/users"
        />
        <MetricCard
          label="Sessions this month"
          value={m?.sessionsMonth ?? "—"}
          sub={m ? `${m.sessionsToday} today · ${m.sessionsWeek} this week` : undefined}
          icon={BookOpen}
          accent="bg-emerald-50"
        />
        <MetricCard
          label="Revenue this month"
          value={m ? `$${(m.revenueMonth / 100).toFixed(0)}` : "—"}
          sub="Gross session value"
          icon={DollarSign}
          accent="bg-amber-50"
          href="/admin/reconciliation"
        />
        <MetricCard
          label="Active quests"
          value={m?.activeQuests ?? "—"}
          sub="In progress right now"
          icon={Zap}
          accent="bg-violet-50"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard
          label="Active duels"
          value={m?.activeDuels ?? "—"}
          sub="Live right now"
          icon={Swords}
          accent="bg-red-50"
        />
        <MetricCard
          label="Division wars"
          value={m?.activeDivisionWars ?? "—"}
          sub="Active this week"
          icon={Shield}
          accent="bg-teal-50"
        />
        <MetricCard
          label="Security events"
          value={m?.securityEvents24h ?? "—"}
          sub="Last 24 hours"
          icon={AlertCircle}
          accent={m && m.securityEvents24h > 0 ? "bg-amber-50" : "bg-slate-100"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-section bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <p className="text-[13px] font-semibold text-slate-900">Quick actions</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Suspend users or inspect payment pipeline issues</p>
          </div>
          <MentrixaSeparatorStack surface="dashboard">
            {[
              { href: "/admin/users", label: "Manage users", sub: `${m?.totalUsers ?? 0} total`, icon: Users },
              { href: "/admin/reconciliation", label: "Payment reconciliation", sub: "Stripe and ledger drift", icon: ArrowLeftRight },
              { href: "/admin/settings", label: "Platform settings", sub: "Features, fees, limits", icon: SettingsIcon },
            ].map(({ href, label, sub, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                  <Icon className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800">{label}</p>
                  <p className="text-[11px] text-slate-400">{sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </Link>
            ))}
          </MentrixaSeparatorStack>
        </div>

        <div className="dash-section bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-slate-900">Session activity</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Rolling 30-day window</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Today", value: m?.sessionsToday ?? 0 },
              { label: "This week", value: m?.sessionsWeek ?? 0 },
              { label: "This month", value: m?.sessionsMonth ?? 0 },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                  <p className="text-[18px] font-semibold text-slate-900 leading-none">{value}</p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        label === "Today" ? (value / Math.max(m?.sessionsMonth ?? 1, 1)) * 100 * 30 :
                        label === "This week" ? (value / Math.max(m?.sessionsMonth ?? 1, 1)) * 100 * 4.3 :
                        100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowLeftRight(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 0-14.14 0" />
      <path d="M4.93 19.07a10 10 0 0 0 14.14 0" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.22 4.22 1.42 1.42" />
      <path d="m18.36 18.36 1.42 1.42" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.22 19.78 1.42-1.42" />
      <path d="m18.36 5.64 1.42-1.42" />
    </svg>
  );
}
