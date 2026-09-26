import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Not used at runtime (no next/image optimisation, config is compiled), so keep them out of the image.
  outputFileTracingExcludes: {
    "*": ["node_modules/@img/**", "node_modules/sharp/**", "node_modules/typescript/**"],
  },
  // Read at runtime by the What's new page (src/lib/whats-new.ts).
  outputFileTracingIncludes: { "*": ["./CHANGELOG.md"] },
  images: { unoptimized: true },
  poweredByHeader: false,
  // The Content-Security-Policy is set per request in src/middleware.ts (it needs a nonce).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
