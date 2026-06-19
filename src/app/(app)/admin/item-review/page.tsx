import { requireRole } from "@/shared/core/auth";
import { getReviewQueue } from "@/features/admin/item-review/actions";
import { ItemReviewClient } from "./item-review-client";

export const dynamic = "force-dynamic";

export default async function ItemReviewPage() {
  await requireRole("admin");
  const queue = await getReviewQueue();

  return (
    <ItemReviewClient
      stats={queue.stats}
      nodeBreakdown={queue.nodeBreakdown}
      groups={queue.groups}
    />
  );
}
