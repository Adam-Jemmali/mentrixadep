import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import type { StudentStickyVariant } from "@/features/student-profile/student-sticky-variants";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { cn } from "@/shared/core/utils";

const hubEyebrowClass = "mx-hub-type-ui text-[#6366F1]";

export function ProductPageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  stickyVariant = "curl",
  className,
}: {
  icon: VocabIconName;
  eyebrow: string;
  title: string;
  subtitle?: string;
  stickyVariant?: StudentStickyVariant;
  className?: string;
}) {
  return (
    <StudentStickyNote variant={stickyVariant} className={cn("mb-8", className)}>
      <header>
        <VocabSectionHeading
          name={icon}
          label={eyebrow}
          surface="light"
          labelClassName={hubEyebrowClass}
          className="block w-full"
        />
        <h1 className={`mt-4 ${mentrixStudent.pageTitle}`}>{title}</h1>
        {subtitle ? (
          <p className={`mt-2 max-w-xl ${mentrixStudent.pageSubtitle}`}>{subtitle}</p>
        ) : null}
      </header>
    </StudentStickyNote>
  );
}
