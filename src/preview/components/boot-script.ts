/*
 * The pre-paint script that applies a stored ground/typography/brand choice to
 * <html> (design-system §8: a dark flash is a defect).
 *
 * It lives in a plain module ON PURPOSE — never move it into a "use client"
 * file. A value a Server Component imports from a "use client" module is not
 * the value: React serialises it as a client reference (`I[module, chunks,
 * "export"]`) that the browser can only resolve after that module's chunks
 * load. Rendered as <head>'s inline <script>, that made hydration depend on
 * chunk timing — measured: React #418 on 12 of 50 font-delayed product-page
 * loads, 0 of 50 once the text came from a plain module.
 */
export const previewBootScript = `(function(){try{var d=document.documentElement,s=localStorage;var g=s.getItem('sf-preview-ground');if(g==='light'||g==='dark')d.setAttribute('data-ground',g);var t=s.getItem('sf-preview-typography');if(t)d.setAttribute('data-typography',t);var b=s.getItem('sf-preview-brand');if(b)d.setAttribute('data-brand',b);}catch(e){}})();`;
