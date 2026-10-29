"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "../types";

/*
 * The reviewer's controls — NOT part of the store. Switches screen, language,
 * ground, typography pairing (D-S4) and brand (D-S1). Settings persist in
 * localStorage under `sf-preview-*` (try/catch: storage can throw) and are
 * applied to <html> before first paint by `previewBootScript` (./boot-script), so switching
 * never flashes the wrong ground.
 */

type Ground = "system" | "light" | "dark";
type Typography = "default" | "contemporary" | "neutral";
type Brand = "default" | "second";

const SCREENS = [
  { label: "Home", path: "" },
  { label: "Listing", path: "/products" },
  { label: "Product · shirt", path: "/products/washed-linen-shirt" },
  { label: "Product · chisels", path: "/products/bench-chisel-set" },
  { label: "Cart", path: "/cart" },
  { label: "Checkout", path: "/checkout" },
];


function apply(name: string, value: string | null) {
  const root = document.documentElement;
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked — applies to this page only */
  }
}

export function PreviewToolbar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ground, setGround] = useState<Ground>("system");
  const [typography, setTypography] = useState<Typography>("default");
  const [brand, setBrand] = useState<Brand>("default");

  // Read after mount rather than with useSearchParams, which would make the toolbar a client-rendered
  // Suspense boundary inside every statically prerendered preview page.
  const [query, setQuery] = useState("");
  useEffect(() => {
    setQuery(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    setGround((root.getAttribute("data-ground") as Ground | null) ?? "system");
    setTypography((root.getAttribute("data-typography") as Typography | null) ?? "default");
    setBrand((root.getAttribute("data-brand") as Brand | null) ?? "default");
  }, []);

  const rest = pathname.replace(/^\/preview\/(ar|en)/, "");
  const otherLocale: Locale = locale === "ar" ? "en" : "ar";

  return (
    <div dir="ltr" lang="en" className="relative z-40 border-b border-line bg-ink text-canvas">
      <div className="container-sf flex min-h-9 items-center justify-between gap-3 font-sans text-[0.75rem]">
        <span className="flex items-center gap-1.5 font-semibold">
          <Eye className="size-3.5" aria-hidden="true" />
          Design preview — mock data, not the live store
        </span>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-1 font-semibold">
          Review controls
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="container-sf grid gap-3 pb-3 text-[0.8125rem] sm:grid-cols-2 lg:grid-cols-5">
          <Group label="Screen">
            {SCREENS.map((screen) => (
              <Link key={screen.label} href={`/preview/${locale}${screen.path}`} className={chip(rest === screen.path)}>
                {screen.label}
              </Link>
            ))}
          </Group>
          <Group label="Language">
            <Link href={`/preview/ar${rest}${query ? `?${query}` : ""}`} className={chip(locale === "ar")} lang="ar">
              العربية
            </Link>
            <Link href={`/preview/en${rest}${query ? `?${query}` : ""}`} className={chip(locale === "en")}>
              English
            </Link>
            <span className="sr-only">Current: {locale}, switch to {otherLocale}</span>
          </Group>
          <Group label="Ground">
            {(["system", "light", "dark"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={chip(ground === value)}
                onClick={() => {
                  setGround(value);
                  apply("data-ground", value === "system" ? null : value);
                  persist("sf-preview-ground", value);
                }}
              >
                {value[0]!.toUpperCase() + value.slice(1)}
              </button>
            ))}
          </Group>
          <Group label="Typography (D-S4)">
            {(["default", "contemporary", "neutral"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={chip(typography === value)}
                onClick={() => {
                  setTypography(value);
                  apply("data-typography", value === "default" ? null : value);
                  persist("sf-preview-typography", value);
                }}
              >
                {{ default: "Naskh · default", contemporary: "Kufi · contemporary", neutral: "Plex · neutral" }[value]}
              </button>
            ))}
          </Group>
          <Group label="Brand (D-S1)">
            {(["default", "second"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={chip(brand === value)}
                onClick={() => {
                  setBrand(value);
                  apply("data-brand", value === "default" ? null : value);
                  persist("sf-preview-brand", value);
                }}
              >
                {value === "default" ? "Designed default" : "Second store"}
              </button>
            ))}
          </Group>
        </div>
      ) : null}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1 font-semibold opacity-80">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

const chip = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 ${active ? "border-canvas bg-canvas text-ink" : "border-[color-mix(in_srgb,var(--sf-canvas)_35%,transparent)] hover:border-canvas"}`;
