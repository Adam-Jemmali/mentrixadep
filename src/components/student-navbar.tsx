"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

  const initials = user ? getInitials(user.displayName, user.email) : "M";
  const profileHref = user ? `/student/${user.id}` : "/student";

  return (
    <Navbar className="student-nav fixed top-3 left-0 right-0 z-40 px-3 sm:px-5">
      <div className="relative w-full">
        {/* Desktop Navbar */}
        <NavBody>
          <a href="/student" className="flex items-center gap-2.5 shrink-0">
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
            <MentrixaWordmark trixaClassName="text-white" />
          </a>
          
          <NavItems 
            items={STUDENT_NAV_ITEMS}
            onItemClick={() => setMobileNavOpen(false)}
          />

          {/* Profile Menu */}
          <div ref={menuRef} className="relative ml-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition"
              aria-label="Open profile menu"
              aria-expanded={profileMenuOpen}
            >
              <ProfileAvatar avatarUrl={user?.avatarUrl} initials={initials} />
            </button>

            {profileMenuOpen && (
              <div className="absolute top-full right-0 z-50 mt-2 rounded-xl border border-white/20 bg-gradient-to-b from-[#1a3a52] to-[#0d1c35] shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] overflow-hidden min-w-[200px]">
                <Link
                  href={profileHref}
                  onClick={() => setProfileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10 hover:text-white"
                >
                  View Profile
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await signOut();
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:bg-white/10 hover:text-white border-t border-white/10"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </NavBody>

        {/* Mobile Navbar */}
        <MobileNav>
          <div className="relative w-full">
            <MobileNavHeader>
              <a href="/student" className="flex items-center gap-2.5 shrink-0">
                <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
                <MentrixaWordmark trixaClassName="text-white" />
              </a>
              <div className="relative z-[70] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center justify-center rounded-full border border-white/15 bg-white/5 p-1 transition hover:bg-white/15"
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
              <div className="absolute right-0 top-full z-[80] mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-white/20 bg-gradient-to-b from-[#1a3a52] to-[#0d1c35] shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)]">
                <Link
                  href={profileHref}
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileNavOpen(false);
                  }}
                  className="block px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-white"
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
                  className="w-full border-t border-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10 hover:text-white"
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
                  {item.name}
                </Link>
              ))}
            </MobileNavMenu>
          </div>
        </MobileNav>
      </div>
    </Navbar>
  );
}
