import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingRoleIcon, landingRoleFromLabel } from "@/features/marketing/landing/ui/landing-role-icon";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingVocabWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { isSingleWordLabel } from "@/features/marketing/landing/ui/landing-word-vocab-pure";
import { cn } from "@/shared/core/utils";

/** Section eyebrow — role or single-word vocab icon when applicable. */
export function LandingEyebrow({
  text,
  className,
  surface = "light",
}: {
  text: string;
  className?: string;
  surface?: "light" | "dark";
}) {
  const role = landingRoleFromLabel(text);

  if (role) {
    return (
      <div className={cn(landingHub.eyebrow, "inline-flex items-center justify-center gap-2.5", className)}>
        <LandingRoleIcon role={role} size="md" surface={surface} />
        {text}
      </div>
    );
  }

  if (isSingleWordLabel(text)) {
    return (
      <div className={cn(landingHub.eyebrow, "flex justify-center", className)}>
        <LandingVocabWord word={text} size="md" surface={surface} className="justify-center" />
      </div>
    );
  }

  return (
    <div className={cn(landingHub.eyebrow, className)}>
      <LandingRoleText text={text} iconSize="sm" surface={surface} />
    </div>
  );
}
