"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";

export interface SearchableOption {
  value: string;
  label: string;
  /** Secondary text shown at the row's end (e.g. a delivery fee). */
  meta?: string;
  /** Extra text the search also matches (e.g. the other locale's name). */
  keywords?: string;
}

/**
 * Folds the differences a customer does not type: case, Arabic diacritics and tatweel, and the hamza/alef, taa
 * marbuta and alef maqsura variants — so "اسكندريه" finds "الإسكندرية".
 */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterOptions(options: SearchableOption[], query: string): SearchableOption[] {
  const needle = foldForSearch(query);
  if (!needle) return options;
  return options.filter((option) => {
    const hay = foldForSearch(`${option.label} ${option.value} ${option.keywords ?? ""}`);
    // Also match without the Arabic definite article, so "قاهره" finds "القاهرة".
    return hay.includes(needle) || hay.replace(/(^| )ال/g, "$1").includes(needle);
  });
}

/**
 * A select with a search box: a button showing the choice, opening a panel with a filter field and a listbox.
 * Keyboard: ↑/↓ move, Enter picks, Esc closes; typing goes straight into the search. The trigger carries `name`, so
 * a form can focus it by name like any other field.
 */
export function SearchableSelect({
  name,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  invalid,
  describedBy,
  labelledBy,
  id,
}: {
  name: string;
  value: string;
  options: SearchableOption[];
  onChange(value: string): void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
  id?: string;
}) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const listId = `${triggerId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);
  const shown = useMemo(() => filterOptions(options, query), [options, query]);

  const show = () => {
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    setQuery("");
    setActive(index);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const pick = (option: SearchableOption) => {
    onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus({ preventScroll: true });
    // Bring the whole panel on screen (its scroll margin clears the phone tab bar).
    panel.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(shown.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(shown.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = shown[active];
      if (option) pick(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        name={name}
        value={value}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
        className={cn(
          "field flex items-center justify-between gap-3 text-start transition-[border-color,box-shadow] duration-[var(--sf-duration-fast)]",
          open && "border-action ring-3 ring-action/15",
          invalid && "border-critical",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-ink-muted")}>{selected ? selected.label : placeholder}</span>
        {selected?.meta ? <span className="tabular flex-none text-[0.875rem] text-ink-secondary">{selected.meta}</span> : null}
        <ChevronDown aria-hidden="true" className={cn("size-[1.125rem] flex-none text-ink-muted transition-transform duration-[var(--sf-duration-fast)]", open && "rotate-180")} />
      </button>

      {open ? (
        <div ref={panel} className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 scroll-mb-28 scroll-mt-24 overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="relative border-b border-line p-2">
            <Search aria-hidden="true" className="pointer-events-none absolute start-5 top-1/2 size-[1.125rem] -translate-y-1/2 text-ink-muted" />
            <input
              ref={search}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              className="min-h-11 w-full rounded-control bg-surface-muted ps-10 pe-3 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-action/30"
            />
          </div>
          <ul ref={list} id={listId} role="listbox" className="max-h-[17rem] overflow-y-auto overscroll-contain p-1.5">
            {shown.length === 0 ? (
              <li className="px-3 py-6 text-center text-[0.9375rem] text-ink-muted">{emptyText}</li>
            ) : (
              shown.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onPointerMove={() => setActive(index)}
                    onClick={() => pick(option)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-[0.9375rem] text-ink",
                      index === active && "bg-surface-muted",
                      isSelected && "bg-blush-soft font-semibold text-action-ink",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.meta ? <span className={cn("tabular flex-none text-[0.8125rem]", isSelected ? "text-action-ink" : "text-ink-secondary")}>{option.meta}</span> : null}
                    <Check aria-hidden="true" className={cn("size-4 flex-none", isSelected ? "opacity-100" : "opacity-0")} />
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
