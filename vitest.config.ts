import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" a des conditional exports (react-server → no-op,
      // default → throw). Next.js active la condition react-server pour ses
      // bundles serveur ; Vitest ne la connaît pas et retombe sur "default",
      // qui throw à l'import. Next.js gère déjà ça en interne, ce n'est donc
      // pas un vrai marqueur de sécurité runtime à préserver ici — on
      // aliase explicitement vers le variant no-op du même package plutôt que
      // d'activer la condition react-server globalement (éviterait d'altérer
      // la résolution d'autres dépendances qui en ont aussi une variante).
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
})
