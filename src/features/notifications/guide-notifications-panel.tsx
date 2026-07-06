"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ScrollRevealCard } from "@/shared/ui/card";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { formatDateInZone } from "@/shared/core/time-format";
import type { GuideNotificationEntry } from "@/features/notifications/load-guide-notifications";
import { markGuideNotificationRead } from "@/features/notifications/mark-guide-notification-read";
import { GUIDE_NOTIFICATIONS } from "@/features/tutor/guide-home-copy-pure";

type Props = {
  notifications: GuideNotificationEntry[];
  displayTimeZone?: string;
};

export function GuideNotificationsPanel({
  notifications,
  displayTimeZone = "UTC",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (notifications.length === 0) return null;

  const unreadCount = notifications.filter((row) => !row.readAt).length;

  return (
    <section className="mb-8">
      <ScrollRevealCard className={mentrixStudent.card + " p-5"}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className={`text-sm font-bold ${mentrixStudent.textOnLight}`}>
              {GUIDE_NOTIFICATIONS.title}
            </h2>
            <p className={`mt-1 text-xs ${mentrixStudent.textMutedOnLight}`}>
              {GUIDE_NOTIFICATIONS.subtitle}
            </p>
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">
              {GUIDE_NOTIFICATIONS.new(unreadCount)}
            </span>
          ) : null}
        </div>

        <ul className="divide-y divide-slate-100">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;
            const content = (
              <>
                <p
                  className={`text-sm leading-relaxed ${
                    isUnread ? "font-medium text-slate-900" : "text-slate-700"
                  }`}
                >
                  {notification.body}
                </p>
                <p className={`mt-1 text-[11px] ${mentrixStudent.textMutedOnLight}`}>
                  {formatDateInZone(notification.createdAt, displayTimeZone)}
                </p>
              </>
            );

            const markRead = () => {
              if (!isUnread || pending) return;
              startTransition(async () => {
                await markGuideNotificationRead(notification.id);
                router.refresh();
              });
            };

            if (notification.href) {
              return (
                <li key={notification.id}>
                  <Link
                    href={notification.href}
                    onClick={markRead}
                    className="block py-3 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-lg"
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={notification.id} className="py-3">
                <button
                  type="button"
                  onClick={markRead}
                  className="w-full text-left"
                  disabled={!isUnread || pending}
                >
                  {content}
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollRevealCard>
    </section>
  );
}
