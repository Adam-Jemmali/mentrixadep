import { handleShareArtifactImageJob } from "@/features/jobs/handlers/share-artifact-image";
import type { BackgroundJobRow } from "@/features/jobs/types";
import { handleAnalyticsJob } from "@/features/jobs/handlers/analytics";
import { handleBriefJob } from "@/features/jobs/handlers/brief";
import { handleEmailJob } from "@/features/jobs/handlers/email";
import { handlePayoutLedgerJob } from "@/features/jobs/handlers/payout";
import { handleStudioPackageJob } from "@/features/jobs/handlers/studio-package";
import { handleTranscriptionJob } from "@/features/jobs/handlers/transcription";
import { handleRetestPushJob } from "@/features/jobs/handlers/retest-push";

export async function runJobHandler(job: BackgroundJobRow): Promise<void> {
  const payload = job.payload ?? {};

  switch (job.job_type) {
    case "email.send":
      await handleEmailJob(payload as Parameters<typeof handleEmailJob>[0]);
      break;
    case "ai.studio_package":
      await handleStudioPackageJob(payload as Parameters<typeof handleStudioPackageJob>[0]);
      break;
    case "ai.brief":
      await handleBriefJob(payload as Parameters<typeof handleBriefJob>[0]);
      break;
    case "ai.transcription":
      await handleTranscriptionJob();
      break;
    case "payout.ledger":
      await handlePayoutLedgerJob(payload as Parameters<typeof handlePayoutLedgerJob>[0]);
      break;
    case "analytics.track":
      await handleAnalyticsJob(payload as Parameters<typeof handleAnalyticsJob>[0]);
      break;
    case "booking.fulfill":
      throw new Error("booking.fulfill handler not yet wired");
    case "image.share_artifact":
      await handleShareArtifactImageJob(
        payload as Parameters<typeof handleShareArtifactImageJob>[0],
      );
      break;
    case "push.retest_complete":
      await handleRetestPushJob(payload as Parameters<typeof handleRetestPushJob>[0]);
      break;
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}
