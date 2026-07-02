import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadBriefArchive } from "@/features/pre-session-brief/load-brief-archive";
import { BriefArchiveClient } from "./brief-archive-client";

export default async function StudentBriefArchivePage() {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  const briefs = await loadBriefArchive();

  return (
    <BriefArchiveClient briefs={briefs} momentumActive={entitlements.momentumActive} />
  );
}
