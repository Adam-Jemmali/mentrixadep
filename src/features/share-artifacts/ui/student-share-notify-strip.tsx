"use client";

import Link from "next/link";
import { useTransition } from "react";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { markStudentShareNotificationRead } from "@/features/share-artifacts/student-share-notifications";
import { cn } from "@/shared/core/utils";

type Entry = {
  id: string;
  body: string;
  href: string | null;
};

export function StudentShareNotifyStrip({ items }: { items: Entry[] }) {
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  const first = items[0]!;

  return (
    <section
      className={cn(mentrixStudent.hubNotebook, "flex flex-wrap items-center justify-between gap-3 px-5 py-4")}
    >
      <p className="mx-hub-ink-title text-sm leading-snug">{first.body}</p>
      {first.href ? (
        <Link
          href={first.href}
          onClick={() => {
            startTransition(async () => {
              await markStudentShareNotificationRead(first.id);
            });
          }}
          className={cn(
            mentrixStudent.pillPrimary,
            "text-[11px] font-black uppercase tracking-[0.14em]",
            pending && "opacity-70",
          )}
        >
          Share
        </Link>
      ) : null}
    </section>
  );
}
