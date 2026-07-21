"use client";

import { useCallback } from "react";
import useSWR, { mutate as globalMutate, useSWRConfig } from "swr";
import {
  getMasteryGrid,
  type MasteryGridFetchMode,
} from "@/features/mastery-grid/get-mastery-grid-action";
import type { MasteryGridData } from "@/features/mastery-grid/types";

export const MASTERY_GRID_SWR_ROOT = "mastery-grid" as const;

export function masteryGridSwrKey(
  userId: string,
  subject: string,
  mode: MasteryGridFetchMode,
) {
  return [MASTERY_GRID_SWR_ROOT, userId, subject, mode] as const;
}

const REVALIDATE_MS = 30_000;

export function useMasteryGridData({
  userId,
  subject,
  mode,
  initialData,
  enabled = true,
}: {
  userId: string;
  subject: string;
  mode: MasteryGridFetchMode;
  initialData?: MasteryGridData;
  enabled?: boolean;
}) {
  const key = enabled ? masteryGridSwrKey(userId, subject, mode) : null;

  return useSWR(
    key,
    () => getMasteryGrid(userId, subject, mode),
    {
      fallbackData: initialData,
      refreshInterval: REVALIDATE_MS,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    },
  );
}

export function useMasteryGridCache() {
  const { mutate } = useSWRConfig();

  const setMasteryGrid = useCallback(
    (userId: string, subject: string, mode: MasteryGridFetchMode, data: MasteryGridData) => {
      void mutate(masteryGridSwrKey(userId, subject, mode), data, { revalidate: false });
    },
    [mutate],
  );

  const revalidateMasteryGrid = useCallback(
    (userId: string, subject: string, mode: MasteryGridFetchMode) => {
      void mutate(masteryGridSwrKey(userId, subject, mode));
    },
    [mutate],
  );

  return { setMasteryGrid, revalidateMasteryGrid };
}

/** Optimistic cache patch after quest finalize — updates every mounted mastery grid for the subject. */
export function patchMasteryGridCache(data: MasteryGridData) {
  void globalMutate(
    (key) =>
      Array.isArray(key) &&
      key[0] === MASTERY_GRID_SWR_ROOT &&
      key[2] === data.subject,
    data,
    { revalidate: false },
  );
}
