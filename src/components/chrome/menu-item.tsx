"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import type { HeaderLink } from "@/lib/chrome/header-links";

const MENU_ROW = "flex min-h-14 items-center justify-between font-display text-lg text-ink";

/**
 * One navigation row in a sheet — the menu drawer and the tab bar's categories sheet. A link with sub-categories splits into the link itself and a disclosure button that reveals them
 * inline beneath it (an accordion, like the footer's groups on a phone); the sub-links are always rendered, `hidden`
 * when closed, so nothing waits on interaction to exist.
 */
export function MenuItem({ link, onNavigate }: { link: HeaderLink; onNavigate(): void }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const id = useId();

  if (link.children.length === 0) {
    return (
      <li className="border-b border-line">
        <Link href={link.href} onClick={onNavigate} className={MENU_ROW}>
          {link.label}
          <ChevronLeft className="size-4 text-ink-muted ltr:-scale-x-100" aria-hidden="true" />
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b border-line">
      <div className="flex items-center">
        <Link href={link.href} onClick={onNavigate} className={cn(MENU_ROW, "flex-1")}>
          {link.label}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={t("showSubcategories", { label: link.label })}
          onClick={() => setOpen((value) => !value)}
          className="-me-3 inline-flex size-14 flex-none items-center justify-center text-ink-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <ChevronDown className={cn("size-5 transition-transform duration-[var(--sf-duration-fast)] ease-standard motion-reduce:transition-none", open && "rotate-180 text-ornament")} aria-hidden="true" />
        </button>
      </div>
      <ul id={id} hidden={!open} className="pb-3 ps-4">
        {link.children.map((child) => (
          <li key={child.key}>
            <Link href={child.href} onClick={onNavigate} className="flex min-h-12 items-center border-s-2 border-line ps-4 text-base text-ink-secondary transition-colors duration-[var(--sf-duration-fast)] hover:border-ornament hover:text-heading">
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}
