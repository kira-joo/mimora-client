import localFont from "next/font/local";

/*
 * design-system §6 / D-S4: every face covers Arabic AND Latin. The merchant
 * picks a pairing (`brand.typographyChoice`); the default pairing (Naskh +
 * Sans Arabic) is preloaded, the alternatives are not — a store using one of
 * them pays one late swap rather than every store paying for fourteen
 * preloaded files. Mono is for Latin codes only (SKUs, order numbers).
 */
/*
 * Self-hosted (src/fonts, see src/fonts/README.md): a production build must not
 * depend on fonts.googleapis.com. Each file carries every unicode-range slice
 * Google's stylesheet defined for the family (the built CSS shipped them all;
 * `subsets` only chose which were preloaded), merged into one file per weight
 * because `next/font/local` cannot express a unicode-range split. The Noto files are variable; one entry per weight pointing
 * at the same file reproduces Google's per-weight @font-face (a single-value
 * weight descriptor pins the axis), so only the listed weights exist, as before.
 * Paths resolve relative to this file. `next/font/local` options must be
 * statically analysable, so the entries are written out literally.
 */
export const naskh = localFont({
  src: [
    { path: "../../fonts/noto-naskh-arabic/NotoNaskhArabic-full.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/noto-naskh-arabic/NotoNaskhArabic-full.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/noto-naskh-arabic/NotoNaskhArabic-full.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-naskh",
  display: "swap",
});
export const sansArabic = localFont({
  src: [
    { path: "../../fonts/noto-sans-arabic/NotoSansArabic-full.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/noto-sans-arabic/NotoSansArabic-full.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/noto-sans-arabic/NotoSansArabic-full.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans-ar",
  display: "swap",
});
export const kufi = localFont({
  src: [
    { path: "../../fonts/noto-kufi-arabic/NotoKufiArabic-full.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/noto-kufi-arabic/NotoKufiArabic-full.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-kufi",
  display: "swap",
  preload: false,
});
export const plexArabic = localFont({
  src: [
    { path: "../../fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-ar",
  display: "swap",
  preload: false,
});
export const plexMono = localFont({
  src: [
    { path: "../../fonts/ibm-plex-mono/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-mono/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});

export const fontVariables = [naskh, sansArabic, kufi, plexArabic, plexMono].map((font) => font.variable).join(" ");
