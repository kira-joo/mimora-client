"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { MOTION } from "@/lib/motion/tokens";

/** The pill every bar control wears — a trigger, a toggle, a popover button. `on` is "this narrows the list". */
export const pillClass = (on: boolean) =>
  cn(
    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-[0.9375rem] font-medium transition-colors duration-[var(--sf-duration-fast)] ease-standard",
    on ? "border-action bg-blush text-heading" : "border-line-strong bg-surface text-ink hover:bg-blush-soft"
  );

interface FilterPopoverProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  label: string;
  /** Text beside the label summarising what is chosen (a count, a price span). */
  summary?: string;
  on?: boolean;
  children: ReactNode;
  /** Which end of the trigger the panel hangs from (`start` = the reading-start edge); it is nudged back inside the viewport either way. */
  align?: "start" | "end";
  className?: string;
}

/**
 * A disclosure popover for one filter: a pill button (`aria-expanded`) and a
 * panel that hangs beneath it. Escape closes it and puts focus back on the
 * pill; a press outside closes it; Tab moving focus out of it closes it. The
 * panel is measured when it opens and nudged back inside the viewport, so a
 * trigger near either edge never pushes the page sideways — in either
 * direction of writing.
 */
export function FilterPopover({ open, onOpenChange, label, summary, on = false, align = "start", children, className }: FilterPopoverProps) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const placer = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onOpenChange(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  // Keep the panel inside the viewport: measured, so it holds whichever side the trigger sits on. `translate` is its own property, so it composes with Motion's transform.
  useLayoutEffect(() => {
    const el = placer.current;
    if (!open || !el) return;
    const place = () => {
      el.style.translate = "";
      const rect = el.getBoundingClientRect();
      const edge = 12;
      const width = document.documentElement.clientWidth;
      const shift = rect.left < edge ? edge - rect.left : rect.right > width - edge ? width - edge - rect.right : 0;
      if (shift) el.style.translate = `${shift}px 0`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  return (
    <div
      ref={root}
      className={cn("relative", className)}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) onOpenChange(false);
      }}
    >
      <button ref={trigger} type="button" className={pillClass(on || open)} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => onOpenChange(!open)}>
        <span>{label}</span>
        {summary ? <span className="tabular rounded-pill bg-action px-2 text-[0.8125rem] leading-6 text-on-action">{summary}</span> : null}
        <ChevronDown className={cn("size-4 transition-transform duration-[var(--sf-duration-fast)]", open && "rotate-180")} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            ref={placer}
            id={panelId}
            role="group"
            aria-label={label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: MOTION.fast, ease: MOTION.easeExit } }}
            transition={{ duration: MOTION.standard, ease: MOTION.easeStandard }}
            className={cn("absolute top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-5 shadow-card", align === "end" ? "end-0" : "start-0")}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
