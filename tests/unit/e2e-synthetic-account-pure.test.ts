import { describe, expect, it } from "vitest";
import {
  isE2ESyntheticAccount,
  isE2ESyntheticEmail,
  isE2ESyntheticLabel,
} from "@/shared/core/e2e-synthetic-account-pure";

describe("e2e synthetic account detection", () => {
  it("flags guest-chain and chain example emails", () => {
    expect(
      isE2ESyntheticEmail("e2e.guest-chain.1783482184461.8p3w5w@example.com"),
    ).toBe(true);
    expect(isE2ESyntheticEmail("e2e.chain.1783485371027@example.com")).toBe(true);
    expect(isE2ESyntheticEmail("student.e2e@example.com")).toBe(false);
    expect(isE2ESyntheticEmail("trapdime@gmail.com")).toBe(false);
  });

  it("flags e2e-chain public labels", () => {
    expect(isE2ESyntheticLabel("e2e-chain-1783485371027")).toBe(true);
    expect(isE2ESyntheticLabel("Trapdime")).toBe(false);
    expect(isE2ESyntheticLabel("vacina5883")).toBe(false);
  });

  it("combines email and label signals", () => {
    expect(
      isE2ESyntheticAccount({
        email: "e2e.guest-chain.1@example.com",
        displayName: null,
        username: null,
      }),
    ).toBe(true);
    expect(
      isE2ESyntheticAccount({
        email: null,
        displayName: "e2e-chain-99",
        username: null,
      }),
    ).toBe(true);
    expect(
      isE2ESyntheticAccount({
        email: "real@mentrixa.one",
        displayName: "Trapdime",
        username: "trapdime",
      }),
    ).toBe(false);
  });
});
