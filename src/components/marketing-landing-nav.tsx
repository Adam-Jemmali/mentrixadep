"use client";

import { useState, memo } from "react";
import Image from "next/image";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
  NavbarLogo,
} from "@/components/ui/resizable-navbar";

const ICON_VERSION = "20260410";

const LANDING_NAV_ITEMS = [
  { name: "Features", link: "#features" },
  { name: "Ranks", link: "#ranks" },
  { name: "Why now", link: "#why" },
  { name: "Flow", link: "#flow" },
  { name: "Pricing", link: "#pricing" },
  { name: "Contact", link: "#contact" },
  { name: "Sign in", link: "/auth/signin?signin=1" },
];

const RoleIcon = memo(function RoleIcon({
  role,
  className = "",
}: {
  role: "mentrixer" | "guide";
  className?: string;
}) {
  return (
    <span className={`relative inline-block size-4 shrink-0 ${className}`} aria-hidden>
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        width={16}
        height={16}
        unoptimized
        className="size-full object-contain"
        sizes="16px"
      />
    </span>
  );
});

/** Fixed landing nav — mounted at the top of `/` so the logo LCP/preload is consumed immediately. */
export function MarketingLandingNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Navbar className="lp-nav fixed top-3 left-0 right-0 z-50 px-3 sm:px-5">
      <div className="relative w-full">
        <NavBody className="rounded-2xl border border-white/10 bg-slate-950/55 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <NavbarLogo />
          <NavItems items={LANDING_NAV_ITEMS} />
          <div className="flex shrink-0 items-center gap-2">
            <NavbarButton
              href="/auth/signup?role=tutor"
              variant="secondary"
              className="hidden sm:inline-flex"
              prefetch={false}
            >
              <RoleIcon role="guide" />
              Earn as a Guide
            </NavbarButton>
            <NavbarButton href="/auth/signup" variant="primary" className="hidden sm:inline-flex" prefetch={false}>
              <RoleIcon role="mentrixer" className="brightness-0 invert" />
              Prove what you know
            </NavbarButton>
          </div>
        </NavBody>

        <MobileNav>
          <div className="relative w-full">
            <MobileNavHeader>
              <NavbarLogo />
              <MobileNavToggle isOpen={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)} />
            </MobileNavHeader>

            <MobileNavMenu isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
              {LANDING_NAV_ITEMS.map((item) => (
                <a
                  key={item.link}
                  href={item.link}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/8 hover:text-white"
                >
                  {item.name}
                </a>
              ))}

              <div className="mt-2 flex flex-col gap-2">
                <NavbarButton href="/auth/signup?role=tutor" variant="secondary" className="w-full" prefetch={false}>
                  <RoleIcon role="guide" />
                  Earn as a Guide
                </NavbarButton>
                <NavbarButton href="/auth/signup" variant="primary" className="w-full" prefetch={false}>
                  <RoleIcon role="mentrixer" className="brightness-0 invert" />
                  Prove what you know
                </NavbarButton>
              </div>
            </MobileNavMenu>
          </div>
        </MobileNav>
      </div>
    </Navbar>
  );
}
