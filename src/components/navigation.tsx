"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  { href: "/student/learning-path", label: "Path" },
  { href: "/student/division", label: "Division" },
  { href: "/student/clan", label: "Clan" },
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

function getInitials(displayName: string | null | undefined, email?: string | null) {
  const name = displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const second = parts[1];
      if (first && second) {
        return (first.charAt(0) + second.charAt(0)).toUpperCase();
      }
    }
    if (name.length >= 2) return name.slice(0, 2).toUpperCase();
    return name.charAt(0).toUpperCase();
  }
  if (!email) return "M";
  const part = email.split("@")[0];
  if (!part) return "M";
  if (part.length >= 2) return part.slice(0, 2).toUpperCase();
  return part.charAt(0).toUpperCase();
}

function profilePageHref(role: string | undefined, userId: string): string | null {
  if (role === "student") return `/student/${userId}`;
  if (role === "tutor") return `/tutor/${userId}`;
  return null;
}

function NavAvatarButton({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null | undefined;
  initials: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [avatarUrl]);

  if (avatarUrl && !broken) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="w-8 h-8 rounded-full object-cover border border-white/15 shrink-0"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

interface NavigationProps {
  user: AuthUser | null;
}

/**
 * useSearchParams() must live inside <Suspense> — without it, Next.js 14 defers the
 * entire component as a React.lazy boundary whose webpack chunk can race-fail in dev
 * ("Cannot read properties of undefined (reading 'call')"). Wrapping in Suspense here
 * keeps the lazy boundary isolated and prevents root hydration failures.
 */
function NavigationInner({ user }: NavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navRef = useRef<HTMLElement | null>(null);
  const underlineRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const mobileLinkRefs = useRef<HTMLAnchorElement[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  /** Waitlist / admin not approved yet — show logo + sign out only (matches middleware: no app routes). */
  const appShellLocked = Boolean(user && !user.approved && user.role !== "admin");

  const navItems = useMemo(() => {
    if (!user || appShellLocked) return [];
    return getNavItems(user.role);
  }, [user, appShellLocked]);
  const profileHref = user && !appShellLocked ? profilePageHref(user.role, user.id) : null;
  const initials = user ? getInitials(user.displayName, user.email) : "M";
  const primaryLabel =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "Account";

  const logoHref = appShellLocked
    ? "/"
    : user?.role === "admin"
      ? "/dashboard"
      : user?.role === "tutor"
        ? "/tutor"
        : user
          ? "/student"
          : "/";
  const showRoleLogo = Boolean(
    user && (user.role === "student" || user.role === "tutor") && !appShellLocked,
  );

  const isActive = useCallback((href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/student") return pathname === "/student";
    if (href === "/tutor") return pathname === "/tutor";
    if (href === "/admin?tab=pending")
      return pathname === "/admin" && searchParams.get("tab") === "pending";
    if (href === "/admin?tab=users")
      return pathname === "/admin" && searchParams.get("tab") === "users";
    if (pathname === "/admin" && !searchParams.get("tab")) return href === "/admin?tab=pending";
    return pathname.startsWith(href);
  }, [pathname, searchParams]);

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
  }, [pathname, navItems, isActive]);

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
        <Link href={logoHref} className="flex items-center gap-2 shrink-0">
          {showRoleLogo ? (
            <Image
              src="/mentrixalogo/logo.png"
              alt="Mentrixa"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain"
            />
          ) : null}
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
              <DropdownMenuTrigger
                className="flex items-center gap-2 rounded-full px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                aria-label="Open account menu"
              >
                <NavAvatarButton avatarUrl={user.avatarUrl} initials={initials} />
                <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Account
                  </span>
                  <span className="max-w-[11rem] truncate text-sm font-medium text-slate-100">
                    {primaryLabel}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-slate-900 border border-white/10 text-slate-100"
              >
                <DropdownMenuLabel className="font-normal space-y-0.5 px-2 py-1.5">
                  <span className="block text-sm font-medium text-slate-100 truncate">
                    {primaryLabel}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {profileHref ? (
                  <DropdownMenuItem
                    asChild
                    className="text-slate-100 focus:bg-white/10 focus:text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href={profileHref}>Profile</Link>
                  </DropdownMenuItem>
                ) : null}
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
              {user ? (
                <div className="mt-6 flex items-center gap-3">
                  <NavAvatarButton avatarUrl={user.avatarUrl} initials={initials} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{primaryLabel}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
              ) : null}
              <div
                className={cn(
                  "flex flex-col divide-y divide-white/10",
                  user ? "mt-6" : "mt-8",
                )}
              >
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
              {user ? (
                <div className="mt-6 flex flex-col gap-0 border-t border-white/10 pt-4">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      onClick={() => setMobileOpen(false)}
                      className="py-2.5 text-sm font-medium text-slate-200 hover:text-white"
                    >
                      Profile
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="py-2.5 text-left text-sm font-medium text-red-400 hover:text-red-300"
                    onClick={async () => {
                      setMobileOpen(false);
                      await signOut();
                      window.location.href = "/";
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
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

export function Navigation({ user }: NavigationProps) {
  return (
    <Suspense fallback={null}>
      <NavigationInner user={user} />
    </Suspense>
  );
}

