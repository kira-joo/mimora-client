import { describe, expect, it } from "vitest";
import { autoplayRuns, cellShift, shortestStep, swipeStep, visibleCells, wrapIndex, type AutoplayState } from "./carousel";

const running: AutoplayState = { count: 3, reducedMotion: false, hovering: false, focusWithin: false, tabHidden: false };

describe("wrapIndex", () => {
  it("steps forward and wraps past the end", () => {
    expect(wrapIndex(0, 1, 3)).toBe(1);
    expect(wrapIndex(2, 1, 3)).toBe(0);
  });
  it("steps back and wraps before the start", () => {
    expect(wrapIndex(0, -1, 3)).toBe(2);
    expect(wrapIndex(1, -1, 3)).toBe(0);
  });
  it("maps an unbounded position onto a slide", () => {
    expect(wrapIndex(-5, 0, 4)).toBe(3);
    expect(wrapIndex(9, 0, 4)).toBe(1);
  });
  it("is stable with no slides", () => {
    expect(wrapIndex(0, 1, 0)).toBe(0);
  });
});

describe("shortestStep", () => {
  it("goes the short way round, in either direction", () => {
    expect(shortestStep(0, 1, 4)).toBe(1);
    expect(shortestStep(0, 3, 4)).toBe(-1);
    expect(shortestStep(3, 0, 4)).toBe(1);
    expect(shortestStep(1, 0, 5)).toBe(-1);
  });
  it("goes forward when both ways are equally long", () => {
    expect(shortestStep(0, 2, 4)).toBe(2);
    expect(shortestStep(3, 1, 4)).toBe(2);
  });
  it("is zero for the current slide and for a lone slide", () => {
    expect(shortestStep(2, 2, 4)).toBe(0);
    expect(shortestStep(0, 0, 1)).toBe(0);
  });
});

describe("visibleCells", () => {
  it("keeps half the loop either side of the position", () => {
    expect(visibleCells(10, 4)).toEqual([8, 9, 10, 11, 12]);
    expect(visibleCells(-1, 4)).toEqual([-3, -2, -1, 0, 1]);
  });
  it("keeps just the neighbours in a loop of three or two", () => {
    expect(visibleCells(5, 3)).toEqual([4, 5, 6]);
    expect(visibleCells(0, 2)).toEqual([-1, 0, 1]);
  });
  it("always contains the target of the longest jump a dot can ask for", () => {
    for (const count of [2, 3, 4, 5, 6, 7]) {
      for (let from = 0; from < count; from++) {
        for (let to = 0; to < count; to++) {
          const target = from + shortestStep(from, to, count);
          expect(visibleCells(from, count)).toContain(target);
        }
      }
    }
  });
  it("is a single cell with nothing to rotate to", () => {
    expect(visibleCells(0, 1)).toEqual([0]);
  });
});

describe("cellShift", () => {
  it("LTR: the next slide waits on the right, the previous on the left", () => {
    expect(cellShift(1, 0, false)).toBe(100);
    expect(cellShift(-1, 0, false)).toBe(-100);
    expect(cellShift(3, 3, false)).toBe(0);
  });
  it("RTL mirrors: the next slide waits on the left", () => {
    expect(cellShift(1, 0, true)).toBe(-100);
    expect(cellShift(-1, 0, true)).toBe(100);
  });
  it("stays continuous across the end of the loop", () => {
    // Stepping from the last slide (position 3 of 4) to the next one keeps travelling the same way.
    expect(cellShift(4, 3, false)).toBe(100);
    expect(cellShift(3, 4, false)).toBe(-100);
  });
});

describe("autoplayRuns", () => {
  it("runs when nothing prevents it", () => {
    expect(autoplayRuns(running)).toBe(true);
  });
  it("never runs under reduced motion", () => {
    expect(autoplayRuns({ ...running, reducedMotion: true })).toBe(false);
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
  it("a swipe and the strip agree: the drag brings the next slide in from where it waits", () => {
    // LTR: next waits on the right, dragging left pulls it in. RTL: next waits on the left, dragging right does.
    expect(Math.sign(cellShift(1, 0, false))).toBe(-Math.sign(-80));
    expect(swipeStep(-80, 0, false)).toBe(1);
    expect(Math.sign(cellShift(1, 0, true))).toBe(-Math.sign(80));
    expect(swipeStep(80, 0, true)).toBe(1);
  });
  it("ignores short and mostly vertical drags", () => {
    expect(swipeStep(-20, 0, false)).toBe(0);
    expect(swipeStep(-60, 90, false)).toBe(0);
  });
});
