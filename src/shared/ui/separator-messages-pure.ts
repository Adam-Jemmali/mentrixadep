export type MentrixaSeparatorSurface = "dashboard" | "settings" | "panel";

export function mentrixaSeparatorAriaLabel(surface: MentrixaSeparatorSurface): string {
  switch (surface) {
    case "dashboard":
      return "Section divider";
    case "settings":
      return "Settings section divider";
    case "panel":
      return "Content divider";
  }
}
