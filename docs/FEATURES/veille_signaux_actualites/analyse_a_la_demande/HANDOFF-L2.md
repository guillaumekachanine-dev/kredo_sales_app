# HANDOFF — L2 : Extension INTEL-021 V2 (Branche Serveur & Workflow n8n)

**Date** : 2026-08-19  
**Baseline de départ** : `f565dc7a167e18edb3c08e606ddadce2b654c4ed`  
**Statut** : Lot L2 entièrement livré et validé. V1 préservé sans régression. L3 non commencé.

---

## 1. Résumé de la livraison

Le Lot L2 rend le contrat V2 `manual_custom` d'analyse à la demande **réellement exécutable** :
1. **Passerelle Serveur Next.js** (`/api/n8n/trigger`) :
   - Branchement pour `workflowId = "intel-021-monthly-watch-analysis"` et `input.schemaVersion = 2`.
   - Validation stricte de l'input V2 via `validateWatchAnalysisInput()`.
   - Résolution & revalidation sous RLS/session via `resolveWatchAnalysisSources()`.
   - Construction d'une enveloppe serveur→n8n et d'un `inputSnapshot` sans contenu métier complet.
   - Forçage strict de `entityType = "workspace"`, `entityId = profile.workspace_id` et `companyId = null`.
2. **Workflow n8n (`INTEL-021`)** :
   - Extension de `n8n/workflows/intel-021-monthly-watch-analysis.json` pour supporter V1 (historique) et V2 (analyse à la demande).
   - Routage de version post-HMAC (`Verify Signature` → `Validate Input` → `Route Schema Version`).
   - Hydratation Supabase des items V2 (`veille_article`, `account_signal`, `intelligence_document`), déduplication du corpus et vérification de la présence d'au moins un item.
   - Prompt V2 orienté par l'intention utilisateur, interdisant toute recherche externe.
   - Contrat de sortie V2 (`WatchAnalysisOutputV2`) avec traçabilité stricte par `evidenceRefs` (validés contre une allowlist du corpus hydraté, titre/provenance réinjectés depuis la source de vérité, recalcul de `coverage`).
   - Callbacks de succès et d'échec unifiés et signés HMAC.

---

## 2. Fichiers créés / modifiés

