# Handoff — Lot 1 « Socle base »

**Chantier :** Gestion des sources · **Lot :** 1 / 6 · **Statut :** ✅ **livré, appliqué en
production le 2026-08-14.**
**Amont :** `PLAN-CHANTIER.md` §3 (modèle retenu) et `HANDOFF-LOT0.md` §6 (décisions actées).
**Aval :** Lot 2 — branchement de la veille hebdomadaire. Voir `HANDOFF-LOT2.md`.

> Ce handoff est rédigé rétroactivement le 2026-08-15, à la reprise du chantier pour le Lot 2,
> pour donner au Lot 1 le document dédié qui lui manquait — le travail lui-même est antérieur
> et n'est pas modifié ici. Il ne réécrit pas l'historique du Lot 0 : voir `HANDOFF-LOT0.md`
> pour ce lot.

---

## 1. Ce qui a été livré

Deux migrations, appliquées et vérifiées en base live (`jvzgmhvwirsbdkjpmvla`) :

- `supabase/migrations/20260814214647_077_source_management.sql`
- `supabase/migrations/20260814214750_078_source_management_created_by_index.sql`

Contenu (détaillé dans `PLAN-CHANTIER.md` §3 et le corps des migrations) :

- 3 tables workspace-scoped : `source_catalog`, `source_corpora`, `source_corpus_items`,
  RLS 4 policies (écriture réservée `is_workspace_admin()` + `origin`/`scope_kind <> 'system'`).
- 2 colonnes additives : `account_watch_settings.include_sector_corpus` (défaut `true`),
  `veille_articles.source_catalog_id` (nullable, FK `source_catalog`) — le crochet du
  scoring V2.
- Vue `public.v_effective_watch_sources` (`security_invoker = true`), trois branches
  (`news` direct, `news` corpus, `account_watch` corpus avec héritage segment → macro).
- RPC `public.ingest_source_corpus(jsonb, text, text)`, `SECURITY DEFINER`,
  `search_path = ''`, idempotente, réservant les sources `origin='system'`/`is_locked` en
  écriture.
- Seed idempotent des 14 sources historiques du nœud `Config Sources KREDO` (corpus système
  `socle-sources-editoriales`, `is_locked = true`), workspace résolu par `SELECT` sur
  `workspaces`, jamais d'UUID en dur.
- Index de couverture FK (`078`) sur `source_catalog.created_by`.
- `supabase/tests/20260814180000_source_management.assertions.sql`.

## 2. État vérifié en base live (2026-08-15, avant Lot 2)

| Objet | Valeur |
|---|---|
| `source_catalog` | 14 lignes, toutes `origin='system'` |
| `source_corpora` | 1 corpus système |
| `source_corpus_items` | 14 |
| `v_effective_watch_sources` / `news` | 14 |
| `v_effective_watch_sources` / `account_watch` | 0 (normal, aucun corpus sectoriel importé) |
| RSS direct | LeMagIT, ChannelNews, L'Usine Digitale, One Useful Thing, VentureBeat AI, OpenAI News, Journal du Net IA, ActuIA, Finextra, Premium Beauty News (10) |
| `site_search` (`collection_url IS NULL`) | The Batch, Anthropic News, The Neuron, a16z (4) |
| `veille_articles.source_catalog_id IS NOT NULL` | **0** — preuve directe que le Lot 2 n'était pas encore branché |

Migrations `20260814214647` et `20260814214750` confirmées présentes dans
`schema_migrations` via `list_migrations` (MCP Supabase).

## 3. Ce que le Lot 1 ne fait pas

- N'écrit rien dans `veille_articles.source_catalog_id` : aucun consommateur ne l'alimentait
  encore (résolu par le Lot 2).
- N'expose pas `workspace_id` dans `v_effective_watch_sources` — documenté comme point
  d'attention pour un futur support multi-workspace, pas un défaut du Lot 1 (le projet est
  mono-workspace, la vue est `security_invoker` pour `authenticated`, et n8n lit en
  `service_role`).
- Aucune UI, aucun import de corpus sectoriel réel (le corpus parfumerie E3 reste un fixture
  de test, pas importé).

## 4. Entrée du Lot 2

Voir `HANDOFF-LOT2.md`.
