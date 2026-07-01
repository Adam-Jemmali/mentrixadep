"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
  /** When set, navigates here instead of browser history back. */
  href?: string;
  role?: "student" | "tutor";
  /** Brand = violet/indigo on dark product surfaces; light = legacy white pill. */
  variant?: "brand" | "light";
}

export function BackButton({
  className,
  onClick,
  href,
  role = "student",
  variant = "brand",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  const iconSrc = role === "tutor" ? "/icons/guide.svg" : "/icons/mentrixer.svg";

  const brandClass = cn(
    mentrixBrandUi.heroBtnOutline,
    "h-9 gap-2.5 rounded-full px-4 shadow-sm hover:shadow-md",
  );
  const lightClass =
    "flex h-9 items-center gap-2.5 rounded-full border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleBack}
      className={cn(variant === "brand" ? brandClass : lightClass, className)}
    >
      <Image
        src={iconSrc}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0 opacity-90 transition-transform duration-300 group-hover:scale-110"
      />
      <span
        className={cn(
          "text-xs font-bold tracking-tight",
          variant === "brand" ? "text-violet-100" : "text-slate-700",
        )}
      >
        Back
      </span>
    </Button>
  );
}
