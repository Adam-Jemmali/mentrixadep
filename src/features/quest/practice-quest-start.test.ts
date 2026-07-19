import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createAdminClient: vi.fn(),
  loadNodeUnlockContext: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/core/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/shared/integrations/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/features/skill-tree/assert-node-unlocked", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/skill-tree/assert-node-unlocked")>();
  return {
    ...actual,
    loadNodeUnlockContext: mocks.loadNodeUnlockContext,
  };
});

import { startPracticeSession } from "@/features/quest/practice-quest";

describe("startPracticeSession skill-tree gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "student-1", role: "student" });
  });

  it("rejects a locked multi-part part with the exact error", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          creator_user_id: "student-1",
          metadata: {
            questKind: "practice_pack",
            subject: "AP Calculus AB",
            course: "AP Calculus AB",
            questions: [
              {
                id: "multi-1",
                kind: "multi_part",
                prompt: "Shared stem",
                explanation: "Explanation",
                parts: [
                  {
                    partKey: "a",
                    prompt: "Part A",
                    itemFormat: "free_response",
                    skillNodeId: "locked-part",
                    answerExpression: "1",
                  },
                ],
              },
            ],
          },
        },
        error: null,
      }),
    };
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });
    mocks.loadNodeUnlockContext.mockResolvedValue({
      parents: new Map([["locked-part", ["required-parent"]]]),
      solidIds: new Set<string>(),
      unlockedIds: new Set<string>(),
    });

    await expect(startPracticeSession("quest-1")).resolves.toEqual({
      success: false,
      error: "Locked. Open prior skill.",
    });
    expect(mocks.loadNodeUnlockContext).toHaveBeenCalledWith("student-1");
  });
});
