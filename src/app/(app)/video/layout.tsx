import type { Viewport } from "next";

/** Disable pinch-zoom on video calls — keeps layout and controls predictable on mobile. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#080C14",
};

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black text-white">{children}</div>;
}
