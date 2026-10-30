/*
 * The motion tokens for Motion (`motion/react`), in seconds. Motion's
 * `transition` props cannot read CSS custom properties, so this module MIRRORS
 * the §14 tokens declared in src/styles/tokens.css — and the contract test
 * beside it reads that file and fails if the two ever disagree. This is the one
 * place a duration or a curve is written as a number; components import it.
 */
export const MOTION = {
  /** --sf-duration-fast */
  fast: 0.15,
  /** --sf-duration-standard */
  standard: 0.25,
  /** --sf-duration-slow */
  slow: 0.4,
  /** --sf-duration-crossfade — the hero carousel's slide-to-slide travel (one full image replacing the next). */
  crossfade: 0.7,
  /** --sf-duration-autoplay — how long a showcase slide rests before the next one (seconds). */
  autoplay: 6,
  /** --sf-duration-confirm — how long an "added" confirmation stays on a button (seconds). */
  confirm: 1.4,
  /** --sf-duration-notice — how long an add-failure message stays on a button (seconds). */
  notice: 2.4,
  /** The §14 stagger step between revealed siblings. */
  stagger: 0.05,
  /** --sf-ease-standard */
  easeStandard: [0.2, 0.7, 0.2, 1] as [number, number, number, number],
  /** --sf-ease-exit */
  easeExit: [0.4, 0, 1, 1] as [number, number, number, number],
} as const;
