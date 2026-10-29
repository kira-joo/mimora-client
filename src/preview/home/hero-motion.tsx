"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * §14 "Hero settle": the image eases from 1.04 to 1 and the type fades and
 * rises 12px just after it. Static under reduced motion — the final state on
 * first paint. Height: ≈80svh on a phone, the viewport below the header on
 * desktop, capped so a very tall screen doesn't stretch the photograph.
 */
export function HeroMotion({ image, children }: { image: ReactNode; children: ReactNode }) {
  // One element tree whatever the preference — see Reveal for how reduced motion stays static.
  return (
    <div className="relative h-[min(80svh,720px)] min-h-[520px] lg:h-[min(calc(100svh-112px),860px)]">
      <motion.div data-reveal="" className="absolute inset-0 -z-10" initial={{ scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}>
        {image}
      </motion.div>
      <motion.div data-reveal="" className="absolute inset-0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1], delay: 0.15 }}>
        {children}
      </motion.div>
    </div>
  );
}
