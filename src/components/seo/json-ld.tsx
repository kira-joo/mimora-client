import { serializeJsonLd } from "@/lib/seo/structured-data";

/** One JSON-LD block. Renders nothing for `null` — a builder that cannot state its facts truthfully returns null. */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
