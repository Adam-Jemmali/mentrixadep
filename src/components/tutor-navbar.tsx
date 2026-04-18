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

const TUTOR_NAV_ITEMS = [
  { name: "Studio", link: "/tutor/sessions-ai" },
  { name: "Sessions", link: "/tutor" },
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
  if (!email) return "G";
  const part = email.split("@")[0];
  if (!part) return "G";
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

interface TutorNavbarProps {
  user: AuthUser | null;
}

export function TutorNavbar({ user }: TutorNavbarProps) {
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
    if (link === "/tutor") {
      return pathname === "/tutor" || pathname === "/tutor/";
    }
    return pathname === link || pathname.startsWith(`${link}/`);
  };

  const initials = user ? getInitials(user.displayName, user.email) : "G";
  const profileHref = user ? `/tutor/${user.id}` : "/tutor";

  return (
    <Navbar className="tutor-nav fixed top-3 left-0 right-0 z-40 px-3 sm:px-5">
      <div className="relative w-full">
        {/* Desktop Navbar */}
        <NavBody>
          <a href="/tutor" className="flex items-center gap-2.5 shrink-0">
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
            <MentrixaWordmark trixaClassName="text-white" />
          </a>
          
          <NavItems 
            items={TUTOR_NAV_ITEMS}
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
              <div className="absolute top-full right-0 z-50 mt-2 rounded-xl border border-slate-200 bg-white shadow-[0_10px_40px_-20px_rgba(0,0,0,0.2)] overflow-hidden min-w-[240px]">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
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
                  className="w-full px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50 border-t border-slate-100"
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
              <a href="/tutor" className="flex items-center gap-2.5 shrink-0">
                <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
                <MentrixaWordmark trixaClassName="text-white" />
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center justify-center rounded-full hover:bg-white/10 transition p-1"
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
              <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-[0_10px_40px_-20px_rgba(0,0,0,0.2)] overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
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
                  className="w-full px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50 border-t border-slate-100"
                >
                  Sign Out
                </button>
              </div>
            )}

            <MobileNavMenu isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
              {TUTOR_NAV_ITEMS.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.link)
                      ? "bg-white/15 text-white"
                      : "text-slate-200 hover:bg-white/5 hover:text-white"
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
