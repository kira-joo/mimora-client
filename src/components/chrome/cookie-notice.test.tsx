import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en/common.json";
import ar from "@/i18n/locales/ar/common.json";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "@/lib/analytics/consent";
import { readConsent } from "@/lib/analytics/consent-store";
import { CookieNotice } from "./cookie-notice";
import { CookieSettingsLink } from "./cookie-settings-link";

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

function mount(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ common: locale === "en" ? en : ar }}>
      <CookieNotice />
      <CookieSettingsLink />
    </NextIntlClientProvider>
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("CookieNotice", () => {
  it("asks on a first visit: a labelled region, accept and decline as equals, nothing pre-selected", async () => {
    mount();
    const region = await screen.findByRole("region", { name: en.analytics.noticeLabel });
    const accept = screen.getByRole("button", { name: en.analytics.accept });
    const decline = screen.getByRole("button", { name: en.analytics.decline });
    expect(region).toBeInTheDocument();
    // Equal prominence: the same classes, so neither is the smaller or greyer option.
    expect(accept.className).toBe(decline.className);
    expect(readConsent().status).toBe("unset");
  });

  it("accepting records granted and closes the notice; the choice is announced", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: en.analytics.accept }));
    expect(readConsent().status).toBe("granted");
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(en.analytics.saved);
  });

  it("declining records denied, and a declined visitor is not asked again on the next visit", async () => {
    const user = userEvent.setup();
    const first = mount();
    await user.click(await screen.findByRole("button", { name: en.analytics.decline }));
    expect(readConsent().status).toBe("denied");
    first.unmount();
    mount();
    await act(async () => {});
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("a stored choice from another legal version asks again", async () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION - 1, analytics: true, at: new Date().toISOString() }));
    mount();
    expect(await screen.findByRole("region", { name: en.analytics.noticeLabel })).toBeInTheDocument();
    expect(readConsent().status).toBe("unset");
  });

  it("the footer's Cookie settings reopens it showing the current choice; the choice can be changed, Escape closes it unchanged", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: en.analytics.accept }));
    await user.click(screen.getByRole("button", { name: en.privacy.cookieSettings }));
    const region = await screen.findByRole("region", { name: en.analytics.noticeLabel });
    expect(region).toHaveTextContent(en.analytics.currentOn);
    // Focus moved to the panel because the visitor asked for it.
    expect(screen.getByRole("button", { name: en.analytics.accept })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    expect(readConsent().status).toBe("granted");

    await user.click(screen.getByRole("button", { name: en.privacy.cookieSettings }));
    await user.click(await screen.findByRole("button", { name: en.analytics.decline }));
    expect(readConsent().status).toBe("denied");
  });

  it("sits before the main landmark in DOM order, so its first control is an early Tab stop", async () => {
    const view = render(
      <NextIntlClientProvider locale="en" messages={{ common: en }}>
        <CookieNotice />
        <header>
          <a href="#top">Home</a>
        </header>
        <main id="main">
          <a href="#product">Product</a>
        </main>
      </NextIntlClientProvider>
    );
    const region = await screen.findByRole("region", { name: en.analytics.noticeLabel });
    const main = view.container.querySelector("main") as HTMLElement;
    const accept = screen.getByRole("button", { name: en.analytics.accept });
    expect(accept.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Tab order follows the DOM: the first tab stop on the page is the notice's own link, not the page chrome.
    const user = userEvent.setup();
    await user.tab();
    expect(region.contains(document.activeElement)).toBe(true);
  });

  it("does not steal focus when it appears on its own", async () => {
    mount();
    await screen.findByRole("region");
    expect(document.body).toHaveFocus();
  });

  it("is available in Arabic with the same two buttons", async () => {
    mount("ar");
    expect(await screen.findByRole("button", { name: ar.analytics.accept })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.analytics.decline })).toBeInTheDocument();
  });
});
