import { formatPeerStandingShort } from "@/features/xp/rank-statistics-pure";

export const PARENT_CUSTODIAN_INVITE_TTL_DAYS = 14;

export type ParentCustodianInviteCopy = {
  verdict: string;
  nextAction: string;
};

export function buildParentCustodianInviteCopy(input: {
  studentFirstName: string;
  custodianEmail: string;
}): ParentCustodianInviteCopy {
  return {
    verdict: `${input.studentFirstName} invited you to a read-only trajectory view for exam season.`,
    nextAction: `Open the link sent to ${input.custodianEmail}. You will see verified movement, not chat or coaching.`,
  };
}

export function buildParentCustodianViewCopy(input: {
  studentFirstName: string;
  trajectoryScore: number | null;
  verifiedPercentile: number | null;
}): ParentCustodianInviteCopy {
  const trajectoryLine =
    input.trajectoryScore != null
      ? `Trajectory Index ${input.trajectoryScore}.`
      : "Trajectory is still building from verified first attempts.";

  const peerLine =
    input.verifiedPercentile != null
      ? `${formatPeerStandingShort(input.verifiedPercentile)} of Mentrixers.`
      : "Peer standing is calibrating.";

  return {
    verdict: `${input.studentFirstName}'s movement is read-only here. ${trajectoryLine} ${peerLine}`,
    nextAction: "This view does not book sessions or change rank. Ask your student to act on the next coaching beat.",
  };
}
