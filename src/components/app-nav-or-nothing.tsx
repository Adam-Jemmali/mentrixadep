"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";
import type { AuthUser } from "@/lib/auth";

export function AppNavOrNothing({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname.startsWith("/video/")) return null;
  return <Navigation user={user} />;
}
