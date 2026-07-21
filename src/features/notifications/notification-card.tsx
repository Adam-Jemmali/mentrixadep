"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "@/shared/animation/motion";
import {
  NOTIFICATION_CARD_COPY,
  NOTIFICATION_CARD_DISMISS_MS,
  notificationCardBodyClass,
  notificationCardSurfaceClass,
  type RetestNotificationTone,
} from "@/features/notifications/notification-card-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

export type NotificationCardProps = {
  id: string;
  body: string;
  href: string | null;
  tone: RetestNotificationTone;
  linkLabel?: string;
  icon?: "breakthrough" | "guide-session" | "practice-pack";
  autoDismiss?: boolean;
  onDismiss?: () => void;
  onNavigate?: () => void;
};

export function NotificationCard({
  body,
  href,
  tone,
  linkLabel = NOTIFICATION_CARD_COPY.viewStudent,
  icon = tone === "warn" ? "guide-session" : "breakthrough",
  autoDismiss = false,
  onDismiss,
  onNavigate,
}: NotificationCardProps) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!autoDismiss || !onDismiss) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => onDismiss(), reduceMotion ? 0 : 320);
    }, NOTIFICATION_CARD_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [autoDismiss, onDismiss, reduceMotion]);

  const surface = notificationCardSurfaceClass(tone);
  const bodyTone = notificationCardBodyClass(tone);

  const content = (
    <>
      <p className={cn("inline-flex items-start gap-2 text-sm leading-snug", bodyTone)}>
        <MentrixaVocabIcon
          name={icon}
          size={16}
          surface="light"
          gold={tone === "gain"}
          title="Retest"
          className="mt-0.5 shrink-0"
        />
        <span>{body}</span>
      </p>
      {href ? (
        <Link
          href={href}
          onClick={onNavigate}
          className={cn(
            "mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em]",
            tone === "gain"
              ? "text-emerald-700 hover:text-emerald-900"
              : tone === "warn"
                ? "text-orange-700 hover:text-orange-900"
                : "text-[#7C3AED] hover:text-[#6D28D9]",
          )}
        >
          {linkLabel}
        </Link>
      ) : null}
    </>
  );

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          layout
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { x: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={cn(
            "pointer-events-auto overflow-hidden rounded-xl border border-[#E0E7FF]/80",
            "px-3.5 py-3 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] backdrop-blur-sm",
            surface,
          )}
        >
          {content}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function NotificationCardStack({
  items,
  autoDismissUnread = true,
  onDismiss,
  onNavigate,
}: {
  items: NotificationCardProps[];
  autoDismissUnread?: boolean;
  onDismiss?: (id: string) => void;
  onNavigate?: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <NotificationCard
          key={item.id}
          {...item}
          autoDismiss={autoDismissUnread && item.autoDismiss !== false}
          onDismiss={onDismiss ? () => onDismiss(item.id) : item.onDismiss}
          onNavigate={onNavigate ? () => onNavigate(item.id) : item.onNavigate}
        />
      ))}
    </div>
  );
}
