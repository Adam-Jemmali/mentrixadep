"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

export function TutorAvatar({
  displayName,
  emailPrefix,
  avatarUrl,
  size = "md",
}: {
  displayName: string | null | undefined;
  emailPrefix: string;
  avatarUrl: string | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const [broken, setBroken] = useState(false);
  const label = (displayName?.trim() || emailPrefix || "Guide").slice(0, 48);
  const initials = initialsFromName(displayName?.trim() || emailPrefix || "G");

  const dim = size === "sm" ? "h-10 w-10 text-xs" : size === "lg" ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";
  const px = size === "sm" ? 40 : size === "lg" ? 64 : 48;

  if (avatarUrl && !broken) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        unoptimized={!avatarUrl.includes("/storage/v1/object/public/")}
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-slate-200 bg-slate-100`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} shrink-0 rounded-full bg-slate-200 flex items-center justify-center font-medium text-slate-700 ring-1 ring-slate-200`}
      aria-hidden
      title={label}
    >
      {initials.length >= 2 ? (
        <span className="leading-none tracking-tight">{initials}</span>
      ) : (
        <User className="h-1/2 w-1/2 opacity-90" strokeWidth={2} />
      )}
    </div>
  );
}
