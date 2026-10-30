import wordmarkImage from "../../../public/brand/mimora/logo/Mimora-Logo-svg.png";

/**
 * The storefront's horizontal wordmark (heart, lettering and bow) — the owner's own artwork, shipped with this client's
 * design rather than served from the store profile, whose `logo` is the square badge. A static import, so the file's
 * existence and its intrinsic size are checked at build time and next/image never needs a remote pattern for it.
 */
export const wordmark = wordmarkImage;
