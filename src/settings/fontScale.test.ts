import { describe, expect, it } from "vitest";
import { normalizeFontScale } from "./fontScale";

describe("font scale", () => {
  it.each([1, 1.15, 1.3] as const)("accepts supported scale %s", (scale) => {
    expect(normalizeFontScale(scale)).toBe(scale);
  });

  it("falls back to standard for invalid or imported values", () => {
    expect(normalizeFontScale(2)).toBe(1);
    expect(normalizeFontScale("1.3")).toBe(1);
    expect(normalizeFontScale(undefined)).toBe(1);
  });
});
