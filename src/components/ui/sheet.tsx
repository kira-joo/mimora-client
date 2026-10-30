"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { MOTION } from "@/lib/motion/tokens";

export type SheetSide = "bottom" | "start" | "end" | "full";

interface SheetProps {
  open: boolean;
  onClose(): void;
  side: SheetSide;
  title: string;
  closeLabel: string;
  /** Desktop: bottom sheets become a centred panel at md and up. */
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const DURATION = { in: MOTION.slow, out: MOTION.standard };
const EASE_STANDARD = MOTION.easeStandard;
const EASE_EXIT = MOTION.easeExit;

/**
 * One sheet for every overlay in the storefront — menu drawer, search, filters,
 * size guide, add-to-cart confirmation, terms. A native <dialog> opened with
 * showModal(): focus is trapped and restored on close by the platform, Escape
 * closes, and the page behind is inert. Motion only decorates entry and exit
 * (§14 "Sheets and drawers"); under reduced motion it fades instead of sliding.
 */
export function Sheet({ open, onClose, side, title, closeLabel, children, footer, className }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (mounted && open && dialog && !dialog.open) dialog.showModal();
  }, [mounted, open]);

  if (!mounted) return null;

  // Read during render, not after: Motion reads `initial` once, on the panel's first frame, so a direction that
  // arrived a render later made an Arabic drawer start on the LTR side and cross the screen. A sheet only ever
  // mounts on the client (it opens on interaction), so `document` is there.
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  const sign = (towardEnd: boolean) => ((towardEnd ? 1 : -1) * (rtl ? -1 : 1));
  const offscreen = reduce
    ? { opacity: 0 }
    : side === "bottom"
      ? { y: "100%" }
      : side === "start"
        ? { x: `${sign(false) * 100}%` }
        : side === "end"
          ? { x: `${sign(true) * 100}%` }
          : { opacity: 0, y: 16 };
  const onscreen = reduce ? { opacity: 1 } : side === "full" ? { opacity: 1, y: 0 } : { x: 0, y: 0 };

  const placement = {
    // Centred at md+ by auto margins, not translate: Motion owns `transform` while it animates, and a CSS translate
    // on the same element was overwritten mid-flight, so the panel jumped into place.
    bottom: "inset-x-0 bottom-0 max-h-[88dvh] md:inset-0 md:m-auto md:h-fit md:w-[min(560px,92vw)]",
    start: "inset-y-0 start-0 w-[min(400px,88vw)]",
    end: "inset-y-0 end-0 w-[min(440px,92vw)]",
    full: "inset-0",
  }[side];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <AnimatePresence
        onExitComplete={() => {
          dialogRef.current?.close();
          setMounted(false);
        }}
      >
        {open ? (
          // The scrim is drawn here, not as the native ::backdrop, so it fades in and out with the panel instead of
          // snapping on and off.
          <motion.div
            key="scrim"
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--sf-backdrop)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: DURATION.out, ease: EASE_EXIT } }}
            transition={{ duration: DURATION.in, ease: EASE_STANDARD }}
            onClick={onClose}
          />
        ) : null}
        {open ? (
          <motion.div
            key="panel"
            initial={offscreen}
            animate={onscreen}
            exit={{ ...offscreen, transition: { duration: DURATION.out, ease: EASE_EXIT } }}
            transition={{ duration: DURATION.in, ease: EASE_STANDARD }}
            className={cn("absolute flex flex-col bg-canvas shadow-[var(--sf-elevation-sheet)] will-change-transform", placement, className)}
          >
            <div className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-[var(--sf-gutter)]">
              <h2 id={titleId} className="t-heading">
                {title}
              </h2>
              <button type="button" onClick={onClose} className="-me-2 inline-flex size-11 items-center justify-center" aria-label={closeLabel}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[var(--sf-gutter)] py-5">{children}</div>
            {footer ? <div className="shrink-0 border-t border-line px-[var(--sf-gutter)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
