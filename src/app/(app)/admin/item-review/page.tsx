import { getItemReviewQueue } from "@/features/admin/item-review";
import { ItemReviewClient } from "./item-review-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Item review. Admin. Mentrixa" };

export default async function AdminItemReviewPage() {
  const initial = await getItemReviewQueue("pending_review").catch(() => ({
    items: [],
    pendingCount: 0,
    approvedCount: 0,
  }));

  return <ItemReviewClient initial={initial} />;
}
