import type { ReactNode } from "react";

export default function WrappedShareLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden bg-[#0B1220]">{children}</div>;
}
