import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import arMessages from "@/i18n/locales/ar/common.json";
import enMessages from "@/i18n/locales/en/common.json";
import type { Invoice } from "@/lib/api/types";
import { StoreProvider } from "@/components/providers/store-context";
// next-intl's navigation helpers need the Next runtime; the sheet itself renders no link.
vi.mock("@/i18n/navigation", () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import { InvoiceSheet } from "./invoice-view";

const base: Invoice = {
  invoiceNumber: "INV-000042",
  orderNumber: "ORD-000117",
  issuedAt: "2026-03-01T10:00:00.000Z",
  placedAt: "2026-03-01T10:00:00.000Z",
  status: "ISSUED",
  seller: { name: { en: "Acme Store", ar: "متجر أكمي" }, phone: "+20100000001", email: "hello@acme.example" },
  billTo: { name: "منى عادل", phone: "+201000000002" },
  fulfilment: { mode: "DELIVERY", address: { recipientName: "منى عادل", phone: "+201000000002", addressLine1: "1 شارع النيل", city: "القاهرة", governorate: "القاهرة" } },
  lines: [{ lineNumber: 1, sku: "SHIRT-OLV-M", productName: "Shirt", variantDescription: "Olive / M", quantity: 3, unitPrice: "40", discount: "20", lineTotal: "100" }],
  subtotal: "100",
  discount: "20",
  promotionCode: "SPRING",
  shipping: "30",
  tax: { mode: "ADDED", rate: 14, amount: "14.7" },
  total: "124.7",
  payment: { method: "COD", status: "NOT_REQUIRED" },
  refunds: { total: "0", entries: [] },
};

function renderInvoice(invoice: Invoice, locale: "en" | "ar") {
  const messages = { common: locale === "ar" ? arMessages : enMessages };
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <StoreProvider value={{ currency: "EGP", timeZone: "Africa/Cairo", storeName: { ar: "", en: "" }, allowVisitorGround: false }}>
        <InvoiceSheet invoice={invoice} />
      </StoreProvider>
    </NextIntlClientProvider>
  );
}

const ARABIC_INDIC = /[٠-٩]/;

describe("InvoiceSheet — English", () => {
  it("shows the invoice and order numbers, the SKU, quantities and money in Western numerals", () => {
    renderInvoice(base, "en");
    expect(screen.getByRole("heading", { level: 1, name: "Invoice" })).toBeInTheDocument();
    expect(screen.getByText("INV-000042")).toBeInTheDocument();
    expect(screen.getByText("ORD-000117")).toBeInTheDocument();
    expect(screen.getByText("SHIRT-OLV-M")).toBeInTheDocument();
    const row = screen.getByText("Shirt").closest("tr")!;
    expect(within(row).getByText("3")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(ARABIC_INDIC);
  });

  it("states the seller from the order's snapshot and says the sale is not void", () => {
    renderInvoice(base, "en");
    expect(screen.getByText("Acme Store")).toBeInTheDocument();
    expect(screen.queryByText("VOID")).not.toBeInTheDocument();
  });

  it("adds tax as its own row when tax was ADDED at placement", () => {
    renderInvoice(base, "en");
    expect(screen.getByText("Tax (14%)")).toBeInTheDocument();
    expect(screen.queryByText(/Includes tax/)).not.toBeInTheDocument();
  });

  it("says tax is included, with the amount, when it was INCLUDED — and adds no tax row", () => {
    renderInvoice({ ...base, tax: { mode: "INCLUDED", rate: 14, amount: "12.28" } }, "en");
    expect(screen.getByText(/Includes tax \(14%\) of/)).toBeInTheDocument();
    expect(screen.queryByText("Tax (14%)")).not.toBeInTheDocument();
  });

  it("names cash on delivery once, not as a method AND a status", () => {
    renderInvoice(base, "en");
    expect(screen.getByText("Cash on delivery")).toBeInTheDocument();
    expect(screen.queryByText(/Pay on delivery/)).not.toBeInTheDocument();
  });

  it("shows free delivery as Free, and omits the discount row when there is none", () => {
    renderInvoice({ ...base, shipping: "0", discount: "0", promotionCode: undefined, lines: [{ ...base.lines[0]!, discount: "0" }] }, "en");
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByText("Discount", { selector: "dt" })).not.toBeInTheDocument();
  });

  it("prints VOID for a cancelled order, keeps its number, and says when", () => {
    renderInvoice({ ...base, status: "VOID", voidedAt: "2026-03-02T09:00:00.000Z" }, "en");
    expect(screen.getByText("VOID")).toBeInTheDocument();
    expect(screen.getByText("INV-000042")).toBeInTheDocument();
    expect(screen.getByText(/This invoice is void: the order was cancelled on/)).toBeInTheDocument();
  });

  it("lists the refunds recorded, payment and return, and the total refunded", () => {
    renderInvoice(
      { ...base, refunds: { total: "70", entries: [{ kind: "RETURN", amount: "40", at: "2026-03-03T00:00:00.000Z", reference: "TXN-9", returnNumber: "RET-000003" }, { kind: "PAYMENT", amount: "30", at: "2026-03-05T00:00:00.000Z" }] } },
      "en"
    );
    expect(screen.getByText("Refunds recorded")).toBeInTheDocument();
    expect(screen.getByText("Return RET-000003")).toBeInTheDocument();
    expect(screen.getByText("Payment refund")).toBeInTheDocument();
    expect(screen.getByText("TXN-9")).toBeInTheDocument();
    expect(screen.getByText("Total refunded")).toBeInTheDocument();
  });

  it("shows pickup invoices as collected-from, with the pickup location", () => {
    renderInvoice({ ...base, fulfilment: { mode: "PICKUP", pickupLocation: { name: "Downtown shop", address: "5 Main St" } } }, "en");
    expect(screen.getByText("Collected from")).toBeInTheDocument();
    expect(screen.getByText("Downtown shop")).toBeInTheDocument();
  });
});

describe("InvoiceSheet — Arabic (D-10)", () => {
  it("renders quantities, money, dates and the tax rate in Arabic-Indic numerals", () => {
    renderInvoice(base, "ar");
    const row = screen.getByText("Shirt").closest("tr")!;
    expect(within(row).getByText("٣")).toBeInTheDocument();
    expect(screen.getByText(/الضريبة/).textContent).toMatch(ARABIC_INDIC);
    expect(screen.getByText("متجر أكمي")).toBeInTheDocument();
  });

  it("keeps the invoice number, order number, SKU and phone numbers Western, each isolated left-to-right", () => {
    renderInvoice(base, "ar");
    for (const text of ["INV-000042", "ORD-000117", "SHIRT-OLV-M", "+20100000001", "+201000000002"]) {
      const node = screen.getAllByText(text)[0]!;
      expect(node.textContent).not.toMatch(ARABIC_INDIC);
      expect(node.closest("bdi")).toHaveAttribute("dir", "ltr");
    }
  });

  it("labels a void invoice in Arabic", () => {
    renderInvoice({ ...base, status: "VOID" }, "ar");
    expect(screen.getByText("ملغاة")).toBeInTheDocument();
    expect(screen.getByText("INV-000042")).toBeInTheDocument();
  });

  it("shows the seller's Arabic name in ar and the English one in en", () => {
    const { unmount } = renderInvoice(base, "ar");
    expect(screen.getByText("متجر أكمي")).toBeInTheDocument();
    unmount();
    renderInvoice(base, "en");
    expect(screen.getByText("Acme Store")).toBeInTheDocument();
  });
});
