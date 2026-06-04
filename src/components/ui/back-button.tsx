"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
  role?: "student" | "tutor";
}

export function BackButton({ className, onClick, role = "student" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  const iconSrc = role === "tutor" ? "/icons/guide.svg" : "/icons/mentrixer.svg";

  return (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleBack}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-full border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md",
        className
      )}
    >
      <Image
        src={iconSrc}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0 opacity-90 transition-transform duration-300 group-hover:scale-110"
      />
      <span className="text-xs font-bold tracking-tight text-slate-700">
        Back
      </span>
    </Button>
  );
}
