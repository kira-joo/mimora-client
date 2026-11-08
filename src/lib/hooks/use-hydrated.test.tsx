import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHydrated } from "./use-hydrated";

function Probe() {
  return <p>{useHydrated() ? "client" : "server"}</p>;
}

afterEach(() => vi.restoreAllMocks());

describe("useHydrated", () => {
  it("is false in the server render", () => {
    expect(renderToString(<Probe />)).toContain("server");
    expect(renderToString(<Probe />)).not.toContain("client");
  });

  it("is true in a client render", () => {
    render(<Probe />);
    expect(screen.getByText("client")).toBeInTheDocument();
  });

  it("hydrates server HTML (false) into true with no hydration mismatch", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable: unknown[] = [];
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    document.body.append(container);
    expect(container.textContent).toBe("server");

    let root!: ReturnType<typeof hydrateRoot>;
    try {
      await act(async () => {
        root = hydrateRoot(container, <Probe />, { onRecoverableError: (error) => recoverable.push(error) });
      });

      expect(container.textContent).toBe("client");
      expect(recoverable).toEqual([]);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });
});
