# Handoff L2 — importeur E4 + RPC transactionnelles (pour Gemini)

> ✅ **Exécuté le 2026-08-20, livré et vérifié indépendamment.** Deux défauts bloquants trouvés à
> la vérification et corrigés avant tout `--live` : la RPC de §5 était spécifiée en schéma
> `private` (erreur de ce prompt, pas de l'exécutant — PostgREST n'expose jamais `private.*`,
> `CLAUDE.md` le documente) et `workspace_id` n'était résolvable ni sous service-role ni sur les
> 4 tables d'items sans défaut. Compte-rendu complet :
> `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §3. Ce fichier reste comme référence du
> prompt, utile pour calibrer L3.

**Tâche** : écrire l'importeur qui transforme un run Master Study validé (`04-secteur.json` du
run pilote) en connaissance canonique, atomiquement, via une RPC transactionnelle unique. Amender
le contrat E4 sur deux points bloquants trouvés en confrontant le schéma aux tables réelles.
Mettre `ingest-competitive-map.ts` au même régime d'atomicité.

**Ce lot ne fait PAS d'ingestion réelle en base.** Il produit un `--dry-run` validé sur le
pilote, testé unitairement. L'ingestion réelle est **L3**, un lot séparé.

**Avant de commencer, lire dans l'ordre** :
1. `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` §5 (provenance
   atomique), §7 (l'importeur), §9.1/§9.2 (amendements déjà tranchés).
2. `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §2 et §3 — ce que L1 a livré (les 8
   colonnes de provenance existent déjà en base, ne pas les recréer) et le périmètre de L2.
3. `docs/MASTER-STUDY/01-CARTE-DE-LA-CONNAISSANCE.md` — la nomenclature des blocs S/C/A, table
   par table.
4. `docs/MASTER-STUDY/09-ETAPE-E6-CHAINE-DE-VALEUR.md` §4.1 — le modèle `value_chain_nodes` que
   ce lot amende.
5. Ce fichier, en entier, avant d'écrire une ligne.

**Ce travail sera revérifié indépendamment après coup**, comme L1 : migration relue, RPC
rejouée en `--dry-run` contre le pilote réel, mapping relu champ par champ. Un rapport qui décrit
ce qui *devrait* marcher n'est pas une livraison — le `--dry-run` doit tourner et son résumé doit
être reproductible par quelqu'un d'autre qui relance la même commande.

---

## 0. Quatre défauts trouvés en préparant ce lot — à corriger, pas à contourner

Ces quatre points ont été vérifiés contre le schéma live et contre le run pilote réel
(`docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/`). Sans les corriger, l'import
du pilote échoue à la première ligne — ce ne sont pas des détails.

### 0.1 `value_chain_nodes.maillon` plafonne à 5, le pilote en a 6

`09-ETAPE-E6-CHAINE-DE-VALEUR.md` §4.1 documente littéralement
`value_chain_nodes    maillons (couche='chaine', maillon 1..5, rang 1..3)`, et la contrainte DB
`value_chain_nodes_maillon_check` l'impose (`CHECK (maillon BETWEEN 1 AND 5)`) — calée sur les 5
maillons du BTP, le seul secteur cartographié à ce jour. Le run pilote Parfumerie a **6 maillons**
(`04-secteur.json > maillons[].rang` va de 1 à 6 : sourcing, transformation, création/formulation,
réglementaire, industrialisation, service client aval). La contrainte doit être élargie — voir §1.

### 0.2 `value_chain_nodes` exige `capture_valeur` pour tout `couche='chaine'`, E4 ne le produit pas

`vcn_capture_si_chaine : CHECK ((couche <> 'chaine') OR (capture_valeur IS NOT NULL))`. Or E4 ne
produit aucun score de captation de valeur (1-3) — c'est explicitement le travail de **E6**, fait
par Claude Opus + arbitrage humain (`09-ETAPE-E6…` §2, ligne « Opérateur »). Les nœuds que E4
écrit sont une **amorce sans captation connue**, que E6 complète ensuite par `UPDATE`. La
contrainte doit être relâchée pour admettre `capture_valeur IS NULL` même sur `couche='chaine'` —
voir §1. `vcn_capture_justifiee` (capture_valeur et justification vont ensemble) reste, elle, la
bonne contrainte à garder : ne pas y toucher.

### 0.3 `sector_pain_points.kredo_practice` et `sector_regulatory_items.kredo_practice` refusent le vocabulaire qu'E4 écrit

