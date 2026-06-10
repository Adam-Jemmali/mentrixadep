import { autoGenerateStudioPackagesForCompletedSessions } from "@/features/studio-ai/studio-packages";
import type { StudioPackageJobPayload } from "@/features/jobs/types";

export async function handleStudioPackageJob(
  payload: StudioPackageJobPayload,
): Promise<void> {
  const sessionId = payload.sessionId;
  if (!sessionId) throw new Error("ai.studio_package: missing sessionId");

  const result = await autoGenerateStudioPackagesForCompletedSessions([sessionId]);
  if (result.failed > 0 && result.generated === 0 && result.skipped === 0) {
    throw new Error("Studio package generation failed");
  }
}
