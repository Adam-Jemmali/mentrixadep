"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { onXpAward } from "@/lib/xp-events";
import type { AuthUser } from "@/lib/auth";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { XpCounter } from "@/components/xp-counter";
import { BubbleText } from "@/components/ui/bubble-text";
import { SecurityShield } from "@/components/security/SecurityShield";

/** Same solid shell as tutor Studio — onboarding tours stay at scroll top so default nav would look washed over bright pages. */
const ONBOARDING_SOLID_NAV_DESKTOP =
  "bg-black/90 supports-[backdrop-filter]:bg-black/85 shadow-[0_10px_36px_rgba(0,0,0,0.45)]";
const ONBOARDING_SOLID_NAV_MOBILE =
  "bg-black/70 shadow-[0_10px_30px_rgba(0,0,0,0.38)]";

const STUDENT_NAV_ITEMS = [
  { name: "Sessions", link: "/student" },
  { name: "Quest", link: "/student/quest" },
  { name: "Path", link: "/student/learning-path" },
  { name: "Division", link: "/student/division" },
  { name: "Clan", link: "/student/clan" },
  { name: "Duels", link: "/student/duel" },
];

function getInitials(displayName: string | null | undefined, email?: string | null): string {
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

function ProfileAvatar({ avatarUrl, initials }: { avatarUrl: string | null | undefined; initials: string }) {
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
        className="h-8 w-8 rounded-full object-cover border border-white/15 shrink-0"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white">
      {initials}
    </div>
  );
}

interface StudentNavbarProps {
  user: AuthUser | null;
}

export function StudentNavbar({ user }: StudentNavbarProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onboardingTour = searchParams.get("onboarding") === "true";

  // Fetch current XP on mount
  useEffect(() => {
    const fetchXp = async () => {
      try {
        const res = await fetch("/api/student/pwa-context", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { totalXp?: number };
        setTotalXp(data.totalXp ?? 0);
      } catch (e) {
        console.error("[StudentNavbar] failed to fetch XP", e);
      }
    };
    void fetchXp();
  }, []);

  // Listen for XP awards and update total
  useEffect(() => {
    const unsubscribe = onXpAward((event) => {
      if (event.totalXp != null) {
        setTotalXp(event.totalXp);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [profileMenuOpen]);

  const isActive = (link: string) => {
    if (link === "/student") {
      return pathname === "/student" || pathname === "/student/";
    }
    return pathname === link || pathname.startsWith(`${link}/`);
  };

  const toggleProfileMenu = () => {
    setMobileNavOpen(false);
    setProfileMenuOpen((open) => !open);
  };

  const initials = user ? getInitials(user.displayName, user.email) : "M";
  const profileHref = user ? `/student/${user.id}` : "/student";

  useEffect(() => {
    router.prefetch("/student");
    for (const item of STUDENT_NAV_ITEMS) router.prefetch(item.link);
    if (user?.id) router.prefetch(`/student/${user.id}`);
  }, [router, user?.id]);

  return (
    <Navbar className="student-nav fixed top-3 left-0 right-0 z-40 px-3 sm:px-5">
      <div className="relative w-full">
        {/* Desktop Navbar */}
        <NavBody className={onboardingTour ? ONBOARDING_SOLID_NAV_DESKTOP : undefined}>
          <Link href="/student" className="flex items-center gap-2.5 shrink-0">
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
            <MentrixaWordmark trixaClassName="text-white" />
          </Link>
          
          <NavItems 
            items={STUDENT_NAV_ITEMS}
            onItemClick={() => setMobileNavOpen(false)}
          />

          {/* XP Counter & Security Status */}
          <div className="ml-4 flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition">
              <XpCounter totalXp={totalXp} />
            </div>
            <div className="hidden lg:block px-2 py-1 rounded-full bg-white/5 border border-white/5 hover:border-white/10 transition">
              <SecurityShield />
            </div>
          </div>

          {/* Profile Menu */}
          <div ref={menuRef} className="relative ml-auto flex-shrink-0">
            <button
              type="button"
              onClick={toggleProfileMenu}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-white/10"
              aria-label="Open profile menu"
              aria-expanded={profileMenuOpen}
            >
              <ProfileAvatar avatarUrl={user?.avatarUrl} initials={initials} />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_40px_-20px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <MentrixaLogoMark size="sm" className="shrink-0" />
                  <MentrixaWordmark trixaClassName="text-slate-900 text-xs" />
                </div>
                <Link
                  href={profileHref}
                  onClick={() => setProfileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  View Profile
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await signOut();
                  }}
                  className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </NavBody>

        {/* Mobile Navbar */}
        <MobileNav className={onboardingTour ? ONBOARDING_SOLID_NAV_MOBILE : undefined}>
          <div className="relative w-full">
            <MobileNavHeader>
              <Link href="/student" className="flex items-center gap-2.5 shrink-0">
                <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
                <MentrixaWordmark trixaClassName="text-white" />
              </Link>
              <div className="relative z-[70] flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleProfileMenu}
                  className="flex items-center justify-center rounded-full p-1 transition hover:bg-white/10"
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                >
                  <ProfileAvatar avatarUrl={user?.avatarUrl} initials={initials} />
                </button>
                <MobileNavToggle isOpen={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)} />
              </div>
            </MobileNavHeader>

            {/* Mobile Profile Menu */}
            {profileMenuOpen && (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_40px_-20px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <MentrixaLogoMark size="sm" className="shrink-0" />
                  <MentrixaWordmark trixaClassName="text-slate-900 text-xs" />
                </div>
                <Link
                  href={profileHref}
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileNavOpen(false);
                  }}
                  className="block px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  View Profile
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    setMobileNavOpen(false);
                    await signOut();
                  }}
                  className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </div>
            )}

            <MobileNavMenu isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
              {STUDENT_NAV_ITEMS.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.link)
                      ? "bg-white/20 text-white"
                      : "text-white/95 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <BubbleText text={item.name} className="text-current" />
                </Link>
              ))}
            </MobileNavMenu>
          </div>
        </MobileNav>
      </div>
    </Navbar>
  );
}
