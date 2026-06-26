"use client";

import { QuestPackLoadPendingPanel } from "@/shared/ui/spinner-patterns";
import { TryQuestShell } from "@/app/(marketing)/try/try-quest-shell";

export default function TryPageLoading() {
  return (
    <TryQuestShell>
      <div className="flex min-h-[70dvh] items-center justify-center px-4 py-12">
        <QuestPackLoadPendingPanel tone="dark" loaderSize="lg" className="max-w-md" />
      </div>
    </TryQuestShell>
  );
}
