/*
 * The pre-paint ground script (MDS §19): applies a visitor's EXPLICIT stored
 * choice before anything paints. The system preference needs no script — it is
 * honoured in CSS (tokens.css) — so this exists only when the merchant lets
 * visitors choose (`theme.allowVisitorChoice`).
 *
 * A PLAIN module on purpose — never move this into a "use client" file. A value
 * a Server Component imports from a "use client" module is serialised as a
 * client reference, resolvable only after that module's chunk loads; rendered
 * as an inline <script> it made hydration depend on chunk timing (React hydration error 418 on
 * 12 of 50 font-delayed loads in the design preview, 0 of 50 after the move,
 * 2026-10-13).
 *
 * try/catch: storage throws outright in a private window with site data
 * blocked; an exception here would abort before the attribute is set.
 */
export const GROUND_STORAGE_KEY = "sf-ground";

export const groundScript = `(function(){try{var g=localStorage.getItem('${GROUND_STORAGE_KEY}');if(g==='light'||g==='dark')document.documentElement.setAttribute('data-ground',g);}catch(e){}})();`;
