# 14 — HANDOFF LOT 3 : Distribution Contrôlée du Source Corpus Work vers la Bibliothèque de Sources

## 1. Résumé exécutif

Le **Lot 3 — Distribution contrôlée du Source Corpus Work vers la bibliothèque de sources** est désormais **CLOSED**.

Il permet à l’utilisateur, depuis une étude Account Intelligence issue du producteur `chatgpt_work`, de transférer les **autorités et domaines réellement mobilisés par l'étude** vers la bibliothèque canonique « Gestion des sources » de Kredo (`source_catalog`, `source_corpora`, `source_corpus_items`).

### Principes directeurs respectés :
1. **Source canonique = autorité / domaine** (et non document/URL) :
   - Pour la référence Arkopharma : 16 autorités/domaines ↔ 27 documents utilisés.
   - Les documents restent strictement de la provenance archivée dans Storage (`source-corpus.json`). Aucune URL ne devient une entrée autonome dans `source_catalog`.
2. **Décision d'architecture — aucun forçage dans E3** :
   - Les champs de preuve sectorielle E3 (`tier`, `utility_score`, `primary_role`, `automation_fit`) demeurent à `NULL` dans `source_corpus_items`.
   - Aucune métrique ni score LLM n'est inventé.
3. **Véritable scope de corpus `account`** :
   - Le système dispose désormais de 3 origines fonctionnelles : `sector`, `thematic`, `account`.
   - Écriture multi-table unique via la RPC `public.ingest_source_corpus` étendue.
4. **Idempotence & Intégrité relationnelle** :
   - Relance non destructive : mise à jour du même corpus pour la même étude.
   - Index partiel unique `(workspace_id, study_id) WHERE scope_kind = 'account'`.
   - Téléchargement et revérification cryptographique SHA-256 du fichier original depuis Storage côté serveur (aucune confiance dans le navigateur).
5. **Préservation stricte du catalogue existant** :
   - Réutilisation des sources déjà cataloguées, préservation intégrale de leur RSS, catégorie, temporalité et statut verrouillé/système.
   - Union des `usage_scopes` : `['news', 'study']`, jamais de réduction à `['study']`.
6. **Isolement absolu de la veille & du digest** :
   - Corpus créé en `activation_state = 'draft'`.
   - `news_eligible = false`, `account_watch_eligible = false`, `is_enabled = false`.
   - Aucune collecte récurrente, cron, digest ni compte surveillé n'est activé.
7. **Non-altération du registre de l'étude** :
   - `coverage.registry.importable` reste inchangé. Le statut de distribution est relationnel (`source_corpora.study_id`).

---

## 2. Migrations & État Supabase vérifié

Deux migrations ont été créées via la CLI Supabase et appliquées sur le projet de production `jvzgmhvwirsbdkjpmvla` :

### 2.1 Migration 1 : Valeur d'ENUM `account`
- **Fichier** : `supabase/migrations/20260913101023_add_account_corpus_scope_kind.sql`
- **Contenu** :
  ```sql
  ALTER TYPE public.corpus_scope_kind ADD VALUE IF NOT EXISTS 'account';
  ```
- **Raison de l'isolation** : Sous PostgreSQL, une nouvelle valeur d'enum ne peut pas être utilisée dans les contraintes de table ou les fonctions SQL au sein de la même transaction DDL.

