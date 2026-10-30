/*
 * The showcase carousel's decisions, as pure functions so they can be tested
 * without a browser: which slide comes next, when autoplay may run, and what a
 * swipe means. The component only wires events to these.
 */

/** The index `step` places from `index`, wrapping both ways. */
export function wrapIndex(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}

export interface AutoplayState {
  count: number;
  reducedMotion: boolean;
  /** The visitor pressed pause (WCAG 2.2.2). */
  userPaused: boolean;
  hovering: boolean;
  focusWithin: boolean;
  tabHidden: boolean;
}

/**
 * Autoplay runs only when there is something to rotate to, the visitor has not
 * asked for stillness (system preference or the pause control), and nothing is
 * being pointed at, focused or hidden. Under reduced motion it never runs.
 */
export function autoplayRuns(state: AutoplayState): boolean {
  if (state.count < 2 || state.reducedMotion || state.userPaused) return false;
  return !state.hovering && !state.focusWithin && !state.tabHidden;
}

/**
 * A horizontal drag as a step: toward the reading-start edge turns forward (like
 * turning a page), so the gesture mirrors in right-to-left. Short or mostly
 * vertical drags are scrolls, not swipes.
 */
export function swipeStep(dx: number, dy: number, rtl: boolean, threshold = 40): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return 0;
  const towardStart = rtl ? dx > 0 : dx < 0;
  return towardStart ? 1 : -1;
}
