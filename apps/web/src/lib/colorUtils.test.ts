import { describe, expect, it } from "vitest";
import { getContrastColor } from "./colorUtils";

describe("getContrastColor", () => {
  it("returns dark text for light backgrounds", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    expect(getContrastColor("f8fafc")).toBe("#000000");
  });

  it("returns white text for dark backgrounds", () => {
    expect(getContrastColor("#000000")).toBe("#FFFFFF");
    expect(getContrastColor("#18181b")).toBe("#FFFFFF");
  });

  it("supports shorthand hex and falls back for invalid input", () => {
    expect(getContrastColor("#fff")).toBe("#000000");
    expect(getContrastColor("not-a-color")).toBe("#000000");
  });
});
