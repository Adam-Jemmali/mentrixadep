"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { mentrixProfileType } from "@/features/student-profile/mentrix-profile-typography";

/** Routes that share profile-parity typography and the hub desk canvas. */
const PRODUCT_ROUTE =
  /^\/student(?:\/(?:mastery|quest|division|duel|subscribe|receipts|loop|briefs|progress|certificate|booking|learning-path|clan|resolve)(?:\/|$)|\/?$)/;

export function StudentProductTypography({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "";
  const isProduct = PRODUCT_ROUTE.test(pathname);

  if (!isProduct) {
    return children;
  }

  return (
    <div className={cn(mentrixProfileType.scope, "mx-hub-desk min-h-[calc(100dvh-4.75rem)]")}>
      {children}
    </div>
  );
}
