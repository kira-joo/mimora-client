import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import enMessages from "@/i18n/locales/en/common.json";
import { StoreProvider } from "@/components/providers/store-context";
import { GROUND_STORAGE_KEY } from "@/lib/theme/ground-script";
import { GroundSwitch } from "./ground-switch";

const store = { currency: "EGP", timeZone: "Africa/Cairo", storeName: { ar: "", en: "" }, allowVisitorGround: true };

/** Both variants the header mounts — the desktop icon toggle and the mobile menu's segmented pair — in one tree. */
function Tree({ allow = true }: { allow?: boolean }) {
  return (
    <NextIntlClientProvider locale="en" messages={{ common: enMessages }}>
      <StoreProvider value={{ ...store, allowVisitorGround: allow }}>
        <GroundSwitch variant="toggle" />
        <GroundSwitch />
      </StoreProvider>
    </NextIntlClientProvider>
  );
}

const root = document.documentElement;
const darkButton = () => screen.getByRole("button", { name: "Dark" });
const lightButton = () => screen.getByRole("button", { name: "Light" });

beforeEach(() => {
  root.removeAttribute("data-ground");
  window.localStorage.clear();
});
afterEach(() => {
  root.removeAttribute("data-ground");
  window.localStorage.clear();
});

describe("GroundSwitch — one ground, every variant", () => {
  it("starts light: the toggle offers dark and the segmented pair marks Light pressed", () => {
    render(<Tree />);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(lightButton().getAttribute("aria-pressed")).toBe("true");
    expect(darkButton().getAttribute("aria-pressed")).toBe("false");
  });

  it("choosing dark on the toggle sets data-ground, remembers it, and the segmented pair follows", () => {
    render(<Tree />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(root.getAttribute("data-ground")).toBe("dark");
    expect(window.localStorage.getItem(GROUND_STORAGE_KEY)).toBe("dark");
    expect(darkButton().getAttribute("aria-pressed")).toBe("true");
    expect(lightButton().getAttribute("aria-pressed")).toBe("false");
    // ...and the toggle itself now offers the way back.
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("choosing a ground on the segmented pair flips the toggle's label", () => {
    render(<Tree />);
    fireEvent.click(darkButton());
    expect(root.getAttribute("data-ground")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();

    fireEvent.click(lightButton());
    expect(root.getAttribute("data-ground")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(lightButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("shows dark on mount when the pre-paint script already set data-ground=dark", () => {
    root.setAttribute("data-ground", "dark");
    render(<Tree />);
    expect(darkButton().getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("hydrates server light HTML into the real ground without a mismatch (the server cannot know it)", async () => {
    const serverHtml = renderToString(<Tree />);
    root.setAttribute("data-ground", "dark");
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const errors: unknown[] = [];
    let reactRoot!: ReturnType<typeof hydrateRoot>;
    try {
      await act(async () => {
        reactRoot = hydrateRoot(container, <Tree />, { onRecoverableError: (error) => errors.push(error) });
      });

      expect(errors).toEqual([]);
      expect(container.querySelector("button[aria-pressed='true']")?.textContent).toBe("Dark");
      expect(container.querySelector("button[aria-label='Switch to light mode']")).not.toBeNull();
    } finally {
      act(() => reactRoot?.unmount());
      container.remove();
    }
  });

  it("renders neither variant when the merchant does not let visitors choose", () => {
    render(<Tree allow={false} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
