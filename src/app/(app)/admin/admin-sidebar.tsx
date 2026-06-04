"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  ShieldCheck,
  ChevronRight,
  BadgeCheck,
  BarChart2,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/reconciliation", label: "Reconciliation", icon: ArrowLeftRight },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 leading-none">Admin</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Mentrixa Platform</p>
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
                className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")}
                strokeWidth={1.8}
              />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-slate-400" strokeWidth={2} />}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#E5E7EB]">
        <Link
          href="/"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Back to platform
        </Link>
      </div>
    </aside>
  );
}
