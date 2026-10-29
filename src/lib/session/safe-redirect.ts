/**
 * Where to go after signing in. Only a same-origin PATH is honoured — never a
 * scheme, a host, or a protocol-relative `//host` — so `redirectTo` cannot be
 * turned into an open redirect off this store.
 */
export function safeRedirect(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Strip a locale prefix: navigation adds the current one.
  const stripped = value.replace(/^\/(ar|en)(?=\/|$)/, "");
  return stripped || "/";
}
