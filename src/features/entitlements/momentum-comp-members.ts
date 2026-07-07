import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  isMomentumCompMember,
  resolveMomentumActive,
  type MomentumCompIdentity,
} from "@/features/entitlements/momentum-comp-members-pure";
import { getStudentSubscription } from "@/features/payments/student-subscription";

async function loadMomentumCompIdentity(userId: string): Promise<MomentumCompIdentity> {
  const admin = createAdminClient();

  const [{ data: settings }, authResult] = await Promise.all([
    admin.from("user_settings").select("display_name").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
  ]);

  return {
    email: authResult.data.user?.email ?? null,
    displayName: settings?.display_name ?? null,
  };
}

export async function resolveMomentumCompMember(userId: string): Promise<boolean> {
  const identity = await loadMomentumCompIdentity(userId);
  return isMomentumCompMember(identity);
}

export async function isMomentumMemberForUser(userId: string): Promise<boolean> {
  const [subscription, compMember] = await Promise.all([
    getStudentSubscription(userId),
    resolveMomentumCompMember(userId),
  ]);
  return resolveMomentumActive({ subscription, compMember });
}
