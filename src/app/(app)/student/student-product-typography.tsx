"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { mentrixProfileType } from "@/features/student-profile/mentrix-profile-typography";

/** Routes that share profile-parity typography (not the profile editor itself). */
const PRODUCT_ROUTE = /^\/student(?:\/(?:mastery|quest|division|duel)(?:\/|$)|\/?$)/;

export function StudentProductTypography({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "";
  const isProduct = PRODUCT_ROUTE.test(pathname);

  if (!isProduct) {
    return children;
  }

  return (
    <div className={cn(mentrixProfileType.scope, "min-h-[calc(100dvh-4.75rem)] bg-mentrixa-app")}>
      {children}
    </div>
  );
}
