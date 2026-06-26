"use client";

import { QuestWorkspaceSkeleton } from "@/shared/ui/skeleton-patterns";

/** Fast skeleton while quest routes hydrate — nested under `student/loading` for quicker paint. */
export default function QuestSegmentLoading() {
  return <QuestWorkspaceSkeleton />;
}
