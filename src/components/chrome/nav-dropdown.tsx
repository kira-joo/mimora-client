"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link, usePathname } from "@/i18n/navigation";
import type { HeaderLink } from "@/lib/chrome/header-links";

interface NavDropdownProps {
  link: HeaderLink;
  current: boolean;
  /** The header's top-level link style, so a parent reads exactly like its siblings. */
  linkClassName: string;
}

/**
 * A desktop header item with sub-categories: a disclosure, not a menu. The name stays a plain link to the category's
 * own page (which lists everything beneath it); the chevron beside it is the button that opens the panel
 * (`aria-expanded`/`aria-controls`), so keyboard and screen-reader users get the same two choices a pointer does.
 *
 * A mouse also opens it on hover. Hover is pointer-type gated: a tap on a tablet fires an emulated enter before its
 * click, and without the gate the click would close what the enter just opened. For the same reason a mouse click on
 * the chevron of a panel its hover just opened keeps it open (the next click closes it). Escape closes it and returns
 * focus to the button; moving focus or the pointer out closes it; so does navigating.
 */
export function NavDropdown({ link, current, linkClassName }: NavDropdownProps) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Set while the panel is open only because a mouse is over the item. A mouse reaching the chevron has already
  // opened it by hovering, so that first click must keep it open, not toggle it shut under the pointer.
  const [openedByHover, setOpenedByHover] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpenedByHover(false);
    setOpen(false);
  };

  // Navigating closes it — adjusted during render, not in an effect.
  const [shownAt, setShownAt] = useState(pathname);
  if (shownAt !== pathname) {
    setShownAt(pathname);
    close();
  }

  return (
    <li
      className="relative flex items-center"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || open) return;
        setOpenedByHover(true);
        setOpen(true);
      }}
      onPointerLeave={(event) => event.pointerType === "mouse" && close()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
          buttonRef.current?.focus();
        }
      }}
    >
      <Link href={link.href} aria-current={current ? "page" : undefined} className={cn(linkClassName, "pe-1")}>
        {link.label}
      </Link>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("showSubcategories", { label: link.label })}
        onClick={() => {
          if (openedByHover) setOpenedByHover(false);
          else setOpen((value) => !value);
        }}
        className="-ms-1 inline-flex size-9 items-center justify-center rounded-full text-ink-secondary transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft hover:text-heading"
      >
        <ChevronDown className={cn("size-4 transition-transform duration-[var(--sf-duration-fast)] ease-standard motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </button>
      {/* The top padding is a bridge: the pointer crosses it on its way down without leaving the item. */}
      <div id={panelId} hidden={!open} className="absolute start-0 top-full z-40 pt-2">
        <ul className="min-w-56 rounded-card border border-line bg-surface p-2 shadow-card transition-[opacity,translate] duration-[var(--sf-duration-fast)] ease-standard starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none">
          {link.children.map((child) => {
            const active = pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <li key={child.key}>
                <Link
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-11 items-center whitespace-nowrap rounded-control px-3 text-[0.9375rem] transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft hover:text-heading", active ? "font-semibold text-heading" : "text-ink")}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
