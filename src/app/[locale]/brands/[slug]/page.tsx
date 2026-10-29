import { ScopePage, scopeMetadata, scopeStaticParams } from "@/components/listing/scope-page";

// = CATALOG_REVALIDATE_SECONDS; segment config must be a literal.
export const revalidate = 300;

export function generateStaticParams() {
  return scopeStaticParams("brand");
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  return scopeMetadata("brand", locale, slug);
}

export default function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  return <ScopePage kind="brand" params={params} />;
}
