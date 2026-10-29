"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { MOTION } from "@/lib/motion/tokens";

/**
 * §14 "Section reveal": a section's heading and first row fade and rise 12px
 * ONCE, on first entry into view. Under reduced motion it renders static —
 * a genuine non-animated path, not a shorter animation: <MotionConfig
 * reducedMotion="user"> drops the rise, and the [data-reveal] CSS guard
 * makes the final state the first paint. The same element renders either
 * way, so server and client markup always agree.
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: MOTION.standard, ease: MOTION.easeStandard, delay }}
    >
      {children}
    </motion.div>
  );
}
