import type { ReactNode } from "react";

export function AuthLayout(props: {
  children: ReactNode;
  /** Reserved for future layout variants; shell handles left panel via route. */
  showLeftPanel?: boolean;
}) {
  return <>{props.children}</>;
}

