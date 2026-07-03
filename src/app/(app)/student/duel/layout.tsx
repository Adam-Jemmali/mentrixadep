import { DuelRouteWarmup } from "./duel-route-warmup";

export default function StudentDuelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DuelRouteWarmup>{children}</DuelRouteWarmup>;
}
