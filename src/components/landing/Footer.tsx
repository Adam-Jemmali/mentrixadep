import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-20 bg-card border-t border-border">
      <div className="section-container">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">O</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">OTAMS</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Academic help. One tap away.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-8 md:gap-12">
            {[
              { name: "Services", href: "/student" },
              { name: "For Providers", href: "/auth/signup?role=tutor" },
              { name: "Privacy", href: "/privacy" },
              { name: "Terms", href: "/terms" },
            ].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} OTAMS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

