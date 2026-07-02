"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { signOut } from "@/features/auth/auth";
import type { AuthUser } from "@/shared/core/auth";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/shared/ui/resizable-navbar";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { NavProfileAvatar } from "@/components/nav-profile-avatar";
import { useProfileBadgeCount } from "@/shared/hooks/use-profile-badge-count";
import { StudentNavRankStrip } from "@/features/student-profile/ui/student-nav-rank-strip";
import { ArenaMusicMuteToggle } from "@/features/student-profile/ui/arena-music-mute-toggle";
import {
  bindDuelAudioElement,
  DUEL_SOUND_SRC,
  ensureDuelLoopPlaying,
  isArenaPath,
  preloadDuelSound,
  startDuelLoopFromGesture,
  stopDuelLoop,
} from "@/features/duels/duel-audio-controller";
import {
  playMentrixaLoadingOnce,
  unlockMentrixaAudioFromUserGesture,
} from "@/shared/integrations/mentrixa-sounds";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Solid shell — light profile/workbench pages must not bleed through the bar. */
const STUDENT_NAV_DESKTOP_SHELL =
  "!bg-slate-950 border-indigo-400/20 shadow-[0_14px_40px_-16px_rgba(2,6,23,0.75)]";
const STUDENT_NAV_MOBILE_HEADER_SHELL =
  "!bg-slate-950 border-white/15 shadow-[0_10px_30px_-16px_rgba(2,6,23,0.75)] md:!bg-slate-950";

const ARENA_NAV_LINKS = new Set(["/student/duel", "/student/division"]);

function isArenaNavLink(link: string): boolean {
  return ARENA_NAV_LINKS.has(link);
}

const STUDENT_NAV_ITEMS: { name: string; link: string; icon: VocabIconName }[] = [
  { name: "Home", link: "/student", icon: "home" },
  { name: "Skills", link: "/student/mastery", icon: "skills" },
  { name: "Quest", link: "/student/quest", icon: "quest" },
  { name: "League", link: "/student/division", icon: "league" },
  { name: "Duels", link: "/student/duel", icon: "duels" },
];

function navItemIcon(name: VocabIconName, label: string, size = 26) {
  return (
    <MentrixaVocabIcon
      name={name}
      size={size}
      surface="dark"
      title={label}
    />
  );
}

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

function ProfileAvatar({
  avatarUrl,
  initials,
  badgeCount,
}: {
  avatarUrl: string | null | undefined;
  initials: string;
  badgeCount: number;
}) {
  return (
    <NavProfileAvatar
      avatarUrl={avatarUrl}
      initials={initials}
      badgeCount={badgeCount}
      badgeNoun="pending session request"
    />
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
  const profileBadgeCount = useProfileBadgeCount(user?.id, user?.role ?? "student");

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
            items={STUDENT_NAV_ITEMS.map((item) => ({
              ...item,
              icon: navItemIcon(item.icon, item.name),
              iconOnly: true,
            }))}
            onItemClick={handleNavItemClick}
            onItemPointerDown={handleArenaNavPointerDown}
            onItemHover={handleArenaNavHover}
            isActive={isActive}
          />

          {/* Rank, XP & streak */}
          <div className="ml-2 hidden items-center gap-2 sm:ml-4 md:flex">
            <StudentNavRankStrip />
            <ArenaMusicMuteToggle />
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
              <ProfileAvatar avatarUrl={user?.avatarUrl} initials={initials} badgeCount={profileBadgeCount} />
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
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  <MentrixaVocabIcon name="profile" size={18} surface="light" />
                  View Profile
                </Link>
                <Link
                  href="/student/subscribe"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  <MentrixaVocabIcon name="momentum-membership" size={18} surface="light" />
                  Momentum membership
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
                  <ProfileAvatar avatarUrl={user?.avatarUrl} initials={initials} badgeCount={profileBadgeCount} />
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
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  <MentrixaVocabIcon name="profile" size={18} surface="light" />
                  View Profile
                </Link>
                <Link
                  href="/student/subscribe"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  <MentrixaVocabIcon name="momentum-membership" size={18} surface="light" />
                  Momentum membership
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
                  aria-label={item.name}
                  title={item.name}
                  onPointerDown={() => handleArenaNavPointerDown(item)}
                  onMouseEnter={() => handleArenaNavHover(item)}
                  onClick={() => handleNavItemClick(item)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg px-4 py-3 transition-colors",
                    isActive(item.link)
                      ? "border border-violet-400/50 bg-gradient-to-r from-[#7C3AED]/35 to-[#6366F1]/35 text-white"
                      : "text-white/95 hover:bg-violet-500/10 hover:text-white"
                  )}
                >
                  {navItemIcon(item.icon, item.name, 30)}
                  <span className="sr-only">{item.name}</span>
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
