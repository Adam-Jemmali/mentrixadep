"use server";

import { requireRole } from "@/shared/core/auth";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";

export async function getMasteryGridForCurrentUser(): Promise<MasteryGridData> {
  const user = await requireRole(["student", "admin"]);
  return loadMasteryGrid(user.id);
}
