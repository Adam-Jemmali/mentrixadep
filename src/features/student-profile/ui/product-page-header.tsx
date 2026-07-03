import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

const hubEyebrowClass = "mx-hub-type-ui text-[#6366F1]";

export function ProductPageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  className,
}: {
  icon: VocabIconName;
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={`${mentrixStudent.pageHeader} mb-8 ${className ?? ""}`}>
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
  );
}
