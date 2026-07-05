import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";

export function LandingSectionShell({
  id,
  className,
  innerClassName,
  tight,
  children,
}: {
  id?: string;
  className?: string;
  innerClassName?: string;
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(tight ? landingHub.sectionTight : landingHub.section, className)}>
      <div className={cn(landingHub.sectionInner, innerClassName)}>{children}</div>
    </section>
  );
}

export function LandingStickyCard({
  className,
  rotate = true,
  variant = "curl",
  children,
}: {
  className?: string;
  rotate?: boolean;
  variant?: LandingStickyVariant;
  children: React.ReactNode;
}) {
  return (
    <LandingStickyNote variant={variant} className={cn(rotate && "rotate-[-0.45deg]", className)}>
      {children}
    </LandingStickyNote>
  );
}

export function LandingSectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={cn("text-center", className)}>
      {eyebrow ? <p className={landingHub.eyebrow}>{eyebrow}</p> : null}
      <h2 className={cn(landingHub.title, eyebrow && "mt-3")}>{title}</h2>
      {subtitle ? <p className={cn(landingHub.body, "mx-auto mt-3 max-w-2xl")}>{subtitle}</p> : null}
    </header>
  );
}
