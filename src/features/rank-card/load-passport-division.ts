import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  AP_CALC_AB_DIVISION_NAME,
  resolveArenaDivisionKey,
  sumArenaDivisionXp,
} from "@/features/divisions/ap-calc-ab-division";

export type PassportDivisionSnapshot = {
  status: "no_division" | "rank_1" | "has_rival";
  divisionName: string;
  myRank: number | null;
  myXp: number;
};

/** Public rank passport division standings for AP Calculus AB league. */
export async function loadPassportDivisionSnapshot(
  studentId: string,
): Promise<PassportDivisionSnapshot> {
  const admin = createAdminClient();
  const divisionKey = resolveArenaDivisionKey();
  const divisionName = AP_CALC_AB_DIVISION_NAME;

  const { data: userXpRow } = await admin
    .from("user_xp")
    .select("division_xp")
    .eq("user_id", studentId)
    .maybeSingle();

  const divisionXp = (userXpRow?.division_xp as Record<string, number> | null) ?? {};
  const myXp = sumArenaDivisionXp(divisionXp);

  if (myXp <= 0) {
    return { status: "no_division", divisionName, myRank: null, myXp: 0 };
  }

  const { count: rankCount } = await admin
    .from("mv_division_leaderboard")
    .select("*", { count: "exact", head: true })
    .eq("division_key", divisionKey)
    .gt("division_xp", myXp);

  const myRank = (rankCount ?? 0) + 1;

  return {
    status: myRank === 1 ? "rank_1" : "has_rival",
    divisionName,
    myRank,
    myXp,
  };
}
