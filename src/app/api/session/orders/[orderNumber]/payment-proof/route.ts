import { NextResponse } from "next/server";
import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** The backend's upload policy (upload-policies.ts) — checked here too, so an oversized file fails before it is relayed. */
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

/**
 * Proof of a transfer payment, multipart under the field `proof`. Relayed
 * server-to-server; the file goes to the backend's PRIVATE asset store and no
 * URL comes back (MDS §13) — the proof is never addressable by a guessable link.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("proof");
  if (!(file instanceof File)) return NextResponse.json({ statusCode: 400, error: "VALIDATION_FAILED", message: "Validation failed", validationErrors: [{ field: "proof", message: "Choose an image of the transfer receipt." }] }, { status: 400 });
  if (!TYPES.has(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ statusCode: 400, error: "VALIDATION_FAILED", message: "Validation failed", validationErrors: [{ field: "proof", message: "Use a JPEG, PNG, WebP or HEIC image up to 8 MB." }] }, { status: 400 });
  }
  const body = new FormData();
  body.set("proof", file, file.name);
  return toResponse(await shopRequest(request, ShopEndpoints.orderPaymentProof, { params: await params, body }));
}
