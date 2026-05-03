"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { BubbleText } from "@/components/ui/bubble-text";

type NavbarProps = {
  children: React.ReactNode;
  className?: string;
};

type NavBodyProps = {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
};

type NavItemsProps = {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
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

export const Navbar = ({ children, className }: NavbarProps) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 8);
  });

  return (
    <motion.div
      className={cn("sticky inset-x-0 top-20 z-40 w-full", className)}
    >
      {React.Children.map(children, (child) => {
        // Avoid passing custom props like `visible` to raw DOM nodes (<div/>, etc.).
        if (!React.isValidElement(child)) return child;
        if (typeof child.type === "string") return child;
        return React.cloneElement(child as React.ReactElement<{ visible?: boolean }>, { visible });
      })}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  const { scrollY } = useScroll();
  const widthRaw = useTransform(scrollY, [0, 260], ["100%", "74%"]);
  const yRaw = useTransform(scrollY, [0, 260], [0, 10]);
  const scaleRaw = useTransform(scrollY, [0, 260], [1, 0.995]);
  const width = useSpring(widthRaw, { stiffness: 220, damping: 34 });
  const y = useSpring(yRaw, { stiffness: 220, damping: 34 });
  const scale = useSpring(scaleRaw, { stiffness: 220, damping: 34 });

  return (
    <motion.div
      transition={{ type: "spring", stiffness: 200, damping: 50 }}
      style={{ minWidth: "min(980px, 94vw)", width, y, scale }}
      className={cn(
        "relative z-[60] mx-auto hidden flex-row items-center justify-between self-start rounded-full border border-white/10 px-6 py-2 text-white transition-[background-color,backdrop-filter,box-shadow] duration-300 ease-out lg:flex",
        visible
          ? "bg-slate-950/55 backdrop-blur-[10px] shadow-[0_0_24px_rgba(34,42,53,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04),0_0_4px_rgba(34,42,53,0.08),0_16px_68px_rgba(47,48,55,0.05),0_1px_0_rgba(255,255,255,0.1)_inset]"
          : "bg-slate-950/45 shadow-none backdrop-blur-none",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "hidden flex-1 flex-row items-center justify-center gap-1 text-sm font-medium text-white/70 transition duration-200 hover:text-white lg:flex",
        className,
      )}
    >
      {items.map((item, idx) => (
        <a
          key={`link-${idx}`}
          href={item.link}
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative px-4 py-2 text-[13px] text-current"
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-white/10"
            />
          )}
          <span className="relative z-20">
            <BubbleText text={item.name} className="text-current" />
          </span>
        </a>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  const { scrollY } = useScroll();
  const widthRaw = useTransform(scrollY, [0, 220], ["100%", "92%"]);
  // Keep mobile navbar text crisp by avoiding Y transforms on the container.
  const yRaw = useTransform(scrollY, [0, 220], [0, 0]);
  const width = useSpring(widthRaw, { stiffness: 220, damping: 34 });
  const y = useSpring(yRaw, { stiffness: 220, damping: 34 });

  return (
    <motion.div
      animate={{
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "4px" : "2rem",
      }}
      transition={{ type: "spring", stiffness: 200, damping: 50 }}
      style={{ width, y }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between px-0 py-2 text-white transition-[background-color,box-shadow] duration-300 ease-out lg:hidden",
        visible
          ? "bg-slate-950/55 shadow-[0_0_24px_rgba(34,42,53,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04),0_0_4px_rgba(34,42,53,0.08),0_16px_68px_rgba(47,48,55,0.05),0_1px_0_rgba(255,255,255,0.1)_inset]"
          : "bg-transparent shadow-none",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({ children, className }: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between rounded-2xl border border-white/20 bg-slate-950/88 px-4 py-3 text-white",
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
    <a href="/" className="flex items-center gap-2.5 text-white">
      {/* Avoid `priority` here: marketing shell mounts this nav late; preload of logo.png was unused and spammed the console. */}
      <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" />
      <MentrixaWordmark trixaClassName="text-white" />
    </a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (React.ComponentPropsWithoutRef<"a"> | React.ComponentPropsWithoutRef<"button">)) => {
  const variantStyles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    dark: "bg-black text-white hover:bg-slate-900",
    gradient: "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 text-white hover:opacity-95",
  } as const;

  return (
    <Tag
      href={href || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors duration-200",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};
