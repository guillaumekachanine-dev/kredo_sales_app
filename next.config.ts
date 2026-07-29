import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

// Dossiers d'assets statiques stables (icônes, logos, images de marque). Servis
// tels quels depuis /public : on les cache agressivement côté CDN + navigateur.
// Cohérent avec le contrat du service worker (public/sw.js) qui fait déjà du
// cache-first permanent sur /icons_set/ et /optimized/. En cas de mise à jour
// d'un asset, bumper CACHE_NAME dans sw.js (ou renommer le fichier).
const IMMUTABLE_ASSET_DIRS = [
  "icons_set",
  "optimized",
  "images",
  "branding",
  "avatars",
];

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake les imports de barrels pour ne bundler que ce qui est utilisé.
    // Gain marginal aujourd'hui (dépendances client minimales) mais pose le
    // pattern : ajouter ici toute future lib volumineuse (icônes, date, ui-kit).
    optimizePackageImports: ["zustand"],
  },
  images: {
    // AVIF d'abord (≈20-30 % plus léger que WebP à qualité égale, gain mobile),
    // WebP en repli. Le surcoût d'encodage est amorti par le cache long ci-dessous.
    formats: ["image/avif", "image/webp"],
    // Les variantes optimisées par next/image sont mises en cache 1 an sur le CDN
    // (défaut Next = 60 s → réoptimisation quasi permanente). Nos sources d'icônes
    // sont stables, donc aucune raison de réoptimiser à chaque requête.
    minimumCacheTTL: 31536000,
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
      // Cache long immuable sur les dossiers d'assets statiques stables.
      ...IMMUTABLE_ASSET_DIRS.map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      })),
    ];
  },
  turbopack: {},
};

// Analyse de bundle activée à la demande uniquement : `ANALYZE=true npm run build`.
// Hors de ce cas le wrapper est un passe-plat, donc aucun impact sur les builds
// de production ni sur les preview Vercel.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

export default withBundleAnalyzer(nextConfig);