**Piège vérifié, pas hypothétique.** Les deux `CHECK` acceptent
`data_ai | cloud_eng | product | cyber | multi` (vocabulaire **legacy**, underscore). Le contrat
E4 (`docs/MASTER-STUDY/schemas/sector-knowledge.schema.json`, champs `kredo_practice` et
`practice_kredo`) exige désormais un **« slug issu de `offer_practices` »** — vocabulaire base,
tiret : le pilote écrit littéralement `"kredo_practice": "data-ai"`. Écrire cette valeur telle
quelle viole le `CHECK` à la première ligne insérée.

**La traduction existe déjà** : `src/lib/config/practices.ts`,
`mapOfferPracticeToKredoPractice(slug)` → `"data-ai"` devient `"data_ai"`. **Tout champ
`kredo_practice`/`practice_kredo` lu depuis un JSON E4 doit passer par cette fonction avant
d'atteindre une colonne `kredo_practice` en base.** Ne jamais écrire la valeur E4 telle quelle.

### 0.4 `dependances_critiques[]` n'a de colonne nulle part — tranché : `playbook.dependances_critiques`

`dependances_critiques[]` (criticité, risque, prestation ouverte, practice) ne correspond à
aucune colonne de `value_chain_nodes` (qui ne modélise que des acteurs positionnés, pas des
risques narratifs). **Décision de Guillaume** : nouvelle clé `playbook.dependances_critiques`,
même régime que les autres clés `★` de `01-CARTE` §7.2 (`economic_models`, `tech_fronts`,
`risks`, `market_thesis`) — aucune table nouvelle, résolue par le même mécanisme clé-par-clé que
le reste du playbook. Voir §4.4.

---

## 1. Migration — élargir deux contraintes, zéro nouvelle colonne

L1 a déjà posé `source_run_id` / `study_snapshot_date` / `resolution_locks` sur les 6 tables
cibles — **ne pas les recréer**. Cette migration ne touche que les deux contraintes de §0.1/§0.2.

Vérifier d'abord le dernier timestamp enregistré (même piège qu'en L1, `CLAUDE.md` : « aligner le
nom du fichier local sur le timestamp réellement enregistré ») :

```sql
select version from supabase_migrations.schema_migrations order by version desc limit 3;
```

`supabase/migrations/<TIMESTAMP_VÉRIFIÉ>_master_study_value_chain_amorce.sql` :

```sql
-- Master Study L2 — la contrainte value_chain_nodes calée sur les 5 maillons du BTP
-- ne tient plus dès qu'un deuxième secteur est cartographié (ADR-0021 §9.1, amorce E4).

alter table public.value_chain_nodes
  drop constraint value_chain_nodes_maillon_check;
alter table public.value_chain_nodes
  add constraint value_chain_nodes_maillon_check check (maillon >= 1);

-- E4 amorce un maillon sans connaître sa captation de valeur (c'est le travail de E6,
-- arbitrage humain). Un nœud 'chaine' peut donc exister avec capture_valeur NULL —
-- vcn_capture_justifiee (capture_valeur et sa justification vont ensemble) reste seule
-- garante de la cohérence quand la captation EST renseignée.
alter table public.value_chain_nodes
  drop constraint vcn_capture_si_chaine;

comment on constraint value_chain_nodes_maillon_check on public.value_chain_nodes is
  'Plancher à 1, pas de plafond : le plafond à 5 (BTP) ne generalise pas — Parfumerie en a 6.';
```

**Ne pas** ajouter de nouvelle colonne à `value_chain_nodes` pour `dependances_critiques` (§0.4
tranché autrement) ni pour quoi que ce soit d'autre. Cette migration ne fait que relâcher deux
`CHECK`.

**Vérifier après application** : les 7 lignes BTP existantes (`couche='chaine'`) ne sont pas
affectées (elles portent déjà `capture_valeur`, la contrainte relâchée ne les invalide pas) —
`select count(*) from value_chain_nodes where couche='chaine' and capture_valeur is null` doit
valoir 0 avant toute écriture E4, et seulement après.

---

## 2. Amendements au corpus MASTER-STUDY

Trois fichiers, dans le même commit que la migration.

### 2.1 `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json`

