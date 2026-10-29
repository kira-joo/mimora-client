import type { ThemeView } from "../api/types";

/*
 * The merchant's theme as CSS (architecture.md §4, MDS §19). The backend
 * RESOLVES every colour per ground with its contrast guarantees (D-2, D-S1);
 * this app only paints them — it never derives a colour. Only brand FILLS are
 * merchant-controlled; text, border and state colours carry measured ratios
 * and are never overridable.
 *
 *   palette.primary → --sf-action / --sf-focus   (the call to action)
 *   palette.accent  → --sf-support
 *
 * The selectors mirror tokens.css exactly, so a brand value can never win over
 * the wrong ground (the recorded "cream-on-cream" failure: one inline value
 * beating both ground blocks).
 */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function fills(palette: ThemeView["palette"]["light"], hoverToward: "black" | "white"): string | null {
  const primary = palette.primary?.hex;
  const accent = palette.accent?.hex;
  if (!primary || !HEX.test(primary) || !accent || !HEX.test(accent)) return null;
  // Hover is a presentation step, not a brand colour: mixed in CSS toward the ground's ink.
  return `--sf-action:${primary};--sf-focus:${primary};--sf-action-hover:color-mix(in oklab,${primary} 88%,${hoverToward});--sf-support:${accent};`;
}

/** The <style> body for the brand, or "" (the designed default tokens stand) when there is no valid theme. */
export function brandCss(theme: ThemeView | null): string {
  if (!theme) return "";
  const light = fills(theme.palette.light, "black");
  const dark = fills(theme.palette.dark, "white");
  const radius = typeof theme.brand.radiusScale === "number" && theme.brand.radiusScale >= 0 && theme.brand.radiusScale <= 4 ? `--sf-brand-radius-scale:${theme.brand.radiusScale};` : "";
  let css = "";
  if (light || radius) css += `:root{${light ?? ""}${radius}}`;
  if (dark) css += `@media (prefers-color-scheme: dark){:root[data-dark="enabled"]:not([data-ground="light"]){${dark}}}:root[data-ground="dark"]{${dark}}`;
  return css;
}

/** Static per store — safe for ISR: nothing here depends on the visitor. */
export function htmlThemeAttributes(theme: ThemeView | null): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (!theme) return attributes;
  if (theme.theme.darkEnabled) attributes["data-dark"] = "enabled";
  // A store whose default ground is dark starts dark; an explicit visitor choice (ground-script.ts) still wins.
  if (theme.theme.darkEnabled && theme.theme.defaultGround === "dark") attributes["data-ground"] = "dark";
  if (theme.brand.typographyChoice !== "default") attributes["data-typography"] = theme.brand.typographyChoice;
  return attributes;
}
