import { describe, expect, it } from "vitest";
import {
  buildArenaWidgetIframeHtml,
  formatPublicFeedLine,
  parseWidgetHeight,
  parseWidgetTheme,
  portfolioToPublicFeedItem,
} from "@/features/arena-widget/public-feed-pure";

describe("public feed pure", () => {
  it("maps portfolio rows without student names", () => {
    const item = portfolioToPublicFeedItem({
      id: "1",
      nodeName: "Chain Rule",
      beforeAccuracy: 41,
      afterAccuracy: 78,
      addedAt: "2026-07-17T12:00:00.000Z",
    });
    expect(item.event_type).toBe("guide_breakthrough");
    expect(item.display_name).toBe("Chain Rule lift");
    expect(item.unit_name).toBe("41% to 78%");
    expect(formatPublicFeedLine(item)).toBe("Chain Rule 41% to 78%");
  });

  it("parses widget theme and height", () => {
    expect(parseWidgetTheme("light")).toBe("light");
    expect(parseWidgetTheme("dark")).toBe("dark");
    expect(parseWidgetTheme(null)).toBe("dark");
    expect(parseWidgetHeight("500")).toBe(500);
    expect(parseWidgetHeight("50")).toBe(240);
  });

  it("builds brief iframe HTML", () => {
    const html = buildArenaWidgetIframeHtml({
      siteUrl: "https://mentrixa.one",
      theme: "dark",
      height: 420,
    });
    expect(html).toContain('src="https://mentrixa.one/widget/arena?theme=dark&height=420"');
    expect(html).not.toMatch(/[()]/);
  });
});