### 2.2 Migration 2 : Modèle relationnel & RPC
- **Fichier** : `supabase/migrations/20260913101040_source_corpora_account_scope_and_rpc.sql`
- **Contenu principal** :
  1. Colonne `study_id uuid NULL REFERENCES public.account_research_studies(id) ON DELETE CASCADE` sur `public.source_corpora`.
  2. Contrainte CHECK `source_corpora_scope_consistency` :
     - `sector` : `sector_id IS NOT NULL AND study_id IS NULL`
     - `account` : `study_id IS NOT NULL AND sector_id IS NULL`
     - `thematic` / `system` : `sector_id IS NULL AND study_id IS NULL`
  3. Index partiel unique :
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS source_corpora_unique_account_study
       ON public.source_corpora (workspace_id, study_id)
       WHERE scope_kind = 'account';
     ```
  4. Mise à jour de la RPC `public.ingest_source_corpus` :
     - Reçoit `p_scope_kind = 'account'`.
     - Résout `study_id` depuis `p_payload->>'study_id'`.
     - Vérifie que l'étude existe, appartient au workspace, porte `producer = 'chatgpt_work'`, et est au statut `ready` ou `published`.
     - Écrit `study_id` sur `source_corpora` avec `sector_id = NULL`.
     - Force `enabled_for_news = false` et `enabled_for_account_watch = false`.
     - Préserve les sources existantes (union des scopes, préservation RSS/temporality/category).

Contrôles Supabase Advisors : `supabase db advisors --linked` exécuté, aucune alerte de sécurité ni régression. Types TypeScript régénérés via `npm run db:types`.

---

## 3. Architecture Domaine & Contrats

### 3.1 Contrat d'Import Account Corpus
- **Module** : `src/features/source-management/domain/account-source-corpus.ts`
- **Entrée** : `WorkSourceCorpusData` (projection de `source-corpus.json`).
- **Helpers** :
  - `extractWorkAuthorityCandidates` : groupe les documents par domaine normalisé, extrait le candidat d'autorité, calcule le score de confiance et le nombre de documents utilisés.
  - `buildAccountCorpusSlug` : format déterministe `sources-compte-<companySlug>-<hash>`.
  - `buildAccountCorpusVersion` : format `work-<YYYYMMDD>-<studyId8>`.
  - `validateNewSourceArbitration` : vérifie que toute nouvelle source sélectionnée est qualifiée (`kredo_category` + `content_temporality`).
  - `buildAccountIngestCorpusPayload` : construit le payload canonique d'ingestion `IngestSourceCorpusPayload` sans inventer de métriques E3 (tier/scores à null, pack `minimal`, `activation_state = 'draft'`).

### 3.2 Évolution du Contrat Global Source Management
- `SourceCorpusScopeKind` : `"system" | "sector" | "thematic" | "account"`.
- `SourceCorpusView` : enrichi de `studyId`, `companyId`, `companyName`, `studyTitle`.
- `SourceManagementSnapshot` : enrichi de `accountCorpora: SourceCorpusView[]`.
- `ingestSourceCorpusAction` : accepte `scopeKind = "account"`, vérifie l'absence de segment, la présence de `study_id`, le draft et la présence de `study` dans `usage_scopes`.

---

## 4. Vérification d'Intégrité Serveur (Storage & SHA-256)

Aucune confiance n'est accordée aux données transmises par le navigateur.
Le flux d'action serveur `prepareWorkSourceDistribution` et `distributeWorkStudySources` dans `src/features/account-research-studies/data/work-source-distribution.ts` applique la séquence stricte :

1. Contrôle de l'authentification et du rôle workspace admin.
2. Lecture de l'étude dans `account_research_studies` (vérification workspace et `producer = 'chatgpt_work'`).
3. Extraction des métadonnées `extraction.source_corpus` (`path`, `bytes`, `sha256`).
4. Téléchargement direct du fichier `source-corpus.json` depuis le bucket privé Storage `account_research_studies`.
5. Calcul du hash SHA-256 sur le Buffer téléchargé et comparaison stricte avec la signature enregistrée à l'intake.
6. Parsing via `parseWorkSourceCorpus` du domaine Lot 1.
7. Résolution contre le catalogue live `source_catalog` par `domain` et `search_domain`.
8. Envoi vers la RPC d'ingestion transactionnelle.

---

## 5. Expérience Utilisateur (UI Desktop & Mobile)

### 5.1 Dialogue de Distribution d'Étude Work
- **Composant** : `src/features/account-research-studies/components/WorkStudySourceDistributionDialog.tsx`
- **Étapes du Wizard** :
  1. **Résumé** : présentation des KPI (autorités identifiées, documents réconciliés, sources existantes dans Kredo, sources nouvelles).
  2. **Arbitrage** : tableau ou liste de cartes permettant d'activer/désactiver chaque source, avec qualification par lot (« Catégorie par défaut », « Temporalité par défaut ») et surcharge individuelle. Le CTA est verrouillé tant qu'une nouvelle source sélectionnée n'est pas qualifiée.
  3. **Confirmation** : synthèse d'impact avant écriture (sources réutilisées, nouvelles, exclues, confirmation du statut draft).
  4. **Succès** : confirmation visuelle avec rappel de l'identifiant du corpus créé.
- **Intégration** :
  - `WorkBundleImportFlow.tsx` : proposé dès la fin de l'import réussi.
  - `AccountStudyDesktop.tsx` / `AccountStudyMobile.tsx` : bouton d'action dans le bandeau d'en-tête de l'étude Work (`+ Sources en bibliothèque` ou `✓ Sources en bibliothèque`).

### 5.2 Bibliothèque « Gestion des sources »
- **Desktop** (`SourceManagementDialogDesktop.tsx`) : 5ème section dédiée « Corpus comptes » dans le panneau de navigation gauche.
- **Mobile** (`SourceManagementModalMobile.tsx`) : Bloc E « Corpus comptes » sous format carte tactile compacte.
- **Détail Corpus** (`SourceCorpusDetailView.tsx` / `MobileCorpusDetail.tsx`) : les interrupteurs « Actualités » et « Veille comptes » sont masqués pour les corpus de compte (comme pour les corpus thématiques).

---

## 6. Protection de la Veille & des Digests

L'audit des consommateurs de `source_corpora` a conduit aux sécurisations suivantes :
- `src/features/veille/digest/data/get-digest-launch-options.ts` : exclusion explicite en mémoire des corpus `scope_kind === "account"`.
- `src/features/veille/digest/data/resolve-digest-launch.ts` : garde défensive rejetant tout lancement de digest ciblant un corpus `account`.
- RPC `ingest_source_corpus` : `enabled_for_news` et `enabled_for_account_watch` forcés à `false`.

---

## 7. Validation & Quality Gates

L'ensemble des Quality Gates du repository a été validé avec succès :

```bash
npm run typecheck              # tsc --noEmit : 0 erreur
npm test                       # vitest : 303 fichiers passés, 3061 tests passés (100%)
npm run check:server-boundary  # 100% conforme server-only
npx eslint <Lot 3 files>       # 0 erreur, 0 warning
npm run build                  # Next.js 16.2.7 Turbopack : production build OK (42/42 routes statiques/dynamiques)
```

### Tests Spécifiques Lot 3 :
- `src/features/source-management/domain/account-source-corpus.test.ts` (7 tests) :
  - Parsing et déduplication de la fixture Arkopharma (16 autorités / 27 documents).
  - Résolution des correspondances catalogue (`domain` et `search_domain`).
  - Préservation du catalogue existant (non-écrasement de RSS, catégorie, temporalité, union de `usage_scopes`).
  - Rejet des nouvelles sources sans qualification opérationnelle.
  - Structure du payload account sans scores E3 inventés.
- `src/features/source-management/actions/ingest-source-corpus.test.ts` (9 tests) :
  - Validation serveur du scope `account` (rejet de segment, exigence de `study_id`, rejet de sources sans `study`).
- Tests de non-régression Source Management & Veille (44 tests dans `source-management-components`, 22 dans `source-corpus-editorial`, 8 dans `get-digest-launch-options`).

---

## 8. Fichiers Créés et Modifiés

### Migrations Supabase
- `supabase/migrations/20260913101023_add_account_corpus_scope_kind.sql` (Créé)
- `supabase/migrations/20260913101040_source_corpora_account_scope_and_rpc.sql` (Créé)

### Domaine & Types
- `src/types/database.generated.ts` (Modifié)
- `src/features/source-management/domain/source-management-contracts.ts` (Modifié)
- `src/features/source-management/domain/source-registry-output.ts` (Modifié)
- `src/features/source-management/domain/account-source-corpus.ts` (Créé)
- `src/features/source-management/domain/corpus-import-view.ts` (Modifié)
- `src/features/source-management/domain/source-management-overview.ts` (Modifié)
- `src/features/source-management/domain/source-management-reconciliation.ts` (Modifié)

### Data Layer & Server Actions
- `src/features/account-research-studies/data/work-source-distribution.ts` (Créé)
- `src/features/account-research-studies/actions/study-actions.ts` (Modifié)
- `src/features/account-research-studies/data/study-read.ts` (Modifié)
- `src/features/source-management/actions/ingest-source-corpus.ts` (Modifié)
- `src/features/source-management/data/get-source-management-snapshot.ts` (Modifié)
- `src/features/veille/digest/data/get-digest-launch-options.ts` (Modifié)
- `src/features/veille/digest/data/resolve-digest-launch.ts` (Modifié)

### Composants UI
- `src/features/account-research-studies/components/WorkStudySourceDistributionDialog.tsx` (Créé)
- `src/features/account-research-studies/components/WorkBundleImportFlow.tsx` (Modifié)
- `src/features/account-research-studies/components/AccountStudyDesktop.tsx` (Modifié)
- `src/features/account-research-studies/components/AccountStudyMobile.tsx` (Modifié)
- `src/components/accounts-contacts/intelligence/ClientIntelligenceCompanyTab.tsx` (Modifié)
- `src/components/accounts-contacts/intelligence/ClientIntelligenceMobileView.tsx` (Modifié)
- `src/features/source-management/components/SourceManagementDialogDesktop.tsx` (Modifié)
- `src/features/source-management/components/SourceManagementModalMobile.tsx` (Modifié)
- `src/features/source-management/components/SourceCorpusDetailView.tsx` (Modifié)
- `src/features/source-management/components/mobile/MobileCorpusDetail.tsx` (Modifié)

### Tests
- `src/features/source-management/domain/account-source-corpus.test.ts` (Créé)
- `src/features/source-management/actions/ingest-source-corpus.test.ts` (Modifié)
- `src/features/source-management/__tests__/source-management-snapshot.test.ts` (Modifié)
- `src/features/source-management/__tests__/source-management-components.test.ts` (Modifié)
- `src/features/source-management/__tests__/source-management-reconciliation.test.ts` (Modifié)
- `src/features/source-management/__tests__/source-management-thematic.test.ts` (Modifié)
- `src/components/accounts-contacts/intelligence/intelligence-process.test.ts` (Modifié)

---

## 9. Recommandations pour Chantiers Futurs (Non Ouverts)

1. **Promotion d'une source de bibliothèque vers la veille** :
   Actuellement, un corpus de compte est strictement conservé en draft et sans veille active. Une évolution fonctionnelle ultérieure pourrait proposer une action éditoriale explicite permettant de promouvoir une source qualifiée vers le flux de veille d'un compte particulier.
2. **Distribution rétroactive des études Deep Research** :
   Le Lot 3 a été délibérément calibré pour `chatgpt_work`. Une future réflexion pourra évaluer si le registre E3 des études PDF Deep Research bénéficie d'un flux d'arbitrage similaire.
