"use client";

import { Fab } from "@/components/ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

export function QuestStartFab() {
  return (
    <Fab
      href="/student/quest"
      label="Start a quest"
      icon={<MentrixaVocabIcon name="quest" size={24} surface="dark" title="Quest" />}
    />
  );
}
