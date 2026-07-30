#!/usr/bin/env node
/**
 * Contrôle d'invariant : tout module qui importe le client Supabase SERVEUR doit
 * porter la garde `import "server-only"`.
 *
 * POURQUOI CE SCRIPT EXISTE
 * -------------------------
 * Audit de performance, Lot 0 (2026-07-29) : `AppOverlayHosts.tsx` — un composant
 * `"use client"` monté dans le layout, donc actif sur TOUTES les pages — importait le
 * barrel `@/components/staffing`, qui réexporte un Server Component important
 * `@/lib/supabase/server` → `next/headers`. Du code serveur était donc atteignable
 * depuis le graphe client, sur chaque page.
 *
 * Turbopack tolère cette violation en silence ; seul webpack la refuse. Le bug n'a
 * été découvert que parce qu'un `next build --webpack` a été lancé à la main pour
 * mesurer des tailles de bundle. La garde `server-only` transforme cette classe de
 * bug en erreur de build immédiate — mais elle manquait à 112 des 126 modules
 * concernés, ce qui la rendait inopérante.
 *
 * Ce script vérifie l'invariant en quelques millisecondes, là où `next build
 * --webpack` prend plusieurs minutes. Les deux sont complémentaires :
 *   - `npm run check:server-boundary` → invariant statique, à mettre en CI
 *   - `npm run build:webpack`         → application réelle de la frontière
 *
 * RÈGLE : un seul type d'exception, les fichiers de test. Vitest ne pose pas la
 * condition de résolution `react-server`, donc `server-only` y lèverait — les modules
 * gardés restent testables grâce à l'alias de `vitest.config.ts`, mais un fichier de
 * test ne peut pas porter la garde lui-même.
 */

import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Import réel du client serveur — et non une simple mention en commentaire.
// (Le piège est concret : AppOverlayHosts.tsx cite `supabase/server.ts` dans un
// commentaire explicatif et ressortait en faux positif sur un grep naïf.)
const SERVER_IMPORT = /^\s*import\s[^;]*?from\s+["'](?:@\/lib\/supabase\/server|\.{1,2}\/[^"']*supabase\/server)["']/m;
const GUARD = /^import\s+["']server-only["']/m;

const isTest = (f) => /\.test\.tsx?$|[\\/]__tests__[\\/]/.test(f);

const files = globSync("src/**/*.{ts,tsx}", { cwd: ROOT });
const offenders = [];

for (const rel of files) {
  if (isTest(rel)) continue;
  const src = readFileSync(join(ROOT, rel), "utf8");
  if (!SERVER_IMPORT.test(src)) continue;
  if (GUARD.test(src)) continue;
  offenders.push(rel);
}

if (offenders.length > 0) {
  console.error(
    `\n✖ Frontière serveur/client : ${offenders.length} module(s) importent ` +
      `@/lib/supabase/server sans la garde \`import "server-only"\` :\n`
  );
  for (const f of offenders) console.error(`    ${f}`);
  console.error(
    `\n  Correctif : ajouter \`import "server-only"\` en tête du fichier.\n` +
      `  Si le fichier porte une directive "use server", l'insérer JUSTE APRÈS\n` +
      `  (la directive doit rester la première instruction du module).\n` +
      `  Voir docs/AUDIT-PERFORMANCE-KREDO.md § Lot 0.\n`
  );
  process.exit(1);
}

console.log(
  `✓ Frontière serveur/client : tous les modules important @/lib/supabase/server ` +
    `portent la garde server-only.`
);
