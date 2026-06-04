"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
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
import { StudentNavRankStrip } from "@/components/student/student-nav-rank-strip";
import { ArenaMusicMuteToggle } from "@/components/student/arena-music-mute-toggle";
import {
  bindDuelAudioElement,
  DUEL_SOUND_SRC,
  ensureDuelLoopPlaying,
  isArenaPath,
  preloadDuelSound,
  startDuelLoopFromGesture,
  stopDuelLoop,
} from "@/lib/duel-audio-controller";
import {
  playMentrixaLoadingOnce,
  unlockMentrixaAudioFromUserGesture,
} from "@/lib/mentrixa-sounds";

const BubbleText = dynamic(
  () => import("@/components/ui/bubble-text").then((m) => ({ default: m.BubbleText })),
  { ssr: false, loading: () => null },
);
const SecurityShield = dynamic(
  () => import("@/components/security/SecurityShield").then((m) => ({ default: m.SecurityShield })),
  { ssr: false, loading: () => null },
);

/** Solid shell — light profile/workbench pages must not bleed through the bar. */
const STUDENT_NAV_DESKTOP_SHELL =
  "!bg-slate-950 border-indigo-400/20 shadow-[0_14px_40px_-16px_rgba(2,6,23,0.75)]";
const STUDENT_NAV_MOBILE_HEADER_SHELL =
  "!bg-slate-950 border-white/15 shadow-[0_10px_30px_-16px_rgba(2,6,23,0.75)] md:!bg-slate-950";

const ARENA_NAV_LINKS = new Set(["/student/duel", "/student/clan"]);

function isArenaNavLink(link: string): boolean {
  return ARENA_NAV_LINKS.has(link);
}

const STUDENT_NAV_ITEMS = [
  { name: "Home", link: "/student" },
  { name: "Quest", link: "/student/quest" },
  { name: "Path", link: "/student/learning-path" },
  { name: "League", link: "/student/division" },
  { name: "Duels", link: "/student/duel" },
  { name: "Clan", link: "/student/clan" },
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
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const bindDuelRef = (el: HTMLAudioElement | null) => {
    bindDuelAudioElement(el);
  };

  useEffect(() => {
    if (isArenaPath(pathname)) ensureDuelLoopPlaying();
    else stopDuelLoop();
  }, [pathname]);

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

  const playHomeLoadingSound = () => {
    unlockMentrixaAudioFromUserGesture();
    playMentrixaLoadingOnce();
  };

  const playArenaDuelSound = () => {
    startDuelLoopFromGesture();
  };

  const handleArenaNavPointerDown = (item: { name: string; link: string }) => {
    if (!isArenaNavLink(item.link)) return;
    startDuelLoopFromGesture();
  };

  const handleArenaNavHover = (item: { name: string; link: string }) => {
    if (!isArenaNavLink(item.link)) return;
    preloadDuelSound();
  };

  const handleNavItemClick = (item: { name: string; link: string }) => {
    setMobileNavOpen(false);
    if (item.link === "/student") playHomeLoadingSound();
    else if (isArenaNavLink(item.link)) playArenaDuelSound();
  };

  const initials = user ? getInitials(user.displayName, user.email) : "M";
  const profileHref = user ? `/student/${user.id}` : "/student";

  useEffect(() => {
    router.prefetch("/student");
    for (const item of STUDENT_NAV_ITEMS) router.prefetch(item.link);
    if (user?.id) router.prefetch(`/student/${user.id}`);
  }, [router, user?.id]);

  return (
    <>
      <audio
        ref={bindDuelRef}
        src={DUEL_SOUND_SRC}
        loop
        preload="auto"
        playsInline
        className="hidden"
        aria-hidden
      />
    <Navbar
      freezeScrollShell
      className="student-nav fixed top-0 left-0 right-0 z-[100] px-3 pb-3 pt-3 sm:px-5"
    >
      <div className="relative w-full">
        {/* Desktop Navbar */}
        <NavBody solid className={STUDENT_NAV_DESKTOP_SHELL}>
          <Link href="/student" className="flex items-center gap-2.5 shrink-0" onClick={playHomeLoadingSound}>
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
            <MentrixaWordmark trixaClassName="text-white" />
          </Link>
          
          <NavItems 
            items={STUDENT_NAV_ITEMS}
            onItemClick={handleNavItemClick}
            onItemPointerDown={handleArenaNavPointerDown}
            onItemHover={handleArenaNavHover}
          />

          {/* Rank, XP, streak & security */}
          <div className="ml-2 hidden items-center gap-2 sm:ml-4 md:flex">
            <StudentNavRankStrip />
            <ArenaMusicMuteToggle />
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
                <ArenaMusicMuteToggle variant="menu" />
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
        <MobileNav className="max-w-[calc(100vw-2rem)] bg-transparent shadow-none">
          <div className="relative w-full">
            <MobileNavHeader className={STUDENT_NAV_MOBILE_HEADER_SHELL}>
              <Link href="/student" className="flex items-center gap-2.5 shrink-0" onClick={playHomeLoadingSound}>
                <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" />
                <MentrixaWordmark trixaClassName="text-white" />
              </Link>
              <div className="relative z-[70] flex items-center gap-2">
                <ArenaMusicMuteToggle className="h-8 w-8 sm:hidden" />
                <div className="flex shrink-0 sm:hidden scale-[0.92] origin-right">
                  <StudentNavRankStrip />
                </div>
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
                <div className="border-t border-slate-100">
                  <ArenaMusicMuteToggle variant="menu" />
                </div>
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
                  onPointerDown={() => handleArenaNavPointerDown(item)}
                  onMouseEnter={() => handleArenaNavHover(item)}
                  onClick={() => handleNavItemClick(item)}
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
    </>
  );
}
