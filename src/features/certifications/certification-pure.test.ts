import { describe, expect, it } from "vitest";
import {
  CERT_ISSUE_PEER_STANDING,
  didCrossIssueThreshold,
  evaluateCertificationEligibility,
  shouldIssueNewCertification,
  shouldReinstateCertification,
  tickCertificationRevocation,
  certificationPeerStandingLabel,
  certificationVerifiedTopLine,
  certificationNodesVerifiedLine,
  certificationAccuracyLine,
  certificationRevokedBody,
  certificationRankVerifyHint,
} from "@/features/certifications/certification-pure";

describe("certification eligibility", () => {
  const base = {
    verifiedPercentile: 90,
    nodesVerified: 90,
    totalNodes: 113,
    vfaStreakLongest: 7,
  };

  it("requires peer standing, coverage, and streak", () => {
    expect(evaluateCertificationEligibility(base).eligible).toBe(true);
    expect(
      evaluateCertificationEligibility({ ...base, verifiedPercentile: 89 }).eligible,
    ).toBe(false);
    expect(
      evaluateCertificationEligibility({ ...base, nodesVerified: 89 }).eligible,
    ).toBe(false);
    expect(
      evaluateCertificationEligibility({ ...base, vfaStreakLongest: 6 }).eligible,
    ).toBe(false);
  });

  it("issues only on first crossing of 90", () => {
    expect(didCrossIssueThreshold(89, 90)).toBe(true);
    expect(didCrossIssueThreshold(90, 91)).toBe(false);
    expect(didCrossIssueThreshold(null, 90)).toBe(true);
    expect(
      shouldIssueNewCertification({
        previousPercentile: 88,
        current: base,
        alreadyHasRow: false,
      }),
    ).toBe(true);
    expect(
      shouldIssueNewCertification({
        previousPercentile: 88,
        current: base,
        alreadyHasRow: true,
      }),
    ).toBe(false);
  });

  it("reinstates when revoked and eligible again", () => {
    expect(
      shouldReinstateCertification({ isRevoked: true, current: base }),
    ).toBe(true);
    expect(
      shouldReinstateCertification({ isRevoked: false, current: base }),
    ).toBe(false);
  });

  it("revokes after 30 consecutive days below 85", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(
      tickCertificationRevocation({
        currentPercentile: 90,
        belowThresholdSince: "2026-07-01T00:00:00.000Z",
        now,
      }).action,
    ).toBe("clear_watch");

    expect(
      tickCertificationRevocation({
        currentPercentile: 80,
        belowThresholdSince: null,
        now,
      }).action,
    ).toBe("start_watch");

    expect(
      tickCertificationRevocation({
        currentPercentile: 80,
        belowThresholdSince: "2026-07-01T00:00:00.000Z",
        now,
      }).action,
    ).toBe("revoke");

    expect(
      tickCertificationRevocation({
        currentPercentile: 80,
        belowThresholdSince: "2026-07-20T00:00:00.000Z",
        now,
      }).action,
    ).toBe("keep_watch");
  });

  it("labels peer standing as Top %, not percentile", () => {
    expect(certificationPeerStandingLabel(CERT_ISSUE_PEER_STANDING)).toBe("Top 10%");
  });

  it("formats verify page copy", () => {
    expect(certificationVerifiedTopLine(92)).toBe(
      "Verified top 8 percent of all Mentrixers tested",
    );
    expect(certificationNodesVerifiedLine(90, 113)).toBe("90 of 113 skill nodes verified");
    expect(certificationAccuracyLine(87.4)).toBe("Overall accuracy: 87%");
    expect(certificationRevokedBody("2026-07-01T00:00:00.000Z")).toContain("Jul 1, 2026");
    expect(certificationRankVerifyHint("alex")).toBe("Visit mentrixa.one/rank/alex to verify");
  });
});
