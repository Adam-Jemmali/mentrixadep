import { Suspense } from "react";
import { requireRole } from "@/shared/core/auth";
import { getStudentSubscription } from "@/features/payments/student-subscription";
import { SubscribeCheckoutSkeleton } from "@/shared/ui/skeleton-patterns";
import { MomentumSubscribeClient } from "./momentum-subscribe-client";

export default async function StudentSubscribePage() {
  const user = await requireRole(["student", "admin"]);
  const initialSubscription = await getStudentSubscription(user.id);
  return (
    <Suspense fallback={<SubscribeCheckoutSkeleton />}>
      <MomentumSubscribeClient initialSubscription={initialSubscription} />
    </Suspense>
  );
}
