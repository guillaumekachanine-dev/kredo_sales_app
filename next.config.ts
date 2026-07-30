import { createRequire } from "node:module";
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
//
// ⚠️ Le module est résolu PARESSEUSEMENT, jamais par un import statique en tête de
// fichier. `@next/bundle-analyzer` est une devDependency, or Next charge ce fichier
// aussi bien au `build` qu'au `next start` : un import statique ferait planter le
// démarrage avec MODULE_NOT_FOUND sur tout environnement installé en production
// seule (`npm ci --omit=dev`, image Docker multi-stage). Vercel installe les
// devDependencies, donc le problème y resterait invisible jusqu'au premier
// self-host. Ici la résolution n'a lieu que si ANALYZE=true.
function withBundleAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== "true") return config;
  const require = createRequire(import.meta.url);
  const bundleAnalyzer = require("@next/bundle-analyzer") as (
    options: { enabled: boolean; openAnalyzer: boolean }
  ) => (config: NextConfig) => NextConfig;
  return bundleAnalyzer({ enabled: true, openAnalyzer: false })(config);
}

export default withBundleAnalyzer(nextConfig);
