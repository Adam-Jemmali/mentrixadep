import { describe, expect, it } from "vitest";
import { isLegacyRepetitiveConstructionStem } from "@/features/quest/item-bank-selector";

describe("isLegacyRepetitiveConstructionStem", () => {
  it("flags generic UV product pipelines", () => {
    expect(
      isLegacyRepetitiveConstructionStem({
        prompt: "Order the analyst pipeline to differentiate a product $uv$.",
        authoring_meta: { template_key: "derivatives:drag-product" },
      }),
    ).toBe(true);
  });

  it("keeps unique product-rule stems with concrete factors", () => {
    expect(
      isLegacyRepetitiveConstructionStem({
        prompt: "Order the product-rule pipeline for $u(x)=x^{3}$ and $v(x)=\\sin(2x)$.",
        authoring_meta: { template_key: "derivatives:drag-product-3-2" },
      }),
    ).toBe(false);
  });
});
