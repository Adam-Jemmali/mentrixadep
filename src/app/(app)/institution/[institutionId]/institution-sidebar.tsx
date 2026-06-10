"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  CreditCard,
  Settings,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/shared/core/utils";
import type { Institution } from "@/shared/types/database";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-500",
  basic: "bg-blue-50 text-blue-600",
  pro: "bg-violet-50 text-violet-700",
};

export function InstitutionSidebar({ institution }: { institution: Institution }) {
  const pathname = usePathname();
  const base = `/institution/${institution.id}`;

  const NAV = [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/members`, label: "Members", icon: Users },
    { href: `${base}/usage`, label: "Usage", icon: BarChart2 },
    { href: `${base}/billing`, label: "Billing", icon: CreditCard },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          {institution.logo_url ? (
            <Image
              src={institution.logo_url}
              alt={institution.name}
              width={32}
              height={32}
              unoptimized
              className="w-8 h-8 rounded-md object-contain border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" strokeWidth={1.8} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 leading-none truncate">
              {institution.name}
            </p>
            <span
              className={cn(
                "inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                PLAN_COLORS[institution.plan] ?? PLAN_COLORS.free
              )}
            >
              {PLAN_LABELS[institution.plan] ?? institution.plan}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 group",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )}
                strokeWidth={1.8}
              />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-slate-400" strokeWidth={2} />}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#E5E7EB]">
        <p className="text-[10px] text-slate-400 font-mono">{institution.domain}</p>
        <Link
          href="/"
          className="mt-1.5 block text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Back to Mentrixa
        </Link>
      </div>
    </aside>
  );
}
