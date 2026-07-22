import { formatPeerStandingShort, peerTopPercent } from "@/features/xp/rank-statistics-pure";

export const CERT_ISSUE_PEER_STANDING = 90;
export const CERT_REVOKE_PEER_STANDING = 85;
export const CERT_REVOKE_CONSECUTIVE_DAYS = 30;
export const CERT_NODE_COVERAGE_RATIO = 0.8;
export const CERT_MIN_VFA_STREAK_DAYS = 7;

export type CertificationEligibilityInput = {
  verifiedPercentile: number | null;
  nodesVerified: number;
  totalNodes: number;
  vfaStreakLongest: number;
};

export type CertificationEligibility = {
  eligible: boolean;
  reasons: string[];
  minNodesRequired: number;
};

export function minNodesRequired(totalNodes: number): number {
  return Math.floor(Math.max(0, totalNodes) * CERT_NODE_COVERAGE_RATIO);
}

export function evaluateCertificationEligibility(
  input: CertificationEligibilityInput,
): CertificationEligibility {
  const reasons: string[] = [];
  const required = minNodesRequired(input.totalNodes);
  const percentile = input.verifiedPercentile;

  if (percentile == null || percentile < CERT_ISSUE_PEER_STANDING) {
    reasons.push(`Peer standing must reach ${formatPeerStandingShort(CERT_ISSUE_PEER_STANDING)}.`);
  }
  if (input.nodesVerified < required) {
    reasons.push(`Verify ${required} of ${input.totalNodes} skills.`);
  }
  if (input.vfaStreakLongest < CERT_MIN_VFA_STREAK_DAYS) {
    reasons.push(`Longest VFA streak must reach ${CERT_MIN_VFA_STREAK_DAYS} days.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    minNodesRequired: required,
  };
}

/** First crossing of the issue threshold only. */
export function didCrossIssueThreshold(
  previousPercentile: number | null,
  currentPercentile: number | null,
): boolean {
  const before = previousPercentile ?? 0;
  const after = currentPercentile ?? 0;
  return before < CERT_ISSUE_PEER_STANDING && after >= CERT_ISSUE_PEER_STANDING;
}

export function shouldIssueNewCertification(params: {
  previousPercentile: number | null;
  current: CertificationEligibilityInput;
  alreadyHasRow: boolean;
}): boolean {
  if (params.alreadyHasRow) return false;
  if (!didCrossIssueThreshold(params.previousPercentile, params.current.verifiedPercentile)) {
    return false;
  }
  return evaluateCertificationEligibility(params.current).eligible;
}

export function shouldReinstateCertification(params: {
  isRevoked: boolean;
  current: CertificationEligibilityInput;
}): boolean {
  if (!params.isRevoked) return false;
  return evaluateCertificationEligibility(params.current).eligible;
}

export type RevokeTickResult =
  | { action: "clear_watch" }
  | { action: "start_watch"; sinceIso: string }
  | { action: "keep_watch" }
  | { action: "revoke"; reason: string };

export function tickCertificationRevocation(params: {
  currentPercentile: number | null;
  belowThresholdSince: string | null;
  now: Date;
}): RevokeTickResult {
  const percentile = params.currentPercentile;
  const aboveFloor = percentile != null && percentile >= CERT_REVOKE_PEER_STANDING;

  if (aboveFloor) {
    return { action: "clear_watch" };
  }

  if (!params.belowThresholdSince) {
    return { action: "start_watch", sinceIso: params.now.toISOString() };
  }

  const since = new Date(params.belowThresholdSince);
  if (!Number.isFinite(since.getTime())) {
    return { action: "start_watch", sinceIso: params.now.toISOString() };
  }

  const elapsedMs = params.now.getTime() - since.getTime();
  const days = elapsedMs / (24 * 60 * 60 * 1000);
  if (days >= CERT_REVOKE_CONSECUTIVE_DAYS) {
    return {
      action: "revoke",
      reason: `Peer standing below ${formatPeerStandingShort(CERT_REVOKE_PEER_STANDING)} for ${CERT_REVOKE_CONSECUTIVE_DAYS} days.`,
    };
  }

  return { action: "keep_watch" };
}

export function certificationVerifyPath(token: string): string {
  return `/verify/${encodeURIComponent(token)}`;
}

export function certificationRevokeEmailCopy(subject: string): {
  subjectLine: string;
  body: string;
} {
  return {
    subjectLine: `${subject} certification suspended`,
    body: `Your ${subject} certification has been suspended. Regain your peer standing to reinstate it.`,
  };
}

export function certificationLiveRecordLine(): string {
  return "This is a live record.";
}

export function certificationPeerStandingLabel(verifiedPercentile: number): string {
  return formatPeerStandingShort(verifiedPercentile);
}

export function certificationTopPercent(verifiedPercentile: number): number {
  return peerTopPercent(verifiedPercentile);
}

export function formatCertificationIssuedAt(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function certificationVerifiedTopLine(verifiedPercentile: number): string {
  return `Verified top ${certificationTopPercent(verifiedPercentile)} percent of all Mentrixers tested`;
}

export function certificationNodesVerifiedLine(
  nodesVerified: number,
  totalNodes: number,
): string {
  return `${nodesVerified} of ${totalNodes} skill nodes verified`;
}

export function certificationAccuracyLine(accuracyOverall: number): string {
  return `Overall accuracy: ${Math.round(accuracyOverall)}%`;
}

export function certificationRevokedBody(revokedAt: string): string {
  return `This certification was suspended on ${formatCertificationIssuedAt(revokedAt)}. The holder's rank dropped below the required threshold.`;
}

export function certificationRankVerifyHint(username: string): string {
  return `Visit mentrixa.one/rank/${username} to verify`;
}

export function certificationShareEmptyVerdict(): string {
  return "No certification yet. It issues automatically when you cross verified peer standing, skill coverage, and streak thresholds.";
}

export function certificationShareNextAction(): string {
  return "Earn it on Quest and Mastery Grid, then open View certificate here.";
}
