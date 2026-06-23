import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake les imports de barrels pour ne bundler que ce qui est utilisé.
    // Gain marginal aujourd'hui (dépendances client minimales) mais pose le
    // pattern : ajouter ici toute future lib volumineuse (icônes, date, ui-kit).
    optimizePackageImports: ["zustand"],
  },
  turbopack: {},
};

export default nextConfig;
