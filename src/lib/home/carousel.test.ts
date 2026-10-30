import { describe, expect, it } from "vitest";
import { autoplayRuns, swipeStep, wrapIndex, type AutoplayState } from "./carousel";

const running: AutoplayState = { count: 3, reducedMotion: false, userPaused: false, hovering: false, focusWithin: false, tabHidden: false };

describe("wrapIndex", () => {
  it("steps forward and wraps past the end", () => {
    expect(wrapIndex(0, 1, 3)).toBe(1);
    expect(wrapIndex(2, 1, 3)).toBe(0);
  });
  it("steps back and wraps before the start", () => {
    expect(wrapIndex(0, -1, 3)).toBe(2);
    expect(wrapIndex(1, -1, 3)).toBe(0);
  });
  it("is stable with no slides", () => {
    expect(wrapIndex(0, 1, 0)).toBe(0);
  });
});

describe("autoplayRuns", () => {
  it("runs when nothing prevents it", () => {
    expect(autoplayRuns(running)).toBe(true);
  });
  it("never runs under reduced motion", () => {
    expect(autoplayRuns({ ...running, reducedMotion: true })).toBe(false);
  });
  it("stops when the visitor pauses it", () => {
    expect(autoplayRuns({ ...running, userPaused: true })).toBe(false);
  });
  it.each(["hovering", "focusWithin", "tabHidden"] as const)("pauses while %s", (key) => {
    expect(autoplayRuns({ ...running, [key]: true })).toBe(false);
  });
  it("does not run with fewer than two slides", () => {
    expect(autoplayRuns({ ...running, count: 1 })).toBe(false);
    expect(autoplayRuns({ ...running, count: 0 })).toBe(false);
  });
});

describe("swipeStep", () => {
  it("LTR: dragging left goes forward, right goes back", () => {
    expect(swipeStep(-80, 4, false)).toBe(1);
    expect(swipeStep(80, 4, false)).toBe(-1);
  });
  it("RTL mirrors: dragging right goes forward, left goes back", () => {
    expect(swipeStep(80, 4, true)).toBe(1);
    expect(swipeStep(-80, 4, true)).toBe(-1);
  });
  it("ignores short and mostly vertical drags", () => {
    expect(swipeStep(-20, 0, false)).toBe(0);
    expect(swipeStep(-60, 90, false)).toBe(0);
  });
});
