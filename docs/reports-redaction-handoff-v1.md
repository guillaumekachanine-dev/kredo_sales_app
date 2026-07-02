# Rapports & Rédaction — Handoff d'implémentation v1

**Référence :** ADR-0009 (voir échange Claude ↔ Guillaume du 2026-07-02, ce document en est la version exécutable).
**Auteur :** Claude (analyse) — à exécuter par un agent tiers, lot par lot.
**Statut :** Lot 0 exécuté et validé (2026-07-02, migration `20260702220731_042_intelligence_documents`). Lot 1 prêt à exécuter au format "contrat" (voir note méthode ci-dessous). Lots 2-6 à raffiner au fil de l'eau.

**Note méthode (à partir du Lot 1) :** les lots suivants sont volontairement rédigés en **spec par contrat** et non en code complet — objectif, contrat de types/noms (ce qui doit être identique dans tous les lots), règles métier non-évidentes, fichiers de référence à imiter, non-objectifs. L'implémentation précise (requêtes, JSX) est laissée à l'agent exécutant, qui doit lire CLAUDE.md + les fichiers de référence cités et suivre les patterns déjà en place dans le repo — pas de nouvelle convention inventée. **En fin de lot, rapporter aussi les décisions de design non-triviales prises** (pas seulement les 4 critères de validation), pour permettre une revue ciblée sans que tout ait dû être spécifié à l'avance.

---

## 0. Contexte pour l'agent exécutant (lire avant tout lot)

Kredo est un outil B2B interne (ESN) en Next.js 16 / Supabase / Tailwind v4. Tu n'as **aucune mémoire des sessions précédentes** — tout ce dont tu as besoin est dans ce document + le fichier `CLAUDE.md` à la racine du repo (lis-le en entier avant de commencer, il contient la stack exclusive, l'état de la base, les règles adaptive design et le design system).

**Ce projet existe déjà et fonctionne** : le module INTEL-020 (rédaction assistée IA — email/LinkedIn/note) est en production. Ce handoff ajoute une **couche documentaire** au-dessus des résultats IA existants, pour qu'ils deviennent une bibliothèque consultable et éditable au lieu d'un flux jetable.

### Ce que tu dois savoir avant de toucher au schéma

