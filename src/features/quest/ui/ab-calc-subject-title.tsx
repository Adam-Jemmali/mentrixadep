import { AP_CALC_AB_SUBJECT_DISPLAY } from "@/features/quest/ap-calc-ab-subject";
import { mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

export function AbCalculusSubjectTitle({
  className,
  hubPaper = false,
}: {
  className?: string;
  /** Solid brand ink on paper hub cards. */
  hubPaper?: boolean;
}) {
  return (
    <span
      className={cn(
        hubPaper
          ? "block font-bold leading-snug text-[#6366F1] text-xl sm:text-2xl pt-0.5"
          : cn(mentrixProfileType.pageTitleDisplay, "text-lg sm:text-xl leading-snug"),
        className,
      )}
      aria-label={AP_CALC_AB_SUBJECT_DISPLAY}
    >
      {AP_CALC_AB_SUBJECT_DISPLAY}
    </span>
  );
}
