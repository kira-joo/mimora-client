import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "motion";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./sheet";

// jsdom has no showModal/close: stand in for the platform's open-state bookkeeping, and record the calls.
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
});
beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
});
afterEach(() => {
  MotionGlobalConfig.skipAnimations = true;
});

function sheet(open: boolean, onClose: () => void = () => {}) {
  return (
    <Sheet open={open} onClose={onClose} side="bottom" title="Filters" closeLabel="Close">
      <p>Sheet body</p>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("renders nothing while closed", () => {
    render(sheet(false));
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(screen.queryByText("Sheet body")).toBeNull();
  });

  it("opening mounts the dialog with its content and opens it as a modal", () => {
    const { rerender } = render(sheet(false));
    rerender(sheet(true));

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("Sheet body")).toBeInTheDocument();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("mounts open when it starts open", () => {
    render(sheet(true));
    expect(screen.getByText("Sheet body")).toBeInTheDocument();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("closing unmounts the dialog after its exit, closing the native dialog, and reopening works", async () => {
    const { rerender } = render(sheet(true));
    rerender(sheet(false));

    await waitFor(() => expect(screen.queryByText("Sheet body")).toBeNull());
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);

    rerender(sheet(true));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("Sheet body")).toBeInTheDocument();
    expect(showModal).toHaveBeenCalledTimes(2);

    // A second full cycle leaves nothing stuck mounted.
    rerender(sheet(false));
    await waitFor(() => expect(screen.queryByText("Sheet body")).toBeNull());
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("asks its owner to close (and never closes itself) from the close button and Escape", () => {
    const onClose = vi.fn();
    render(sheet(true, onClose));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const cancel = new Event("cancel", { cancelable: true });
    screen.getByRole("dialog").dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Sheet body")).toBeInTheDocument();
  });
});
