import { cronGetHandler } from "@/shared/core/cron-auth";
import { runCheckCertificationRevoke } from "@/features/certifications/check-certification-revoke-cron";

async function run() {
  const result = await runCheckCertificationRevoke();
  return {
    rows_scanned: result.scanned,
    rows_revoked: result.revoked,
    rows_watching: result.watching,
    ...result,
  };
}

export const GET = cronGetHandler("check-certification-revoke", run);
