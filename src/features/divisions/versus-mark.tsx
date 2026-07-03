import { cn } from "@/shared/core/utils";

/** Bold italic VS with knockout overlap — matches league rival screenshot. */
export function VersusMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "mx-hub-vs-mark inline-flex items-center leading-none",
        size === "sm" && "text-2xl",
        size === "md" && "text-4xl",
        size === "lg" && "text-5xl",
        className,
      )}
      aria-label="Versus"
      title="Versus"
    >
      <span className="mx-hub-vs-v">V</span>
      <span className="mx-hub-vs-s">S</span>
    </span>
  );
}
