import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en/common.json";
import ar from "@/i18n/locales/ar/common.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

/*
 * A plain function, not `vi.fn`: the spy wraps a rejected promise in a derived one nobody handles, which vitest then
 * reports as an unhandled rejection of the test even though the component handled the real one.
 */
const calls: unknown[][] = [];
let outcome: "resolve" | "reject" = "resolve";
const request = (...args: unknown[]) => {
  calls.push(args);
  return outcome === "resolve" ? Promise.resolve(undefined) : Promise.reject(new Error("401"));
};
vi.mock("@/lib/api/session-client", () => ({ sessionApi: () => ({ request }), newIdempotencyKey: () => "key-1" }));

import { NewsletterConfirmStatus } from "./newsletter-confirm-status";

function mount(locale: "en" | "ar" = "en") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <NextIntlClientProvider locale={locale} messages={{ common: locale === "en" ? en : ar }}>
        <NewsletterConfirmStatus />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  calls.length = 0;
  outcome = "resolve";
});
afterEach(cleanup);

describe("NewsletterConfirmStatus", () => {
  it("posts the token once, with an idempotency key and without a pointless session refresh, then confirms", async () => {
    search = "token=abc123";
    mount();
    expect(screen.getByRole("status")).toHaveTextContent(en.newsletterConfirm.confirming);
    expect(await screen.findByText(en.newsletterConfirm.done)).toBeInTheDocument();
    expect(calls).toHaveLength(1);
    expect(calls[0]![1]).toMatchObject({ body: { token: "abc123" }, headers: { "Idempotency-Key": "key-1" }, skipAuthRefresh: true });
    expect(screen.getByRole("link", { name: en.newsletterConfirm.continue })).toHaveAttribute("href", "/");
  });

  it("an invalid or expired link reads as one alert, in Arabic too", async () => {
    search = "token=stale";
    outcome = "reject";
    mount("ar");
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.newsletterConfirm.invalid);
  });

  it("a link with no token never calls the backend", async () => {
    search = "";
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(en.newsletterConfirm.invalid);
    await waitFor(() => expect(calls).toHaveLength(0));
  });
});
