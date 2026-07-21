"use server";

import { requireRole } from "@/shared/core/auth";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export type MasteryGridFetchMode = "student" | "guide" | "public";

export async function getMasteryGrid(
  userId: string,
  subject: string,
  mode: MasteryGridFetchMode,
): Promise<MasteryGridData> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("userId is required.");
  }
  if (!isApCalculusAbSubject(subject)) {
    throw new Error("Only AP Calculus AB is available for the mastery grid.");
  }

  if (mode === "public") {
    return loadMasteryGrid(trimmedUserId);
  }

  if (mode === "guide") {
    await requireRole(["tutor", "admin"]);
    return loadMasteryGrid(trimmedUserId);
  }

  const user = await requireRole(["student", "admin"]);
  if (user.role !== "admin" && user.id !== trimmedUserId) {
    throw new Error("You can only load your own mastery grid.");
  }

  return loadMasteryGrid(trimmedUserId);
}

export async function getMasteryGridForCurrentUser(): Promise<MasteryGridData> {
  const user = await requireRole(["student", "admin"]);
  return loadMasteryGrid(user.id);
}
