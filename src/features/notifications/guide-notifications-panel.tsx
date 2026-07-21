"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { formatDateInZone } from "@/shared/core/time-format";
import type { GuideNotificationEntry } from "@/features/notifications/load-guide-notifications";
import { markGuideNotificationRead } from "@/features/notifications/mark-guide-notification-read";
import { NotificationCardStack } from "@/features/notifications/notification-card";
import { GUIDE_NOTIFICATIONS } from "@/features/tutor/guide-home-copy-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_SESSION_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

type Props = {
  notifications: GuideNotificationEntry[];
  displayTimeZone?: string;
  staggerIndex?: number;
};

export function GuideNotificationsPanel({
  notifications,
  displayTimeZone = "UTC",
  staggerIndex = 2,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const unread = useMemo(
    () => notifications.filter((row) => !row.readAt),
    [notifications],
  );
  const read = useMemo(
    () => notifications.filter((row) => row.readAt),
    [notifications],
  );

  if (notifications.length === 0) return null;

  const markRead = (notificationId: string) => {
    if (pending) return;
    startTransition(async () => {
      await markGuideNotificationRead(notificationId);
      router.refresh();
    });
  };

  return (
    <section className="mb-8">
      <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.impact} staggerIndex={staggerIndex}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <MentrixaVocabIcon
              name={CANONICAL_SESSION_ICON}
              size={18}
              surface="light"
              title="Notifications"
            />
            <div>
              <h2 className={`text-sm font-bold ${mentrixStudent.textOnLight}`}>
                {GUIDE_NOTIFICATIONS.title}
              </h2>
              <p className={`mt-1 text-xs ${mentrixStudent.textMutedOnLight}`}>
                {GUIDE_NOTIFICATIONS.subtitle}
              </p>
            </div>
          </div>
          {unread.length > 0 ? (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">
              {GUIDE_NOTIFICATIONS.new(unread.length)}
            </span>
          ) : null}
        </div>

        {unread.length > 0 ? (
          <div className="mb-4">
            <NotificationCardStack
              items={unread.map((notification) => ({
                id: notification.id,
                body: notification.body,
                href: notification.href,
                tone: notification.tone,
                autoDismiss: true,
              }))}
              onDismiss={markRead}
              onNavigate={markRead}
            />
          </div>
        ) : null}

        {read.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {read.map((notification) => (
              <li key={notification.id} className="py-3">
                <p className={cn("text-sm leading-relaxed text-slate-700")}>{notification.body}</p>
                <p className={`mt-1 text-[11px] ${mentrixStudent.textMutedOnLight}`}>
                  {formatDateInZone(notification.createdAt, displayTimeZone)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </GuideAnimatedSticky>
    </section>
  );
}
