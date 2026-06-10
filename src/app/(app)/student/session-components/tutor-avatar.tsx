import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { cn } from "@/shared/core/utils";

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

  const badgeSize = {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 28,
  }[size];

  return (
    <div className="relative inline-flex shrink-0">
      <Avatar className={cn("border border-slate-200 bg-slate-50 shadow-sm", dim)}>
        {avatarUrl && (
          <AvatarImage 
            src={avatarUrl} 
            alt={displayName || "Tutor"} 
            className="object-cover"
          />
        )}
        <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 font-bold text-slate-600">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Verified Badge */}
      {verified && (
        <span className="absolute -right-0.5 -top-0.5 z-10 flex items-center justify-center">
          <span className="sr-only">Verified Guide</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={badgeSize}
            height={badgeSize}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="drop-shadow-sm"
          >
            <path
              className="fill-white"
              d="M3.046 8.277A4.402 4.402 0 0 1 8.303 3.03a4.4 4.4 0 0 1 7.411 0 4.397 4.397 0 0 1 5.19 3.068c.207.713.23 1.466.067 2.19a4.4 4.4 0 0 1 0 7.415 4.403 4.403 0 0 1-3.06 5.187 4.398 4.398 0 0 1-2.186.072 4.398 4.398 0 0 1-7.422 0 4.398 4.398 0 0 1-5.257-5.248 4.4 4.4 0 0 1 0-7.437Z"
            />
            <path
              className="fill-blue-600"
              d="M4.674 8.954a3.602 3.602 0 0 1 4.301-4.293 3.6 3.6 0 0 1 6.064 0 3.598 3.598 0 0 1 4.3 4.302 3.6 3.6 0 0 1 0 6.067 3.6 3.6 0 0 1-4.29 4.302 3.6 3.6 0 0 1-6.074 0 3.598 3.598 0 0 1-4.3-4.293 3.6 3.6 0 0 1 0-6.085Z"
            />
            <path
              className="fill-white"
              d="M15.707 9.293a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L11 12.586l3.293-3.293a1 1 0 0 1 1.414 0Z"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

