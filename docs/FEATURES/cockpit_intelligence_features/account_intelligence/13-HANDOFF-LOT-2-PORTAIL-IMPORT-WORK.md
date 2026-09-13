# 13 — HANDOFF LOT 2 : Portail d'Import Unifié, Persistance ChatGPT Work & Publication

## 1. Résumé exécutif

Le **Lot 2 — Portail d'import unifié + persistance ChatGPT Work + publication** est désormais **CLOSED**.

Il transforme le composant d'importation PDF en un véritable portail unifié d'acquisition d'études Account Intelligence proposant deux canaux :
1. **ChatGPT Deep Research** : 1 PDF → conversion asynchrone n8n / IA (strictement préservée, 0 régression) ;
2. **ChatGPT Work** : bundle de 2 fichiers JSON structurés → détection structurelle, validation déterministe, adaptation directe en `AccountStudyKnowledge` canonique, archivage fidèle des originaux dans Storage, et persistance directe au statut `ready`.

Les deux canaux convergent vers la même table `public.account_research_studies` et sont restitués par le même renderer `AccountStudyReader` canonique (avec étiquettes adaptées au format du document original).

---

## 2. Migration & État Supabase vérifié

La migration a été créée et appliquée sur le projet de production `jvzgmhvwirsbdkjpmvla` via la CLI Supabase :
- Fichier : [`supabase/migrations/20260913014632_work_study_producer_and_storage.sql`](file:///Users/dosta/Developer/kredo_sales_app/supabase/migrations/20260913014632_work_study_producer_and_storage.sql)

### Contrôles vérifiés en live :
1. **Contrainte `account_research_studies_producer_check`** :
   Accepte désormais `'chatgpt_deep_research'` (défaut) et `'chatgpt_work'`. Rejette toute autre valeur.
2. **Contrainte `account_research_studies_published_ready`** :
   - Conditions communes : `status = 'ready'`, `knowledge_json` non nul, `sources_registry_json` non nul, `coverage` non nul, `coverage.text.identical = true` ;
   - Si `producer = 'chatgpt_deep_research'` : `coverage.registry.importable = true` (garantie E3 stricte préservée) ;
   - Si `producer = 'chatgpt_work'` : publication de l'étude autorisée même si `registry.importable = false`.
3. **Bucket `account_research_studies`** :
   - Modifié pour autoriser `application/pdf` et `application/json` ;
   - Reste strictement privé (`public: false`) ;
   - Limite de taille inchangée : 50 Mo (`52428800` octets).
4. **Sécurité & RLS** :
   - Aucune modification de policy RLS existante ;
   - Aucun RPC, trigger ou table supplémentaire ;
   - Types TypeScript régénérés dans `src/types/database.generated.ts`.

---

## 3. Modèle Storage du Bundle Work

Les DEUX fichiers JSON originaux sont conservés **octet pour octet** dans le bucket privé `account_research_studies` :
- **Arborescence** :
  `${workspaceId}/${companyId}/${bundleId}/account-intelligence.json`
  `${workspaceId}/${companyId}/${bundleId}/source-corpus.json`
- **Fichier principal** (colonnes DB de la ligne) :
  - `original_file_path` = chemin vers `account-intelligence.json`
  - `original_file_name` = nom initial de l'utilisateur pour ce fichier
  - `original_file_bytes` = taille octets calculée
  - `original_file_sha256` = empreinte SHA-256 du fichier
- **Second fichier** (dans la colonne JSONB `extraction`) :
  ```json
  {
    "mode": "chatgpt_work_bundle",
    "source_corpus": {
      "path": "<workspaceId>/<companyId>/<bundleId>/source-corpus.json",
      "file_name": "<nom_original_utilisateur>",
      "bytes": 12345,
      "sha256": "<hash_sha256>"
    }
  }
  ```
- **Traçabilité de conversion** (dans la colonne JSONB `conversion`) :
  ```json
  {
    "mode": "deterministic_work_adapter",
    "adapter_version": 1,
    "completed_at": "2026-09-13T..."
  }
  ```
- Aucun run IA ni n8n n'est déclenché pour Work.
- En cas d'échec de validation ou d'insertion, un nettoyage best-effort supprime les objets téléversés dans Storage.

---

## 4. Architecture des Flux & Composants UI

### 4.1 Shell Dialog & Sélecteur
- [`AccountStudyPanel.tsx`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/components/AccountStudyPanel.tsx) :
  Bouton d'action renommé en **« Importer une étude »** (au lieu de « Importer une étude (PDF ChatGPT) »). Transmet `isMobile` et le producteur au dialogue.
- [`AccountStudyImportDialog.tsx`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/components/AccountStudyImportDialog.tsx) :
  Composant shell hébergeant l'aiguillage. Si l'utilisateur rouvre une étude existante, il route directement vers le flux correspondant (`deep_research` ou `work`). Sinon, il affiche `ImportModeSelector`.
- [`ImportModeSelector.tsx`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/components/ImportModeSelector.tsx) :
  Deux cartes de sélection (`ChatGPT Deep Research` / 1 PDF vs `ChatGPT Work` / 2 JSON).

### 4.2 Pipeline Deep Research PDF (préservé)
- [`DeepResearchPdfImportFlow.tsx`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/components/DeepResearchPdfImportFlow.tsx) :
  Extraction isolée du flux PDF complet préexistant :
  `select` → `extracting` → `extracted` (avec métriques d'extraction déterministe) → `tracking` (avec suivi n8n et barre de progression) → `ready` (avec publication E3 stricte).
  Zéro régression, bouton retour vers le sélecteur disponible à l'étape initiale.

### 4.3 Pipeline ChatGPT Work
- [`WorkBundleImportFlow.tsx`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/components/WorkBundleImportFlow.tsx) :
  1. Dépôt ou sélection simultanée de 2 fichiers `.json` ;
  2. Lecture locale et détection automatique des rôles (`account_intelligence` et `source_corpus`) par `detectWorkBundleRoles` ;
  3. Contrôle de cohérence d'identité (`checkCompanyIdentityMatch`) comparant le compte Kredo au nom détecté dans l'étude ;
  4. Prévisualisation dynamique instantanée : version du schéma, nombre de sections, d'affirmations, de lacunes, de documents, d'autorités et statut des citations sources (bloque si mismatch d'entreprise) ;
  5. Clic « Importer l'étude » : obtention des URLs signées, téléversement direct des 2 fichiers vers Storage, appel de `registerWorkStudyAction` ;
  6. Passage direct à l'état `ready` : rapport de couverture lisible, boutons de téléchargement (`Briques (JSON)`, `Sources E3 (JSON)`, `Texte intégral (.md)`), bouton « Publier sur le compte ».

### 4.4 Adaptative Design Mobile
- Respect des règles Kredo : aucun composant desktop comprimé avec `hidden`.
- Touch targets > 44px sur tous les boutons interactifs.
- Présentation mobile synthétique et lisible sans défilement horizontal ni tableaux lourds.

### 4.5 Reader & Noms de fichiers
- [`study-read.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/data/study-read.ts) :
  `readStudyFile` nettoie indifféremment les extensions `.pdf` et `.json` (`name.replace(/\.(pdf|json)$/i, "")`).
  `AccountStudySummary` et `getAccountStudyState` intègrent désormais `producer`.
- [`AccountStudyReader.tsx`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/components/AccountStudyReader.tsx) :
  Bouton d'ouverture adapté au producteur : « Ouvrir le JSON original » si `chatgpt_work`, « Ouvrir le PDF original » si `chatgpt_deep_research`.
- [`study-view.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/study-view.ts) :
  Bandeau de lecture qualifié : « Étude sourcée — ChatGPT Work » ou « Étude sourcée — ChatGPT Deep Research ».

---

## 5. Politique de Publication par Producteur

Implémentée de manière pure et testée dans [`study-publication-policy.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/study-publication-policy.ts) et intégrée dans `publishStudy()` :

| Critère | Deep Research (`chatgpt_deep_research`) | ChatGPT Work (`chatgpt_work`) |
|---|---|---|
| Statut d'étude | `ready` et non encore publiée | `ready` et non encore publiée |
| Validité `AccountStudyKnowledge` | Obligatoire (`validateStudyKnowledge`) | Obligatoire (`validateStudyKnowledge`) |
| Intégrité textuelle | `coverage.text.identical === true` | `coverage.text.identical === true` |
| Registre de sources | Objet présent et non nul | Objet présent et non nul |
| Références sources | Résolues | Aucune référence orpheline (`unresolved_source_refs === 0`) |
| Schéma E3 Master Study | **Strictement obligatoire** (`parseSourceRegistryOutput().ok === true`) | **Non bloquant** (champs E3 manquants différés au Lot 3) |
| `coverage.registry.importable` | **Doit être `true`** | **Peut être `false`** (signalé comme information neutre, non comme erreur) |

---

## 6. Fichiers créés et modifiés au Lot 2

### Fichiers modifiés :
- `supabase/migrations/20260913014632_work_study_producer_and_storage.sql` (migration DDL & Storage)
- `src/types/database.generated.ts` (régénération des types après push Supabase)
- `src/features/account-research-studies/domain/work-study-adapter.ts` (support du titre dans le contexte d'adaptation)
- `src/features/account-research-studies/domain/study-view.ts` (exposition du `producer` dans `StudyReportView` et bannière Work)
- `src/features/account-research-studies/data/study-conversion.ts` (`publishStudy` utilisant `validateStudyPublicationPolicy`)
- `src/features/account-research-studies/data/study-read.ts` (gestion des extensions `.json`, inclusion du `producer`)
- `src/features/account-research-studies/actions/study-actions.ts` (actions serveur `requestWorkStudyUploadAction` et `registerWorkStudyAction`)
- `src/features/account-research-studies/components/StudyCoverageReport.tsx` (adaptation informative pour le registre Work non importable)
- `src/features/account-research-studies/components/AccountStudyReader.tsx` (bouton adapté « Ouvrir le JSON original »)
- `src/features/account-research-studies/components/AccountStudyPanel.tsx` (libellé unifié « Importer une étude », propagation `producer` et `isMobile`)
- `src/features/account-research-studies/components/AccountStudyImportDialog.tsx` (refonte en shell/orchestrateur)

### Fichiers créés :
- `src/features/account-research-studies/domain/study-publication-policy.ts` (fonction pure de validation de politique de publication)
- `src/features/account-research-studies/domain/study-publication-policy.test.ts` (tests unitaires de publication Deep Research vs Work)
- `src/features/account-research-studies/domain/work-study-detection.ts` (détection automatique structurelle et vérification d'identité)
- `src/features/account-research-studies/domain/work-study-detection.test.ts` (tests de détection de bundle et rejets)
- `src/features/account-research-studies/data/work-study-intake.ts` (couche `server-only` pour les tickets d'upload et l'enregistrement Work)
- `src/features/account-research-studies/data/work-study-intake.test.ts` (tests unitaires intake, garanties de persistance, nettoyage et base)
- `src/features/account-research-studies/components/ImportModeSelector.tsx` (sélecteur desktop/mobile du canal d'import)
- `src/features/account-research-studies/components/DeepResearchPdfImportFlow.tsx` (flux Deep Research PDF isolé et préservé)
- `src/features/account-research-studies/components/WorkBundleImportFlow.tsx` (flux ChatGPT Work complet, drag & drop, preview, ready & publish)

---

## 7. Résultats des Tests & Quality Gates

Toutes les vérifications du repo sont passées avec succès :

1. **Tests unitaires ciblés Lot 1 & Lot 2** :
   ```bash
   npx vitest run src/features/account-research-studies/
   # ✓ 5 fichiers de tests passés (52/52 tests)
   #   - work-study-detection.test.ts (5/5)
   #   - work-study-intake.test.ts (8/8)
   #   - work-study-pipeline.test.ts (18/18)
   #   - study-pipeline.test.ts (12/12)
   #   - study-publication-policy.test.ts (9/9)
   ```
2. **Suite complète de tests du projet (`npm test`)** :
   ```
   ✓ 302 test files passed (302/302)
   ✓ 3053 tests passed (3053/3053)
   ```
3. **Contrôle des frontières serveur (`npm run check:server-boundary`)** :
   ```
   ✓ Frontière serveur/client : tous les modules important @/lib/supabase/server portent la garde server-only.
   ```
4. **Vérification de typage (`npm run typecheck`)** :
   ```
   ✓ tsc --noEmit : 0 erreur.
   ```
5. **Linting ciblé (`npx eslint src/features/account-research-studies/`)** :
   ```
   ✓ 0 erreur, 0 avertissement.
   ```
6. **Build de production Next.js (`npm run build`)** :
   ```
   ✓ Compiled successfully in 9.4s
   ✓ Finished TypeScript in 49s
   ✓ Generating static pages (42/42)
   ✓ Build réussi sans erreur.
   ```

---

## 8. Structure du Registre Work Non Importable & Point de Reprise Lot 3

### 8.1 État actuel du registre de compte Work
Dans une étude Work importée, le fichier `sources_registry_json` est généré avec toutes les données primaires disponibles depuis `source_corpus.json` :
- `meta.segment_slug` : assigné selon l'entreprise Kredo ;
- `meta.corpus_scope` : `"account"` ;
- `sources` : 16 autorités pour Arkopharma (`SRC-001` à `SRC-016`), avec domaines, éditeurs et la liste de leurs pages dans `documents` ;
- `pack_minimal` et `pack_enrichi` : partitionnés.

### 8.2 Champs E3 manquants pour l'importabilité
Le parseur canonique E3 (`parseSourceRegistryOutput`) requiert des métadonnées de qualification que ChatGPT Work ne fournit pas nativement :
- `tier` (1 à 4) sur chaque source ;
- `primary_role` (`proof`, `corroboration`, `discovery`, `watch`) ;
- `utility_score` (0 à 100) et `utility_score_detail` (6 critères : pertinence sectorielle, couverture besoins, valeur commerciale, fraîcheur, autorité éditoriale, automation access) ;
- `automation_fit` (`high`, `medium`, `low`, `manual_only`) ;
- `content_temporality` (`static`, `periodic`, `continuous`) ;
- `familles_sectorielles_obligatoires` (associations d'autorités vers `presse_professionnelle`, `federation`, `regulateur`).

### 8.3 Périmètre et Objectif du Lot 3
Le Lot 3 aura pour objectif :
> **« Normalisation et distribution contrôlée du Source Corpus Work vers Gestion des sources en réutilisant le pipeline source-management existant. »**
- Permettre la qualification ou l'enrichissement contrôlé de ces critères manquants sans injecter de fausses valeurs ;
- Écrire dans `source_catalog`, `source_corpora` et `source_corpus_items` au moyen de la fonction `ingestSourceCorpus()` ;
- Rendre le registre de sources Work pleinement importable au sein de *Gestion des sources*.
