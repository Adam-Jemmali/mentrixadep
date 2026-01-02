import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "OTAMS - Online Tutoring and Management System",
  description: "Online Tutoring and Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900`}
      >
        <ErrorBoundary>
          <Navigation />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
