import { content } from "../../../preview/fixtures/content";
import { HomeSectionView } from "../../../preview/home/sections";
import type { Locale } from "../../../preview/types";

/** Home — the merchant's published sections, in their order, from the `StorefrontContentView`-shaped fixture. */
export default async function PreviewHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <>
      {content.homeSections.map((section, index) => (
        <HomeSectionView key={`${section.type}-${index}`} section={section} locale={locale} />
      ))}
    </>
  );
}
