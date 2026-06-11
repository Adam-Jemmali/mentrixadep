import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/shared/integrations/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

vi.mock("@/shared/core/role-home", () => ({
  getRoleHomePath: (role: string) => {
    if (role === "student") return "/student";
    if (role === "tutor") return "/tutor";
    if (role === "admin") return "/admin";
    return "/";
  },
}));

import { getPostApprovalRedirectPath } from "@/shared/core/post-approval-redirect";

function mockQuestCount(count: number | null, error: Error | null = null) {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        eq: () => ({
          error,
          count,
        }),
      }),
    }),
  });
}

describe("getPostApprovalRedirectPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends brand-new students to onboarding quest", async () => {
    mockQuestCount(0);
    await expect(
      getPostApprovalRedirectPath({ userId: "user-1", role: "student" }),
    ).resolves.toBe("/student/quest?onboarding=true");
  });

  it("sends returning students to student hub", async () => {
    mockQuestCount(2);
    await expect(
      getPostApprovalRedirectPath({ userId: "user-1", role: "student" }),
    ).resolves.toBe("/student");
  });

  it("sends tutors to tutor onboarding", async () => {
    await expect(
      getPostApprovalRedirectPath({ userId: "user-1", role: "tutor" }),
    ).resolves.toBe("/tutor?onboarding=true");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("falls back to role home when quest count query fails", async () => {
    mockQuestCount(null, new Error("db down"));
    await expect(
      getPostApprovalRedirectPath({ userId: "user-1", role: "student" }),
    ).resolves.toBe("/student");
  });
});