**Retirer** la propriété `budgets_18_36_mois` (bloc `$defs`/`properties`, ~l. 225-237) — décision
déjà actée dans l'ADR §9.2, jamais appliquée. Vérifier qu'elle n'est listée nulle part dans
`required` (elle ne l'est pas).

**Ajouter** deux champs optionnels à `marche` (ADR §13.2, jamais appliqué non plus) :

```json
"marche": {
  "type": "object",
  "required": ["perimetre", "src_ids"],
  "properties": {
    "taille_eur_bn": { "type": ["number", "null"] },
    "taille_statut": { "enum": ["published", "not_published", "not_applicable"], "default": "published" },
    "croissance_pct": { "type": ["number", "null"] },
    "croissance_statut": { "enum": ["published", "not_published", "not_applicable"], "default": "published" },
    "perimetre": { "type": "string" },
    "exercice": { "type": ["integer", "null"] },
    "src_ids": { "$ref": "#/$defs/srcIds" }
  }
}
```

Sans ce champ, l'importeur n'a **aucun signal structuré** pour distinguer « le segment n'a jamais
été étudié » (héritage macro autorisé) de « le segment a été étudié, la valeur n'est pas
publiable » (`resolution_locks`, ADR §6). Ne pas inférer `not_published` depuis
`taille_eur_bn === null` seul — c'est exactement la confusion que L1 a corrigée côté base ;
la réintroduire côté import ferait revenir le même défaut par un autre chemin.

### 2.2 `docs/MASTER-STUDY/prompts/E4-etude-sectorielle.md`

Retirer la consigne de production de `budgets_18_36_mois` (chercher « BUDGET » /
« TRAJECTOIRES ET BUDGETS À 18-36 MOIS », ~l. 150). Ajouter la consigne de renseigner
`taille_statut`/`croissance_statut` quand `taille_eur_bn`/`croissance_pct` valent `null`, dans le
même esprit que la consigne existante pour `incertitudes`.

### 2.3 `docs/MASTER-STUDY/09-ETAPE-E6-CHAINE-DE-VALEUR.md` §4.1

Remplacer `value_chain_nodes    maillons (couche='chaine', maillon 1..5, rang 1..3)` par
`value_chain_nodes    maillons (couche='chaine', maillon >= 1, rang 1..3)`. Ajouter une ligne
précisant que **E4 amorce** un nœud par maillon (`rang=1`, `capture_valeur` NULL) à l'ingestion, et
que **E6 approfondit** — positionne les acteurs, les liens, et complète `capture_valeur` /
`capture_justification` par arbitrage humain. Le point 1 du §4.2 (« Poser les maillons depuis E4
§2.3 ») devient : « Les maillons existent déjà, amorcés par l'import E4 ; ce lot les complète, il
ne les recrée pas ».

### 2.4 Le run pilote lui-même — une correction de contenu, pas de contrat

`docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/04-secteur.json` a été produit
avant ce schéma amendé. Son `incertitudes[0]` dit déjà, en prose : *« le TAM reste donc non
publié »*. **Ajouter** au bloc `marche` existant :

```json
"taille_statut": "not_published",
"croissance_statut": "not_published"
```

Ce n'est pas une invention : c'est la transcription structurée d'un fait que l'étude a déjà
établi en texte. Sans cette édition, le `--dry-run` du §6 ne pourra pas exercer le chemin
`resolution_locks` contre une donnée réelle — il faudrait un JSON de test synthétique, moins
probant.

---

## 3. Contrats TypeScript — `src/features/master-study/`

Nouveau domaine, patron `src/features/hiring-intensity/` (le précédent le plus proche : un
domaine autonome, testé, sans UI, qui alimente un script CLI).

```
src/features/master-study/
  domain/
    e4-contracts.ts           # types TS dérivés du schéma JSON (à la main, pas de générateur)
    map-e4-to-canon.ts        # E4 JSON validé → payload RPC (fonction pure, testable)
    map-e4-to-canon.test.ts
  data/
    ingest-master-study.ts    # server-only, appelle la RPC
  __tests__/
    fixtures/                 # copie ou lecture directe du run pilote pour les tests de mapping
```

`e4-contracts.ts` reprend la forme de `sector-knowledge.schema.json` — ne pas générer
automatiquement, écrire à la main comme le reste des contrats du projet
(`src/lib/intelligence/*-contracts.ts` est le patron de style : commentaires expliquant le
*pourquoi*, pas de sur-validation).

---

## 4. Le mapping E4 → canon, exhaustif

Chaque ligne est une décision déjà prise — ne pas en réinterpréter le sens en implémentant.

| Bloc E4 (`04-secteur.json`) | Destination | Règle |
|---|---|---|
| `perimetre.definition` | `sector_intelligence.description` | Verbatim. **Ne pas** composer avec `message_sectoriel` (registre S1 ≠ S13, `01-CARTE`) |
| `perimetre.hors_champ`, `perimetre.regle_comparabilite` | `sector_intelligence.caveats.hors_champ` / `.regle_comparabilite` | Nouvelles clés dans le blob `caveats` existant (déjà utilisé pour `corpus`/`marche`/`sources`/`verbatims`/`frequences` au niveau macro) |
| `incertitudes[]` | `sector_intelligence.caveats.incertitudes` | Verbatim, nouvelle clé |
| `trous[]` | `sector_intelligence.caveats.trous` | Verbatim, nouvelle clé |
| `theses[]` | `sector_intelligence.playbook.market_thesis` | Verbatim — le schéma définit `playbook.market_thesis` avec exactement la même forme (`id`/`these`/`src_ids`/`donc_commercialement`) : c'est une copie assumée, pas une nouvelle transformation |
| `message_sectoriel` | **Aucune colonne canon** | Reste dans `intelligence_documents.current_content_json` (le document archivé porte le JSON complet). Pas de duplication — une lecture future (L4/L5) le lit depuis le document, pas depuis `sector_intelligence` |
| `marche.taille_eur_bn` | `sector_intelligence.market_size_eur_bn` | `NULL` si `taille_statut ∈ {not_published, not_applicable}` **ou** si la valeur JSON est `null` |
| `marche.croissance_pct` | `sector_intelligence.market_growth_pct` | Idem avec `croissance_statut` |
| `marche.taille_statut` / `croissance_statut` | `sector_intelligence.resolution_locks` | `taille_statut ≠ 'published'` → clé `market_size_eur_bn` posée (valeur = le statut) ; idem `croissance_statut` → `market_growth_pct`. Absent du JSON (runs pré-§2.1) → traité comme `'published'`, **jamais** comme `not_published` : un champ absent du contrat n'est pas une déclaration d'inconnu |
| `blocs_clients[]` + `modeles_economiques[]` | `sector_intelligence.playbook.economic_models` | **Concaténés**, chaque item gardant ses propres champs natifs (pas de reformatage forcé — la vue ne les type pas item par item, `01-CARTE` S3 les regroupe sous un seul bloc) |
| `maillons[]` | `value_chain_nodes` | Voir §4.1 — piège de nom à ne pas rater |
| `fronts_technologiques[]` | `sector_intelligence.playbook.tech_fronts` | Verbatim |
| `dependances_critiques[]` | `sector_intelligence.playbook.dependances_critiques` | Verbatim, nouvelle clé (§0.4). **`practice_kredo` de chaque item passe par `mapOfferPracticeToKredoPractice()` avant écriture si un jour ce champ migre vers une colonne — pour l'instant il reste tel quel dans le JSONB, aucune contrainte SQL ne le valide** |
| `regulation[]` | `sector_regulatory_items` | Voir §4.2 |
| `chronologie[]` | `sector_events` | Voir §4.3 |
| `risques_opportunites[]` | `sector_intelligence.playbook.risks` | Verbatim |
| `pain_points[]` | `sector_pain_points` | Voir §4.4 |
| `playbook.personas/objections/entry_points/roi_arguments` | `sector_intelligence.playbook.*` (mêmes clés) | Verbatim — ces 4 clés existent déjà en base, c'est le premier import qui les remplit réellement pour ce segment |
| `sources[]` | **Hors périmètre L2** | Reste dans le document archivé uniquement (ADR MS-15 : rien en V1 sur `intelligence_source_links`) |
| `compteurs`, `meta` | **Non écrits** | Validation G1 uniquement, déjà passée avant que l'importeur tourne |

### 4.1 `maillons[]` → `value_chain_nodes` — le piège de nom

**E4 appelle son propre numéro de maillon `rang`. La colonne DB `value_chain_nodes.rang` est un
concept différent** (l'ordinal d'un acteur *au sein* d'un même maillon quand plusieurs lignes le
décomposent — c'est ce que fait le BTP existant : 3 lignes `maillon=1, rang=1/2/3` pour trois
types d'acteurs sur le même maillon). E4, lui, ne décompose pas — un maillon E4 = un acteur/étape,
donc **un maillon E4 = une seule ligne DB**.

**Mapping correct** :

```
couche               = 'chaine'
maillon              = maillons[i].rang        ← PAS value_chain_nodes.rang
rang                 = 1                        ← toujours 1, une seule ligne par maillon E4
label                = maillons[i].nom
description          = maillons[i].contenu
capture_valeur       = NULL                     ← amorce, E6 le complète (§0.2)
capture_justification= NULL
confiance            = 'moyenne'                ← valeur par défaut documentée, pas déduite d'un champ E4
```

Si vous mappez `maillons[i].rang` sur `value_chain_nodes.rang` par réflexe de nommage, la colonne
`maillon` (NOT NULL quand `couche='chaine'`) reste vide et l'insertion échoue — **c'est le test à
écrire en premier** (§7).

`acteurs_types[]`, `position_compte_etalon`, `qui_y_est_deja[]` n'ont pas de colonne dans
`value_chain_nodes` — ils restent dans le document archivé (comme `sources[]`), disponibles pour
E6 quand il approfondit, pas perdus mais pas dupliqués en base non plus.

### 4.2 `regulation[]` → `sector_regulatory_items`

```
name               = libelle
authority          = authority
description        = null                       ← pas de champ E4 distinct de libelle
deadline_date       = deadline_date
source_url          = source_url
commercial_angle    = commercial_angle
kredo_practice      = mapOfferPracticeToKredoPractice(kredo_practice)   ← §0.3, obligatoire
is_commercial_window = false                     ← curation humaine ultérieure, jamais déduit
urgency             = 'medium'                    ← valeur par défaut documentée ; aucun champ E4
                                                     ne porte d'urgence, ne pas en inventer une
                                                     depuis `statut` (acquis/proposition ne mesure
                                                     pas l'urgence, seulement le degré de certitude)
```

`portee` (`segment`/`macro`) filtre **où** l'item est écrit : `segment` → `sector_id = p_segment_id`
(le segment lui-même) ; `macro` → **ne pas écrire cet item du tout** dans ce lot (le macro a sa
propre fiche `sector_intelligence`, hors périmètre d'un import scopé segment — écrire au macro
depuis un import segment mélangerait deux runs). Documenter les items `portee='macro'` ignorés
dans le résumé du script (§7), ne pas les faire disparaître silencieusement.

### 4.3 `chronologie[]` → `sector_events`

```
title              = fait (tronqué à ~120 caractères pour le titre ; texte complet en description)
description        = fait
event_type         = 'market'                    ← valeur par défaut documentée ; CHECK limite à
                                                     regulatory|market|competitor|appointment|
                                                     tender|report|other, aucun champ E4 ne les
                                                     distingue
event_date         = normaliser `date` : "YYYY" → "YYYY-01-01", "YYYY-MM" → "YYYY-MM-01",
                     "YYYY-MM-DD" inchangé — chronologie[].date n'est pas garanti ISO complet
source_url         = null
commercial_opportunity = null
status             = 'pending'                    (défaut colonne, ne pas le forcer autrement)
```

### 4.4 `pain_points[]` → `sector_pain_points`

```
title              = libelle
description        = null
frequency_count    = frequency_count
source_company_ids = source_company_ids ?? '{}'  ← optionnel au schéma, vérifier la nullabilité
                                                     réelle de la colonne avant d'écrire ; défaut
                                                     tableau vide, jamais NULL si la colonne l'exige
kredo_practice     = null                         ← aucun champ E4 ne le porte sur pain_points
verbatim           = null
```

---

## 5. La RPC — `private.ingest_master_study_e4`

Un seul paramètre JSONB en entrée (même convention que `ingest_competitive_map_batch`, déjà en
production — ne pas inventer une signature à N paramètres positionnels).

### 5.1 Sécurité — le point non négociable

**`workspace_id` n'est jamais un paramètre.** Toutes les tables cibles portent
`workspace_id DEFAULT private.current_workspace_id()` — laisser le défaut faire le travail, ne
jamais accepter de valeur envoyée par l'appelant (même doctrine que `CompetitiveMapIngestionDecision`
dans `ingest-competitive-map.ts`, qui n'envoie jamais de `workspace_id` non plus). La seule
vérification manuelle nécessaire porte sur **la ligne qu'on met à jour** (`sector_intelligence`,
qui n'est pas un simple INSERT) :

```sql
update public.sector_intelligence
set ...
where id = p_segment_id
  and workspace_id = private.current_workspace_id();
-- puis vérifier GET DIAGNOSTICS ... = 1, sinon raise exception
```

Sans ce garde-fou explicite sur l'`UPDATE`, une fonction `SECURITY DEFINER` (qui contourne la RLS
par construction) pourrait modifier la fiche sectorielle d'un autre workspace si on lui passait
un `segment_id` étranger. Voir le précédent réel : `docs/adr/ADR-0020-missions-intelligence.md` §5.1
documente exactement ce type de faille corrigée ailleurs dans le projet (D-17,
`docs/init-projet/DECISIONS_LOG.md`).

### 5.2 Corps — squelette à compléter, pas à redessiner

```sql
create or replace function private.ingest_master_study_e4(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segment_id uuid := (p_payload->>'segment_id')::uuid;
  v_run_id uuid;
  v_document_id uuid;
  v_updated integer;
begin
  -- Le segment doit exister ET appartenir au workspace de l'appelant.
  if not exists (
    select 1 from public.sector_intelligence
    where id = v_segment_id and workspace_id = private.current_workspace_id()
  ) then
    raise exception 'Segment introuvable ou hors workspace : %', v_segment_id;
  end if;

  -- 1. Le run (company_id volontairement omis => NULL, ADR MS-9b)
  insert into public.ai_intelligence_runs (
    run_type, status, trigger_source, input_snapshot, config,
    started_at, completed_at, primary_entity_type, primary_entity_id
  ) values (
    'master_study', 'succeeded', 'manual',
    p_payload->'run'->'input_snapshot', p_payload->'run'->'config',
    now(), now(), 'sector', v_segment_id
  ) returning id into v_run_id;

  -- 2. Le document archivé
  insert into public.intelligence_documents (
    title, document_type, status, current_content_text, current_content_json,
    primary_entity_type, primary_entity_id, scope_json, data_cutoff_at
  ) values (
    p_payload->'document'->>'title', 'master_study', 'ready',
    p_payload->'document'->>'content_text', p_payload->'document'->'content_json',
    'sector', v_segment_id, p_payload->'document'->'scope_json',
    (p_payload->>'study_snapshot_date')::timestamptz
  ) returning id into v_document_id;

  insert into public.intelligence_document_versions (
    document_id, version_number, origin, content_text, content_json
  ) values (
    v_document_id, 1, 'imported',
    p_payload->'document'->>'content_text', p_payload->'document'->'content_json'
  );

  -- 3. sector_intelligence — patch scalaire + fusion clé par clé playbook/caveats
  update public.sector_intelligence
  set
    description = coalesce(p_payload->'sector_patch'->>'description', description),
    market_size_eur_bn = case when p_payload->'sector_patch' ? 'market_size_eur_bn'
      then (p_payload->'sector_patch'->>'market_size_eur_bn')::numeric else market_size_eur_bn end,
    market_growth_pct = case when p_payload->'sector_patch' ? 'market_growth_pct'
      then (p_payload->'sector_patch'->>'market_growth_pct')::numeric else market_growth_pct end,
    resolution_locks = coalesce(resolution_locks, '{}'::jsonb) || coalesce(p_payload->'sector_patch'->'resolution_locks', '{}'::jsonb),
    playbook = coalesce(playbook, '{}'::jsonb) || coalesce(p_payload->'sector_patch'->'playbook_patch', '{}'::jsonb),
    caveats = coalesce(caveats, '{}'::jsonb) || coalesce(p_payload->'sector_patch'->'caveats_patch', '{}'::jsonb),
    source_run_id = v_run_id,
    study_snapshot_date = (p_payload->>'study_snapshot_date')::date
  where id = v_segment_id and workspace_id = private.current_workspace_id();
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sector_intelligence non mis à jour pour %', v_segment_id;
  end if;

  -- 4. Tables d'items — idempotent sur CE run_id (rejeu du même run_id remplace ses
  --    propres lignes, jamais celles d'un autre — ADR §7.3 point 9)
  delete from public.sector_events where sector_id = v_segment_id and source_run_id = v_run_id;
  insert into public.sector_events (sector_id, title, event_type, description, event_date,
      source_url, commercial_opportunity, source_run_id)
  select v_segment_id, e->>'title', e->>'event_type', e->>'description',
      (e->>'event_date')::date, e->>'source_url', e->>'commercial_opportunity', v_run_id
  from jsonb_array_elements(p_payload->'events') e;

  delete from public.sector_pain_points where sector_id = v_segment_id and source_run_id = v_run_id;
  insert into public.sector_pain_points (sector_id, title, frequency_count, source_company_ids, source_run_id)
  select v_segment_id, p->>'title', (p->>'frequency_count')::integer,
      coalesce(array(select jsonb_array_elements_text(p->'source_company_ids'))::uuid[], '{}'), v_run_id
  from jsonb_array_elements(p_payload->'pain_points') p;

  delete from public.sector_regulatory_items where sector_id = v_segment_id and source_run_id = v_run_id;
  insert into public.sector_regulatory_items (sector_id, name, authority, deadline_date,
      source_url, commercial_angle, kredo_practice, is_commercial_window, urgency, source_run_id)
  select v_segment_id, r->>'name', r->>'authority', (r->>'deadline_date')::date,
      r->>'source_url', r->>'commercial_angle', r->>'kredo_practice',
      (r->>'is_commercial_window')::boolean, r->>'urgency', v_run_id
  from jsonb_array_elements(p_payload->'regulatory_items') r;

  delete from public.value_chain_nodes where sector_id = v_segment_id and source_run_id = v_run_id;
  insert into public.value_chain_nodes (sector_id, couche, maillon, rang, label, description, confiance, source_run_id)
  select v_segment_id, 'chaine', (n->>'maillon')::integer, 1, n->>'label', n->>'description', 'moyenne', v_run_id
  from jsonb_array_elements(p_payload->'value_chain_nodes') n;

  return jsonb_build_object('run_id', v_run_id, 'document_id', v_document_id, 'segment_id', v_segment_id);
end;
$$;

grant execute on function private.ingest_master_study_e4(jsonb) to authenticated, service_role;
```

**`kredo_practice` et `is_commercial_window`/`urgency` sont déjà traduits/défaultés côté
TypeScript avant d'atteindre ce payload** (§4.2) — la RPC ne fait que projeter du JSON déjà
correct, elle ne connaît pas `mapOfferPracticeToKredoPractice`. Ne pas dupliquer cette logique en
SQL.

Ce squelette est un point de départ vérifié contre les colonnes réelles, pas un copié-collé
aveugle : relire chaque `insert`/`update` contre les listes de colonnes de §4 avant de le
finaliser, en particulier les valeurs par défaut documentées (`confiance='moyenne'`,
`event_type='market'`, `urgency='medium'`) qui sont des choix explicites à ne pas déplacer sans
le signaler dans le rapport de livraison.

---

## 6. Script — `scripts/ingest-master-study.mts`

Même patron que `scripts/measure-hiring-intensity.mts` (`tsx --conditions=react-server
--env-file=.env.local`) : le métier vit dans `src/features/master-study/`, le script n'est qu'un
point d'entrée.

```bash
tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts \
  docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ --dry-run
```

**`--dry-run` par défaut si l'option n'est pas passée** — l'écriture réelle demande
`--live` explicite, jamais l'inverse (un oubli de flag ne doit jamais déclencher une écriture).

En `--dry-run` : lit `04-secteur.json`, valide contre le schéma amendé (§2.1), construit le
payload (§3, `map-e4-to-canon.ts`), **n'appelle pas la RPC**, imprime un résumé (compteurs par
bloc de `01-CARTE`, items `portee='macro'` ignorés, warnings sur les valeurs par défaut
appliquées listées en §5.2).

