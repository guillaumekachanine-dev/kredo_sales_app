<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KREDO — instructions agents

**`CLAUDE.md` (racine) fait autorité** sur la stack, le schéma Supabase, les règles de design
adaptatif, les commandes et les interdits. Le lire avant d'écrire du code. Ce fichier ne contient
que ce qui s'y ajoute.

## Commandes

```bash
npm run dev                    # Next dev (Turbopack)
npm run build                  # build de production — la seule vraie vérification
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint
npm test                       # vitest run
npm run check:server-boundary  # `import "server-only"` sur tout module important le client Supabase serveur
npm run db:types               # régénère src/types/database.generated.ts
npm run n8n:status             # dérive entre n8n/workflows/ (repo) et le VPS
```

Valider dans cet ordre : `typecheck` → `test` → `check:server-boundary` → `lint` → `build`.
`tsc` ne détecte pas tout : un composant client important une *valeur* depuis un module
`server-only` passe le typecheck et casse `next build`.

## Interdits (détail dans CLAUDE.md)

- Pas de shadcn/ui, Radix, recharts, chart.js, Tremor — composants et SVG **maison**.
- Pas de `tailwind.config.*` : Tailwind v4, `@theme` dans `src/app/globals.css` uniquement.
- Pas de HEX en dur dans le JSX — uniquement les variables `@theme`.
- Jamais de `DataTable` en vue mobile.
- Jamais la `SUPABASE_SERVICE_ROLE_KEY` derrière un préfixe `NEXT_PUBLIC_`.

## Routage design-system

Si une demande cite l'un de ces identifiants, l'identifiant **seul vaut instruction** : lire le
fichier avant d'écrire ou de modifier de l'UI, et inspecter les composants source qu'il liste.

- `edito_bright_design` → `docs/DESIGN/design-systems/global_design/kredo_actual_design/edito_bright_design.md`
  Spécification graphique canonique du projet.

- `cockpit_intelligence_design` → `docs/DESIGN/design-systems/cockpit_intelligence/cockpit_intelligence_design.md`,
  puis `edito_bright_design.md`. L'implémentation Cockpit Intelligence CEGEMA actuelle et les
  fichiers listés dans la référence font foi pour les pages d'intelligence compte. L'identifiant
  fixe le langage visuel mais laisse ouverte la structure de page si elle est demandée autrement.

> ⚠️ `docs/` a été réorganisé en août 2026 (réorganisation encore non commitée). Les chemins
> `docs/design-systems/…` que l'on trouve ailleurs dans le repo sont périmés. Localiser un
> document avec `find docs -name "<fichier>"`.

## n8n

Workflows versionnés en JSON dans `n8n/workflows/`, un `.SETUP.md` par workflow. **L'import et
l'activation sur le VPS sont manuels et faits par Guillaume** — ne pas tenter d'écrire via un MCP
n8n. Patcher le JSON par script plutôt qu'à la main, valider les nœuds `code` avec `node --check`
*et* par exécution réelle sur mocks.

## QA visuelle — authentification navigateur

Pour toute QA visuelle avec `agent-browser` sur KREDO :

1. Charger systématiquement la session authentifiée persistante avant d’ouvrir une route protégée :

   ```bash
   agent-browser state load .codex/auth-state.json

Ouvrir ensuite directement la route à contrôler :

agent-browser open http://localhost:3000/<route>
Ne jamais modifier, désactiver ou contourner le système d’authentification applicatif pour permettre la QA.
Si l’ouverture redirige vers /login, considérer que la session QA a expiré ou est invalide. Ne pas tenter de corriger l’authentification dans le code : signaler qu’un renouvellement de .codex/auth-state.json est nécessaire.
.codex/auth-state.json contient un état de session local sensible et ne doit jamais être commité.

### Séquence QA recommandée

```bash
agent-browser state load .codex/auth-state.json
agent-browser open http://localhost:3000/<route>
agent-browser wait --load networkidle
agent-browser screenshot --annotate
agent-browser snapshot -i
