import { describe, expect, it } from "vitest";
import { isSupportedLocale, SUPPORTED_LOCALES } from "./index";

describe("shared locale helpers", () => {
  it("accepts only supported Canadian locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["fr-CA", "en-CA"]);
    expect(isSupportedLocale("fr-CA")).toBe(true);
    expect(isSupportedLocale("en-CA")).toBe(true);
    expect(isSupportedLocale("fr-FR")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
  });
});
