import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import arMessages from "@/i18n/locales/ar/common.json";
import enMessages from "@/i18n/locales/en/common.json";
import type { OrderDetail } from "@/lib/api/types";
import { StoreProvider } from "@/components/providers/store-context";

vi.mock("@/i18n/navigation", () => ({ Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => <a href={href} className={className}>{children}</a> }));

import { OrderDetailView } from "./order-view";

const base: OrderDetail = {
  orderId: "o1",
  orderNumber: "ORD-000117",
  placedAt: "2026-03-01T10:00:00.000Z",
  status: "PROCESSING",
  paymentStatus: "NOT_REQUIRED",
  lines: [{ lineNumber: 1, orderLineId: "l1", productId: "p1", variantId: "v1", sku: "SKU-1", productName: "Shirt", variantDescription: "M", quantity: 1, unitPrice: "40", lineTotal: "40" }],
  subtotal: "40",
  discount: "0",
  tax: "0",
  total: "70",
  fulfilment: { mode: "DELIVERY", fee: "30", addressSnapshot: { recipientName: "Mona", phone: "+201000000002", addressLine1: "1 Nile St", city: "Cairo", governorate: "Cairo" } },
  payment: { method: "COD", status: "NOT_REQUIRED" },
  canCancel: false,
  timeline: [],
};
const PICKUP = { mode: "PICKUP" as const, fee: "0", pickupLocationSnapshot: { name: "Shop", address: "5 Main St" } };

function renderOrder(order: OrderDetail, locale: "en" | "ar" = "en", token?: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale={locale} messages={{ common: locale === "ar" ? arMessages : enMessages }}>
        <StoreProvider value={{ currency: "EGP", timeZone: "Africa/Cairo", storeName: { ar: "", en: "" }, allowVisitorGround: false }}>
          <OrderDetailView order={order} token={token} justPlaced={false} taxMode={null} />
        </StoreProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const progress = (name = "Order progress") => within(screen.getByRole("list", { name })).getAllByRole("listitem");

describe("OrderView — progress", () => {
  it("shows the delivery journey with the current step marked", () => {
    renderOrder(base);
    const items = progress();
    expect(items).toHaveLength(6);
    expect(items[2]).toHaveAttribute("aria-current", "step");
    expect(items[2]!.textContent).toMatch(/current step/);
    expect(items[0]!.textContent).toMatch(/done/);
    expect(items[5]!.textContent).toMatch(/upcoming/);
  });

  it("shows in transit, in words, as the current step of a delivery", () => {
    renderOrder({ ...base, status: "IN_TRANSIT" });
    const current = progress().find((item) => item.getAttribute("aria-current") === "step")!;
    expect(current.textContent).toMatch(/^In transit/);
  });

  it("walks a pickup to Collected, every step done", () => {
    renderOrder({ ...base, status: "COLLECTED", fulfilment: PICKUP });
    const items = progress();
    expect(items).toHaveLength(5);
    expect(items.at(-1)!.textContent).toMatch(/^Collected/);
    expect(items.every((item) => /done/.test(item.textContent ?? ""))).toBe(true);
  });

  it("treats a pickup completed as DELIVERED before COLLECTED existed as finished", () => {
    renderOrder({ ...base, status: "DELIVERED", fulfilment: PICKUP });
    expect(progress().every((item) => /done/.test(item.textContent ?? ""))).toBe(true);
  });

  it("draws no progress for a cancelled order", () => {
    renderOrder({ ...base, status: "CANCELLED" });
    expect(screen.queryByRole("list", { name: "Order progress" })).not.toBeInTheDocument();
  });

  it("is worded in Arabic too, with no missing key", () => {
    renderOrder({ ...base, status: "IN_TRANSIT" }, "ar");
    const list = screen.getByRole("list", { name: "تقدّم الطلب" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(document.body.textContent).not.toMatch(/\[missing/);
    expect(list.textContent).toContain("قيد النقل");
  });

  it("stops promising a window once the order is collected", () => {
    const window_ = { from: "2026-03-02T00:00:00.000Z", to: "2026-03-04T00:00:00.000Z" };
    const ready = renderOrder({ ...base, status: "READY_FOR_PICKUP", fulfilment: { ...PICKUP, promisedWindow: window_ } });
    expect(screen.getByText(enMessages.readyBetween)).toBeInTheDocument();
    ready.unmount();
    renderOrder({ ...base, status: "COLLECTED", fulfilment: { ...PICKUP, promisedWindow: window_ } });
    expect(screen.queryByText(enMessages.readyBetween)).not.toBeInTheDocument();
  });
});

describe("OrderView — tracking", () => {
  const tracking = { carrierName: "Aramex", trackingNumber: "AB123456", url: "https://aramex.example/track?n=AB123456" };

  it("shows the carrier and number and links to the carrier's page, in a new tab without an opener", () => {
    renderOrder({ ...base, status: "SHIPPED", tracking });
    const link = screen.getByRole("link", { name: /Track your shipment/ });
    expect(link).toHaveAttribute("href", tracking.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(screen.getByText("Aramex")).toBeInTheDocument();
    expect(screen.getByText("AB123456").closest("bdi")).toHaveAttribute("dir", "ltr");
  });

  it("never renders a non-https link as a link, even if the backend sent one", () => {
    renderOrder({ ...base, status: "SHIPPED", tracking: { ...tracking, url: "javascript:alert(1)" } });
    expect(screen.queryByRole("link", { name: /Track your shipment/ })).not.toBeInTheDocument();
    expect(screen.getByText("AB123456")).toBeInTheDocument();
  });

  it("shows nothing when no tracking was entered", () => {
    renderOrder({ ...base, status: "SHIPPED" });
    expect(screen.queryByText("Tracking")).not.toBeInTheDocument();
  });
});

describe("OrderView — customer note and invoice", () => {
  it("shows the customer's own note as plain text, direction following what they wrote", () => {
    renderOrder({ ...base, notes: "<b>اتركه</b> عند الجار" });
    const note = screen.getByText("<b>اتركه</b> عند الجار");
    expect(note).toHaveAttribute("dir", "auto");
    expect(note.querySelector("b")).toBeNull();
  });

  it("omits the note section when there is none", () => {
    renderOrder(base);
    expect(screen.queryByText("Your note")).not.toBeInTheDocument();
  });

  it("links to the invoice when the order has one, carrying the guest's token", () => {
    renderOrder({ ...base, invoiceNumber: "INV-000042" }, "en", "tokentokentokentoken");
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/orders/ORD-000117/invoice?t=tokentokentokentoken");
  });

  it("links to the invoice without a token for a signed-in customer", () => {
    renderOrder({ ...base, invoiceNumber: "INV-000042" });
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/orders/ORD-000117/invoice");
  });

  it("offers no invoice link for an order that has none", () => {
    renderOrder(base);
    expect(screen.queryByRole("link", { name: "View invoice" })).not.toBeInTheDocument();
  });
});
