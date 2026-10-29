import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../../../styles/globals.css";
import "../../../preview/preview.css";
import { isLocale } from "../../../preview/i18n";
import { content } from "../../../preview/fixtures/content";
import { PreviewStateProvider } from "../../../preview/state";
import { AnnouncementBar, Footer, Header } from "../../../preview/components/chrome";
import { PreviewToolbar } from "../../../preview/components/preview-toolbar";
import { previewBootScript } from "../../../preview/components/boot-script";
import { AddedSheet } from "../../../preview/pdp/added-sheet";
import { fontVariables } from "../../../lib/theme/fonts";

/*
 * DESIGN PREVIEW — the root layout of an isolated route tree. There is no
 * production storefront yet; when there is, it gets its own root layout and
 * nothing here is imported by it. The preview never ships: a production build
 * serves it only when DESIGN_PREVIEW=1 is set explicitly.
 */

export const metadata: Metadata = {
  title: "Storefront design preview",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export default async function PreviewLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_PREVIEW !== "1") notFound();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      // The preview offers the dark ground; a real store does only when its merchant opts in (D-S5).
      data-dark="enabled"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a stored ground/typography/brand choice before first paint — a dark flash is a defect (§8). */}
        <script dangerouslySetInnerHTML={{ __html: previewBootScript }} />
      </head>
      <body>
        <PreviewStateProvider>
          <PreviewToolbar locale={locale} />
          <AnnouncementBar locale={locale} announcement={content.announcement} />
          <Header locale={locale} navigation={content.headerNavigation} />
          <main id="main">{children}</main>
          <Footer locale={locale} content={content} />
          <AddedSheet locale={locale} />
        </PreviewStateProvider>
      </body>
    </html>
  );
}
