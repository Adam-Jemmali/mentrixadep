"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { cn } from "@/shared/core/utils";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";

const LOGO_SIZE = 32;
const HTML_CURSOR_CLASS = "lp-landing-logo-cursor-active";

function canUseCustomCursor() {
  return (
    window.matchMedia("(hover: hover)").matches ||
    window.matchMedia("(any-hover: hover)").matches
  );
}

type Props = {
  children?: ReactNode;
  className?: string;
};

/**
 * Single Mentrixa logo cursor follower — no particle trail (low-end safe).
 */
export function MentrixaCursor({ children, className }: Props) {
  const [active, setActive] = useState(false);
  const followerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: -120, y: -120 });
  const posRef = useRef({ x: -120, y: -120 });
  const rafRef = useRef(0);
  const visibleRef = useRef(false);

  useEffect(() => {
    setActive(canUseCustomCursor());
  }, []);

  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add(HTML_CURSOR_CLASS);
    return () => {
      document.documentElement.classList.remove(HTML_CURSOR_CLASS);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const follower = followerRef.current;
    if (!follower) return;

    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const t = targetRef.current;
      const p = posRef.current;
      p.x += (t.x - p.x) * 0.32;
      p.y += (t.y - p.y) * 0.32;
      follower.style.transform = `translate3d(${Math.round(p.x - LOGO_SIZE / 2)}px, ${Math.round(p.y - LOGO_SIZE / 2)}px, 0)`;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      if (!visibleRef.current) {
        visibleRef.current = true;
        follower.style.opacity = "1";
        posRef.current.x = e.clientX;
        posRef.current.y = e.clientY;
      }
    };

    const onLeave = () => {
      visibleRef.current = false;
      follower.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [active]);

  if (!active) return children ?? null;

  return (
    <>
      {children}
      <div
        ref={followerRef}
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[9999] opacity-0 will-change-transform",
          className,
        )}
        style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
        aria-hidden
      >
        <NextImage
          src={MENTRIXA_LOGO_PNG}
          alt=""
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="select-none object-contain drop-shadow-[0_2px_8px_rgba(11,18,32,0.35)]"
          draggable={false}
          priority
        />
      </div>
    </>
  );
}

/** @deprecated Use MentrixaCursor — kept for import compatibility. */
export function TechCursor() {
  return <MentrixaCursor />;
}

export default MentrixaCursor;
