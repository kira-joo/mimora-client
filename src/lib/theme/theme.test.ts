import { describe, expect, it } from "vitest";
import type { ThemeView } from "../api/types";
import { brandCss, htmlThemeAttributes } from "./theme";

const fill = (hex: string) => ({ hex, contrastRatio: 5, source: "derived" as const });
const theme = (overrides: Partial<ThemeView["theme"]> = {}, primary = "#2f6e8c"): ThemeView => ({
  brand: { primary, accent: "#4b5b43", radiusScale: 1 },
  theme: { defaultGround: "light", darkEnabled: true, allowVisitorChoice: true, ...overrides },
  palette: { light: { primary: fill(primary), accent: fill("#4b5b43") }, dark: { primary: fill("#3985a9"), accent: fill("#9db08f") } },
  grounds: { light: "#F7F5F1", dark: "#14130F" },
});

describe("brand CSS", () => {
  it("paints the resolved fills per ground, under the same selectors as tokens.css", () => {
    const css = brandCss(theme());
    expect(css).toContain(":root{--sf-action:#2f6e8c;");
    expect(css).toContain(':root[data-dark="enabled"]:not([data-ground="light"]){--sf-action:#3985a9;');
    expect(css).toContain(':root[data-ground="dark"]{--sf-action:#3985a9;');
  });

  it("refuses anything that is not a hex colour — this string is written into a <style> element", () => {
    expect(brandCss(theme({}, "red;}body{display:none"))).not.toContain("display:none");
  });

  it("emits nothing without a theme, so the designed default tokens stand", () => {
    expect(brandCss(null)).toBe("");
  });

  it("offers the dark ground only when the merchant enabled it (D-S5)", () => {
    expect(htmlThemeAttributes(theme({ darkEnabled: false }))).toEqual({});
    expect(htmlThemeAttributes(theme({ darkEnabled: true, defaultGround: "dark" }))).toEqual({ "data-dark": "enabled", "data-ground": "dark" });
  });
});
