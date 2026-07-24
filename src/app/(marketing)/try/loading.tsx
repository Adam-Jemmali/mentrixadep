import { QuestWorkspaceSkeleton } from "@/shared/ui/skeleton-patterns";
import { TryQuestShell } from "@/app/(marketing)/try/try-quest-shell";

export default function TryPageLoading() {
  return (
    <TryQuestShell>
      <QuestWorkspaceSkeleton />
    </TryQuestShell>
  );
}
