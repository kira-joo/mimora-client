import { useId } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Bow } from "./ornaments";

/*
 * The ribbon is drawn in one fixed coordinate space (the viewBox) and scaled uniformly with the strip's
 * width, so the wave, the check and the bow keep their proportions from 343px to 398px and up.
 *
 * Geometry: the centre line is a sine, `RIBBON_CENTRE - WAVE_AMPLITUDE * sin(2π x / WAVE_PERIOD)`.
 * Two full periods fit the width, and the line crosses the centre height exactly at the middle of the
 * strip — that is where the bow's knot sits, so the bow is tied onto the ribbon at its natural height.
 */
const VIEW_W = 400;
const VIEW_H = 50;
const RIBBON_CENTRE = VIEW_H / 2;
const RIBBON_HALF = 7; // ribbon thickness 14, ~12px on a 343px phone
const WAVE_AMPLITUDE = 7.5;
const WAVE_PERIOD = VIEW_W / 2;
const NOTCH = 6; // swallow-tail depth at each end of the ribbon
const CHECK = 7; // one gingham square; mirrors --sf-gingham-ribbon (7px), so the check matches the footer ribbon

const BOW_W = 84;
const BOW_H = (BOW_W * 120) / 220; // the Bow ornament's own 220x120 box
const BOW_KNOT_Y = (BOW_H * 53) / 120; // the knot's centre inside that box

const OMEGA = (2 * Math.PI) / WAVE_PERIOD;
const centreY = (x: number) => RIBBON_CENTRE - WAVE_AMPLITUDE * Math.sin(OMEGA * x);
const slopeAt = (x: number) => -WAVE_AMPLITUDE * OMEGA * Math.cos(OMEGA * x);
const n = (v: number) => v.toFixed(2);

// Quarter-wave anchors: the curve is split where it peaks and crosses, and each piece is one cubic (Hermite form).
const ANCHORS = Array.from({ length: VIEW_W / (WAVE_PERIOD / 4) + 1 }, (_, i) => (i * WAVE_PERIOD) / 4);

/** The cubic segments of one ribbon edge, `offset` px above (-) or below (+) the centre line, walking `xs`. */
function edge(xs: number[], offset: number): string {
  let d = "";
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1];
    const b = xs[i];
    const h = (b - a) / 3;
    d += `C${n(a + h)} ${n(centreY(a) + slopeAt(a) * h + offset)} ${n(b - h)} ${n(centreY(b) - slopeAt(b) * h + offset)} ${n(b)} ${n(centreY(b) + offset)}`;
  }
  return d;
}

const RIBBON_PATH =
  `M0 ${n(centreY(0) - RIBBON_HALF)}` +
  edge(ANCHORS, -RIBBON_HALF) +
  `L${VIEW_W - NOTCH} ${n(centreY(VIEW_W - NOTCH))}L${VIEW_W} ${n(centreY(VIEW_W) + RIBBON_HALF)}` +
  edge([...ANCHORS].reverse(), RIBBON_HALF) +
  `L${NOTCH} ${n(centreY(NOTCH))}Z`;

/**
 * Phone-only section divider: a gently wavy gingham ribbon with a satin bow tied at its centre. The check is
 * clipped to the ribbon, so it flows with it. Purely decorative (aria-hidden), symmetric about the centre line;
 * the drawing mirrors with the page direction. Hidden from `lg`, where the desktop sections keep their own rhythm.
 */
export function RibbonDivider({ className }: { className?: string }) {
  const patternId = `ribbon-check-${useId().replace(/:/g, "")}`;
  return (
    <div aria-hidden="true" className={cn("container-sf relative lg:hidden", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        focusable="false"
        className="sf-lift block h-auto w-full overflow-visible rtl:-scale-x-100"
      >
        <defs>
          <pattern id={patternId} width={CHECK * 2} height={CHECK * 2} patternUnits="userSpaceOnUse">
            <rect width={CHECK} height={CHECK * 2} fill="var(--sf-gingham-stripe)" />
            <rect width={CHECK * 2} height={CHECK} fill="var(--sf-gingham-stripe)" />
          </pattern>
        </defs>
        <path d={RIBBON_PATH} fill="var(--sf-gingham-base)" />
        <path d={RIBBON_PATH} fill={`url(#${patternId})`} />
        <path
          d={RIBBON_PATH}
          fill="none"
          stroke="var(--sf-ribbon-light)"
          strokeOpacity="0.9"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <Bow className="sf-bow-tie" x={(VIEW_W - BOW_W) / 2} y={RIBBON_CENTRE - BOW_KNOT_Y} width={BOW_W} height={BOW_H} />
      </svg>
    </div>
  );
}
