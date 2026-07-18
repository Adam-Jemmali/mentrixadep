import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Soft chip that keeps Mentrixa public-folder icon colors visible on light hub cards. */
export function HubVocabIcon({
  name,
  title,
  size = 28,
  className,
  tone = "violet",
}: {
  name: VocabIconName;
  title?: string;
  size?: number;
  className?: string;
  tone?: "violet" | "amber";
}) {
  const chip =
    tone === "amber"
      ? "bg-amber-100 ring-1 ring-amber-200/80"
      : "bg-violet-100 ring-1 ring-violet-200/80";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl p-1.5",
        chip,
        className,
      )}
    >
      <MentrixaVocabIcon name={name} size={size} surface="light" title={title} />
    </span>
  );
}
