import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MotionGlobalConfig } from "motion";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/i18n/locales/en/common.json";
import type { ListingState } from "@/lib/catalog/listing-query";

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push }) }));

import { ListingControls } from "./listing-controls";

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  // jsdom has no <dialog> modal API; the Sheet only needs the open attribute to be real.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  push.mockClear();
  // The draft's live result count looks itself up; nothing here is about that.
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

const base: ListingState = { attr: [], opt: [], inStock: false, sort: "newest", page: 1 };

function ui(state: ListingState, total = 10) {
  return (
    <NextIntlClientProvider locale="en" messages={{ common: enMessages }}>
      <ListingControls basePath="/shop" state={state} facets={[]} currency="EGP" inStockCount={7} total={total} />
    </NextIntlClientProvider>
  );
}

const openFilters = () => fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
const sheet = () => screen.getByRole("dialog", { name: "Filter" });
const stock = () => within(sheet()).getByRole("checkbox", { name: /In stock only/ }) as HTMLInputElement;
const minPrice = () => within(sheet()).getByLabelText("Lowest price") as HTMLInputElement;

describe("ListingControls — the phone filter sheet's draft", () => {
  it("discarding a draft by closing resets to the applied state on reopen", async () => {
    render(ui(base));
    openFilters();
    fireEvent.click(stock());
    fireEvent.change(minPrice(), { target: { value: "25" } });
    expect(stock().checked).toBe(true);
    expect(minPrice().value).toBe("25");

    fireEvent.click(within(sheet()).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(push).not.toHaveBeenCalled();

    openFilters();
    expect(stock().checked).toBe(false);
    expect(minPrice().value).toBe("");
  });

  it("a new applied state while the sheet is open replaces the draft", () => {
    const { rerender } = render(ui(base));
    openFilters();
    fireEvent.click(stock());
    expect(stock().checked).toBe(true);

    rerender(ui({ ...base, minPrice: "10" }));
    expect(stock().checked).toBe(false);
    expect(minPrice().value).toBe("10");
  });

  it("a parent re-render with the same state identity keeps the user's draft", () => {
    const { rerender } = render(ui(base, 10));
    openFilters();
    fireEvent.click(stock());
    fireEvent.change(minPrice(), { target: { value: "25" } });

    rerender(ui(base, 11));
    expect(stock().checked).toBe(true);
    expect(minPrice().value).toBe("25");
  });

  it("applies the draft it holds: Show navigates with it and closes the sheet", async () => {
    render(ui(base));
    openFilters();
    fireEvent.click(stock());
    fireEvent.click(within(sheet()).getByRole("button", { name: /^Show/ }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toMatch(/^\/shop\?.*inStock=/);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
