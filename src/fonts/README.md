# Self-hosted fonts

These files replace `next/font/google` so a production build never fetches from
fonts.googleapis.com / fonts.gstatic.com. They are loaded through
`next/font/local` (which keeps Next's automatic fallback metric adjustment).
Fetched 2026-10-22 from the official `google/fonts` repository
(https://github.com/google/fonts, `ofl/<family>/`, branch `main`).

**License:** every family below is SIL Open Font License 1.1 (verified against
the `OFL.txt` shipped in each upstream directory and the `name` table of each
font). The license text is in `OFL.txt` in this directory and must stay with
these files. The fonts may be bundled and redistributed with software but not
sold on their own; Modified Versions must not use a Reserved Font Name.

**Modification notice (Noto families).** The files are web subsets of the upstream fonts:
glyphs outside the union of the Unicode ranges in Google's stylesheet for the family (every slice: arabic, latin, latin-ext, plus math/symbols, cyrillic, greek or vietnamese where Google defines them) were dropped, variable fonts were pinned to the weight range used (and `wdth=100`),
hinting was removed, and the result was converted to WOFF2. Outlines and OpenType
layout features (`GSUB`/`GPOS`, needed for Arabic shaping) are otherwise
unchanged. Glyph coverage was verified (fontTools cmap) to be a superset of the
files Google serves (all slices).
**IBM Plex files are UNMODIFIED** (2026-10-22). IBM Plex carries the Reserved
Font Name "Plex", and a subset is a Modified Version that may not use it. So the
Plex files here are IBM's own release files, byte-for-byte, from the official
npm packages (`npm pack @ibm/plex-sans@1.1.0`, `@ibm/plex-mono@2.5.0` → `package/fonts/complete/woff2/`), under IBM's own file
names, with IBM's license as `IBM-Plex-LICENSE.txt`. They are larger than a
subset would be — the price of not modifying them. The modification notice
below applies to the Noto families only.

**Playfair Display is NOT subset.** It carries the Reserved Font Name "Playfair
Display", so (like IBM Plex above) it is kept unmodified: the upstream variable
TTFs (`ofl/playfairdisplay/PlayfairDisplay[wght].ttf` and
`PlayfairDisplay-Italic[wght].ttf`, version 1.203, fetched 2026-10-29 from the
official `google/fonts` repository) were only re-encoded to WOFF2 with
`fontTools` (`font.flavor = "woff2"`) — every glyph (1103 / 1101), the full cmap
(verified identical), the `wght` 400-900 axis and all layout tables are kept.
It is the Latin display serif; it has no Arabic, so Arabic text in a display
stack falls through to Noto Naskh Arabic.

**How the files were made** (reproducible): take the upstream TTF, instantiate
the variable axes (`fontTools.varLib.instancer`), subset with
`fontTools.subset` using the union of the `unicode-range` values of all of Google's CSS faces for the family (`layout_features='*'`, all name IDs kept), write WOFF2. The slices are merged into one file per weight because `next/font/local`
cannot express a `unicode-range` split.

| Family | Version | Source | Copyright (font `name` table) | Files |
|---|---|---|---|---|
| Noto Naskh Arabic | 2.021 | https://github.com/google/fonts/tree/main/ofl/notonaskharabic (upstream https://github.com/notofonts/arabic) | Copyright 2022 The Noto Project Authors (https://github.com/notofonts/arabic) | `noto-naskh-arabic/NotoNaskhArabic-full.woff2` (variable, wght 400-700; all Google slices) |
| Noto Sans Arabic | 2.012 | https://github.com/google/fonts/tree/main/ofl/notosansarabic (upstream https://github.com/notofonts/arabic) | Copyright 2022 The Noto Project Authors (https://github.com/notofonts/arabic) | `noto-sans-arabic/NotoSansArabic-full.woff2` (variable, wght 400-600, wdth 100; all Google slices) |
| Playfair Display | 1.203 | https://github.com/google/fonts/tree/main/ofl/playfairdisplay (upstream https://github.com/clauseggers/Playfair-Display) | Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name "Playfair Display" | `playfair-display/PlayfairDisplay-VF.woff2`, `playfair-display/PlayfairDisplay-Italic-VF.woff2` (variable, wght 400-900; lossless WOFF2 repackaging, not subset) |
| IBM Plex Mono | 2.005 (npm `@ibm/plex-mono@2.5.0`) | https://www.npmjs.com/package/@ibm/plex-mono (upstream https://github.com/IBM/plex) | Copyright 2017 IBM Corp. All rights reserved. | `ibm-plex-mono/IBMPlexMono-{Regular,Medium}.woff2` — IBM's unmodified complete files |

Declared in `src/lib/theme/fonts.ts` (the only place fonts are configured; the
design preview imports the same module). Weights, CSS variable names, `display`
and preload choices are unchanged from the former `next/font/google` setup.
Design-system section 6 (typography) describes the pairings. To add or update a
font: repeat the steps above, add a row here, keep `OFL.txt` current.
