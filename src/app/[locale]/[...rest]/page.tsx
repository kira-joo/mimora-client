import { notFound } from "next/navigation";

/**
 * Any unmatched path under a locale renders the designed not-found page INSIDE
 * the locale layout — with `lang`, `dir`, the header and the way back — rather
 * than Next's bare global 404 (measured by axe: no `lang` on <html>).
 */
export default function CatchAll() {
  notFound();
}
