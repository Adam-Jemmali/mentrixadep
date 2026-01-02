"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Services", href: "/student" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "For Providers", href: "/auth/signup?role=tutor" },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50" : "bg-transparent"
    }`}>
      <div className="section-container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">O</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight hidden sm:block">OTAMS</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => {
              if (link.href.startsWith("#")) {
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                );
              }
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border animate-fade-in">
          <div className="section-container py-6 space-y-4">
            {navLinks.map((link) => {
              if (link.href.startsWith("#")) {
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                );
              }
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="pt-6 border-t border-border space-y-3">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
              </Button>
              <Button className="w-full" asChild>
                <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

