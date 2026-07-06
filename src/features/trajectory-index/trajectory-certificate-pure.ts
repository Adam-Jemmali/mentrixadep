import { formatPeerStandingShort } from "@/features/xp/rank-statistics-pure";

const VERIFIED_GOLD = "#D4A017";

export type TrajectoryCertificateData = {
  studentName: string;
  subject: string;
  verifiedPercentile: number | null;
  trajectoryScore: number | null;
  generatedOn: string;
  archiveWeeks: number;
};

export function buildTrajectoryCertificateVerdict(data: TrajectoryCertificateData): {
  verdict: string;
  nextAction: string;
} {
  const peerLine =
    data.verifiedPercentile != null
      ? `${formatPeerStandingShort(data.verifiedPercentile)} of Mentrixers verified on ${data.subject}.`
      : `Peer standing on ${data.subject} is still calibrating.`;

  const trajectoryLine =
    data.trajectoryScore != null
      ? `Trajectory Index ${data.trajectoryScore} across ${data.archiveWeeks} archived weeks.`
      : `Trajectory archive spans ${data.archiveWeeks} weeks of verified movement.`;

  return {
    verdict: `${peerLine} ${trajectoryLine}`,
    nextAction: "Print or save this certificate for your exam-season record. Gold marks verified peer standing only.",
  };
}

export function verifiedPercentileGoldStyle(): { color: string } {
  return { color: VERIFIED_GOLD };
}
