"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";

/**
 * One footer link group. From lg it is a plain titled list, always open. Below lg it is a disclosure: the heading
 * holds a full-width button (`aria-expanded`/`aria-controls`) so a phone shows four short rows instead of a long
 * column of links. The links are server-rendered either way (closed is `hidden`, not unmounted), so nothing waits
 * on hydration and a crawler sees every link.
 */
export function FooterSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <nav aria-label={title} className="border-b border-line lg:border-0">
      <h2 className="hidden font-display text-[1.0625rem] font-semibold text-heading lg:mb-4 lg:block">{title}</h2>
      <h2 className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full items-center justify-between gap-3 text-start font-display text-[1.0625rem] font-semibold text-heading focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          {title}
          <ChevronDown className={cn("size-5 flex-none text-ornament transition-transform duration-[var(--sf-duration-fast)] ease-standard motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h2>
      <ul id={id} className={cn("flex-col pb-4 lg:flex lg:pb-0", open ? "flex" : "hidden")}>
        {children}
      </ul>
    </nav>
  );
}
