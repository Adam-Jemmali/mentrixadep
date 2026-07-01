import { describe, expect, it } from "vitest";
import {
  extractDiscussionLinks,
  validateDiscussionLink,
  validateDiscussionLinks,
} from "@/features/divisions/discussion-content-pure";

describe("discussion link moderation", () => {
  it("allows https links", () => {
    const result = validateDiscussionLinks("Check https://example.com/guide for tips.");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.links).toHaveLength(1);
      expect(result.links[0]?.host).toBe("example.com");
    }
  });

  it("rejects javascript links", () => {
    const result = validateDiscussionLink("javascript:alert(1)");
    expect(result.ok).toBe(false);
  });

  it("rejects http links", () => {
    const result = validateDiscussionLink("http://example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects too many links", () => {
    const text =
      "a https://a.com b https://b.com c https://c.com d https://d.com";
    const result = validateDiscussionLinks(text);
    expect(result.ok).toBe(false);
  });

  it("extracts links without duplicates", () => {
    const links = extractDiscussionLinks(
      "See https://mentrixa.one and again https://mentrixa.one/path",
    );
    expect(links).toHaveLength(2);
  });
});
