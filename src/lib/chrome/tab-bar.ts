export type TabBarRoute = "home" | "categories" | "shop" | "wishlist" | "account";

/** Which tab, if any, the page belongs to. The wishlist lives under /account, so it is tested first. */
export function tabBarRoute(pathname: string): TabBarRoute | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/categories/")) return "categories";
  if (pathname === "/products") return "shop";
  if (pathname === "/account/wishlist" || pathname.startsWith("/account/wishlist/")) return "wishlist";
  if (pathname === "/account" || pathname.startsWith("/account/")) return "account";
  return null;
}
