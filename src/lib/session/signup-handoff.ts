/**
 * Where signup sends the customer: the login page, phone prefilled, the original
 * `redirectTo` preserved untouched (login's `safeRedirect` validates it on the way
 * out), and a flag that shows the "sign in to continue" notice. The flag and the
 * notice are the same for a new and an already-registered phone — nothing here may
 * depend on what the backend did.
 */
const PHONE_KEY = "sf-signup-phone";

/**
 * Where signup sends the customer: the login page, with the fixed notice and the original
 * `redirectTo`. The phone is NOT in the URL — a URL is kept in history, server logs and referrers,
 * and a phone number is personal data — it is handed over in this tab's sessionStorage instead,
 * read once by the login form.
 */
export function loginHrefAfterSignup(phone: string, redirectTo: string | null): { pathname: "/login"; query: Record<string, string> } {
  try {
    window.sessionStorage.setItem(PHONE_KEY, phone);
  } catch {
    // Storage unavailable (private mode, blocked site data): the customer types the number again.
  }
  return { pathname: "/login", query: { registered: "1", ...(redirectTo ? { redirectTo } : {}) } };
}

/** The phone signup handed over, once — it is removed as it is read. */
export function takeSignupPhone(): string {
  try {
    const phone = window.sessionStorage.getItem(PHONE_KEY) ?? "";
    window.sessionStorage.removeItem(PHONE_KEY);
    return phone;
  } catch {
    return "";
  }
}
