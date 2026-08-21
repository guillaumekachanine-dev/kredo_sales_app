# ADR-0021 — Master Study : ingestion canonique, projections et distribution dans KREDO

- **Statut** : **Accepté**
- **Version** : **2.0** — remplace intégralement la v1.0 « Proposé à l'adoption » du 2026-08-20
- **Date** : 2026-08-20
- **Décideur** : Guillaume Kasanin
- **Portée** : Master Study · Business Intelligence · Cockpit Intelligence compte · Prospection · Knowledge Hub
- **Segment pilote** : `seg-parfumerie-compositions-b2b` — Compositions & ingrédients B2B (`db34f8a0-9d9e-4585-acd6-2fbbdd1baad6`)
- **Compte pilote** : ROBERTET (`67b346ff-68c8-4f36-a510-13024955856f`, `relation_type='client'`, `depth_level='active'`)
- **Complète** : `docs/MASTER-STUDY/01-CARTE-DE-LA-CONNAISSANCE.md` · `02-DISTRIBUTION-DANS-KREDO.md` · `09-ETAPE-E6-CHAINE-DE-VALEUR.md` · `10-ETAPE-E7-GATES-ET-INGESTION.md`
- **Ne remplace pas** la nomenclature S/C/A/P, ni les étapes E0→E7, ni les gates G0→G3.

> ### Décision
>
> Une Master Study est **un corpus versionné unique**, **ingéré une seule fois** vers la connaissance
> canonique de KREDO, **de manière atomique avec son estampillage**.
>
> Aucune surface ne possède sa copie de l'étude. Deux read models déterministes suffisent :
> **un segment-centric**, **un compte-centric**. Le reste est de la présentation.
>
> **On duplique les formes de lecture, jamais la vérité — et on ne persiste aucune synthèse.**

---

## Ce qui change par rapport à la v1.0

| # | v1.0 | v2.0 | Motif |
|---|---|---|---|
| 1 | 4 projections, dont `MasterStudyDigest` pour un « module Études sectorielles » | **2 projections.** Le Digest devient un **composant transverse** sans contrat de données propre | `/prospection/sector-studies` et `/prospection/approche-sectorielle` sont deux `permanentRedirect("/intelligence")`. La surface n'existe pas ; le composant, si (`SectorStudiesModal`) |
| 2 | `explicit_unknown` stocké dans `sector_intelligence.caveats` | Colonne dédiée **`resolution_locks`**, jamais héritée | `v_sector_knowledge_resolved` résout `caveats` par substitution du blob entier : écrire sur le segment **efface les caveats du macro**. C'est le bug que la migration 071 a corrigé pour `playbook` |
| 3 | « Il manque `source_run_id` » | **La provenance est atomique** : une RPC transactionnelle, pas une colonne remplie après coup | Le chemin de preuve E5 existe déjà en code et **a échoué en silence sur le segment pilote** : 8 entrées écrites le 14/08 à 21:51, **0 document `competitive_map_import`** |
| 4 | MS-3 « BI pas monolithique » | MS-3 nomme la cause : **BI lit `sector_intelligence` brute, pas `v_sector_knowledge_resolved`**, et charge tout, sans filtre | C'est la raison technique pour laquelle BI ne peut pas afficher la Master Study |
| 5 | `study_snapshot_date` sur 5 tables | `source_run_id` partout, `study_snapshot_date` **uniquement** où c'est déjà une clé de jointure | Un fait dérivable du run, dupliqué, divergera |
| 6 | Séquencement : provenance → E4 → projections | **L0 vérité d'affichage → L1 verrou → L2 importeur → L3 ingestion → L4/L5 lectures** | Poser des colonnes sur des tables vides ne prouve rien ; dessiner des projections avant E4, c'est les dessiner contre de la donnée imaginée |
| 7 | §21 : suspendre le redesign Cockpit > Secteur | Le redesign attend L5, mais **le chiffre faux se corrige en L0**, immédiatement | Ce n'est pas une question de design |
| 8 | — | **6 blocs de l'E4 pilote n'avaient aucune destination.** Tranché : `maillons` → `value_chain_nodes` ; `dependances_critiques` → `playbook.dependances_critiques` (précisé L2, §9.1) ; `budgets_18_36_mois` **retiré du contrat** | `02-DISTRIBUTION` : « un bloc qui n'apparaît nulle part n'a pas de raison d'être produit » |

---

# 1. Contexte

## 1.1 Le problème

Le chantier a commencé sur un symptôme : l'onglet **Secteur** du Cockpit d'un compte n'est pas
alimenté par la Master Study. Le vrai problème est plus large :

> **Comment faire de la Master Study une source de connaissance unique, versionnée et traçable,
> puis en distribuer plusieurs lectures cohérentes sans duplication, sans contradiction et sans
> sur-ingénierie ?**

La Master Study du segment Parfumerie **contient** la matière attendue (64 Ko de JSON validé :
5 thèses avec `donc_commercialement`, 5 modèles économiques, 5 fronts technologiques, 6 maillons,
6 dépendances critiques, 5 items réglementaires datés, 7 dates de chronologie, 7 risques/opportunités,
4 pain points, un playbook complet, 29 sources). Elle sait aussi dire **« non publié »** au lieu
d'inventer.

Le problème n'est donc pas la production de connaissance. **C'est qu'elle n'atterrit pas.**

## 1.2 État vérifié en base — 2026-08-20

Relevé live sur `jvzgmhvwirsbdkjpmvla`. Ces constats datent ; **les décisions MS-\*, non.**

**Le segment pilote (`db34f8a0…`) — E4 absent :**

| Élément | État |
|---|---|
| `description` · `caveats` | vide · NULL |
| `market_size_eur_bn` · `market_growth_pct` | NULL · NULL |
| `playbook` | `{personas:0, objections:0, entry_points:0, roi_arguments:0}` — squelette de seed |
| `sector_events` / `_pain_points` / `_regulatory_items` au segment | **0 / 0 / 0** (macro : 5 / 8 / 5) |
| `value_chain_nodes` | 0 au segment, 0 au macro |
| document `master_study` | 0 (aucun dans toute la base) |

**E5 est là, et il est riche** — le correctif A4 (commit `149d3e98`) a pris :

| Élément | État |
|---|---|
| `competitive_map_entries` (segment) | **8**, `study_snapshot_date = 2026-08-14` |
| `profile_json` | **5 039 à 6 803 octets**, clés `couche_esn`, `traduction_commerciale`, `grilles`, `maillon`, `contrats_majeurs`, `metier_chaine_valeur`, `trigger_events`, `a_ne_pas_dire`, `trous`, `sources` |
| `appetence_provisoire` | **`true` sur les 8** — l'axe accessibilité n'est pas prouvé (A6 = **0 fait sur 621**) |
| `source_document_id` | **NULL sur les 8** |

