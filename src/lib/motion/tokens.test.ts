import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MOTION } from "./tokens";

/** The mirror is only safe if it cannot drift: read the CSS tokens and compare. */
const css = readFileSync(path.resolve(__dirname, "../../styles/tokens.css"), "utf8");
const value = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
const ms = (name: string) => Number(value(name)?.replace("ms", "")) / 1000;
const bezier = (name: string) => value(name)?.match(/cubic-bezier\(([^)]+)\)/)?.[1]?.split(",").map(Number);

describe("motion tokens mirror tokens.css", () => {
  it("durations", () => {
    expect(MOTION.fast).toBe(ms("sf-duration-fast"));
    expect(MOTION.standard).toBe(ms("sf-duration-standard"));
    expect(MOTION.slow).toBe(ms("sf-duration-slow"));
  });

  it("easings", () => {
    expect(MOTION.easeStandard).toEqual(bezier("sf-ease-standard"));
    expect(MOTION.easeExit).toEqual(bezier("sf-ease-exit"));
  });
});
