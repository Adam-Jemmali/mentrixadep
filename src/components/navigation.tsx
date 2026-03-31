"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { gsap } from "gsap";
import type { AuthUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staggerIn } from "@/lib/gsap";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";

const STUDENT_LINKS = [
  { href: "/student/quest", label: "Quest" },
  { href: "/student/division", label: "Division" },
  { href: "/student/duel", label: "Duels" },
  { href: "/student", label: "Sessions" },
] as const;

const TUTOR_LINKS = [
  { href: "/tutor/sessions-ai", label: "Studio" },
  { href: "/tutor", label: "Sessions" },
] as const;

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin?tab=pending", label: "Registrations" },
  { href: "/admin?tab=users", label: "Users" },
] as const;

function getNavItems(role: string | null | undefined) {
  if (role === "admin") return ADMIN_LINKS;
  if (role === "tutor") return TUTOR_LINKS;
  return STUDENT_LINKS;
}

function getInitials(email?: string | null) {
  if (!email) return "M";
  const part = email.split("@")[0];
  if (!part) return "M";
  if (part.length >= 2) return part.slice(0, 2).toUpperCase();
  return part.charAt(0).toUpperCase();
}

interface NavigationProps {
  user: AuthUser | null;
}

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navRef = useRef<HTMLElement | null>(null);
  const underlineRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const mobileLinkRefs = useRef<HTMLAnchorElement[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user ? getNavItems(user.role) : [];
  const logoHref =
    user?.role === "admin"
      ? "/dashboard"
      : user?.role === "tutor"
        ? "/tutor"
        : user
          ? "/student"
          : "/";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/student") return pathname === "/student";
    if (href === "/tutor") return pathname === "/tutor";
    if (href === "/admin?tab=pending")
      return pathname === "/admin" && searchParams.get("tab") === "pending";
    if (href === "/admin?tab=users")
      return pathname === "/admin" && searchParams.get("tab") === "users";
    if (pathname === "/admin" && !searchParams.get("tab")) return href === "/admin?tab=pending";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    if (!navRef.current) return;
    gsap.fromTo(
      navRef.current,
      { y: -56 },
      { y: 0, duration: 0.5, ease: "power3.out", delay: 0.1 },
    );
  }, []);

  useEffect(() => {
    navItems.forEach((item) => {
      const ref = underlineRefs.current[item.href];
      if (!ref) return;
      if (isActive(item.href)) {
        gsap.set(ref, { scaleX: 1 });
      } else {
        gsap.set(ref, { scaleX: 0 });
      }
    });
  }, [pathname, navItems]);

  useEffect(() => {
    if (mobileOpen && mobileLinkRefs.current.length > 0) {
      staggerIn(mobileLinkRefs.current);
    }
  }, [mobileOpen]);

  const handleHover = (href: string, enter: boolean) => {
    const ref = underlineRefs.current[href];
    if (!ref) return;
    if (isActive(href)) return;
    gsap.to(ref, {
      scaleX: enter ? 1 : 0,
      duration: enter ? 0.25 : 0.2,
      ease: enter ? "power2.out" : "power2.in",
    });
  };

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900/90 backdrop-blur-md border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href={logoHref} className="flex items-center shrink-0">
          <MentrixaWordmark trixaClassName="text-white/95" />
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center h-9"
                onMouseEnter={() => handleHover(item.href, true)}
                onMouseLeave={() => handleHover(item.href, false)}
              >
                <span
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors",
                    active && "text-white font-semibold",
                  )}
                >
                  {item.label}
                </span>
                <span
                  ref={(el) => {
                    underlineRefs.current[item.href] = el;
                  }}
                  className="absolute bottom-0 left-3 right-3 h-px bg-sky-400/90 origin-left"
                  style={{ transform: "scaleX(0)" }}
                />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-sky-400/50">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold flex items-center justify-center">
                  {getInitials(user.email)}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-slate-900 border border-white/10 text-slate-100"
              >
                <DropdownMenuLabel className="text-xs text-slate-500 truncate">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  asChild
                  className="text-slate-100 focus:bg-white/10 focus:text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300 focus:bg-red-950/40 cursor-pointer"
                  onSelect={async (e) => {
                    e.preventDefault();
                    await signOut();
                    window.location.href = "/";
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-slate-400 hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold text-slate-900 bg-white px-4 py-2 rounded-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
              >
                Get started
              </Link>
            </div>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex flex-col justify-center gap-1 h-8 w-8 items-center"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              <span
                className={cn(
                  "block w-[18px] h-px bg-white transition-transform duration-200 origin-center",
                  mobileOpen && "translate-y-[6px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block w-[18px] h-px bg-white transition-all duration-200",
                  mobileOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "block w-[18px] h-px bg-white transition-transform duration-200 origin-center",
                  mobileOpen && "-translate-y-[6px] -rotate-45",
                )}
              />
            </button>
            <SheetContent
              side="right"
              className="pt-8 px-6 bg-slate-900 border-l border-white/10 text-white"
            >
              <SheetHeader>
                <SheetTitle className="text-left">
                  <MentrixaWordmark trixaClassName="text-white/95" />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col divide-y divide-white/10">
                {(user ? navItems : STUDENT_LINKS).map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    ref={(el) => {
                      if (el) {
                        mobileLinkRefs.current[index] = el;
                      }
                    }}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-base font-medium text-slate-200 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {!user && (
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileOpen(false)}
                    className="py-2 text-sm font-medium text-slate-400 hover:text-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="text-center text-sm font-semibold text-slate-900 bg-white px-4 py-2.5 rounded-lg"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

