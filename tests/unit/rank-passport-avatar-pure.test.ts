import { describe, expect, it } from "vitest";
import {
  isLikelyImageUrl,
  resolvePassportAvatarUrl,
} from "@/features/rank-card/rank-passport-avatar-pure";

describe("isLikelyImageUrl", () => {
  it("accepts common image extensions", () => {
    expect(isLikelyImageUrl("https://cdn.example.com/user/photo.jpg")).toBe(true);
    expect(isLikelyImageUrl("https://cdn.example.com/user/photo.webp?v=1")).toBe(true);
  });

  it("accepts supabase storage and google avatars", () => {
    expect(
      isLikelyImageUrl(
        "https://abc.supabase.co/storage/v1/object/public/avatars/user.png",
      ),
    ).toBe(true);
    expect(isLikelyImageUrl("https://lh3.googleusercontent.com/a/abc")).toBe(true);
  });

  it("rejects webpage urls", () => {
    expect(isLikelyImageUrl("https://mentrixa.one/")).toBe(false);
    expect(isLikelyImageUrl("https://example.com/page.html")).toBe(false);
  });
});

describe("resolvePassportAvatarUrl", () => {
  it("prefers valid settings avatar over auth metadata", () => {
    expect(
      resolvePassportAvatarUrl({
        settingsUrl: "https://cdn.example.com/me.png",
        authMetadata: { picture: "https://lh3.googleusercontent.com/a/oauth" },
      }),
    ).toBe("https://cdn.example.com/me.png");
  });

  it("falls back to auth metadata when settings url is not an image", () => {
    expect(
      resolvePassportAvatarUrl({
        settingsUrl: "https://mentrixa.one/",
        authMetadata: { picture: "https://lh3.googleusercontent.com/a/oauth.jpg" },
      }),
    ).toBe("https://lh3.googleusercontent.com/a/oauth.jpg");
  });

  it("returns null when no valid image exists", () => {
    expect(
      resolvePassportAvatarUrl({
        settingsUrl: "https://mentrixa.one/",
        authMetadata: { picture: "https://mentrixa.one/landing" },
      }),
    ).toBeNull();
  });
});
