import type { SVGProps } from "react";

/*
 * Small hand-drawn ornaments — decorative only, so every one is aria-hidden and
 * takes its colour from the `ornament` / `ribbon-*` tokens (so both grounds work).
 * They are drawn in a mirror-neutral way where possible; the bow is asymmetric and
 * callers flip it with `rtl:-scale-x-100` so the composition mirrors with the page.
 */
type Props = SVGProps<SVGSVGElement>;

/** A loose, single-stroke outline heart — slightly uneven, like a pen drawing. */
export function HandHeart({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 32 30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} {...rest}>
      <path d="M16.4 27.2C9.6 22.1 3.2 17.3 3 10.9 2.9 6.6 6 3.6 9.7 3.7c2.6.1 4.9 1.7 6.2 4.1 1.4-2.7 3.9-4.3 6.7-4.2 3.8.1 6.6 3.3 6.4 7.4-.3 6.2-6.4 11.4-12.6 16.2z" />
    </svg>
  );
}

/** A filled heart, for small accents next to a title. */
export function SolidHeart({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 22" fill="currentColor" aria-hidden="true" focusable="false" className={className} {...rest}>
      <path d="M12.2 21C6.9 17 2 13.3 1.8 8.4 1.7 5.1 4.1 2.8 7 2.9c2 .1 3.8 1.3 4.8 3.2 1.1-2 3-3.3 5.2-3.2 2.9.1 5.1 2.6 4.9 5.7-.2 4.8-4.9 8.8-9.7 12.4z" />
    </svg>
  );
}

/** A tied satin bow with two tails — drawn in three tones so it reads as ribbon, not a flat icon. */
export function Bow({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 220 120" fill="none" aria-hidden="true" focusable="false" className={className} {...rest}>
      <path d="M104 52C86 26 44 8 22 22 6 33 10 62 30 74c20 12 52 2 74-22z" className="fill-ribbon-light" />
      <path d="M116 52c18-26 60-44 82-30 16 11 12 40-8 52-20 12-52 2-74-22z" className="fill-ribbon-mid" />
      <path d="M30 74c18 8 44 2 74-22-24 8-50 6-70 0-4 6-4 14-4 22z" className="fill-ribbon-dark" opacity="0.55" />
      <path d="M190 74c-18 8-44 2-74-22 24 8 50 6 70 0 4 6 4 14 4 22z" className="fill-ribbon-dark" opacity="0.55" />
      <path d="M104 52c-8 16-26 40-46 62 14 2 28-4 40-18 6-8 10-20 12-30z" className="fill-ribbon-mid" />
      <path d="M116 52c8 16 26 40 46 62-14 2-28-4-40-18-6-8-10-20-12-30z" className="fill-ribbon-light" />
      <rect x="98" y="40" width="24" height="26" rx="9" className="fill-ribbon-dark" />
      <path d="M102 46c4-3 12-3 16 0" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A curling ribbon doodle used as a section flourish. */
export function Squiggle({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 120 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" className={className} {...rest}>
      <path d="M3 14c8-12 14-12 20 0s12 12 20 0 14-12 20 0 12 12 20 0 14-12 20 0 12 12 14 2" />
    </svg>
  );
}

/** A four-point sparkle. */
export function Sparkle({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className} {...rest}>
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
    </svg>
  );
}
