import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { cn } from "@/shared/core/utils";
import { MentrixaAvatarBadge } from "@/shared/ui/badge-patterns";

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
  verified = true,
}: {
  displayName: string | null | undefined;
  emailPrefix: string;
  avatarUrl: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  verified?: boolean;
}) {
  const initials = initialsFromName(displayName?.trim() || emailPrefix || "G");

  const dim = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  }[size];

  const avatar = (
    <Avatar className={cn("border border-slate-200 bg-slate-50 shadow-sm", dim)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={displayName || "Tutor"} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 font-bold text-slate-600">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!verified) {
    return <div className="relative inline-flex shrink-0">{avatar}</div>;
  }

  return (
    <MentrixaAvatarBadge
      dot
      dotColor="accent"
      dotPlacement="top-right"
      countLabel="Verified Guide"
      className="shrink-0"
    >
      {avatar}
    </MentrixaAvatarBadge>
  );
}
