import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/i18n/locales/en/common.json";
import { PriceRange } from "./facet-bodies";

type Props = React.ComponentProps<typeof PriceRange>;

function ui(props: Partial<Props> = {}) {
  return (
    <NextIntlClientProvider locale="en" messages={{ common: enMessages }}>
      <PriceRange min={undefined} max={undefined} scale={null} currency="EGP" onChange={() => {}} {...props} />
    </NextIntlClientProvider>
  );
}

const minInput = () => screen.getByLabelText("Lowest price") as HTMLInputElement;
const maxInput = () => screen.getByLabelText("Highest price") as HTMLInputElement;

describe("PriceRange — typed text versus the bound props", () => {
  it("keeps what was typed when the parent re-renders with the same bounds", () => {
    const onChange = vi.fn();
    const { rerender } = render(ui({ onChange }));
    fireEvent.change(minInput(), { target: { value: "12" } });
    fireEvent.change(maxInput(), { target: { value: "40" } });
    expect(onChange).toHaveBeenLastCalledWith(undefined, "40");

    // The parent has not accepted the value (props unchanged) — a fresh render must not wipe the field.
    rerender(ui({ onChange: vi.fn(), currency: "USD" }));
    expect(minInput().value).toBe("12");
    expect(maxInput().value).toBe("40");
  });

  it("keeps a half-typed, not-yet-sendable value ('1.') through a re-render", () => {
    const onChange = vi.fn();
    const { rerender } = render(ui({ onChange, min: "5" }));
    fireEvent.change(minInput(), { target: { value: "1." } });
    expect(onChange).not.toHaveBeenCalled();
    rerender(ui({ onChange, min: "5", currency: "USD" }));
    expect(minInput().value).toBe("1.");
  });

  it("replaces the typed minimum when the min prop changes, and leaves the maximum alone", () => {
    const { rerender } = render(ui({ max: "90" }));
    fireEvent.change(minInput(), { target: { value: "12" } });
    fireEvent.change(maxInput(), { target: { value: "95" } });

    rerender(ui({ min: "30", max: "90" }));
    expect(minInput().value).toBe("30");
    expect(maxInput().value).toBe("95");
  });

  it("replaces the typed maximum when the max prop changes, and leaves the minimum alone", () => {
    const { rerender } = render(ui({ min: "10" }));
    fireEvent.change(minInput(), { target: { value: "12" } });
    fireEvent.change(maxInput(), { target: { value: "40" } });

    rerender(ui({ min: "10", max: "75" }));
    expect(maxInput().value).toBe("75");
    expect(minInput().value).toBe("12");
  });

  it("clears the typed text when a bound is reset from outside to undefined", () => {
    const { rerender } = render(ui({ min: "10", max: "50" }));
    fireEvent.change(minInput(), { target: { value: "20" } });
    rerender(ui({ min: undefined, max: "50" }));
    expect(minInput().value).toBe("");
    expect(maxInput().value).toBe("50");
  });
});
