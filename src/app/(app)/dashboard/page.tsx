import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getDisplayName(userId: string, email?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.display_name) return data.display_name;
  if (email) return email.split("@")[0];
  return "there";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  if (user.role !== "admin") {
    redirect(user.role === "tutor" ? "/tutor" : "/student");
  }

  const displayName = await getDisplayName(user.id, user.email);

  const dashboardHref = "/admin";
  const dashboardLabel = "Admin panel";

  return (
    <div className="min-h-screen bg-background">
      <div className="section-container py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {displayName}
          </p>
        </div>

        <Card className="mb-6 border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-medium text-foreground w-20">
                  Role:
                </span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium uppercase">
                  {user.role}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-medium text-foreground w-20">
                  Email:
                </span>
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-medium text-foreground w-20">
                  Status:
                </span>
                <span className="px-2 py-1 bg-success/10 text-success rounded text-xs font-medium">
                  Approved
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger-children">
          <Card className="card-lift border-slate-200/80 shadow-sm hover:border-mentrixa-200/60 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <Button asChild className="w-full" variant="default">
                <Link href={dashboardHref}>{dashboardLabel}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-lift border-slate-200/80 shadow-sm hover:border-mentrixa-200/60 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <Button asChild className="w-full" variant="outline">
                <Link href="/settings">Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