**Provenance et contrats :**

- Aucune des 5 tables sectorielles ne porte `source_run_id` ni `study_snapshot_date`.
  `competitive_map_entries` porte `study_snapshot_date` et `source_document_id`, pas `source_run_id`.
- `intelligence_source_links.object_type` ∈ `proposal | fact | signal` (CHECK).
- `intelligence_document_type` porte déjà `master_study` (migration 076) ; `intelligence_entity_type`
  porte déjà `sector`. **Aucune migration d'enum n'est à rejouer** — E7 §6.3 est dépassé sur ce point.
- `ai_intelligence_results.result_type` est du `text` libre : `sector_study`, `competitive_map`,
  `sector_source_registry` ne demandent **aucune** migration.

## 1.3 Trois défauts que le cadrage v1 n'avait pas vus

**(a) Le Cockpit affiche aujourd'hui un chiffre faux sur le compte pilote.**
`getSectorSnapshot(segment_id)` lit `v_sector_knowledge_resolved`, dont la résolution est
`COALESCE(s.market_size_eur_bn, m.market_size_eur_bn)`. Le segment est NULL, le macro
« Parfumerie, Arômes & Cosmétique » porte **80 Md€ / 5,2 %** — un marché mondial toutes catégories,
issu d'une recherche de juin 2026 que ses propres `caveats` déclarent non revérifiée. L'onglet
Secteur de ROBERTET affiche donc « Taille marché KREDO : 80 Md€ », **sans badge de provenance** :
`SectorLevelBadge` est appliqué à `description`, pas aux chiffres
(`ClientIntelligenceSectorTab.tsx`, bloc `SectorIntroduction`). Or `04-secteur.json` déclare
explicitement la taille du segment **non publiée**.

**(b) La chaîne de preuve E5 existe en code et a échoué en silence.**
`ingest-competitive-map.ts` archive un document `competitive_map_import` avec
`primaryEntity = {entityType:'sector', entityId: segmentId}` — exactement la Couche 1 visée. Les
8 entrées ont été écrites le `2026-08-14 21:51:31` et **aucun document n'existe**. L'archivage est
un `try/catch` qui retourne `reportError` sans faire échouer l'import.

**(c) BI ne lit pas la vue résolue et charge tout.**
`getBusinessIntelligenceSnapshot()` fait `from("sector_intelligence").select(…)` **sans filtre
`level`**, plus tous les `sector_pain_points`, `sector_events`, `sector_news`,
`sector_regulatory_items`, les **745** `account_signals`, `account_score_current` +
`account_score_components`, plus l'intégralité de `getPortfolioIntelligenceSnapshot()` — à chaque
ouverture de `/intelligence`, sans segment sélectionné. `build-sector-activation-model.ts` ne
connaît ni `level`, ni `parent_id`, ni `macro` : il traite les 53 fiches à plat.

---

# 2. Options écartées

| Option | Verdict | Motif décisif |
|---|---|---|
| **A** — une ingestion par destination | **REJETÉE** | Trois copies, trois invalidations, divergence inévitable ; chaque nouvelle surface crée une branche d'ingestion |
| **B** — lire les JSON bruts partout | **REJETÉE** | Pas de jointure avec le CRM et les offres, pas de scoring, parsing réimplémenté par écran. Le document est une **archive et une preuve**, pas un datastore |
| **C** — pré-générer un résumé persisté par destination | **REJETÉE** | Réintroduit plusieurs vérités, textes figés, invalidation complexe. **C'est la seule option réellement irréversible** : tant que rien n'est stocké, toute lecture reste modifiable sans migration |
| **D** — résumé LLM dynamique à la lecture | **REJETÉE comme mécanisme principal** | Non déterministe, coûteux, intestable, et **inutile** : E4 produit déjà des blocs structurés et leurs « DONC, commercialement ». Un LLM pourra plus tard *rédiger* une synthèse déjà résolue ; il ne décide jamais de la connaissance |
| **E** — ingestion canonique + projections déterministes | **RETENUE** | Une vérité, provenance conservée, chaque surface garde sa finalité, testable, réutilise le schéma existant |

---

# 3. Architecture retenue

```
docs/MASTER-STUDY/registre/<run>/*.json          contrats validés · gate G1
        │
        │   scripts/ingest-master-study.mts  (--dry-run par défaut)
        │   + RPC transactionnelle : tout entre, ou rien n'entre
        ▼
┌─ COUCHE 1 · artefact probant ────────────────────────────────────────────┐
│  ai_intelligence_runs      run_type='master_study', company_id IS NULL   │
│                            primary_entity_type='sector'                  │
│  intelligence_documents    document_type='master_study'                  │
│  + _versions               primary_entity_type='sector'                  │
│  « Qu'a réellement produit cette étude, à cette date ? »                  │
└──────────────────────────────────────────────────────────────────────────┘
        ▼
┌─ COUCHE 2 · canon requêtable ────────────────────────────────────────────┐
│  sector_intelligence · sector_events · sector_pain_points                 │
│  sector_regulatory_items · competitive_map_entries · value_chain_*        │
│  account_facts · intelligence_sources                                    │
│  estampillés source_run_id · résolus par v_sector_knowledge_*            │
│  « Qu'est-ce que KREDO sait et peut requêter ? »                          │
└──────────────────────────────────────────────────────────────────────────┘
        ▼
┌─ COUCHE 3 · lectures, jamais persistées ─────────────────────────────────┐
│  SectorKnowledgeReadModel(segmentId)   → BI, 4 onglets                   │
│  AccountSectorPerspective(companyId)   → Cockpit > Secteur               │
│                                                                          │
│  MasterStudyReader          composant transverse, pas de contrat propre  │
│  build-sector-playbook-model  déjà écrit, à repointer                    │
│  « Parmi ce que KREDO sait, qu'est-ce qui est utile ici, maintenant ? »   │
└──────────────────────────────────────────────────────────────────────────┘
```

## 3.1 Couche 1 — artefact probant

**Aucune table nouvelle.** Le registre d'exécution est `ai_intelligence_runs` :

```
run_type            = 'master_study'
primary_entity_type = 'sector'
primary_entity_id   = <segment_id>
company_id          = NULL          ← règle MS-9b, non négociable
input_snapshot      = contenu de registre/<run>/07-verdict.json
```

Le document est `intelligence_documents` :

```
document_type       = 'master_study'
primary_entity_type = 'sector'
primary_entity_id   = <segment_id>
data_cutoff_at      = date_snapshot du run
scope_json          = { run_slug, snapshot_date, gates, verdict, schemas }
```

Versions successives dans `intelligence_document_versions` (append-only). Liens vers les comptes
cartographiés dans `intelligence_document_links` (`entity_type='company'`).

