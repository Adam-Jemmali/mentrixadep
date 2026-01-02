import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="section-container py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user.email}
          </p>
        </div>

        <Card className="mb-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.role === "admin" && (
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="p-6">
                <Button asChild className="w-full" variant="default">
                  <Link href="/admin">Admin Panel</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {(user.role === "tutor" || user.role === "admin") && (
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="p-6">
                <Button asChild className="w-full" variant="default">
                  <Link href="/tutor">Tutor Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {(user.role === "student" || user.role === "admin") && (
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="p-6">
                <Button asChild className="w-full" variant="default">
                  <Link href="/student">Student Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
