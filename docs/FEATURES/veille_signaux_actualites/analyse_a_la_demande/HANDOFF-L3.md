# HANDOFF — LOT L3 — Persistance & Restitution Veille V1 + V2

> **Baseline attendue & vérifiée** : `b140b7d16cba0038d9d97371679bdf2ed58acfdb`  
> **Chantier** : Analyse à la demande — Veille  
> **Lot** : L3 (Persistance V2 `manual_custom`, restitution Veille V1+V2, consultation Rapports & rédaction)

---

## 1. Périmètre réalisé

Le lot L3 complète le chantier « Analyse à la demande — Veille » sans altérer les workflows n8n ni le schéma de la base de données.

1. **Persistance documentaire V2 `manual_custom`** :
   - Détection stricte V2 via le discrimateur `input_snapshot.schemaVersion === 2 && input_snapshot.triggerMode === "manual_custom"`.
   - Contournement de la RPC mensuelle `upsert_strategic_watch_document` au profit de `saveAsDocumentWithClient(...)`.
   - Création de documents autonomes dans `intelligence_documents` avec `periodStart = null`, `periodEnd = null`, `scopeJson` enrichi (`analysisKind: "manual_custom"`, `triggerMode: "manual_custom"`).
   - Trace de versionnage dans `intelligence_document_versions` (`brief_json`, `source_refs`, `qa_flags`).
   - Révalidation combinée des chemins `/reports` et `/veille`.

2. **Lecture et restitution des analyses V1 + V2 dans Veille (Desktop & Mobile)** :
   - Mise à jour des contrats et parsers dans `veille-desktop-contracts.ts` (`parseWatchAnalysisOutputV2`, `parseStrategicWatchAnalysisOutput`, type `StrategicWatchAnalysisContent`).
   - Création du module de présentation pure `src/features/watch-analysis/domain/watch-analysis-presentation.ts` (`getWatchAnalysisKindLabel`, `getWatchAnalysisDateLabel`, `getWatchAnalysisCoverage`, `formatEvidenceRef`).
   - Tri de l'historique dans `veille-data.ts` par `created_at` décroissant (au lieu de `period_start`).
   - Neutralisation des en-têtes et sélecteurs de l'interface Desktop (`VeilleActualitesDesktop.tsx`) : « ANALYSES DE VEILLE / Analyses stratégiques », badges de type (« À la demande » vs « Mensuelle »), métriques de couverture V2, restitution des preuves (`evidenceRefs`), fiche de rapport et actions documentaires.
   - Refonte des view-models et onglets mobiles (`veille-mobile-view-models.ts`, `VeilleAnalysesTab.tsx`) pour afficher la couverture V2, l'étiquetage neutre et les preuves détaillées sans crash ni mention `Période non renseignée`.

3. **Vérification de consultation dans Rapports & rédaction** :
   - Validation que les documents V2 créés avec `document_type = "strategic_watch_analysis"` et `periodStart/End = null` sont chargés sans régression par la bibliothèque de rapports (`/reports?doc=...`).

---

## 2. Fichiers créés et modifiés

| Fichier | Nature | Description |
| :--- | :--- | :--- |
| `src/components/accounts-contacts/intelligence/save-as-document.ts` | Modification | Ajout du helper `isManualCustomWatchAnalysisSnapshot` et de la branche de persistance V2 via `saveAsDocumentWithClient` |
| `src/components/veille/veille-desktop-contracts.ts` | Modification | Définition des types V2, de `StrategicWatchAnalysisContent` et des parsers V1+V2 |
| `src/features/watch-analysis/domain/watch-analysis-presentation.ts` | **Création** | Adaptateur de présentation pure (libellés, dates, couvertures, preuves) |
| `src/app/(app)/veille/_data/veille-data.ts` | Modification | Cartographie des documents V1/V2 et ordonnancement de l'historique par `created_at desc` |
| `src/components/veille/VeilleActualitesDesktop.tsx` | Modification | Intégration de la restitution V1/V2, badges, métriques, `evidenceRefs`, sélecteur et fiche rapport |
| `src/components/veille/mobile/veille-mobile-view-models.ts` | Modification | Support des view-models V1/V2 (index & archives) sans régression |
| `src/components/veille/mobile/VeilleAnalysesTab.tsx` | Modification | Affichage mobile du sélecteur neutre et des preuves d'analyse |
| `src/features/watch-analysis/__tests__/save-as-document-v2.test.ts` | **Création** | Tests unitaires de la persistance V2 vs V1 (RPC vs `saveAsDocumentWithClient`, idempotence) |
| `src/features/watch-analysis/__tests__/parse-watch-analysis-output.test.ts` | **Création** | Tests unitaires des parsers V1/V2 et dérivation de schéma |
| `src/features/watch-analysis/__tests__/watch-analysis-presentation.test.ts` | **Création** | Tests unitaires de l'adaptateur de présentation et des view-models |

---

## 3. Plan de vérification et résultats

| Commande | Statut | Remarques |
| :--- | :--- | :--- |
| `npx vitest run src/features/watch-analysis` | **PASS** | 9 fichiers de test, 72 tests unitaires passés avec succès |
| `npm run typecheck` | **PASS** | `tsc --noEmit` validé sans erreur |
| `npm test` | **PASS** | 162 fichiers de test, 1618 tests validés à 100% |
| `npm run check:server-boundary` | **PASS** | Frontière serveur/client conforme (`import "server-only"`) |
| `npm run lint` | **PASS** | ESLint validé |
| `npm run build` | **PASS** | Build de production Next.js validé sans erreur |

---

## 4. Garanties de non-régression & Interdits

- **Base de données & RPC** : Aucune migration DB ni modification de table/RPC Supabase effectuée.
- **Workflow n8n** : Aucune modification des JSONs de workflows n8n ou des déclencheurs Webhook.
- **Missions d'intelligence** : Aucun couplage ni altération apportée aux missions d'intelligence.