## 3.2 Couche 2 — canon requêtable

Les blocs S/C/A vont dans leurs structures métier existantes, telles que
`01-CARTE-DE-LA-CONNAISSANCE.md` les assigne. Aucune table nouvelle.

Une seule migration additive, **8 colonnes**, plus la réécriture d'une vue :

```sql
sector_intelligence       + source_run_id uuid
                          + study_snapshot_date date
                          + resolution_locks jsonb NOT NULL DEFAULT '{}'
sector_events             + source_run_id uuid
sector_pain_points        + source_run_id uuid
sector_regulatory_items   + source_run_id uuid
value_chain_nodes         + source_run_id uuid
competitive_map_entries   + source_run_id uuid      -- study_snapshot_date existe déjà
```

**`study_snapshot_date` n'est PAS répliqué sur les tables d'items.** Il est dérivable du run ; le
porter partout duplique un fait qui divergera. On ne le conserve que là où c'est **déjà une clé de
jointure de loader** : `competitive_map_entries`, filtré dessus par
`get-competitive-map-workspace.ts`.

`value_chain_actors` et `value_chain_links` **n'ont pas** de `source_run_id` : ils héritent du run
par leur `node_id`. On estampille le niveau où l'ownership est clair, pas chaque nœud du graphe.

## 3.3 Couche 3 — lectures

Les écrans ne possèdent pas la donnée. Ils construisent des contrats adaptés à leur question, à
partir du canon. **Rien n'est persisté à ce niveau** : c'est ce qui garantit qu'une lecture reste
modifiable, fusionnable ou supprimable sans migration ni réingestion.

---

# 4. Les deux projections, et le composant transverse

## 4.1 `SectorKnowledgeReadModel(segmentId)` — segment-centric

**Destination** : Business Intelligence, 4 onglets · le `MasterStudyReader` · le Knowledge Hub.

**Question** : *« Que faut-il savoir de ce marché pour le comprendre, le comparer, le prioriser et
préparer une campagne ? »*

Un seul loader, **un segment à la fois**, lisant `v_sector_knowledge_resolved` et
`v_sector_knowledge_items` — jamais `sector_intelligence` en direct. Chaque onglet BI en sélectionne
ce dont il est responsable :

| Onglet BI | Blocs | Source |
|---|---|---|
| **Étude sectorielle** | S1 S2 S3 S4 S5 S6 S9 S13 | E4 |
| **Environnement concurrentiel** | C1 C2 C2b C3 C4 C5 C6 | E5 + `account_facts` |
| **Chaîne de valeur** | S8 A12 | E4 (`maillons`, `dependances_critiques`) + E6 |
| **Calendrier réglementaire** | S7 | socle réglementaire daté |

> **BI est exhaustive fonctionnellement, jamais monolithique techniquement.** Le chargement global
> actuel (53 fiches + 745 signaux + tout le portefeuille, sans filtre) est démonté en L4. C'est le
> correctif réel de « BI ne voit pas la Master Study » : la cause n'est pas l'absence de read
> models, c'est la lecture de la table brute.

## 4.2 `AccountSectorPerspective(companyId)` — compte-centric

**Destination** : Cockpit Intelligence > **Secteur**.

**Question** : *« Qu'est-ce que ce segment signifie pour CE compte ? »*

```ts
type AccountSectorPerspective = {
  segment:        { id, name, snapshotDate }
  essentialContext: { definition, keyTheses }
  whyNow:         { relevantDynamics, relevantRegulatoryItems, relevantTechFronts }
  competitivePosition: AccountCompetitiveContext | null   // Gate A conservée
  valueChainPosition:  { node, dependencies }
  accountInterpretation: { positioning, angleEntree, commercialTranslation }
  provenance:     { runId, snapshotDate, documentId }
}
```

**Le compte courant est le sujet ; les concurrents ne sont qu'un contexte.** La Master Study n'est
pas affichée « en plus » de la fiche compte : elle sert à expliquer le compte.

Le travail de **GATE A** (`competitiveContext`) est conservé intégralement, replacé comme
sous-brique de `competitivePosition`.

**Ce lot est plus court qu'il n'y paraît** : pour ROBERTET, `profile_json` porte déjà
`traduction_commerciale`, `angle_entree`, `couche_esn`, `maillon`, `trigger_events`, la position
concurrentielle et l'accessibilité — 6,3 Ko. Ce qui manque est **exclusivement** le contexte
segment, c'est-à-dire E4. Une fois E4 ingéré, la Perspective est un presenter, pas un chantier.

## 4.3 `MasterStudyReader` — composant transverse, pas une surface

> **Décision produit (MS-4).** La lecture rapide et légère d'une Master Study est un **composant**,
> disponible partout, alimenté par `SectorKnowledgeReadModel` — **le même read model que BI**. Il
> n'a **pas de contrat de données propre**, pas de projection dédiée, pas de table.

