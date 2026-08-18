# KREDO — HANDOFF LOT 6 : Scoring V2 d’Efficacité des Sources

> **Statut** : Implémenté et validé sur `main`  
> **Date** : 19 août 2026  
> **Auteur** : Agent AI (DeepMind Antigravity)  
> **Périmètre** : Lot 6 uniquement (Instrumentation, Scoring V2 30j & Affichage UI d'efficacité des sources)

---

## 1. Résumé du Lot 6

Le Lot 6 introduit la mesure objective et continue de l’efficacité de chaque source du catalogue KREDO interrogée par la veille hebdomadaire (`veille-hebdomadaire-kredo`) et la veille comptes (`intel-033-account-watch-refresh`).

### Problème résolu
Un simple `GROUP BY` sur les articles ou signaux finaux ne permettait pas de distinguer :
1. Une source **jamais interrogée**.
2. Une source **interrogée mais en erreur technique** (ex: HTTP 500 / ETIMEDOUT).
3. Une source **interrogée sans résultat** (ex: 0 item).
4. Une source **productive** (qui franchit le dédup et génère au moins 1 item retenu dans le digest/signal).

### Solution implémentée
Instrumentation au niveau des runs via la table `source_collection_metrics`, calcul d'une vue d'agrégation glissante à 30 jours (`v_source_effectiveness_30d`), et restitution adaptative Desktop/Mobile dans l'interface **Gestion des sources**.

---

## 2. Architecture & Modèle de Données

### 2.1 Table `public.source_collection_metrics`
`supabase/migrations/20260819020000_088_source_collection_metrics.sql`

- **Attribution multi-tenant** : `workspace_id` avec RLS strict (`pg_has_role('authenticated')`).
- **Clé d'unicité idempotente** : `(workflow_id, workflow_run_key, source_catalog_id, usage_scope)`.
- **Colonnes d'observation** :
  - `query_succeeded` (`boolean`) : `true` si la source a répondu sans erreur technique.
  - `items_collected` (`integer`) : Nombre brut d'items renvoyés par la source.
  - `items_after_dedup` (`integer`) : Nombre d'items ayant franchi le dédup & filtre administratif.
  - `items_retained` (`integer`) : Nombre d'items finalement retenus dans le digest/signal.

### 2.2 Vue Security Invoker `public.v_source_effectiveness_30d`
Aggrège les observations des 30 derniers jours par `(workspace_id, source_catalog_id)` :
- **Taux de fiabilité technique** (`reliability_rate`) = `successful_observations / observations`
- **Taux de runs productifs** (`productive_run_rate`) = `productive_observations / observations` (où `items_retained > 0`)
- **Taux de rétention** (`retention_rate`) = `COALESCE(SUM(items_retained)::numeric / NULLIF(SUM(items_after_dedup), 0), 0)` (protection explicite contre la division par zéro lorsque `items_after_dedup = 0` : le taux vaut 0 et n'invalide pas le score global avec un NULL accidentel).
- **Score d’efficacité V2** (`effectiveness_score`) :
  $$\text{Score} = \text{ROUND}((0.25 \times \text{fiabilité} + 0.50 \times \text{runs productifs} + 0.25 \times \text{rétention}) \times 100)$$
- **Règle des < 3 observations** : Si `observations < 3`, `effectiveness_score = NULL` (rendu en UI sous le statut **"À observer X/3 runs"**).

---

## 3. Instrumentation des Workflows n8n

1. **`n8n/workflows/veille-hebdomadaire-kredo.json`** :
   - Nœud `Préparer Métriques Sources` (Code Node) : collecte les stats pour chaque source du catalogue interrogée en scope `news`.
   - Nœud `Écrire Métriques Sources` (HTTP Request Node) : `POST /rest/v1/source_collection_metrics?on_conflict=workflow_id,workflow_run_key,source_catalog_id,usage_scope` avec `Prefer: resolution=merge-duplicates` (ciblage explicite de la contrainte UNIQUE d'upsert) et `onError: continueErrorOutput` (instrumentation 100% non bloquante).

2. **`n8n/workflows/intel-033-account-watch-refresh.json`** :
   - Nœud `Préparer Métriques Sources` (Code Node) : collecte les stats pour les sources sectorielles avec `sourceCatalogId` en scope `account_watch`.
   - Nœud `Écrire Métriques Sources` (HTTP Request Node) : `POST /rest/v1/source_collection_metrics?on_conflict=workflow_id,workflow_run_key,source_catalog_id,usage_scope` avec `Prefer: resolution=merge-duplicates`.

---

## 4. Expérience Utilisateur (UI)

- **Types & Contrats** (`src/features/source-management/domain/source-management-contracts.ts`) :
  - Ajout du type `SourceEffectivenessMetrics`.
  - Extension de `SourceCatalogEntry` avec `effectiveness?: SourceEffectivenessMetrics | null`.
  - Extension de `SourceCorpusView` avec `evaluatedSourcesCount` et `averageEffectivenessScore`.

- **Moyenne Corpus** (`src/features/source-management/data/get-source-management-snapshot.ts`) :
  - `averageEffectivenessScore` calcule la moyenne **exclusivement sur les sources évaluées** (`observations >= 3`). Les sources "À observer" (`< 3` obs) ne sont ni comptées comme 0/100, ni intégrées dans le dénominateur.

- **Rendu Desktop** :
  - Dans la liste dense (`SourceDenseList`) et le détail corpus (`SourceCorpusDetailView`), chaque source affiche :
    - `82/100 5 runs · 3 productifs`
    - ou `À observer 1/3 runs` si `< 3` obs.
  - Dans l'en-tête et les cartes corpus (`SourceCorpusCard`) :
    - `Efficacité observée : 68/100 (12 / 20 sources évaluées)`.

- **Rendu Mobile** :
  - Rendu épuré dans les cartes (`SourceBaseList`) : `68/100 · 4 runs` ou `À observer · 1/3 runs`.

---

## 5. Non-Régression & Garanties

- Aucune modification des prompts métier, des LLM, des crons ni des plafonds de collecte.
- Aucune désactivation automatique de source et aucune modification automatique de `utility_score`.
- Tous les tests automatisés (Vitest + harnais n8n) passent au vert à 100%.

```bash
npm run typecheck       # ✓ Passed (0 errors)
npm test                # ✓ 1546 tests passed
npm run test:n8n        # ✓ 111 tests passed
npm run check:server-boundary # ✓ Passed
npm run build           # ✓ Compiled successfully
```

---

## 6. Prochaines Étapes Manuelles (pour Guillaume)

1. Appliquer la migration Supabase `supabase/migrations/20260819020000_088_source_collection_metrics.sql` en base.
2. Importer et activer la version mise à jour des workflows n8n sur le VPS :
   - `n8n/workflows/veille-hebdomadaire-kredo.json`
   - `n8n/workflows/intel-033-account-watch-refresh.json`
