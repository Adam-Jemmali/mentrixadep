import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LP_NUM_TITLE_CLASS, LP_NUM_WATERMARK_CLASS } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { LandingEyebrow } from "@/features/marketing/landing/ui/landing-eyebrow";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingVocabWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { isSingleWordLabel } from "@/features/marketing/landing/ui/landing-word-vocab-pure";
import { landingRoleFromLabel } from "@/features/marketing/landing/ui/landing-role-icon";

export function LandingNumberHeading({
  eyebrow,
  count,
  suffix,
  subtitle,
  className,
  id,
}: {
  eyebrow?: string;
  count: number | string;
  suffix: string;
  subtitle?: string;
  className?: string;
  id?: string;
}) {
  const digit = String(count);

  return (
    <header className={cn("text-center", className)}>
      {eyebrow ? <LandingEyebrow text={eyebrow} className="mb-0" /> : null}
      <h2
        id={id}
        className={cn(landingHub.title, eyebrow ? "mt-3" : "", "inline-flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1")}
      >
        <span className={LP_NUM_TITLE_CLASS} aria-hidden>
          {digit}
        </span>
        {isSingleWordLabel(suffix) && !landingRoleFromLabel(suffix) ? (
          <LandingVocabWord word={suffix} size="md" className="inline-flex" />
        ) : (
          <span>
            <LandingRoleText text={suffix} iconSize="sm" />
          </span>
        )}
      </h2>
      {subtitle ? (
        <p className={cn(landingHub.body, "mx-auto mt-3 max-w-2xl")}>
          <LandingRoleText text={subtitle} iconSize="sm" />
        </p>
      ) : null}
    </header>
  );
}

export function LandingNumberWatermark({ value }: { value: string | number }) {
  return (
    <span className={LP_NUM_WATERMARK_CLASS} aria-hidden>
      {value}
    </span>
  );
}
