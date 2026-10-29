import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // This repo's instructions live in CLAUDE.md; don't generate a second file on every `next dev`.
  agentRules: false,
  images: {
    // Merchant media lives on the backend's image provider (ImageAsset.provider "cloudinary").
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async redirects() {
    // The design preview's entry: Arabic is the default locale.
    return [{ source: "/preview", destination: "/preview/ar", permanent: false }];
  },
};

export default withNextIntl(nextConfig);
