import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake les imports de barrels pour ne bundler que ce qui est utilisé.
    // Gain marginal aujourd'hui (dépendances client minimales) mais pose le
    // pattern : ajouter ici toute future lib volumineuse (icônes, date, ui-kit).
    optimizePackageImports: ["zustand"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
