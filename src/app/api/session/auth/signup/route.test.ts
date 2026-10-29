import { beforeEach, describe, expect, it, vi } from "vitest";

const clearCartToken = vi.fn();
const shopRequest = vi.fn();
vi.mock("@/lib/session/cookies", () => ({ clearCartToken }));
vi.mock("@/lib/session/shop-request", async () => {
  const { NextResponse } = await import("next/server");
  return {
    shopRequest,
    jsonBody: async (request: Request) => request.json().catch(() => ({})),
    toResponse: (result: { status: number; data: unknown }) => NextResponse.json(result.data, { status: result.status }),
  };
});

const { POST } = await import("./route");
const call = () => POST(new Request("http://localhost/api/session/auth/signup", { method: "POST", body: JSON.stringify({ phone: "+201005550001", password: "correct-horse", name: "N" }) }));

beforeEach(() => {
  clearCartToken.mockClear();
  shopRequest.mockReset();
});

describe("POST /api/session/auth/signup (BFF)", () => {
  it("passes the backend's identical 202 through and never touches the guest cart token", async () => {
    shopRequest.mockResolvedValue({ status: 202, data: { status: "accepted" } });
    const response = await call();
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "accepted" });
    expect(clearCartToken).not.toHaveBeenCalled();
  });

  it("does not clear the cart even if a (legacy) body claimed a merge", async () => {
    shopRequest.mockResolvedValue({ status: 202, data: { status: "accepted", cartMerge: { merged: true } } });
    await call();
    expect(clearCartToken).not.toHaveBeenCalled();
  });
});
