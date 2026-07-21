"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BeforeAfterCard } from "@/features/share/before-after-card";
import type { StudentShareProofNotification } from "@/features/share-artifacts/student-share-notifications";
import { markStudentShareNotificationRead } from "@/features/share-artifacts/student-share-notifications";
import { cn } from "@/shared/core/utils";

export function StudentShareNotifyStrip({ items }: { items: StudentShareProofNotification[] }) {
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  const first = items[0]!;

  return (
    <section className="space-y-4">
      <BeforeAfterCard
        mode="inline"
        nodeName={first.nodeName}
        beforeAccuracy={first.beforeAccuracy}
        afterAccuracy={first.afterAccuracy}
        guideName={first.guideName ?? undefined}
        date={new Date(first.createdAt)}
        rankUsername={first.rankUsername}
      />

      {first.href ? (
        <div className="flex justify-center">
          <Link
            href={first.href}
            onClick={() => {
              startTransition(async () => {
                await markStudentShareNotificationRead(first.id);
              });
            }}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-full",
              "bg-[var(--mx-violet,#7C3AED)] px-5 py-2 text-sm font-bold text-white",
              "transition-colors hover:bg-[#6D28D9]",
              pending && "opacity-70",
            )}
          >
            Share
          </Link>
        </div>
      ) : null}
    </section>
  );
}