Il existe déjà : `SectorStudiesModal`, montée en `dynamic()` dans BI desktop et mobile, avec ses
9 sections (synthèse marché, personas, pain points, ROI, objections, échéances, acteurs, points
d'entrée, limites & sources). Son intuition produit est bonne. Ce qui change en L4 : il cesse d'être
alimenté par `build-sector-playbook-model` sur la table brute, et lit le read model résolu.

**Points de montage prévus** : modale BI (existant) · tiroir depuis le Cockpit d'un compte ·
entrée Knowledge Hub sur le document `master_study`. La liste n'est pas fermée.

**Pourquoi un composant et pas une cinquième surface.** `02-DISTRIBUTION` §1 déclare quatre
surfaces — BI, Prospection, Cockpit, Knowledge Hub — sur le principe *une page = un lecteur, un
moment, une question*. Le « module Études sectorielles » n'en est pas une :
`/prospection/sector-studies` et `/prospection/approche-sectorielle` sont deux
`permanentRedirect("/intelligence")`.

**Réversibilité — explicite.** En faire une page autonome plus tard (`/intelligence/etudes`, avec
recherche, historique de versions, filtres) coûte : un `page.tsx`, un layout autour d'un composant
déjà écrit, et un amendement de `02-DISTRIBUTION` §1 pour passer à cinq surfaces. **Aucune
migration, aucune réingestion, aucun contrat de données à créer.** C'est une décision produit
révisable à tout moment. La seule voie qui serait sans retour est l'option C, écartée.

**La contrainte à tenir, elle, n'est pas négociable** : un composant « disponible partout » qui
aurait sa propre source deviendrait la troisième vérité que `02-DISTRIBUTION` interdit. Le brancher
sur le read model partagé rend la règle mécanique au lieu d'être une bonne intention.

## 4.4 Le playbook — déjà écrit, à repointer

`build-sector-playbook-model.ts` existe. Il n'est pas réécrit : il est repointé sur le read model
résolu. Le playbook reste **calculé, jamais recopié** (`01-CARTE` §4 : un bloc P ne s'écrit pas).

---

# 5. Provenance — atomique, pas best-effort

## 5.1 Le principe

Chaque objet matérialisé par une étude doit répondre à : *qui m'a produit, quand, dans quel
snapshot, avec quel document source ?*

## 5.2 La règle qui compte

> **MS-10. L'estampillage est écrit dans la même transaction que la donnée.**
> Une RPC `SECURITY DEFINER` par famille de blocs : le run, le document, les lignes et leur
> `source_run_id` entrent ensemble, ou rien n'entre.

Ce n'est pas une préférence de style. Le chemin de preuve E5 existe déjà en code, et il a produit
8 entrées sans document sur le segment pilote parce que l'archivage était une étape de suivi
non bloquante. **Ajouter une colonne nullable remplie après coup reproduit exactement ce trou.**

Corollaire opérationnel : `ingest-competitive-map.ts` est amené au même régime en L2 — l'archivage
du document cesse d'être un `try/catch` silencieux.

## 5.3 Rollback

- **Tables d'items** : supprimer/remplacer les lignes du `source_run_id` concerné.
- **`sector_intelligence`** : c'est aussi l'entité de taxonomie, elle ne se versionne pas en
  plusieurs lignes. Rollback = **rejouer la matérialisation du dernier run accepté précédent**
  depuis le document archivé. D'où l'importance de la Couche 1 : sans document, pas de rollback.
- **Comptes `mapped` créés** : conservés avec leur `origin`, supprimés explicitement s'ils n'ont
  jamais été promus (ADR-0019 D-3).

## 5.4 Cohérence de snapshot — le résolveur existe déjà

Une projection ne combine **jamais** silencieusement E4 d'août, E5 de novembre et E6 de février.

`getAcceptedMasterStudyRun(segmentId)` retourne
`{ runId, snapshotDate, hasE4, hasE5, hasE6, verdict }`. Ce n'est pas à écrire de zéro :
`get-competitive-map-workspace.ts` construit déjà le catalogue « dernier `study_snapshot_date` par
segment » puis filtre les entrées dessus. **À généraliser sur `source_run_id`, pas à réinventer.**

**Dégradation explicite** : `E4 présent · E5 présent · E6 absent` est un état valide, affiché comme
tel. Une donnée d'un run antérieur n'est proposée en fallback que si **son millésime est visible**
et si la règle métier l'autorise nommément.

---

# 6. Héritage macro/segment — `resolution_locks`

## 6.1 Le problème, mesuré

`segment.market_size = NULL` a deux sens irréconciliables :

```
ABSENT           le segment n'a jamais été étudié           → héritage autorisé
EXPLICIT_UNKNOWN le segment a été étudié, la valeur          → héritage INTERDIT
                 n'est pas publiable
```

Le cas Parfumerie est le second. La vue résout aujourd'hui par `COALESCE` et fait donc passer un
chiffre macro mondial pour une caractéristique du segment.

## 6.2 Pourquoi pas `caveats`

La v1 proposait de stocker `resolution_overrides` dans `sector_intelligence.caveats`. **C'est une
erreur qui casse la résolution.** La vue résout `caveats` par substitution du blob entier :

```sql
CASE WHEN private.jsonb_is_filled(s.caveats) THEN s.caveats ELSE m.caveats END
```

Écrire une clé sur le segment rend `s.caveats` « rempli » et **fait disparaître les caveats du
macro** — dont l'avertissement `⚠️ Les fréquences ne sont rattachées à aucun compte source`, qui
est exactement ce qu'il ne faut jamais perdre. C'est le bug que la migration 071 a corrigé pour
`playbook`, reproduit à l'identique.

## 6.3 Solution retenue

Une colonne dédiée, **jamais héritée**, sur `sector_intelligence` :

```json
resolution_locks = {
  "market_size_eur_bn": "explicit_unknown",
  "market_growth_pct":  "explicit_unknown"
}
```

Valeurs : `explicit_unknown` · `not_applicable`. (`published` et `unknown` ne se stockent pas :
l'un est la valeur elle-même, l'autre est l'absence.)

Le contrat E4 porte l'état de la mesure à la source :

```json
"marche": {
  "taille_eur_bn": null,     "taille_statut": "not_published",
  "croissance_pct": null,    "croissance_statut": "not_published"
}
```

`v_sector_knowledge_resolved` est **réécrite** : chaque `COALESCE(s.x, m.x)` devient

```sql
CASE WHEN s.resolution_locks ? 'x' THEN NULL ELSE COALESCE(s.x, m.x) END
```

et un champ `x_level` supplémentaire vaut `'locked'` pour que l'UI puisse dire *« le segment a été
étudié, cette valeur n'est pas publiable »* — ce qui n'est **pas** la même chose que *« pas de
donnée »*.

⚠️ **Cette réécriture n'est pas gratuite** : `supabase/tests/069_sector_knowledge_resolution.assertions.sql`
porte 14 assertions à rejouer contre la base, et à compléter des cas de verrou.

---

# 7. L'importeur

## 7.1 Les migrations ne sont pas un importeur métier

E7 §6.1 recommande une « migration idempotente » pour E4. Acceptable pour initialiser un pilote,
mauvais comme régime permanent : historique de migrations pollué par du contenu, rollback métier
impossible, une migration par étude, couplage entre contenu et déploiement DB.

> **MS-13.** Les migrations servent au **schéma** (colonne, contrainte, valeur d'enum, fonction).
> L'ingestion récurrente de connaissance passe par un **importeur métier versionné**.

## 7.2 Forme retenue — tranchée

**CLI TypeScript `.mts` + RPC transactionnelle.**

```bash
tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts \
  docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ --dry-run
```

Le précédent existe et fonctionne : `npm run ft:measure` →
`scripts/measure-hiring-intensity.mts`, qui réutilise les modules `server-only` de
`src/features/hiring-intensity/`. Même patron ici : **le métier vit dans
`src/features/master-study/domain/`**, testé par Vitest ; le script n'est qu'un point d'entrée.

Ce n'est pas « le chemin le plus simple ». Le chemin le plus simple est celui qui a déjà perdu
le document E5 du pilote.

## 7.3 Responsabilités

1. Charger le run depuis `registre/<run>/`.
2. Valider chaque JSON contre `docs/MASTER-STUDY/schemas/`.
3. Vérifier le verdict des gates (`07-verdict.json`) — **un run `rejected` n'est jamais matérialisé
   comme courant**.
4. Créer / rattacher le `ai_intelligence_run` (`company_id IS NULL`).
5. Archiver le document `master_study` + sa version.
6. Matérialiser E2 / E3 / E4 / E6 **par RPC transactionnelle**, estampillées du même `source_run_id`.
7. Transmettre ce `source_run_id` et ce `study_snapshot_date` au `CompetitiveMapImportWizard` (E5).
8. Exécuter la recette SQL (compteurs avant/après, par bloc de `01-CARTE`).
9. `--dry-run` **par défaut** ; l'écriture demande un flag explicite.

**Idempotence** : la clé est `(segment_id, source_run_id)`. Un rejeu du même run remplace les
lignes de ce run, et **jamais** celles d'un autre.

## 7.4 E5 reste humain — et c'est cohérent

La résolution d'entité produit `resolved | ambiguous | not_found` ; l'arbitrage des `ambiguous` est
un jugement (ADR-0019 écarte explicitement un workflow n8n sur ce lot). La chaîne
`E5 JSON → CompetitiveMapImportWizard → arbitrage → competitive_map_entries` est conservée.

**Mais l'import reçoit le même `source_run_id` et le même `study_snapshot_date` que le reste de
l'étude.** Une étape humaine n'interrompt pas la cohérence du run.

---

# 8. Frontières fonctionnelles

## 8.1 Cockpit — Secteur ne refait pas l'écran voisin

| Onglet | Reste propriétaire de |
|---|---|
| **Secteur** | définition courte du segment · 2-3 thèses · 1-3 changements de contexte · position concurrentielle · position chaîne de valeur · un angle commercial |
| **Enjeux** | le **détail** des enjeux du compte, conséquences réglementaires, criticité, urgence, preuves |
| **Stratégie** | le **détail** : personas, objections, ROI, messages, pitchs, angles d'offres |

> **Une synthèse peut citer un bloc voisin ; elle ne doit pas refaire l'écran voisin.**
> Secteur peut signaler « IFRA 52 est structurant pour ce compte » ; Enjeux porte le détail
> exploitable.

## 8.2 Ce que chaque destination consomme

`●` bloc principal · `○` consommé en contexte

| Source | BI | `MasterStudyReader` | Cockpit > Secteur | Prospection | Knowledge |
|---|:-:|:-:|:-:|:-:|:-:|
| **E2** socle / réglementaire | ● Calendrier | ○ échéances clés | ○ contexte pertinent | ● fenêtres / why now | ○ preuve |
| **E3** sources | ○ drill-down | ○ compteur + réserves | ○ provenance légère | ○ grounding | **●** |
| **E4** étude sectorielle | **●** | **●** synthèse | ● sélection orientée compte | ○ messages | ○ document |
| **E5** comptes / cartographie | **●** | ○ benchmark + top acteurs | **●** compte + pairs | ● priorisation | ○ document |
| **E6** chaîne de valeur | **●** | ○ maillons clés | ● position du compte | ○ contexte | ○ export |
| `account_facts` courants | ○ | — | ● contexte compte | ○ grounding | ○ preuve |
| `offers` | ○ fit analytique | — | ○ implication KREDO | **●** | ○ référentiel |

---

# 9. Amendements au corpus MASTER-STUDY

Ces amendements sont **partie intégrante de la décision**, pas un suivi.

## 9.1 `maillons` et `dependances_critiques` — deux destinations distinctes, aucune perdue

`04-secteur.json` du pilote porte 6 `maillons` (avec `position_compte_etalon`,
`ou_lesn_se_branche`, `qui_y_est_deja`, `donc_commercialement`) et 6 `dependances_critiques` (avec
`criticite`, `risque`, `prestation_ouverte`, `practice_kredo`). `01-CARTE` assigne S8 à
`value_chain_*` et déclare E6 producteur — mais `value_chain_nodes` ne modélise que des acteurs
positionnés (`couche`/`maillon`/`rang`/`capture_valeur`), sans colonne pour une criticité, un
risque ou une prestation ouverte : `dependances_critiques` n'y a jamais eu de place réelle.

> **Tranché (précisé au lot L2, 2026-08-20).** L'importeur E4 **écrit `maillons` dans
> `value_chain_nodes`** avec son `source_run_id` — amorce sans captation
> (`capture_valeur = NULL`), que E6 complète ensuite par arbitrage humain (acteurs positionnés,
> liens, captation). `09-ETAPE-E6-CHAINE-DE-VALEUR.md` §4.1 est amendé en conséquence : le
> plafond `maillon 1..5`, calé sur le seul BTP, est retiré (le pilote Parfumerie en compte 6).
>
> `dependances_critiques` **n'écrit pas dans `value_chain_nodes`** : nouvelle clé
> `sector_intelligence.playbook.dependances_critiques`, même régime que les autres clés `★` de
> `01-CARTE` §7.2 — zéro table, résolue par le mécanisme clé-par-clé existant du playbook.

L'alternative — jeter ces deux blocs — perdrait 12 blocs sourcés du pilote pour une pureté
d'étape qui n'a aucun lecteur.

## 9.2 `budgets_18_36_mois` — retiré du contrat E4

> **Tranché : le bloc est supprimé.** Motif : les 5 lignes du pilote sont des trajectoires
> qualitatives adossées à un `offer_slug`, pas des budgets. La capacité réelle d'une étude à
> établir des enveloppes budgétaires à 18-36 mois n'est pas établie, et `02-DISTRIBUTION` interdit
> de produire un bloc qui n'a pas d'écran.

**Deux éditions normatives, dans le même commit** :

| Fichier | Édition |
|---|---|
| `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json` | supprimer la propriété `budgets_18_36_mois` (l. 225-237) |
| `docs/MASTER-STUDY/prompts/E4-etude-sectorielle.md` | supprimer la consigne de production correspondante |

`scripts/audit-master-study.py` **ne demande aucune retouche** : `check_compteurs` itère les clés
du bloc `compteurs` du livrable, il ne connaît aucun nom de liste en dur.

## 9.3 Le nombre de surfaces reste à quatre

`02-DISTRIBUTION-DANS-KREDO.md` §1 est **inchangé**. Le `MasterStudyReader` y est ajouté au §7
(« connaissance transverse »), pas au §1.

## 9.4 E7 est dépassé sur deux points, à corriger

- §6.3 ligne 1 : `intelligence_document_type += master_study` est **déjà appliquée** (migration 076).
  Ne pas rejouer.
- §6.3 ligne 2 : `ai_intelligence_results.result_type` **est** un `text` — vérifié. Aucune migration.

---

# 10. Décisions normatives

| ID | Décision |
|---|---|
| **MS-1** | Une Master Study est un **corpus versionné unique** ; aucune destination ne possède sa propre ingestion. |
| **MS-2** | Supabase porte la **connaissance canonique normalisée** ; le document Master Study reste l'artefact historique et probant. |
| **MS-3** | BI consomme la Master Study de manière **exhaustive** via `SectorKnowledgeReadModel`, **un segment à la fois**, lisant `v_sector_knowledge_resolved` / `v_sector_knowledge_items` — **jamais `sector_intelligence` en direct, jamais sans filtre `level`**. Le chargement global actuel est démonté. |
| **MS-4** | La lecture rapide d'une étude est un **composant transverse** (`MasterStudyReader`), alimenté par `SectorKnowledgeReadModel`. **Pas de projection dédiée, pas de contrat de données propre, pas de table.** En faire une page plus tard est une décision produit réversible, sans migration. |
| **MS-5** | Cockpit > Secteur consomme une **`AccountSectorPerspective`** : la Master Study vue depuis le compte. |
| **MS-6** | La GATE A `competitiveContext` est conservée comme sous-brique de `AccountSectorPerspective`. |
| **MS-7** | Prospection consomme des **produits dérivés** ; le playbook est calculé, jamais stocké. |
| **MS-8** | **Aucun LLM n'est requis à la lecture.** Les projections sélectionnent, ordonnent et présentent — elles n'interprètent pas. |
| **MS-9** | `ai_intelligence_runs` est le registre des runs Master Study ; **aucune table `master_study_runs`**. |
| **MS-9b** | Un run et un résultat `master_study` portent **`company_id IS NULL`** ; le segment va dans `primary_entity_*`. Rattacher le run au compte étalon polluerait `v_ai_intelligence_summary` (`count_runs`, `latest_run_*`) et rejouerait la dette M-4 d'ADR-0020. `result_type` ∈ `sector_study` · `competitive_map` · `sector_source_registry` ; **`phase` n'est pas signifiante** pour ces runs. |
| **MS-10** | **L'estampillage est atomique avec l'écriture** : une RPC transactionnelle par famille de blocs. Aucune provenance en étape de suivi non bloquante. |
| **MS-11** | Une projection ne mélange jamais silencieusement deux snapshots. `getAcceptedMasterStudyRun()` arbitre ; la dégradation (E6 absent) est affichée, pas comblée. |
| **MS-12** | `NULL` ne vaut pas « hériter ». Un inconnu explicite bloque l'héritage macro, via **`sector_intelligence.resolution_locks`** — **jamais via `caveats`**, qui est résolu par substitution de blob. |
| **MS-13** | Les migrations servent au schéma ; l'ingestion récurrente passe par `scripts/ingest-master-study.mts`, `--dry-run` par défaut, idempotent sur `(segment_id, source_run_id)`. |
| **MS-14** | E5 conserve son arbitrage humain, mais partage le run et le snapshot du reste de l'étude. |
| **MS-15** | La relation source → connaissance sectorielle réutilisera `intelligence_source_links`, dont l'allowlist sera étendue **le jour où un écran la réclame**. **Rien en V1** (voir §14). |
| **MS-16** | Les contrats E4/E5 évoluent vers des **références croisées stables**, en réutilisant d'abord les `id` qui existent (`theses[].id`) avant d'en créer. Fallback déterministe en V1. |
| **MS-17** | Le design final de Cockpit > Secteur reprend en **L5**, après matérialisation E4 et stabilisation du contrat `AccountSectorPerspective`. |
| **MS-18** | **L'affichage d'une valeur héritée du macro porte toujours sa provenance.** Un chiffre sans badge est un chiffre présenté comme spécifique au segment. |
| **MS-19** | **E4 amorce la chaîne de valeur, E6 l'approfondit.** Les deux écrivent dans `value_chain_*`, arbitrés par `source_run_id`. |
| **MS-20** | **Aucune synthèse n'est persistée.** Pas de table `sector_digest_cache`, pas de `account_sector_perspectives`, pas de résumé par compte. C'est ce qui garde toute décision de lecture réversible. |
| **MS-21** | **`NULL` ne vaut pas non plus « impossible à estimer ».** Un troisième statut, **`estimated`**, distingue une valeur triangulée depuis la décomposition sourcée d'un marché (tier 1-2, méthodologie documentée) d'une valeur publiée telle quelle (`segment`/`macro`) et d'un inconnu explicite (`locked`, MS-12). `estimated` porte une vraie valeur, jamais héritée du macro, avec sa provenance affichée (badge dédié, MS-18 étendu). Amendement du 2026-08-21 — voir §15. |

---

# 11. Plan de lots

| Lot | Contenu | Coût | Pourquoi ici |
|---|---|---|---|
| **L0** ✅ | **Vérité d'affichage — livré le 2026-08-20.** `marketSizeEurBn` / `marketGrowthPct` / `attractivenessScore` héritées portent `SectorLevelBadge`, comme `description`. Aucun schéma, aucune migration — requête parallèle sur la table brute. Handoff : `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` | ~2 h | Supprimait un chiffre faux en production sur le compte pilote (80 Md€ affiché comme taille du segment Parfumerie, en réalité celle du macro) |
| **L1** ✅ | **Migration additive — livré le 2026-08-20** (`20260820200000_master_study_provenance_columns.sql`). 8 colonnes + `resolution_locks`, réécriture de `v_sector_knowledge_resolved` avec les verrous et les `*_level`, assertions 069 étendues 14→18. Le pis-aller TypeScript de L0 a été retiré dans le même lot. Détail : `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §2 | ½ j | Le verrou doit exister **avant** la première écriture E4, sinon on ingère puis on corrige |
| **L2** ✅ | **Importeur E4 — livré le 2026-08-20** (`20260820200001`/`002_*.sql`). `src/features/master-study/` (contrats TS, mapping, RPC `public.ingest_master_study_e4`), `scripts/ingest-master-study.mts --dry-run`, `ingest-competitive-map.ts` mis au régime `source_run_id` + logs d'échec. Amendements §9.1/§9.2 appliqués. Deux défauts trouvés en vérification indépendante et corrigés avant tout `--live` : RPC placée par erreur en schéma `private` (jamais exposée par PostgREST) et `workspace_id` non résolvable sous service-role. Détail : `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §3 | 2 j | Le dry-run sur le run parfumerie **est** la validation du mapping |
| **L3** ✅ | **Ingestion réelle du pilote — livré le 2026-08-20.** Document `master_study` (`c8e7aa8b-8ecd-4af4-9e9e-5b04884d1b35`) + run `master_study` (`522cfe06-f241-4620-a820-a0806a902571`) + E4 canon (`sector_intelligence` patchée, verrous `not_published` posés) + 6 `value_chain_nodes` + 2 `sector_regulatory_items` + 4 `sector_pain_points` + 7 `sector_events`. 8 `competitive_map_entries` orphelines maintenues (décision différée à L4/L5). Recette SQL validée. | ½ j | **Point de bascule.** Rien en aval n'est testable avant |
| **L4** ✅ | `SectorKnowledgeReadModel(segmentId)` · rebranchement de BI sur les vues résolues · démontage du chargement global · groupement corrigé sur `segmentId` (`build-sector-activation-model.ts`) · repointage de `build-sector-playbook-model`. **Livré et vérifié indépendamment le 2026-08-20** — aucun défaut bloquant trouvé (contraste avec L1/L2/L3). Reste ouvert : provenance (`*_Level`) non encore portée par `SectorActivationSector`, badges verrou/héritage absents de BI | 2 j | Correctif réel de « BI ne voit pas la Master Study » |
| **L5** ✅ | **`AccountSectorPerspective` — livré et vérifié indépendamment le 2026-08-20.** Data layer pur (`src/features/master-study/data/get-account-sector-perspective.ts`), aucun consommateur UI. Réutilise `SectorKnowledgeReadModel` (L4) et GATE A (`getCompetitiveMapCitation`) sans modification. Correctif de provenance des 8 `competitive_map_entries` orphelines exécuté (rattachées au run pilote). Détail : `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §4.9. **GATE B design → Cockpit > Secteur reste à faire**, volontairement hors périmètre de ce lot | 1 j | Contre de la donnée réelle, pas imaginée |
| **L6+** | Preuves (`intelligence_source_links`), références croisées E4↔E5, projections Prospection | — | Après mesure d'usage |

**L3 est le point de bascule** : jusque-là, aucun segment ne porte E4 et toute projection se
conçoit contre de la donnée imaginée.

---

# 12. Tests architecturaux obligatoires

## 12.1 Ingestion
- Un run `rejected` n'est jamais matérialisé comme courant.
- Un rejeu du même run est idempotent sur `(segment_id, source_run_id)`.
- Les lignes d'un run antérieur ne sont pas touchées par le rejeu d'un autre.
- **Une erreur à mi-parcours ne laisse aucune ligne écrite sans son estampille** (test de la RPC en
  rollback) — le test qui aurait attrapé la perte du document E5.
- E5 humain reste rattaché au même `source_run_id`.
- Un run `master_study` n'apparaît dans aucune ligne de `v_ai_intelligence_summary`.

## 12.2 Résolution segment / macro
- Absence segment → héritage macro autorisé, `*_level = 'macro'`.
- `resolution_locks` posé → héritage bloqué, valeur `NULL`, `*_level = 'locked'`.
- Écrire `resolution_locks` sur un segment **ne modifie pas** la résolution de ses `caveats`.
- La provenance `segment | macro | locked` reste identifiable sur chaque champ.

## 12.3 Read models
- Même canon, même run → **même sortie**, au caractère près. Aucun LLM.
- `SectorKnowledgeReadModel` ne lit jamais `sector_intelligence` en direct (test de code source,
  patron de `client-intelligence-sector.test.ts:112`).

## 12.4 Perspective compte
- Aucune donnée d'un autre segment, aucune d'un autre snapshot.
- Compte courant correctement identifié ; les pairs restent secondaires.
- Absence E6 gérée sans erreur, et **affichée**.
- `appetence_provisoire` conservé et visible.
- Un champ `NULL` n'est jamais inventé ni comblé.

## 12.5 Cohérence inter-surfaces
Une donnée canonique affichée à plusieurs endroits est identique. `IFRA 52` ne peut pas avoir deux
dates, deux statuts ou deux formulations entre BI, `MasterStudyReader` et Cockpit.

---

# 13. Conséquences

**Positives**
- Disparition de la duplication de connaissance entre écrans.
- Chaque Master Study produite devient réellement exploitable — le chantier reste à **1/38 segments
  porteurs de connaissance** ; c'est le chiffre que L3 fait bouger.
- Cockpit plus pertinent sans devenir plus lourd ; BI plus riche sans imposer sa profondeur partout.
- Provenance et rollback solides, parce qu'atomiques.
- Beaucoup moins de génération IA inutile : E4 a déjà fait le travail analytique.
- Ajouter un consommateur futur = un presenter, jamais une ingestion.

**Coûts assumés**
- Une migration additive de 8 colonnes + réécriture d'une vue et de ses assertions.
- Un importeur métier et ses RPC.
- Deux amendements de contrat E4 (§9.1, §9.2) et un d'E6.
- Le démontage du chargement global de BI.

Ces coûts sont structurels mais bornés. Ils remplacent une dette bien plus coûteuse : plusieurs
versions persistées de la même étude.

**Régression connue et acceptée**
`value_chain_nodes` reçoit désormais des écritures de deux étapes (E4 et E6). Sans discipline sur
`source_run_id`, un rejeu E6 pourrait écraser l'amorce E4. Le test §12.1 « les lignes d'un run
antérieur ne sont pas touchées » est la seule barrière ; il est bloquant.

---

# 14. Ce qui reste ouvert

1. **`intelligence_source_links` — rien en V1 (MS-15).** Étendre l'allowlist n'est pas une ligne :
   la table porte **une seule policy RLS `SELECT`**, il faudrait donc aussi livrer une fonction
   `SECURITY DEFINER` d'écriture scopée workspace, pour zéro consommateur UI. Le besoin réel du
   pilote — « ouvrir la source » depuis BI Calendrier — est déjà couvert par
   `sector_regulatory_items.source_url`. À rouvrir quand un écran le réclame, avec l'ordre de
   priorité : document Master Study → items réglementaires → faits décisifs affichés.
2. **A6 / accessibilité reste à 0 fait sur 621.** `appetence_provisoire = true` sur les 8 entrées du
   pilote : la carte de priorisation C2b a un axe provisoire, et l'UI doit le dire. Hors périmètre
   de cette ADR — c'est l'action **B4** de `registre/ROADMAP-CORRECTIONS.md`.
3. **Références croisées E4 ↔ E5 ↔ E6 (MS-16).** Fallback déterministe en V1, `sector_relevance_refs`
   en V1.1, après validation du premier `AccountSectorPerspective`.
4. **`build-sector-activation-model.ts` groupe au macro.** Signalé depuis le Lot 0 sectoriel, traité
   en L4 avec le rebranchement de BI.

---

# 15. Amendement — 2026-08-21 : le statut `estimated`

## 15.1 Le problème signalé

Le TAM du segment pilote (`seg-parfumerie-compositions-b2b`) était `not_published` alors qu'une
recherche de cinq lignes de prompt a produit un document exploitable, sourcé SNIAA/PRODAROM/INSEE,
en quelques minutes (Guillaume, 2026-08-21). Investigation : `03-sources.json` du run pilote
documente que **SNIAA avait été identifié par la recherche Gemini Deep Research du 14/08, puis
écarté à la fusion mécanique des deux corpus E3 faute d'URL vérifiable dans le JSON source** — pas
un défaut de recherche, un défaut du script de fusion. Le prompt E4 (§ Règles de comparabilité)
interdisait par ailleurs explicitement de « reconstituer par règle de trois » un chiffre de segment
à partir d'un marché plus large — une règle correcte pour empêcher de faire passer le CA d'un
groupe pour celui d'une branche, mais rédigée assez large pour bloquer aussi la triangulation
légitime depuis la propre décomposition publiée d'un syndicat professionnel.

## 15.2 Décision (MS-21)

Un troisième statut, **`estimated`**, vient s'ajouter à `published`/`not_published`/`not_applicable`
(côté corpus, `taille_statut`/`croissance_statut`) et à `segment`/`macro`/`locked` (côté canon,
`resolution_locks` et `*_level`). Il porte une vraie valeur — jamais `NULL`, jamais héritée du
macro — mais distincte d'un chiffre publié tel quel : c'est une triangulation, pas une citation.

**Conditions non négociables** (portées dans le prompt E4, § Règles de comparabilité) :
1. La décomposition elle-même doit être sourcée (tier 1-2) — jamais le chiffre final seul.
2. `taille_methodologie`/`croissance_methodologie` (nouveaux champs du schéma) sont obligatoires
   dès que le statut est `estimated` : lignes sommées, valeurs et parts telles que publiées,
   millésime, ce qui a été exclu et pourquoi.
3. La règle « jamais un chiffre de groupe pour une branche » reste absolue et inchangée — elle
   couvre un cas différent (proxy depuis une seule entreprise), pas la décomposition d'un marché
   par sa propre source officielle.

## 15.3 Ce qui a changé, techniquement

- **DB** (migration `20260821010415_sector_knowledge_estimated_status.sql`) : `private.sector_resolve_scalar`/
  `sector_scalar_level` reparamétrées sur le **statut réel** du verrou (`text`), pas un booléen
  verrouillé/pas verrouillé — nécessaire pour distinguer trois traitements (`not_published`/
  `not_applicable` → `NULL` + `locked` ; `estimated` → valeur conservée + `estimated` ; rien →
  résolution segment/macro normale). `v_sector_knowledge_resolved` recréée en conséquence
  (`security_invoker` vérifié préservé). 19 assertions SQL rejouées, 0 régression.
- **Correction de vocabulaire trouvée en cours de route** : cette ADR documentait `explicit_unknown`
  comme valeur de verrou (§6.3) ; l'importeur L2 (`map-e4-to-canon.ts`) écrit en réalité
  `not_published`, le vocabulaire du corpus lui-même. Les fonctions et assertions utilisent
  `not_published`, pas `explicit_unknown` — ce paragraphe corrige la divergence, elle n'introduit
  pas de nouveau nom.
- **TypeScript** : `SectorResolvedLevel` passe à 4 valeurs dans ses deux définitions
  (`get-sector-knowledge-read-model.ts`, `client-intelligence-sector.ts`) ; `SectorLevelBadge`
  affiche un badge « Estimation » distinct (`text-info`, jamais confondu avec `warning` = verrouillé
  ni `muted` = hérité du macro) ; `E4MarketMetricStatus` étendu.
- **Corpus** : `schemas/sector-knowledge.schema.json` (`taille_statut`/`croissance_statut` + 2 champs
  `*_methodologie`), `prompts/E4-etude-sectorielle.md` (règle de comparabilité amendée avec les
  4 conditions du §15.2).
- **Segment pilote** : `taille_eur_bn` passe de `null`/`not_published` à **2,4** (`estimated`) —
  95 % du CA filière SNIAA 2023 (compositions parfumantes 53 % + ingrédients aromatiques 23 % +
  arômes formulés 19 %, les trois lignes que couvre la description canon du segment), corroboré par
  Insee PRODCOM (1,637 Md€ de facturations NAF 20.53Z 2020). `croissance_pct` reste `not_published` :
  aucune décomposition officielle équivalente n'a été trouvée pour la croissance, et MS-21 n'autorise
  la triangulation que quand la décomposition elle-même est sourcée — pas de précision inventée.
  Sources SNIAA/Insee ajoutées à `03-sources.json` (SRC-030/031) et `04-secteur.json` (src 30/31).

## 15.4 Ce que ça ne change pas

- `resolution_locks.market_growth_pct` reste `not_published` sur le pilote — MS-21 ne force aucune
  triangulation, elle l'autorise seulement quand elle est défendable.
- Aucune migration de `caveats` ni de `dependences_critiques` : le mécanisme est isolé au couple
  scalaire taille/croissance, là où le problème a été signalé.
- Rien ne change pour les segments qui n'ont jamais été étudiés (`resolution_locks = {}`) : ils
  continuent d'hériter du macro normalement.

---

## Sources de cadrage

**Corpus** — `docs/MASTER-STUDY/` : `README.md` §5-§6, `00-DOCTRINE.md`,
`01-CARTE-DE-LA-CONNAISSANCE.md`, `02-DISTRIBUTION-DANS-KREDO.md`, `09-ETAPE-E6…`,
`10-ETAPE-E7…`, `schemas/sector-knowledge.schema.json`, `schemas/competitive-map.schema.json`,
`registre/ROADMAP-CORRECTIONS.md`, `registre/2026-08-parfumerie-compositions-b2b/` (7 livrables).

**Code lu** — `src/features/business-intelligence/data/get-business-intelligence-snapshot.ts`,
`models/build-sector-activation-model.ts`, `models/build-sector-playbook-model.ts`,
`studies/SectorStudiesModal.tsx` · `src/features/competitive-map/data/get-competitive-map-workspace.ts`,
`actions/ingest-competitive-map.ts` · `src/lib/intelligence/client-intelligence-sector.ts`,
`sector-snapshot-data.ts`, `sector-intelligence-contracts.ts`, `intelligence-data.ts` ·
`src/components/accounts-contacts/intelligence/ClientIntelligenceSectorTab.tsx` ·
`src/features/intelligence-missions/` (patron ADR-0020) · `scripts/measure-hiring-intensity.mts`.

**Audit Supabase live du 2026-08-20** — `sector_intelligence`, `sector_events`,
`sector_pain_points`, `sector_regulatory_items`, `sector_news`, `competitive_map_entries`,
`value_chain_*`, `account_facts`, `intelligence_sources`, `intelligence_source_links`,
`intelligence_documents`, `ai_intelligence_runs`, `v_sector_knowledge_resolved`,
`v_ai_intelligence_summary`, `pg_enum`, `pg_constraint`.

> Les constats « live » de cette ADR doivent être réévalués si le schéma évolue.
> Les décisions **MS-1 → MS-21** décrivent la doctrine cible et ne dépendent d'aucun relevé.
