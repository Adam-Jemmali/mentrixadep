import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("approved, role")
    .eq("id", user.id)
    .single();

  if (userData?.approved) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Account Pending Approval
          </h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
            Your registration request is pending admin approval. You will be able to access the platform once an admin approves your account.
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-yellow-800 dark:text-yellow-200 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