### Modifiés
- [`src/lib/n8n/types.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/n8n/types.ts) — Ajout des types `WatchAnalysisEvidenceRef` et `WatchAnalysisOutputV2`.
- [`src/app/api/n8n/trigger/route.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/api/n8n/trigger/route.ts) — Ajout de la branche `schemaVersion === 2` pour `intel-021-monthly-watch-analysis`.
- [`n8n/workflows/intel-021-monthly-watch-analysis.json`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/intel-021-monthly-watch-analysis.json) — Extension du workflow (nœuds V2 dédiés, routage V1/V2, hydratation, prompt V2, validation output V2).
- [`n8n/workflows/intel-021-monthly-watch-analysis.SETUP.md`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/intel-021-monthly-watch-analysis.SETUP.md) — Documentation mise à jour pour inclure V1 et V2.
- [`src/lib/n8n/monthly-watch-analysis.test.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/n8n/monthly-watch-analysis.test.ts) — Adaptation des tests d'assertion de structure pour supporter V1+V2.

### Créés
- [`src/features/watch-analysis/data/build-watch-analysis-launch.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/watch-analysis/data/build-watch-analysis-launch.ts) — Helper `buildWatchAnalysisRunEnvelope` et `buildWatchAnalysisInputSnapshot` (`server-only`).
- [`src/features/watch-analysis/__tests__/build-watch-analysis-launch.test.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/watch-analysis/__tests__/build-watch-analysis-launch.test.ts) — Tests unitaires de la construction d'enveloppe et snapshot V2.
- [`src/features/watch-analysis/__tests__/trigger-route-v2.test.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/watch-analysis/__tests__/trigger-route-v2.test.ts) — Tests unitaires de la branche serveur `/api/n8n/trigger` V2.
- [`n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js) — Harnais de test n8n Node.js couvrant l'ensemble du workflow INTEL-021 V1 et V2.

### Hors périmètre (Intacts)
- UI L1 (`VeilleActualitesDesktop.tsx`, `VeilleActualitesMobile.tsx`, `VeilleAnalysesTab.tsx`, `WatchAnalysisComposer*.tsx`, etc.) — non touchée.
- Persistance L3 (`save-as-document.ts`, `upsert_strategic_watch_document`) — non touchée.
- Missions d'intelligence (`MISSION_CATALOG`, `mission-001-run`, ADR-0020) — non touchées.
- Base de données Supabase (aucune table, migration, RPC ou RLS modifiée).

---

## 3. Enveloppe serveur→n8n et input_snapshot

### Forme exacte de `WatchAnalysisRunEnvelopeV2` (envoyée à n8n)
```ts
type WatchAnalysisRunEnvelopeV2 = {
  schemaVersion: 2
  triggerMode: "manual_custom"
  intention: string
  requestedAt: string
  refs: WatchAnalysisResolvedRef[]
  stats: {
    sourceGroups: number
    resolvedRefs: number
  }
}
```

### Forme exacte de `input_snapshot` (persistée dans `ai_intelligence_runs`)
```json
{
  "schemaVersion": 2,
  "triggerMode": "manual_custom",
  "intention": "...",
  "requestedAt": "...",
  "sources": [ ... ],
  "resolvedRefs": [ ... ],
  "resolutionStats": {
    "sourceGroups": 2,
    "resolvedRefs": 3
  }
}
```
*Garantie : aucun contenu d'article, de signal, de document ou de prompt LLM dans input_snapshot.*

---

## 4. Architecture du routage n8n V1/V2

```text
Webhook — Monthly Watch
           │
     Verify Signature
           │
     Validate Input (valide HMAC + structure V1 ou V2)
           │
   Route Schema Version (Switch code)
     ├── Output 0 (V1) ──> Mark Run Running ──> Load Digests ──> Load Articles ──> Assemble Prompt ──> Call LLM ──> Validate Output ──> Prepare Callback
     │
     └── Output 1 (V2) ──> Mark Run Running V2 ──> Hydrate Corpus V2 ──> Assemble Prompt V2 ──> Call LLM V2 ──> Validate Output V2 ──> Prepare Callback V2
                                                                                                                                           │
                                                                                                                                  Sign Callback ──> Callback
```

Tout échec sur l'un des nœuds V1 ou V2 (`onError: "continueErrorOutput"`) est capturé par `Prepare Failure Callback` → `Sign Failure Callback` → `Callback (Failure)`.

---

## 5. Tables & colonnes réellement hydratées dans n8n V2

- `veille_articles` : `id`, `digest_id`, `published_at`, `selection_rank`, `source_name`, `titre_fr`, `resume`, `categorie`, `secteur_principal`, `analyse_kredo`, `action_commerciale`, `tags`
- `account_signals` : `id`, `company_id`, `title`, `summary`, `category`, `detected_at`, `recommended_action`
- `intelligence_documents` : `id`, `title`, `document_type`, `current_content_text`, `current_content_json`

---

## 6. Contrat de sortie final `WatchAnalysisOutputV2`

```ts
export type WatchAnalysisOutputV2 = {
  schemaVersion: 2
  analysisKind: "manual_custom"
  title: string
  executiveSummary: string
  majorTrends: Array<{
    title: string
    synthesis: string
    sectors: string[]
    confidence: number
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  weakSignals: Array<{
    title: string
    synthesis: string
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  regulatoryDevelopments: Array<{
    title: string
    impact: string
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  commercialOpportunities: Array<{
    title: string
    rationale: string
    recommendedAction: string
    practices: string[]
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  risksAndWatchpoints: Array<{
    title: string
    explanation: string
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  priorityActions: Array<{
    title: string
    action: string
    horizon: "immediate" | "30_days" | "quarter"
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  coverage: {
    sourceGroups: number
    resolvedRefs: number
    articlesCount: number
    signalsCount: number
    documentsCount: number
    totalItems: number
  }
}
```

---

## 7. Validation des evidenceRefs et Coverage

- **Allowlist stricte** : Construite déterministement au nœud `Validate Output V2` sous la forme `${kind}:${id}` depuis `hydratedCorpus`.
- **Rejet des références inconnues** : Si le LLM cite un `evidenceRef` absente de l'allowlist, le nœud lève une exception et fait basculer le run vers le callback d'échec (`status: "failed"`).
- **Inviolabilité des métadonnées** : `title` et `provenance` des `evidenceRefs` sont réinjectés depuis le corpus hydraté serveur, sans faire confiance au LLM.
- **Coverage recalculé** : Le bloc `coverage` est entièrement recalculé par le code n8n depuis le corpus hydraté effectif.

---

## 8. Callbacks n8n

- `resultType` = `"strategic_watch_analysis"`
- `phase` = `1`
- `status` = `"succeeded"` ou `"failed"`
- `contentJson` = `WatchAnalysisOutputV2` (succès) ou `{ error: message }` (échec)
- `contextSnapshot` = Trace V2 sans contenu lourd (schemaVersion 2, triggerMode manual_custom, intention, requestedAt, refs, stats)
- `sourceRefs` = Dérivé de `hydratedCorpus`
- `qaFlags` = `evidence_traceability`, `resolved_refs_only`, `no_external_collection`, `coverage_from_hydrated_corpus`

---

## 9. Tests exécutés & Résultats

```bash
npx vitest run src/features/watch-analysis   → 6 fichiers, 56 tests, TOUS VERTS
npm run test:n8n                             → 8 harnais, 317 assertions, TOUTES VERTES
npm test                                     → 159 fichiers, 1602 tests, TOUS VERTS
npm run typecheck                            → OK (0 erreur TypeScript)
npm run check:server-boundary                → OK (frontière serveur/client respectée)
npx eslint <fichiers touchés>                 → 0 erreur, 0 warning
npm run build:webpack                        → Exit 0 (compilation production réussie)
```

### Preuve de non-régression V1
- Le test `n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js` teste explicitement l'entrée `schemaVersion: 1` et valide que la branche V1 s'exécute normalement.
- `src/lib/n8n/monthly-watch-analysis.test.ts` confirme l'intégrité de la structure et des deux branches.

---

## 10. Écarts au cadrage

Aucun écart de fond. Le workflow est resté `active: false` et n'a pas été importé ni activé sur le VPS.

---

## 11. Ce que L3 peut considérer comme stable

- `/api/n8n/trigger` accepte et traite le payload V2 du compositeur UI L1.
- `ai_intelligence_runs` reçoit le snapshot V2 (`triggerMode: "manual_custom"`).
- `ai_intelligence_results` recevra le callback `strategic_watch_analysis` portant un `contentJson` conforme au contrat `WatchAnalysisOutputV2`.
- L3 peut utiliser `triggerMode === "manual_custom"` pour créer un document autonome dans `intelligence_documents` au lieu de déclencher le versioning mensuel `upsert_strategic_watch_document`.

---

## 12. Actions manuelles restantes

Aucune. Workflow JSON versionné avec `active: false`. Pas d'import ni d'activation VPS réalisés.
