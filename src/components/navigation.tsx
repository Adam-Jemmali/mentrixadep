import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function Navigation() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    ...(user.role === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
    ...(user.role === "tutor" || user.role === "admin"
      ? [{ href: "/tutor", label: "Tutor" }]
      : []),
    ...(user.role === "student" || user.role === "admin"
      ? [{ href: "/student", label: "Student" }]
      : []),
  ];

  return (
    <nav className="bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-50">
      <div className="section-container">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight hidden sm:inline">
                OTAMS
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline font-medium">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="destructive" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
        <div className="sm:hidden pb-4 space-y-1 pt-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
