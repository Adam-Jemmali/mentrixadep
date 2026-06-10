"use client";

import React, { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { cn } from "@/shared/core/utils";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { BubbleText } from "@/shared/ui/bubble-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";

type NavbarProps = {
  children: React.ReactNode;
  className?: string;
  /** When true, do not change nav shell on scroll (keeps top-of-page colors on bright student pages). */
  freezeScrollShell?: boolean;
};

type NavBodyProps = {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  /** Solid dark shell — use on student nav over light pages (no translucent bleed-through). */
  solid?: boolean;
};

type NavItemsProps = {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: (item: { name: string; link: string }) => void;
  onItemPointerDown?: (item: { name: string; link: string }) => void;
  onItemHover?: (item: { name: string; link: string }) => void;
};

type MobileNavProps = {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
};

type MobileNavHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

type MobileNavMenuProps = {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
};

export const Navbar = ({ children, className, freezeScrollShell = false }: NavbarProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (freezeScrollShell) return;

    let raf = 0;
    let lastVisible = false;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const nextVisible = window.scrollY > 8;
        if (nextVisible !== lastVisible) {
          lastVisible = nextVisible;
          setVisible(nextVisible);
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [freezeScrollShell]);

  const shellVisible = freezeScrollShell ? false : visible;

  return (
    <div
      className={cn("sticky inset-x-0 top-20 z-40 w-full", className)}
    >
      {React.Children.map(children, (child) => {
        // Avoid passing custom props like `visible` to raw DOM nodes (<div/>, etc.).
        if (!React.isValidElement(child)) return child;
        if (typeof child.type === "string") return child;
        return React.cloneElement(child as React.ReactElement<{ visible?: boolean }>, {
          visible: shellVisible,
        });
      })}
    </div>
  );
};

export const NavBody = ({ children, className, visible, solid = false }: NavBodyProps) => {
  return (
    <div
      className={cn(
        "relative z-[60] mx-auto hidden min-w-[min(980px,94vw)] w-full flex-row items-center justify-between self-start rounded-full border border-white/10 px-6 py-2 text-white transition-[background-color,box-shadow,transform,max-width] duration-300 ease-out lg:flex",
        solid
          ? "max-w-[min(980px,94vw)] translate-y-0 scale-100 bg-slate-950 shadow-[0_14px_40px_-16px_rgba(2,6,23,0.65)] supports-[backdrop-filter]:bg-slate-950"
          : visible
            ? "max-w-[74%] translate-y-[10px] scale-[0.995] bg-slate-950/82 shadow-[0_10px_36px_rgba(2,6,23,0.22)] supports-[backdrop-filter]:bg-slate-950/72 supports-[backdrop-filter]:backdrop-blur-sm"
            : "max-w-full translate-y-0 scale-100 bg-slate-950/68 shadow-none supports-[backdrop-filter]:backdrop-blur-0",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const NavItems = ({ items, className, onItemClick, onItemPointerDown, onItemHover }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const router = useRouter();
  const tier = useUiPerfTier();

  const navItemClass =
    "hidden flex-1 flex-row items-center justify-center gap-1 text-sm font-medium text-white/70 transition-colors duration-150 ease-out hover:text-white lg:flex";

  const links = items.map((item, idx) => (
    <Link
      key={item.link}
      href={item.link}
      prefetch
      onMouseEnter={() => {
        setHovered(idx);
        router.prefetch(item.link);
        onItemHover?.(item);
      }}
      onPointerDown={() => onItemPointerDown?.(item)}
      onClick={() => onItemClick?.(item)}
      className="relative px-4 py-2 text-[13px] text-current transition-opacity duration-150 ease-out hover:opacity-100"
    >
      {hovered === idx &&
        (tier === "lite" ? (
          <span className="absolute inset-0 h-full w-full rounded-full bg-white/10" />
        ) : (
          <motion.div
            layoutId="hovered"
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-0 h-full w-full rounded-full bg-white/10"
          />
        ))}
      <span className="relative z-20">
        <BubbleText text={item.name} className="text-current" />
      </span>
    </Link>
  ));

  return tier === "lite" ? (
    <div className={cn(navItemClass, className)} onMouseLeave={() => setHovered(null)}>
      {links}
    </div>
  ) : (
    <motion.div className={cn(navItemClass, className)} onMouseLeave={() => setHovered(null)}>
      {links}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <div
      className={cn(
        "relative z-50 mx-auto flex w-full flex-col items-center justify-between py-2 text-white transition-[background-color,box-shadow,max-width,padding,border-radius] duration-300 ease-out lg:hidden",
        visible
          ? "max-w-[92%] rounded px-3 bg-slate-950/55 shadow-[0_10px_30px_rgba(2,6,23,0.24)]"
          : "max-w-[calc(100vw-2rem)] rounded-[2rem] px-0 bg-transparent shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavHeader = ({ children, className }: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between rounded-2xl border border-white/22 bg-slate-950/[0.94] px-4 py-3 text-white max-md:shadow-[0_8px_24px_rgba(2,6,23,0.55)] md:border-white/20 md:bg-slate-950/88 md:shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({ children, className, isOpen, onClose }: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg border border-white/20 bg-slate-950 px-4 py-8 text-white shadow-[0_0_24px_rgba(2,_6,_23,_0.28),_0_1px_1px_rgba(0,_0,_0,_0.2),_0_0_0_1px_rgba(148,_163,_184,_0.08),_0_0_4px_rgba(2,_6,_23,_0.24),_0_16px_68px_rgba(2,_6,_23,_0.28),_0_1px_0_rgba(255,_255,_255,_0.06)_inset]",
          className,
        )}
      >
        {children}
        <button type="button" onClick={onClose} className="sr-only" aria-hidden="true" tabIndex={-1} />
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white transition-colors hover:bg-white/10"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {isOpen ? <IconX className="h-5 w-5" /> : <IconMenu2 className="h-5 w-5" />}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white">
      <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
      <MentrixaWordmark trixaClassName="text-white" />
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as,
  children,
  className,
  variant = "primary",
  prefetch,
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
  /** Next.js Link only — omitted for plain `<button>` / custom `as`. */
  prefetch?: boolean;
} & Omit<
  React.ComponentPropsWithoutRef<"a"> & React.ComponentPropsWithoutRef<"button">,
  "prefetch"
>) => {
  const variantStyles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    dark: "bg-black text-white hover:bg-slate-900",
    gradient: "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 text-white hover:opacity-95",
  } as const;

  const sharedClassName = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors duration-200",
    variantStyles[variant],
    className,
  );

  const Tag = as ?? (href ? Link : "button");

  if (Tag === Link && href) {
    return (
      <Link href={href} prefetch={prefetch} className={sharedClassName} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <Tag href={href || undefined} className={sharedClassName} {...props}>
      {children}
    </Tag>
  );
};
