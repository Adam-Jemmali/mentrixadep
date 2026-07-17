import type { ReactNode } from "react";

/** Bare shell for iframe embeds. No nav. No marketing chrome. */
export default function WidgetLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-0 overflow-hidden">{children}</div>;
}
