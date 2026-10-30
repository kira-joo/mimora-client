import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/config/site-origin";

/** Index the catalog; keep transactional, account and API routes out (MDS §21). */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/cart", "/*/checkout", "/*/account", "/*/orders/", "/*/login", "/*/signup", "/*/search"] }],
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
