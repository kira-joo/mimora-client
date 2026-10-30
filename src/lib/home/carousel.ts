/*
 * The hero carousel's decisions, as pure functions so they can be tested
 * without a browser: which slide is showing, how far a slide sits from the
 * frame, when autoplay may run, and what a swipe means. The component only
 * wires events to these.
 *
 * The carousel keeps one unbounded `position` (0, 1, 2 … or -1, -2 … — never
 * wrapped). The slide showing is `wrapIndex(position, 0, count)`; every step
 * and every jump just moves `position`, so a loop is a real continuation of
 * the same direction of travel instead of a rewind across the whole strip.
 */

/** The index `step` places from `index`, wrapping both ways. */
export function wrapIndex(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}

/**
 * The signed distance to travel from the slide at `from` to the slide at `to`:
 * the shorter way round the loop, and forward when both ways are equal.
 */
export function shortestStep(from: number, to: number, count: number): number {
  if (count <= 1) return 0;
  const forward = wrapIndex(to, -from, count);
  return forward > count / 2 ? forward - count : forward;
}

/**
 * The cells to keep mounted around `position`: as many either side as the
 * longest jump a dot can ask for (`shortestStep` never exceeds half the loop).
 * Cell `v` shows slide `wrapIndex(v, 0, count)` and sits `v - position` frames
 * from the viewport, so a cell never changes slide and never jumps — it only
 * slides.
 */
export function visibleCells(position: number, count: number): number[] {
  if (count < 2) return [0];
  const reach = Math.floor(count / 2);
  return Array.from({ length: reach * 2 + 1 }, (_, i) => position - reach + i);
}

/**
 * Where cell `v` sits as a percentage of the frame's width. The strip runs in
 * the reading direction, so the next slide waits on the reading-end side:
 * physical right in LTR, physical left in RTL.
 */
export function cellShift(v: number, position: number, rtl: boolean): number {
  const shift = (v - position) * 100;
  return rtl ? -shift : shift;
}

export interface AutoplayState {
  count: number;
  reducedMotion: boolean;
  hovering: boolean;
  focusWithin: boolean;
  tabHidden: boolean;
}

/**
 * Autoplay runs only when there is something to rotate to, the visitor has not
 * asked for stillness (system preference), and nothing is being pointed at,
 * focused or hidden. There is deliberately no pause control: the safeguards
 * are these silent ones. Under reduced motion it never runs.
 */
export function autoplayRuns(state: AutoplayState): boolean {
  if (state.count < 2 || state.reducedMotion) return false;
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