1. **Les fonctions Postgres `current_workspace_id()`, `set_updated_at()`, `log_audit()` vivent dans le schéma `private`, pas `public`.** CLAUDE.md documente encore `public.` — c'est un drift de documentation connu, ignore cette partie de CLAUDE.md et utilise `private.current_workspace_id()`, `private.set_updated_at()`, `private.log_audit()`. Vérifié dans les migrations `026_calendar_events.sql` et `033_fixed_price_projects.sql`, les deux plus proches analogues de ce que tu vas écrire.
2. **Convention enum : `CREATE TYPE ... AS ENUM`, pas de `CHECK IN (...)` sur du texte libre.** Toutes les migrations récentes (`project_status`, `absence_type`, `ai_run_status`...) suivent ce pattern. Respecte-le.
3. **RLS = motif uniforme 4 policies** (SELECT/UPDATE/DELETE sur `workspace_id = private.current_workspace_id()`, INSERT `WITH CHECK (true)` car le `DEFAULT` de la colonne garantit l'isolation). Copie exactement le pattern de `033_fixed_price_projects.sql` section 7.
4. **`ai_intelligence_runs` / `ai_intelligence_results` restent immuables.** Tu ne les modifies JAMAIS dans ces lots (sauf le callback n8n au Lot 4, qui les alimente déjà). Tu construis une couche séparée qui les référence en lecture seule via `source_result_id`.
5. **Pattern de page Kredo obligatoire** : `page.tsx` (Server Component, détection device via user-agent) → distribue `XxxDesktopView.tsx` / `XxxMobileView.tsx`. Jamais de composant lourd chargé puis masqué en CSS.
6. **Design system** : variables Tailwind v4 dans `globals.css` (palette "Cobalt Franc"), primitives maison (`AppDrawer`, `AppDialog`, `SurfaceCard`, `StatusPill`, `KpiCard`, `DataTable`). **Zéro** shadcn/Radix, recharts, HEX brut, gradient, shadow superflu.
7. **`IntelligenceEntityType`** (déjà défini dans `src/lib/intelligence/intelligence-registry.ts:26`) : union à 9 valeurs — `company | contact | opportunity | mission | project | collaborator | candidate | sector | calendar_event`. Réutilise cette même liste pour tout ce qui touche à `entity_type` dans ce lot — ne réinvente pas une autre énumération.
8. **Validation obligatoire après chaque lot** : `npx tsc --noEmit` → EXIT 0, `npm run build` → EXIT 0, 0 erreur ESLint sur les fichiers touchés, 0 HEX / 0 shadow / 0 gradient / 0 librairie de chart externe. Ne considère jamais un lot terminé sans ces 4 vérifications.

### Décisions déjà tranchées (ne pas rouvrir le débat)

- Pas de table `intelligence_collections` en V1 — reportée (0 document existant aujourd'hui, les `tags[]` suffisent).
- 5 `document_type` seulement (alignés sur les workflows n8n existants/prévus), pas 10.
- 4 statuts (`draft | ready | used | archived`) — pas de `approved` (aucun workflow d'approbation en V1).
- Pas de `link_role` sur `intelligence_document_links` en V1 — juste la relation entité.
- Pas de `document_subtype`.
- Recherche plein texte via colonne générée `tsvector`, pas d'indexation du JSON brut.
- Le CTA « Nouvelle rédaction » de la page `/reports` n'est PAS un nouveau formulaire — il ouvre le panneau Intelligence existant (`useIntelligencePanel().open()`).

---

## LOT 0 — Migration DB + types TypeScript

### Objectif

Créer les 3 tables de la couche documentaire (`intelligence_documents`, `intelligence_document_versions`, `intelligence_document_links`), leurs enums, RLS, triggers, index. Régénérer les types Supabase. Aucune UI, aucune Server Action dans ce lot — uniquement la fondation base de données.

### Fichier à créer

`supabase/migrations/<TIMESTAMP>_042_intelligence_documents.sql`

Génère le timestamp avec `date -u +%Y%m%d%H%M%S` pour qu'il soit postérieur à la dernière migration (`20260702130000_enable_realtime_ai_intelligence_results.sql`). Le préfixe `042_` suit la numérotation séquentielle visible dans `supabase/migrations/` (dernier numéro connu : `041_calendar_events_mission_id`).

### Contenu exact de la migration

```sql
-- ============================================================
-- 042_intelligence_documents
-- Couche documentaire au-dessus de ai_intelligence_runs/results
-- (qui restent immuables). Voir docs/reports-redaction-handoff-v1.md
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.intelligence_document_type AS ENUM (
  'communication', 'client_summary', 'commercial_pitch', 'campaign', 'internal_note'
);

CREATE TYPE public.intelligence_document_status AS ENUM (
  'draft', 'ready', 'used', 'archived'
);

CREATE TYPE public.intelligence_document_version_origin AS ENUM (
  'generated', 'regenerated', 'manual_edit', 'duplicated', 'imported'
);

CREATE TYPE public.intelligence_entity_type AS ENUM (
  'company', 'contact', 'opportunity', 'mission', 'project',
  'collaborator', 'candidate', 'sector', 'calendar_event'
);

-- ============================================================
-- 2. TABLE intelligence_documents
-- ============================================================

CREATE TABLE public.intelligence_documents (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id              uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Provenance (lecture seule, jamais modifiée après coup)
  source_result_id      uuid            REFERENCES public.ai_intelligence_results(id) ON DELETE SET NULL,

  -- Identité
  title                 text            NOT NULL,
  document_type         public.intelligence_document_type NOT NULL,
  status                public.intelligence_document_status NOT NULL DEFAULT 'draft',

  -- Contenu courant (dénormalisé depuis la dernière version pour lecture rapide)
  current_content_text  text,
  current_content_json  jsonb           NOT NULL DEFAULT '{}',

  -- Rattachement principal (dénormalisé depuis intelligence_document_links pour les
  -- filtres/tri rapides côté liste ; la relation normalisée complète vit dans
  -- intelligence_document_links)
  primary_entity_type   public.intelligence_entity_type,
  primary_entity_id     uuid,

  tags                  text[]          NOT NULL DEFAULT '{}',
  is_favorite           boolean         NOT NULL DEFAULT false,
  version_number        integer         NOT NULL DEFAULT 1,

  last_used_at          timestamptz,
  archived_at           timestamptz,

  search_vector         tsvector        GENERATED ALWAYS AS (
                          to_tsvector('french', coalesce(title, '') || ' ' || coalesce(current_content_text, ''))
                        ) STORED,

  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT intelligence_documents_version_positive CHECK (version_number >= 1)
);

-- ============================================================
-- 3. TABLE intelligence_document_versions
-- ============================================================

CREATE TABLE public.intelligence_document_versions (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id           uuid            NOT NULL REFERENCES public.intelligence_documents(id) ON DELETE CASCADE,

  version_number        integer         NOT NULL,
  origin                public.intelligence_document_version_origin NOT NULL,
  source_result_id      uuid            REFERENCES public.ai_intelligence_results(id) ON DELETE SET NULL,

  content_text          text,
  content_json          jsonb           NOT NULL DEFAULT '{}',
  brief_json            jsonb,
  source_refs           jsonb           NOT NULL DEFAULT '[]',
  qa_flags              jsonb           NOT NULL DEFAULT '[]',
  change_note           text,

  created_by            uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT intelligence_document_versions_uniq UNIQUE (document_id, version_number)
);

-- ============================================================
-- 4. TABLE intelligence_document_links
-- ============================================================

CREATE TABLE public.intelligence_document_links (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id           uuid            NOT NULL REFERENCES public.intelligence_documents(id) ON DELETE CASCADE,

  entity_type           public.intelligence_entity_type NOT NULL,
  entity_id             uuid            NOT NULL,

  created_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT intelligence_document_links_uniq UNIQUE (document_id, entity_type, entity_id)
);

-- ============================================================
-- 5. TRIGGERS updated_at + audit
-- ============================================================

CREATE TRIGGER trg_intelligence_documents_updated_at
  BEFORE UPDATE ON public.intelligence_documents
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_intelligence_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.intelligence_documents
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

-- Pas de log_audit sur _versions (append-only, jamais update/delete) ni sur
-- _links (table de jointure pure) — cohérent avec le motif existant
-- (missions/mission_activity_reports n'ont pas non plus de log_audit).

-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX idx_intelligence_documents_workspace_updated
  ON public.intelligence_documents(workspace_id, updated_at DESC);
CREATE INDEX idx_intelligence_documents_type
  ON public.intelligence_documents(workspace_id, document_type);
CREATE INDEX idx_intelligence_documents_status
  ON public.intelligence_documents(workspace_id, status);
CREATE INDEX idx_intelligence_documents_owner
  ON public.intelligence_documents(workspace_id, owner_id);
CREATE INDEX idx_intelligence_documents_entity
  ON public.intelligence_documents(primary_entity_type, primary_entity_id)
  WHERE primary_entity_type IS NOT NULL;
CREATE INDEX idx_intelligence_documents_tags_gin
  ON public.intelligence_documents USING gin(tags);
CREATE INDEX idx_intelligence_documents_search_gin
  ON public.intelligence_documents USING gin(search_vector);

CREATE INDEX idx_intelligence_document_versions_document
  ON public.intelligence_document_versions(document_id, version_number DESC);
CREATE INDEX idx_intelligence_document_versions_workspace
  ON public.intelligence_document_versions(workspace_id);

CREATE INDEX idx_intelligence_document_links_document
  ON public.intelligence_document_links(document_id);
CREATE INDEX idx_intelligence_document_links_entity
  ON public.intelligence_document_links(entity_type, entity_id);
CREATE INDEX idx_intelligence_document_links_workspace
  ON public.intelligence_document_links(workspace_id);

-- ============================================================
-- 7. RLS — motif uniforme workspace (4 policies par table)
-- ============================================================

ALTER TABLE public.intelligence_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_document_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_document_links     ENABLE ROW LEVEL SECURITY;

-- intelligence_documents
CREATE POLICY "intelligence_documents_select" ON public.intelligence_documents
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_documents_insert" ON public.intelligence_documents
  FOR INSERT WITH CHECK (true);
CREATE POLICY "intelligence_documents_update" ON public.intelligence_documents
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_documents_delete" ON public.intelligence_documents
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- intelligence_document_versions
CREATE POLICY "intelligence_document_versions_select" ON public.intelligence_document_versions
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_versions_insert" ON public.intelligence_document_versions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "intelligence_document_versions_update" ON public.intelligence_document_versions
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_versions_delete" ON public.intelligence_document_versions
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- intelligence_document_links
CREATE POLICY "intelligence_document_links_select" ON public.intelligence_document_links
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_links_insert" ON public.intelligence_document_links
  FOR INSERT WITH CHECK (true);
CREATE POLICY "intelligence_document_links_update" ON public.intelligence_document_links
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_links_delete" ON public.intelligence_document_links
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- ============================================================
-- 8. GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_documents         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_document_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_document_links    TO authenticated;

GRANT ALL ON public.intelligence_documents         TO service_role;
GRANT ALL ON public.intelligence_document_versions TO service_role;
GRANT ALL ON public.intelligence_document_links    TO service_role;

-- ============================================================
-- 9. COMMENTS
-- ============================================================

COMMENT ON TABLE public.intelligence_documents IS
  'Couche documentaire exploitable par l''utilisateur — distincte de ai_intelligence_results (immuable, technique). Un document peut naître d''une génération IA (source_result_id) ou être créé manuellement (source_result_id NULL).';
COMMENT ON TABLE public.intelligence_document_versions IS
  'Historique append-only des versions d''un document. Jamais d''UPDATE/DELETE en usage normal.';
COMMENT ON TABLE public.intelligence_document_links IS
  'Relation N:M polymorphe entre un document et les entités métier Kredo (compte, contact, opportunité...). primary_entity_type/id sur intelligence_documents est une dénormalisation de lecture rapide de la relation principale.';
COMMENT ON COLUMN public.intelligence_documents.current_content_text IS
  'Version texte brut du contenu courant — alimente search_vector. Doit être tenu synchrone avec current_content_json à chaque écriture.';
```

### Étapes d'exécution

1. Lire `CLAUDE.md` en entier (section stack + section "Nouvelle migration DB").
2. Lire `supabase/migrations/20260625003741_033_fixed_price_projects.sql` en entier pour confirmer le pattern exact (RLS, triggers, grants) avant d'écrire.
3. Créer le fichier de migration ci-dessus avec le bon timestamp.
4. Appliquer la migration en live (`mcp__supabase__apply_migration` ou CLI selon l'environnement disponible).
5. Vérifier via `mcp__supabase__list_tables` que les 3 tables existent avec les bonnes colonnes/contraintes.
6. Vérifier via `mcp__supabase__get_advisors` (type `security`) qu'aucune alerte RLS n'est levée sur les 3 nouvelles tables.
7. Régénérer les types : `npx supabase gen types typescript --project-id jvzgmhvwirsbdkjpmvla > src/types/database.generated.ts` (ou l'équivalent MCP `generate_typescript_types`). **Ne touche PAS `src/types/database.types.ts`** (façade canonique — elle réexporte `database.generated.ts`, ne la réécris pas à la main).
8. Mettre à jour la section "Migrations appliquées" et "Schéma public" de `CLAUDE.md` : ajouter la ligne `042 | 042_intelligence_documents (bibliothèque documentaire IA)` au tableau des migrations, et une sous-section "Domaine Intelligence commerciale" mentionnant les 3 nouvelles tables (colle-toi au format existant du fichier).

### Critères de validation (bloquants)

- `npx tsc --noEmit` → EXIT 0.
- `npm run build` → EXIT 0.
- Les 3 tables apparaissent dans `mcp__supabase__list_tables` avec RLS activé.
- `mcp__supabase__get_advisors` (security) : 0 alerte nouvelle sur ces 3 tables.
- `database.generated.ts` contient bien `intelligence_documents`, `intelligence_document_versions`, `intelligence_document_links` avec les types Row/Insert/Update.
- Aucune table existante modifiée (`ai_intelligence_runs`, `ai_intelligence_results`, `interactions` intacts).

### Ce que ce lot NE fait PAS (explicitement hors scope)

- Aucune Server Action, aucun composant React.
- Aucun backfill de données existantes (FOLIO pitches, résultats INTEL-020 historiques) — prévu en V2 (Lot 6).
- Aucune modification du callback n8n (`/api/n8n/callback/route.ts`) — c'est le Lot 4.
- Aucune activation de la route `/reports` dans `main-menu.config.ts` — c'est le Lot 2.

### Rapport attendu en fin de lot

Un message court confirmant : timestamp de migration utilisé, résultat des 4 critères de validation, et tout écart rencontré par rapport à ce document (ex. si `private.current_workspace_id()` n'existe pas et qu'il faut fallback sur `public.`, le signaler explicitement plutôt que de corriger silencieusement).

---

## LOT 1 — Server Actions + data layer

### Objectif

Couche de lecture/écriture Supabase pour `intelligence_documents` et tables liées (créées au Lot 0), consommable par les pages Desktop/Mobile des lots suivants. Pas de composant React dans ce lot.

### Fichiers à créer

| Fichier | Responsabilité |
|---|---|
| `src/app/(app)/reports/_data/reports-types.ts` | Types front (contrat ci-dessous) |
| `src/app/(app)/reports/_data/get-reports-list.ts` | Liste paginée + filtres + KPIs |
| `src/app/(app)/reports/_data/get-document-detail.ts` | Un document complet (versions + links enrichis) |
| `src/app/(app)/reports/_data/reports-actions.ts` | Server Actions d'écriture |

### Contrat de types (à respecter exactement — consommé par les Lots 2/3/5)

```ts
type DocumentListItem = {
  id: string
  title: string
  documentType: Database["public"]["Enums"]["intelligence_document_type"]
  status: Database["public"]["Enums"]["intelligence_document_status"]
  versionNumber: number
  isFavorite: boolean
  tags: string[]
  primaryEntity: { type: string; id: string; label: string } | null  // label résolu via jointure
  qualityOk: boolean | null  // dérivé des qa_flags de la dernière version : null si aucun flag, true si tous passed
  ownerName: string
  updatedAt: string
}

type DocumentVersion = {
  id: string
  versionNumber: number
  origin: Database["public"]["Enums"]["intelligence_document_version_origin"]
  contentText: string | null
  contentJson: unknown
  briefJson: unknown | null
  sourceRefs: unknown[]
  qaFlags: unknown[]
  changeNote: string | null
  createdByName: string | null
  createdAt: string
}

type DocumentLink = { entityType: string; entityId: string; label: string }

type DocumentDetail = DocumentListItem & {
  currentContentText: string | null
  currentContentJson: unknown
  links: DocumentLink[]
  versions: DocumentVersion[]  // triées version_number DESC
}

type ReportsFilterState = {
  search?: string
  documentType?: string
  status?: string
  entityType?: string
  entityId?: string
  ownerId?: string
  favoritesOnly?: boolean
  periodFrom?: string
  periodTo?: string
}

type ReportsKpis = { total: number; drafts: number; ready: number; usedThisMonth: number }
```

### Règles métier non-évidentes

1. **`saveAsDocument()` est une écriture atomique sur 3 tables** : `intelligence_documents` (status='draft') + 1ère ligne `intelligence_document_versions` (origin selon contexte d'appel) + N lignes `intelligence_document_links`. Si une des 3 échoue, aucune ne doit rester (pas de document orphelin sans version). Regarder si une transaction Postgres via RPC est justifiée — précédent dans le repo : `financial_modeling_transaction_api` (migration `20260630107000`). Si le volume/la criticité ne le justifie pas, écriture séquentielle avec rollback manuel explicite en cas d'échec intermédiaire (supprimer ce qui a été créé).
2. **`updateDocument()` incrémente toujours `version_number`** et insère une nouvelle ligne `_versions` (origin='manual_edit') — jamais d'UPDATE sur une version existante (append-only, contrainte déjà en base).
3. **Recherche plein texte** : `search_vector @@ websearch_to_tsquery('french', :query)` sur `intelligence_documents`, pas de LIKE/ILIKE sur `current_content_text` (l'index GIN existe pour ça).
4. **`qualityOk`** se calcule à partir des `qa_flags` de la **dernière version**, pas du document — un document peut avoir été corrigé après un premier résultat en échec QA.
5. **RLS fait le filtrage workspace** — ne jamais ajouter `.eq("workspace_id", ...)` manuellement dans les queries (incohérent avec le reste du repo, cf. `intelligence-data.ts`).

### Fichiers de référence à imiter

- Pattern Server Action + revalidation : `src/components/accounts-contacts/intelligence/save-communication-interaction.ts`
- Pattern data loader multi-requêtes parallèles : `src/app/(app)/missions/_data/get-mission-detail.ts` (`Promise.all`, ViewModel strict)
- Pattern filtres + pagination sur liste : chercher l'équivalent dans `src/app/(app)/recruitment/_data/` ou `src/app/(app)/missions/_data/get-opportunities-list.ts`

### Non-objectifs de ce lot

- Aucun composant React.
- Aucune modification du callback n8n (Lot 4).
- Pas de RPC PL/pgSQL sauf si l'agent juge, après avoir regardé `financial_modeling_transaction_api`, que c'est réellement nécessaire pour l'atomicité — sinon écriture séquentielle suffit en V1.

### Validation

Mêmes 4 critères que le Lot 0 (`tsc`, `build`, lint, design system) + vérifier manuellement qu'un appel à `saveAsDocument()` depuis un script/test ponctuel crée bien les 3 lignes attendues et qu'un échec simulé ne laisse pas de document orphelin.

---

## LOT 2 — Page /reports Desktop

### Objectif

Page desktop fonctionnelle et navigable : liste des documents avec KPIs/filtres/recherche, rail de prévisualisation, route activée dans le menu. **Pas d'édition de contenu dans ce lot** (c'est le Lot 5) — le rail est en lecture seule + actions ponctuelles (favori, dupliquer, archiver, copier).

### État réel du Lot 1 (corrige l'aperçu précédent)

Le Lot 1 livré expose exactement : `getReportsList()`, `getDocumentDetail()`, `saveAsDocument()`, `updateDocument()`, `setDocumentFavorite(documentId, isFavorite)`, `setDocumentStatus(documentId, status)`. **Il n'y a pas de `duplicateDocument()` ni `archiveDocument()` dédiée** — `archiveDocument` = `setDocumentStatus(id, "archived")`, déjà disponible. `duplicateDocument()` n'existe pas encore : ce lot doit l'ajouter dans `reports-actions.ts` (voir ci-dessous), en réutilisant le pattern déjà en place (`saveAsDocumentWithClient` + insertion `origin: "duplicated"`).

### Fichiers à créer

| Fichier | Responsabilité |
|---|---|
| `src/app/(app)/reports/page.tsx` | Server Component. Détection device (pattern `index.tsx` standard Kredo — regarder `src/app/(app)/finance/page.tsx` ou équivalent pour le user-agent sniffing exact). Appelle `getReportsList({ filters, page })` à partir de `searchParams`. Si `searchParams.doc` présent, appelle aussi `getDocumentDetail(doc)` en parallèle (`Promise.all`). Distribue `ReportsDesktopView` ou `ReportsMobileView` (mobile = Lot 3, stub minimal acceptable ce lot-ci si pas encore fait). |
| `src/components/reports/ReportsDesktopView.tsx` | Layout desktop (détail ci-dessous). |
| `src/components/reports/DocumentPreviewPanel.tsx` | Rail droit lecture seule (détail ci-dessous). |

### Fichier à étendre

`src/app/(app)/reports/_data/reports-actions.ts` — ajouter :

```ts
export type DuplicateDocumentInput = { documentId: string }
export async function duplicateDocument(input: DuplicateDocumentInput): Promise<DocumentMutationResult>
```

Règle : charge le document + sa dernière version, appelle `saveAsDocumentWithClient()` avec `origin: "duplicated"`, `title: "Copie de " + original.title`, `sourceResultId: null` (une copie n'est pas elle-même une génération IA), copie `tags`/`current_content_*`/`links`. Le nouveau document est toujours `status: "draft"` quel que soit le statut de l'original.

### Contrat de layout (ce qui doit être respecté, pas le JSX exact)

`ReportsDesktopView` :
- Racine : `EntityWorkspacePage` (PAS `EntityWorkspaceTemplate` — cette page est list-only, pas de vue kanban/planning à sélectionner).
- `EntityWorkspaceHeader` : `title="Rapports & Rédaction"`, `kpis` = 4 `KpiCard` (`size="compact"`) mappés 1:1 sur `ReportsKpis` (`total`→"Documents", `drafts`→"Brouillons", `ready`→"Prêts", `usedThisMonth`→"Utilisés ce mois"), `actions` = bouton "Nouvelle rédaction".
- Sous le header : `PageFilterBar` avec `children` = contrôles de filtre (recherche texte, select `document_type`, select `status`, toggle favoris, select entité si pertinent — voir `ReportsFilterState`), `activeCount`/`onReset` calculés côté client.
- Corps : grille 2 colonnes desktop — `DataTable<DocumentListItem>` à gauche (`ariaLabel="Liste des documents"`, `getRowId={(r) => r.id}`, `onRowClick` met à jour l'URL `?doc=<id>` via `router.push`/`replace`, `selectedRowId` = doc courant), `DocumentPreviewPanel` à droite quand un `doc` est sélectionné (sinon état vide "Sélectionnez un document").
- Colonnes `DataTable` attendues : Titre (`title`), Type (`documentType`, libellé FR via mapping local), Lié à (`primaryEntity?.label ?? "—"`), Statut (`StatusPill` — mapping `status`→`variant` : `draft`→`"draft"`, `ready`→`"inProgress"`, `used`→`"success"`, `archived`→`"neutral"`), Version (`versionNumber`), Qualité (`qualityOk`→ `StatusPill` `"success"`/`"warning"`/rien si `null`), Modifié le (`updatedAt`, formaté `JJ/MM/AAAA`).

`DocumentPreviewPanel` (props : `document: DocumentDetail`) :
- `SurfaceCard` avec sections : titre + badges (type/statut/version), contenu (`currentContentText` en `whitespace-pre-wrap`), sources (`versions[0].sourceRefs`), QA (`versions[0].qaFlags`, réutiliser le pattern d'affichage de `CommunicationResult.tsx` — flags passed/failed), entités liées (`links`, chaque item cliquable si une route existe pour ce type, sinon texte simple), historique versions (liste condensée `versionNumber · origin · date`, pas besoin du composant `DocumentVersionHistory` complet ici — ce sera enrichi au Lot 5).
- Actions en pied de panneau : "Copier" (clipboard du `currentContentText`), "Dupliquer" (`duplicateDocument`), toggle favori (`setDocumentFavorite`), "Archiver" (`setDocumentStatus(id, "archived")`, visible seulement si `status !== "archived"`).
- **Ne pas inclure** "Reprendre et modifier", "Régénérer", "Journaliser comme interaction" dans ce lot — ces actions dépendent de composants pas encore livrés (Lots 4/5). Un panneau avec des boutons qui ne font rien est pire qu'un panneau qui ne les propose pas encore.

### Modification

`src/lib/navigation/main-menu.config.ts` : dans l'entrée `{ label: "Rapports & Rédaction", href: "/reports", ... }` (section Intelligence), retirer `comingSoon: true` et `disabled: true`.

### CTA "Nouvelle rédaction"

`onClick={() => useIntelligencePanel.getState().open()}` (store Zustand, `src/hooks/use-intelligence-panel.ts` — pas de Context React, c'est un store global). Le panneau `IntelligencePanel` s'ouvre déjà tout seul via ce store (branché dans `AppShell`), ce composant n'a rien d'autre à faire. **Ne pas dupliquer `CommunicationBriefForm` ni recréer un formulaire de génération.**

### Fichiers de référence à imiter

- Layout Desktop dense avec KPIs + filtres + table + rail latéral : chercher un module existant proche (ex. `FinanceDesktopDashboard.tsx` pour KPIs/SurfaceCard, `OpportunitiesDesktopView.tsx` pour `DataTable` + filtres avancés).
- Affichage QA flags : `src/components/accounts-contacts/intelligence/CommunicationResult.tsx` (section badges passed/failed).
- Device detection Server Component : n'importe quel `page.tsx` existant sous `src/app/(app)/` avec `index.tsx`/`DesktopView`/`MobileView`.

### Non-objectifs de ce lot

- Édition de contenu (Lot 5).
- Bouton Régénérer (Lot 6).
- Vue mobile complète (Lot 3 — un stub qui affiche juste "Version mobile à venir" est acceptable si le Lot 3 n'est pas encore fait, mais `page.tsx` doit quand même faire la détection device correctement).

### Validation

4 critères standard + vérifier manuellement dans le navigateur : la route `/reports` est accessible depuis le menu, la sélection d'un document met à jour l'URL et survit à un refresh (`?doc=<id>` relu au chargement), et `duplicateDocument` crée bien un nouveau document `draft` distinct.

---

## LOT 3 — Page /reports Mobile

### Objectif

Vue mobile complète de `/reports` : liste de cartes avec filtres rapides, prévisualisation dans un `AppDrawer side="bottom"`, actions CTA accessibles au pouce. Mêmes données que le desktop, interaction optimisée mobile (touch targets ≥ 44px, pas de tableau dense).

### État de départ après Lot 2

- `page.tsx` existe et distribue déjà `ReportsMobileView` en cas de device mobile.
- `ReportsMobileView.tsx` existe mais est un **stub** : il affiche juste "Version mobile à venir" et ne reçoit que `error?`.
- `page.tsx` charge déjà `reportsData` et `filters` mais **ne les passe pas** à `ReportsMobileView` — c'est la première correction de ce lot.

### Fichiers à modifier

**`src/app/(app)/reports/page.tsx`** — étendre l'appel `<ReportsMobileView />` avec les props manquantes :

```tsx
// avant (stub)
return <ReportsMobileView error={listError} />

// après
return (
  <ReportsMobileView
    reportsData={reportsData}
    filters={filters}
    listError={listError}
  />
)
```

**`src/components/reports/ReportsMobileView.tsx`** — remplacer le stub par l'implémentation complète (voir contrat ci-dessous).

### Fichiers à créer

| Fichier | Responsabilité |
|---|---|
| `src/components/reports/DocumentCard.tsx` | Carte mobile d'un document (liste) |
| `src/components/reports/DocumentMobileDetail.tsx` | Contenu du drawer de consultation mobile |

### Contrat `ReportsMobileView`

Props :
```ts
type ReportsMobileViewProps = {
  reportsData: ReportsListData
  filters: ReportsFilterState
  listError?: string | null
}
```

Structure :
- Racine : `MobileActionPage` (from `@/components/templates/MobileActionPage`)
- `header` : `MobilePageHeader` avec `eyebrow="Intelligence"`, `title="Rapports & Rédaction"`, `actions=<Button onClick={() => useIntelligencePanel.getState().open()}>Nouvelle rédaction</Button>` (même pattern que les autres pages mobile)
- Juste sous le header (dans `children`) : un champ de recherche mobile (Input full-width, icône loupe, `onChange` → `router.replace` avec `?search=...` — debounce non requis, onChange est suffisant pour V1)
- Filtres rapides : 3 boutons pills horizontaux scrollables (`overflow-x-auto`, `whitespace-nowrap`) :
  - "Récents" → pas de filtre status actif (clear `status` et `favoritesOnly` dans l'URL)
  - "Brouillons" → `?status=draft`
  - "Favoris" → `?favoritesOnly=true`
  - Variant `"primary"` quand actif, `"secondary"` sinon. Actif si : "Récents" quand aucun des deux autres n'est actif, "Brouillons" si `filters.status === "draft"`, "Favoris" si `filters.favoritesOnly`.
- Corps : liste de `DocumentCard` (`flex flex-col gap-3`), state vide si `reportsData.items.length === 0`
- `ErrorState` si `listError`
- État local `selectedDocumentId: string | null` (pas dans l'URL sur mobile — trop de friction) → ouvre `DocumentMobileDetail` dans un `AppDrawer side="bottom"`

Pas de pagination mobile en V1 : afficher les 24 premiers (pageSize par défaut de `getReportsList`). Un "Voir plus" ou infinite scroll est hors périmètre.

### Contrat `DocumentCard`

Props :
```ts
type DocumentCardProps = {
  document: DocumentListItem
  onClick: () => void
}
```

Structure (touch target : la carte entière est cliquable via `onClick`, min-height `≥ 56px`) :
- `div` avec `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), `onClick`
- Pattern CSS identique aux cartes missions : `rounded-[var(--radius-medium)] border border-border/50 bg-surface p-4 transition-all active:scale-[0.99]`
- Ligne 1 : titre (`font-semibold text-heading text-sm`) à gauche, favori star si `isFavorite` (`text-primary`) à droite
- Ligne 2 : `StatusPill` (même mapping `draft/ready/used/archived → variant` que le desktop), puis type document en petit texte gris FR label
- Ligne 3 : entité liée (`primaryEntity?.label` ou `—`) en `text-xs text-muted` + date (`updatedAt`, format `JJ/MM/AAAA`) poussée à droite

NB : pas besoin de bouton "CTA principal Reprendre" sur la carte — le tap de la carte entière ouvre le drawer de consultation. En V1, l'édition (Lot 5) sera accessible depuis le drawer.

### Contrat `DocumentMobileDetail`

Props :
```ts
type DocumentMobileDetailProps = {
  documentId: string
  open: boolean
  onClose: () => void
}
```

Ce composant charge lui-même son détail : `useEffect([documentId, open])` → appelle `getDocumentDetail(documentId)` via `fetch`/Server Action ou directement. **Attention** : `getDocumentDetail` est une fonction server-side (`createClient()` depuis `@/lib/supabase/server`), pas directement appellable côté client. Deux options acceptables — choisir l'une :
1. **Créer une Server Action wrapper** `fetchDocumentDetail(id: string): Promise<DocumentDetailResult>` dans `reports-actions.ts` (juste `"use server"` + appel direct à `getDocumentDetail`), appelee depuis `useEffect`.
2. **Passer le `DocumentDetail` en prop** depuis `ReportsMobileView` (les données sont déjà dans `reportsData.items` pour les champs de base, mais `DocumentDetail` a en plus `currentContentText`, `links`, `versions` — donc cette option nécessite un second chargement côté client ou de pré-charger via une autre route). Option 1 est plus simple.

Structure du drawer :
- `AppDrawer side="bottom"` (from `@/components/ui/AppDrawer`) avec `open`, `onOpenChange={(v) => { if (!v) onClose() }}`, `title={document?.title}` (une fois chargé), `loading` pendant le fetch, `error` si erreur
- Corps = sections simplifiées (même contenu que `DocumentPreviewPanel`, mais sans la grille 2-col) :
  - Statut + type (badges `StatusPill`)
  - Contenu texte (scroll interne, `max-h-[40vh] overflow-y-auto`, `whitespace-pre-wrap`)
  - QA flags : juste le badge global "Qualité OK" / "À vérifier" (sans détail de chaque flag — espace limité)
  - Entités liées (liste simple)
  - Versions condensées (même format que `DocumentPreviewPanel`)
- Footer du drawer (`footer` prop) : 2 actions principales — "Copier" + toggle favori. "Archiver" en secondaire (si `status !== "archived"`). Même logique que `DocumentPreviewPanel` (`setDocumentFavorite`, `setDocumentStatus`, `navigator.clipboard`). Pas de "Dupliquer" sur mobile V1 (action moins courante, à ajouter si besoin au Lot 5).

### Fichiers de référence à imiter

| Pattern | Référence |
|---|---|
| Liste de cartes mobiles | `src/components/missions/MissionsMobileListView.tsx` |
| Carte mobile avec statut | `src/components/ui/mobile/MobileActionCard.tsx` |
| AppDrawer side="bottom" | `src/components/agenda/AgendaMobileEventDrawer.tsx` |
| Page mobile avec filtres pills | `src/components/recruitment/RecruitmentWorkspace.tsx` (filtres par viewMode) |
| CTA sur MobilePageHeader | `src/components/reports/ReportsMobileView.tsx` (stub existant — le pattern `MobilePageHeader + actions` est déjà là) |

### Non-objectifs de ce lot

- Pagination / infinite scroll (les 24 premiers suffisent)
- Édition de contenu mobile (Lot 5)
- Bouton "Dupliquer" dans le drawer (Lot 5)
- Filtres avancés (auteur, période, type d'entité) — les 3 pills suffisent pour V1

### Validation

4 critères standard + tester manuellement avec cookie `kredo_force_device=mobile` : les 3 pills filtrent correctement la liste, le tap d'une carte ouvre le drawer, les actions Copier/Favori fonctionnent dans le drawer.

---

## LOT 4 — Rewiring du flux de sauvegarde INTEL-020 (aperçu)

**Objectif :** Séparer "Enregistrer dans la bibliothèque" (crée un document) et "Journaliser comme interaction" (action commerciale explicite).

**Fichiers à modifier :**
- `src/components/accounts-contacts/intelligence/CommunicationResult.tsx` — bouton "Enregistrer" actuel → renommer, brancher sur nouvelle action `saveResultAsDocument()`. Ajouter bouton séparé "Journaliser comme interaction" (garde `saveCommunicationInteraction()` existant).
- `src/app/api/n8n/callback/route.ts` — auto-créer un `intelligence_documents` (draft) à chaque `ai_intelligence_results` succeeded éligible (types `communication`, `client_summary`, `commercial_pitch`, `campaign`).

**Fichier à créer :** `src/components/accounts-contacts/intelligence/save-as-document.ts` (Server Action).

---

## LOT 5 — Éditeur structuré + versioning (aperçu)

**Fichiers à créer :**
- `src/components/reports/DocumentEditor.tsx` — formulaire structuré (titre/objet/corps + champs conditionnels par `document_type`), pas de WYSIWYG. Sauvegarde → nouvelle version `origin='manual_edit'`.
- `src/components/reports/DocumentVersionHistory.tsx` — timeline verticale, preview read-only par version.

---

## LOT 6 — V2 différé (ne pas implémenter maintenant)

- `intelligence_collections`
- Bouton "Régénérer" (relance n8n avec le `brief_json` d'origine)
- Backfill des FOLIO pitches historiques (`companies.metadata.pitches`)
- Recherche avancée / filtrage croisé par entité dans le panneau

---

## Note pour la suite

Les Lots 1 à 5 ci-dessus sont des aperçus structurés mais moins détaillés que le Lot 0. **Ne pas les exécuter tels quels sans repasser par une session de raffinement** une fois le Lot 0 validé — le format de directive complet (comme le Lot 0) sera rédigé à ce moment-là, informé par tout écart rencontré pendant l'exécution du Lot 0 (ex. si la génération de types échoue, si `private.current_workspace_id()` n'existe pas tel qu'attendu, etc.).
