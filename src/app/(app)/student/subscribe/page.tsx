import { Suspense } from "react";
import { requireRole } from "@/shared/core/auth";
import { SubscribeCheckoutSkeleton } from "@/shared/ui/skeleton-patterns";
import { MomentumSubscribeClient } from "./momentum-subscribe-client";

export default async function StudentSubscribePage() {
  await requireRole(["student", "admin"]);
  return (
    <Suspense fallback={<SubscribeCheckoutSkeleton />}>
      <MomentumSubscribeClient />
    </Suspense>
  );
}
