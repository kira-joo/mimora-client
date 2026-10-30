import localFont from "next/font/local";

/*
 * Mimora's typography is fixed here, in code: Playfair Display for Latin
 * display text, Noto Naskh Arabic for Arabic display, Noto Sans Arabic for
 * text. There is no merchant-selectable pairing (the template's
 * `typographyChoice` was removed). Mono is for Latin codes only (SKUs, order
 * numbers).
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
/*
 * The Latin display serif (OFL, variable wght 400-900, upright + italic). It has no Arabic: in a display stack Arabic
 * text falls through to Naskh. The files are unsubset on purpose — see src/fonts/README.md (Reserved Font Name).
 */
export const playfair = localFont({
  src: [
    { path: "../../fonts/playfair-display/PlayfairDisplay-VF.woff2", weight: "400 900", style: "normal" },
    { path: "../../fonts/playfair-display/PlayfairDisplay-Italic-VF.woff2", weight: "400 900", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
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

export const fontVariables = [naskh, sansArabic, playfair, plexMono].map((font) => font.variable).join(" ");
