"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { mentrixProfileType } from "@/features/student-profile/mentrix-profile-typography";

/** All authenticated student product routes share hub desk + handwriting scope. */
function isStudentProductRoute(pathname: string): boolean {
  if (!pathname.startsWith("/student")) return false;
  if (pathname.startsWith("/student/duel/") && pathname !== "/student/duel" && pathname !== "/student/duel/history") {
    return false;
  }
  return true;
}

export function StudentProductTypography({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "";
  const isProduct = isStudentProductRoute(pathname);

  if (!isProduct) {
    return children;
  }

  return (
    <div className={cn(mentrixProfileType.scope, "mx-hub-desk min-h-[calc(100dvh-4.75rem)]")}>
      {children}
    </div>
  );
}
