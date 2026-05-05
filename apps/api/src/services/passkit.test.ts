import { describe, expect, it } from "vitest";
import { getContrastColor } from "./passkit.js";

describe("wallet pass color helpers", () => {
  it("chooses readable text colors from tenant card backgrounds", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    expect(getContrastColor("#18181b")).toBe("#FFFFFF");
    expect(getContrastColor("#ffcc00")).toBe("#000000");
  });

  it("normalizes shorthand hex and protects invalid tenant colors", () => {
    expect(getContrastColor("#000")).toBe("#FFFFFF");
    expect(getContrastColor("invalid")).toBe("#000000");
  });
});