En `--live` (code à écrire, **non exercé contre la prod dans ce lot** — c'est L3) : appelle
`supabase.rpc('ingest_master_study_e4', { p_payload })`, imprime le `run_id`/`document_id` retourné.

---

## 7. Tests — obligatoires avant tout `--live`

`src/features/master-study/domain/map-e4-to-canon.test.ts` :

1. **Le piège de §4.1** : un `maillons[]` avec `rang: 3` produit une ligne dont
   `value_chain_nodes.maillon === 3` **et** `rang === 1` — pas l'inverse. Test explicite, nommé
   pour qu'il documente le piège s'il casse un jour.
2. `mapOfferPracticeToKredoPractice("data-ai")` appliqué à chaque `kredo_practice`/`practice_kredo`
   du payload produit `"data_ai"`, jamais la valeur brute.
3. `marche.taille_statut = "not_published"` → `resolution_locks` porte la clé
   `market_size_eur_bn`, et `market_size_eur_bn` du payload est `null` même si `taille_eur_bn`
   valait un nombre (le verrou l'emporte, cohérent avec `private.sector_resolve_scalar` de L1).
   `taille_statut` absent du JSON → pas de verrou posé (comportement historique préservé).
4. Un item `regulation[]` avec `portee: "macro"` n'apparaît pas dans `payload.regulatory_items`.
5. **Test contre le fixture réel** : charger
   `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/04-secteur.json` (patché selon
   §2.4) depuis le disque, mapper, vérifier les compteurs (6 maillons, 6 dépendances critiques, 4
   pain points, etc. — comparer à `04-secteur.json > compteurs`) plutôt qu'un fixture synthétique
   qui dériverait du run réel sans qu'on s'en aperçoive.

`src/features/master-study/data/ingest-master-study.test.ts` : mock du client Supabase (patron
`sector-snapshot-data.test.ts` de L1 — builder avec `from()`/`select()`/`eq()`), vérifie que
`--dry-run` n'appelle jamais `.rpc()`.

---

## 8. Retrofit — `ingest-competitive-map.ts`

**Ce qu'il faut corriger, précisément.** `archiveCompetitiveMapImport()` (fin du fichier) écrit
aujourd'hui le document via `saveAsDocumentWithClient()` dans un `try/catch` dont l'échec est
**best-effort par design assumé** (le commentaire du fichier le dit explicitement : « un import
CRM réussi ne doit jamais devenir un échec parce que l'écriture du rapport a raté »). C'est ce
best-effort qui explique les 8 `competitive_map_entries` du pilote sans document
(`source_document_id` NULL sur les 8, vérifié en base au lot L1).

**Ne pas rendre l'archivage bloquant** — l'intention best-effort reste juste : un import CRM
réussi ne doit pas échouer parce que le rapport a raté. Le vrai correctif est **d'observer et de
signaler l'échec au lieu de le rendre invisible** :

1. Si `saveAsDocumentWithClient` échoue, logger l'erreur côté serveur (`console.error`, patron
   déjà utilisé ailleurs dans le fichier) — aujourd'hui l'échec ne remonte que dans
   `reportError`, jamais dans les logs serveur, donc invisible en dehors de l'écran d'import.
2. Ajouter `source_run_id` à l'écriture de `competitive_map_entries` **quand elle provient d'un
   import rattaché à un run Master Study** (ce n'est pas le cas aujourd'hui — l'import E5 reste
   humain, indépendant, ADR MS-14). Si `ingest_competitive_map_batch` (RPC existante, migration
   074) n'accepte pas encore ce paramètre, l'étendre pour l'accepter en optionnel
   (`p_source_run_id uuid default null`), sans changer son comportement quand il est absent.
3. **Ne pas** fusionner cette RPC avec `private.ingest_master_study_e4` — E5 reste un flux humain
   distinct (arbitrage `resolved`/`ambiguous`/`not_found`), ADR §7.4 le dit explicitement.

---

## 9. Ce que L2 ne fait toujours pas

- **Aucune écriture en base de production.** Le `--dry-run` sur le pilote est la preuve de ce
  lot ; l'écriture réelle (`--live`) est **L3**.
- Pas de lecture/projection (`SectorKnowledgeReadModel`, `AccountSectorPerspective`) — **L4/L5**.
- Pas d'extension de `intelligence_source_links` — ADR MS-15, hors V1.
- `sources[]` (E3, 29 items) n'est pas matérialisé en canon — reste dans le document archivé.

---

## 10. Boucle de validation

```bash
npm run typecheck
npm test
npm run check:server-boundary
npx eslint src/features/master-study/ src/features/competitive-map/actions/ingest-competitive-map.ts scripts/ingest-master-study.mts
rm -rf .next && npm run build
```

**Plus, spécifique à ce lot** :

1. Appliquer la migration §1, vérifier live que les 2 contraintes ont le nouveau comportement
   (insérer un nœud `couche='chaine', maillon=6, capture_valeur=NULL` en transaction `ROLLBACK`
   pour prouver que ça passe désormais, puis `ROLLBACK` — ne rien laisser).
2. Rejouer `supabase/tests/069_sector_knowledge_resolution.assertions.sql` (18 assertions) — la
   migration ne doit rien casser côté L1.
3. Lancer `tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts
   docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ --dry-run` — rapporter le
   résumé complet (compteurs par bloc, warnings, items macro ignorés).
4. Confirmer par requête que rien n'a été écrit : `select count(*) from ai_intelligence_runs
   where run_type='master_study'` doit valoir 0 après le `--dry-run`.

---

## 11. Rendu attendu

- Migration appliquée, nom aligné sur le timestamp réel.
- 3 fichiers du corpus amendés (§2.1-2.3) + le run pilote patché (§2.4), dans des commits
  distincts si possible (contrat vs contenu, doctrine du projet : « un défaut de contrat se
  corrige avant toute collecte »).
- `src/features/master-study/` complet, testé (§7).
- `private.ingest_master_study_e4` RPC (§5) créée en base.
- `ingest-competitive-map.ts` retrofité (§8).
- Sortie complète du `--dry-run` sur le pilote (§10.3), et confirmation explicite que rien n'est
  entré en base (§10.4) — la preuve que L2 pose l'outillage sans ingérer, exactement comme L1 a
  posé l'infrastructure sans verrouiller.
