import { requireRole } from "@/lib/auth";
import { getVerificationQueue, getVerificationStats } from "@/app/actions/verification";
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
