import { requireRole } from "@/shared/core/auth";
import { getVerificationQueue, getVerificationStats } from "@/features/verification/verification-queue";
import { VerificationClient } from "./verification-client";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const admin = await requireRole("admin");

  const [queue, stats] = await Promise.all([
    getVerificationQueue("all"),
    getVerificationStats(),
  ]);

  return (
    <VerificationClient
      initialQueue={queue.filter((row) => row.user_id !== admin.id)}
      stats={stats}
      currentAdminId={admin.id}
    />
  );
}
