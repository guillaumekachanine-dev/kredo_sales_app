# Gestion des sources — plan de chantier

> **Statut : proposition, soumise à Guillaume. Rien n'est écrit en base, en repo ni sur n8n.**
> Audit code + base réalisé le 2026-08-14 contre la base live (`jvzgmhvwirsbdkjpmvla`) et `main`
> au commit `c1114a64`. Tout chiffre de ce document est mesuré, pas repris d'une doc.

---

## 0. Ce que la feature doit faire (relecture de la demande)

| # | Demande | Traduction technique |
|---|---|---|
| 1 | Bouton « Gérer les sources » dans le header Veille, icône `source_parameters.png` | Launcher Desktop (fin de `VeilleHeaderActions`) + IconButton dans `MobilePageHeader.actions` (aujourd'hui vide) |
| 2 | Modale à 2 sections | « Sources actualités IT » / « Sources veille sectorielle » |
| 3 | Socle 14 sources non modifiable, famille affichée, classement par catégorie | Corpus système verrouillé **par RLS**, pas par un bouton grisé |
| 4 | « + Ajouter une source » (URL, famille, catégorie KREDO) | Server Action owner/admin, dédoublonnage par domaine |
| 5 | « + Ajouter un corpus » : liste, date, nb sources, note d'efficacité ; sélection source par source | Table `source_corpora` + modulation `source_corpus_items.is_enabled` |
| 6 | Consommer le livrable JSON de E3 | Parseur dédié validé contre `schemas/source-registry.schema.json` |
| 7 | « Importer un corpus » depuis l'UI, même mécanisme que carto concurrentielle / comptes & contacts | Wizard `parse → resolve read-only → arbitrage → RPC SECURITY DEFINER` |
| 8 | Les sources sélectionnées sont réellement consultées par n8n | Vue unique `v_effective_watch_sources`, plus aucune liste en dur |
| 9 | V2 : scoring d'efficacité des sources | **Hook posé en V1** (voir §4.6), table V2 |

**Le point 8 est le seul qui puisse échouer silencieusement. C'est lui qui commande l'ordre des lots.**

---

## 1. Audit — état réel, mesuré

### 1.1 La veille hebdomadaire

Workflow : `n8n/veille_ia/veille-hebdomadaire-kredo.json` (20 nœuds).
⚠️ Il est **hors** de `n8n/workflows/`, donc **invisible pour `npm run n8n:status`** : sa dérive
repo ↔ VPS n'a jamais été mesurée.

Les 14 flux RSS sont en dur dans le nœud `Config Sources KREDO` (tableau JS), avec `name`,
`rssUrl`, `homepage`, `secteurDefaut`, `categorieDefaut`, `confiance`.

### 1.2 🔴 Le défaut bloquant : `slice(0, 40)`

Nœud `Dédup + Filtre Récence + Préfiltre Qualité` :

```js
const capped = filtered.slice(0, 40);   // « Cap à 40 candidats pour maîtriser le coût »
```

Les items arrivent **dans l'ordre de la boucle sur les sources**. Le cap est donc **positionnel**.

Mesure en base — les 4 digests existants :

| digest | `nb_sources_actives` | `nb_candidats_evalues` |
|---|---|---|
| 2026-08-10 | 14 | **40** |
| 2026-08-03 | 14 | **40** |
| 2026-07-13 | 14 | **40** |
| 2026-07-07 | 14 | **40** |

4 runs sur 4 à 40/40 : **le plafond est saturé**. Les dernières sources du tableau ne
contribuent déjà rien. Corollaire déterministe : **ajouter une source, manuelle ou issue d'un
corpus, produit exactement zéro candidat supplémentaire**, sans erreur, sans log, sans trace.

Confirmation indirecte : sur 20 articles retenus toutes périodes confondues, **5 sources
distinctes seulement** apparaissent (Journal du Net 7, ChannelNews 7, OpenAI News 4,
L'Usine Digitale 1, ActuIA 1). LeMagIT, source n°1 du tableau, n'apparaît jamais.

**Le correctif existe déjà dans le repo** : `INTEL-033`, nœud `Normalize & Dedup Items`, fait
un tourniquet + tri par fraîcheur, avec le commentaire exact du même diagnostic. Il suffit de
le porter — mais **clé par source**, pas par famille (voir §1.3).

### 1.3 INTEL-033 — veille compte

42 nœuds. **4 collecteurs réels** : `Official Site`, `News Media`, `Public Records`, `Tenders`.
Aucun collecteur emploi ni social, alors que `account_watch_settings` porte `include_jobs` et
`include_social_manual` (colonnes actives, sans consommateur). Le rapport a raison sur ce point.

Le tourniquet y est **clé par `sourceType`** — 4 files. Un corpus sectoriel de 12 domaines
tomberait intégralement dans la file `news_media` et y subirait le même écrasement positionnel.
**Il faut re-clé sur `sourceKey`.**

### 1.4 Écran de configuration actuel

`VeilleHeaderActions.tsx` → dialog « Configurer la veille » : champs libres **Familles de
sources** et **Catégories surveillées**, écrits dans `workspaces.settings`.

Mesure : `select settings from workspaces` → `{}`. **Jamais renseignés, jamais lus par n8n.**
C'est une promesse d'UI sans effet. À supprimer.

`MobilePageHeader` de la veille : `actions` non passé. Rien à réutiliser côté mobile.

### 1.5 Base — compteurs live au 2026-08-14

| Objet | Live | Ce que disent les docs |
|---|---|---|
| `intelligence_sources` | **478** | 42 (CLAUDE.md) · 450 (E3) · 167 (rapport ChatGPT) |
| `intelligence_source_links` | 1 288 | 89 (CLAUDE.md) |
| `account_watch_settings` | 12 | 3 (CLAUDE.md) · 12 (rapport ✓) |
| `veille_digests` / `veille_articles` | 4 / 20 | — |
| `companies` (dont `segment_id`) | 109 / **109** | 96 |
| `sector_intelligence` | 53 | 53 ✓ |
| tables `source*` / `*corpus*` | **0** | — |

`intelligence_sources` : **356 lignes sur 478 pointent `news.google.com`** (`source_type =
news_media`, `collection_method = scrape`), chacune avec une `source_key` de dédoublonnage
d'article. RLS : **une seule policy `SELECT`**. C'est bien un journal de collecte inéditable,
pas un registre. La séparation preuve/configuration est justifiée.

`ai_intelligence_results.company_id` : **nullable** (vérifié `information_schema`).

### 1.6 Le mécanisme d'import à reproduire

`src/features/competitive-map/` — utilisé par `/prospection/cartographies` **et** par
`AccountsContactsViews.tsx`. Chaîne :

1. `domain/competitive-map-output.ts` → `parseCompetitiveMapOutput()`, parsing local, zéro écriture ;
2. `data/resolve-competitive-map-entries.ts` → résolution **lecture seule** contre la base ;
3. `components/CompetitiveMapImportWizard.tsx` → 3 étapes `Préparer → Arbitrer → Finaliser` ;
4. `actions/ingest-competitive-map.ts` → valide, puis `rpc('ingest_competitive_map_batch')`,
   **SECURITY DEFINER**. Le client n'envoie que des décisions déjà vues, jamais une valeur canonique.

C'est le patron exact à répliquer pour l'import de corpus.

---

## 2. Critique du rapport ChatGPT

### 2.1 Ce qu'il a juste, et qu'on garde

1. **Séparation configuration ≠ preuve.** Conforme à E3 §6. Confirmé par la RLS et la
   composition réelle d'`intelligence_sources`.
2. **Trois objets** source / corpus / appartenance + une projection de lecture. Bon modèle.
3. **Verrouillage du socle par RLS**, pas par un bouton désactivé.
4. **Exclusion déterministe du `static`** avant dépense LLM. Conforme à la règle E3 §8.
5. **Ne pas promettre de collecteur emploi/social.** Vérifié : ils n'existent pas.
6. **Supprimer `sourceFamilies` / `categories`.** Vérifié : champs morts.
7. **Ne pas rendre `intelligence_sources` éditable.** Correct.
8. **Vue unique consommée par n8n**, aucune liste parallèle. Correct.

### 2.2 🔴 C1 — Le plan ne peut pas atteindre son propre critère de succès

Le rapport écrit, §5.1 : *« Conserver le plafond de candidats avant classement LLM. »* Et sa
recette Lot 3 attend : *« Un corpus validé actif : ajout uniquement des items news_eligible. »*

Ces deux phrases sont incompatibles. Avec `slice(0,40)` saturé (§1.2), un corpus activé ajoute
**zéro** candidat. La recette passerait au vert en comptant les *sources chargées* (« une source
manuelle RSS active : 15 ») alors qu'aucun *article* supplémentaire n'entre. On livrerait une
feature qui affiche 15 sources et en collecte 3.

Le rapport n'a jamais ouvert ce nœud. C'est le défaut central, et E3 §6 précaution 2 l'avait
nommé : *« Ajouter 15 sources produirait exactement zéro candidat supplémentaire, de façon
déterministe et silencieuse. Le correctif est un quota par source + entrelacement round-robin,
à livrer avant toute extension de corpus. »*

**→ Correctif : le tourniquet devient le Lot 0, avant toute table, toute UI.**

### 2.3 🔴 C2 — L'architecture n'a jamais été testée contre son entrée réelle

Mesure sur `registre/2026-08-parfumerie-compositions-b2b/03-sources.json`, **seul corpus E3
validé du repo** — 29 sources :

| Critère | Résultat |
|---|---|
| `usage_scopes` contient `news` | **2 / 29** (SRC-004 EUR-Lex, SRC-027 TED) |
| `usage_scopes` contient `account_watch` | **7 / 29** |
| `automation_fit = manual_only` | **17 / 29** |
| `collection_url` non nul | 12 / 29 — et **aucun n'est un flux RSS** (docs d'API, formulaires de recherche) |
| `content_temporality = static` | 8 / 29 |

Appliquons le prédicat du rapport (`collection_mode in ('rss','site_search')`, `api` exclu, `manual_only` exclu) :

> **`news` → 0 source. `account_watch` → 0 source.**

Le rapport construit trois tables, une vue, deux shells UI et deux refontes de workflow pour
faire circuler **zéro ligne**.

**La cause : il prend `collection_url` pour la primitive de collecte.** Or dans le schéma E3,
`collection_url` est **nullable** et hétérogène, tandis que **`search_domain` est obligatoire
sur chaque source** (`"search_domain": { "type": "string" }`, dans `required`).

**→ Correctif : `search_domain` est la primitive universelle.** Une source sans flux devient une
requête Google News RSS `site:<search_domain>` — exactement ce que le rapport propose lui-même
pour `account_watch`, mais qu'il n'applique pas à `news`. `collection_url` devient une
*optimisation* (flux direct quand il existe), plus une condition. Et `collection_mode` n'a plus
besoin d'être saisi par le producteur : il se dérive.

Effet mesuré : la collectabilité du corpus parfumerie passe de **2/29 à 21/29** (tout le
non-`static`).

Corollaire : `automation_fit = manual_only` ne doit **pas** exclure. Ce champ qualifie la
légalité d'une *aspiration industrielle* (les `conditions_utilisation` du corpus disent « pas de
scraping de masse »), pas la possibilité d'une *recherche*. Une requête `site:` est une
recherche. Il devient une **dépriorisation**, pas un filtre.

### 2.4 C3 — Prémisse fausse, deux fois, et qui oriente une décision

Le rapport affirme, en tableau de constats puis en interdiction de Lot 1 : *« `ai_intelligence_results.company_id`
est NOT NULL. »* **C'est faux** — la colonne est nullable (`information_schema`, 14/08).

L'erreur n'est pas anodine : `MASTER-STUDY/README.md` §5.2 signale **exactement cette erreur**
dans le document dont ChatGPT l'a héritée (`ANALYSE-CRITIQUE-ET-ARCHITECTURE-CIBLE.md`, classé
ARCHIVE). Le rapport a donc recyclé une archive sans re-vérifier. Ses compteurs le confirment :
`intelligence_sources` annoncé à 167, live à **478**.

Sans conséquence sur l'architecture retenue ici (on ne stocke pas les corpus dans
`ai_intelligence_results` de toute façon), mais cela impose de re-vérifier chacune de ses
affirmations de schéma avant de s'en servir.

### 2.5 C4 — Un lot entier consacré à réparer un document interdit d'usage

Lot 0 du rapport : *« Le référentiel Électronique B2B doit être réparé avant import. »*

Ce fichier **n'existe pas dans le repo** (seul `Référentiel Sources Tourisme France.md` est
présent), et `MASTER-STUDY/README.md` §5.3 classe tout le corpus antérieur au standard —
`cartographie-concurrentielle/03-sources.md` inclus — en **PÉRIMÉ**, application interdite.
Réparer un livrable qu'on n'a pas le droit d'appliquer est du travail à valeur négative.

**→ Lot 0 du rapport supprimé.**

### 2.6 C5 — Le verrou d'activation empêche d'activer quoi que ce soit

Rapport : *« Un corpus draft n'entre jamais dans la vue effective »*, activation réservée aux
corpus validés. Or, E3 §7 : *« `production_ready` est interdit tant qu'une `collection_url`
reste non probée »*, et G1 exige ≥ 15 requêtes journalisées.

Le corpus parfumerie porte `"requetes": 0`, aucun `03-journal.md`, et 2 sources en
`validation_status: pending`. **Il ne pourra jamais atteindre `production_ready`.** On livrerait
une modale de corpus où aucun interrupteur ne peut être basculé.

**→ Correctif : découpler deux verdicts qui n'ont pas le même objet.**

| Verdict | Question | Producteur | Effet |
|---|---|---|---|
| `quality_verdict` (G1) | « puis-je **citer** cette source comme preuve en rendez-vous ? » | `scripts/audit-master-study.py`, hors contexte producteur | **Documentaire.** Affiché comme badge. N'active rien, ne bloque rien |
| `activation_state` | « est-ce que je **collecte** avec ce corpus ? » | Guillaume, owner/admin, explicitement | Pilote la vue effective |

Un corpus qui parse, dont les packs résolvent, et qui porte ≥ 1 source collectable, est
activable — avec un badge « sous caveats » visible. La qualité épistémique et le débit de
collecte sont deux choses différentes ; les confondre gèle la feature.

### 2.7 C6 — Dérive sémantique sur la section 2

Guillaume : « **Sources veille sectorielle** ». Le rapport : « Sources veille des comptes »,
scopée par `account_watch_settings` compte par compte.

Ce n'est pas la même chose. Un corpus est rattaché à un **segment** (`sector_intelligence`), et
il doit alimenter **et** la veille globale **et** tout compte de ce segment — les 109 comptes
ont un `segment_id`. La maille naturelle est le secteur ; l'héritage compte en est une
conséquence, pas l'objet.

**→ La section garde son nom sectoriel. L'héritage vers les comptes s'affiche comme effet
(« ce corpus alimente 7 comptes du segment »), pas comme point d'entrée.**

### 2.8 C7 — Sur-ingénierie à raboter

| Ce que propose le rapport | Verdict |
|---|---|
| `unique (id, workspace_id)` + FK composites sur les 3 tables | Aucun précédent dans le repo. L'isolation vient de la RLS + `DEFAULT current_workspace_id()`. **Retiré** |
| `source_corpora.is_locked` | Redondant avec `scope_kind = 'system'`. **Retiré** |
| `pack_role = 'base'` | Redondant avec `origin = 'system'`. **Retiré** — on garde `minimal`/`enrichi`, le vocabulaire E3 |
| `source_key` + `canonical_url` + `homepage_url` + `domain` + `external_source_id` | 5 colonnes d'identité. **On garde `source_key`, `domain`, `search_domain`, `collection_url`, `homepage_url`, `external_src_id`** — chacune a un usage distinct, `canonical_url` disparaît |
| `content_temporality` en `static\|event\|mixed` | **Inventé.** Le schéma E3 dit `static\|periodic\|continuous`. On s'aligne sur E3 : pas de troisième vocabulaire |
| Wizard d'import | Traité en note de bas de page alors que c'est la demande n°7. **Promu en lot dédié** |

### 2.9 C8 — La provenance n'est pas résolue

E3 §6 précaution 1 : sans déballage de l'éditeur réel, une source qualifiée T3 `corroboration`
écrit une preuve portant `news.google.com`, et **tout l'appareil tier/score devient
infalsifiable**. Mesure : 356/478 lignes d'`intelligence_sources` sont déjà dans ce cas.

Le rapport n'en dit rien — alors que son architecture, corrigée par C2, fait passer *l'essentiel*
de la collecte corpus par Google News RSS, ce qui aggrave le problème.

**→ Déballage `<source url="…">` / paramètre `url=` au moment de la collecte. Coût quasi nul,
et c'est aussi la clé de jointure du scoring V2.**

### 2.10 C9 — Le V2 n'a aucun crochet

Guillaume demande un scoring d'efficacité des sources en V2. Le rapport n'en dit pas un mot, et
son modèle ne laisse aucune prise : rien ne relie un article retenu à la source du catalogue.

**→ Une colonne nullable en V1 : `veille_articles.source_catalog_id`.** « Quelles sources
produisent des articles retenus » devient un `group by` dès le premier run, sans table
supplémentaire et sans backfill ultérieur.

---

## 3. Architecture retenue

### 3.1 Modèle

```
source_catalog ──< source_corpus_items >── source_corpora ──> sector_intelligence (segment)
      │                                          │
      │                                          └── activation_state · enabled_for_news
      │                                              enabled_for_account_watch · quality_verdict
      │
      └──> v_effective_watch_sources (security_invoker) ──> n8n (news | account_watch)
      │
      └──< veille_articles.source_catalog_id            [crochet scoring V2]
      └──< intelligence_sources.technical_metadata      [preuves, inchangé]
```

**`source_catalog`** — le point de collecte.
`source_key` (unique/workspace) · `name` · `publisher` · `domain` · **`search_domain` NOT NULL** ·
`collection_url` nullable · `homepage_url` · `family` · `kredo_category` (CHECK) ·
`origin` (`system|manual|corpus`) · `content_temporality` (`static|periodic|continuous`) ·
`usage_scopes text[]` · `validation_status` · `is_active` · `is_locked` · `last_verified_at` ·
`last_error` · `created_by` · timestamps.
`collection_mode` **n'est pas stocké** : dérivé à la lecture (`rss` si `collection_url` ressemble
à un flux, sinon `site_search`).

**`source_corpora`** — un corpus versionné.
`scope_kind` (`system|sector`) · `sector_id → sector_intelligence` (le **segment**) · `slug` ·
`version` · `snapshot_date` · `is_current` · **`quality_verdict`** (G1, documentaire) ·
**`activation_state`** (`draft|active`) · `enabled_for_news` · `enabled_for_account_watch` ·
`source_document_path` · `source_document_hash` · `gaps jsonb` · `metadata jsonb`
(compteurs, familles obligatoires, matrice de couverture, `besoins_information`).

**`source_corpus_items`** — appartenance + qualification contextuelle.
`corpus_id` · `source_id` · `external_src_id` (`SRC-007`) · `pack` (`minimal|enrichi`) · `tier` ·
`primary_role` · `utility_score` · `automation_fit` · `familles_couvertes text[]` · `atteste` ·
`news_eligible` · `account_watch_eligible` · `is_enabled` · `exclusion_reason`.
Les deux `*_eligible` sont **calculés à l'import** depuis `usage_scopes` + `content_temporality`,
puis modulables un à un par l'utilisateur (demande n°5).

**Colonnes additives**
`account_watch_settings.include_sector_corpus boolean not null default true`
`veille_articles.source_catalog_id uuid null references source_catalog(id) on delete set null`

### 3.2 La vue `v_effective_watch_sources`

`security_invoker = true`. Trois branches (`news` direct · `news` corpus · `account_watch` corpus
avec héritage segment → macro), `distinct on` + `priority`.

Prédicat, **corrigé par rapport au rapport** :

```
content_temporality <> 'static'          -- règle déterministe E3, dure
is_active AND validation_status not in ('rejected','unreachable')
<scope> = any(usage_scopes)
-- PAS de filtre sur collection_mode : search_domain suffit toujours
```

Sortie par ligne : `usage_scope` · `company_id` · `source_id` · `source_key` · `source_name` ·
`publisher` · `domain` · **`search_domain`** · `collection_url` · `collection_mode` (dérivé) ·
`family` · `kredo_category` · `origin` · `corpus_id` · `utility_score` · `priority`.

`priority` : `system` (0) < `manual` (1) < corpus `pack=minimal` (2) < corpus `pack=enrichi` (3),
`automation_fit='manual_only'` dépriorisé d'un cran. C'est ce qui règle l'ordre du tourniquet.

### 3.3 RLS

- SELECT : workspace, `authenticated`, sur les 3 tables et la vue.
- INSERT/UPDATE/DELETE : `is_workspace_admin()` **ET** `origin <> 'system'` /
  `scope_kind <> 'system'` **ET** `not is_locked`. Le socle est intouchable par API utilisateur.
- Import de corpus : **jamais en écriture directe**. RPC `ingest_source_corpus(p_payload jsonb,
  p_segment_slug text, p_reason text)`, `SECURITY DEFINER`, `search_path = ''`, calquée sur
  `ingest_competitive_map_batch`.
- `service_role` (n8n) : lecture de la vue. Écriture uniquement de `source_catalog.last_verified_at` /
  `last_error` / `validation_status='unreachable'`.

### 3.4 n8n

**Veille hebdomadaire** :
1. ✅ *(Lot 0)* **`slice(0,40)` → tourniquet par source + tri fraîcheur**, dédup douce sur titre,
   `nb_sources_actives` = sources réellement contributrices.
2. *(Lot 2)* `Config Sources KREDO` → HTTP GET sur la vue (`usage_scope=eq.news`), tri `priority, utility_score desc`.
3. *(Lot 2)* Branche `site_search` → Google News RSS `https://news.google.com/rss/search?q=site:<search_domain>+<termes>&hl=fr&gl=FR&ceid=FR:fr`.
4. *(Lot 2)* **Déballage de l'éditeur réel** (`<source url>`, puis paramètre `url=`) avant écriture.
   Volontairement **hors Lot 0** : les 14 flux actuels sont des flux d'éditeur direct — vérifié,
   les 20 URLs stockées sont toutes des URLs d'éditeur. Le déballage devient nécessaire au moment
   exact où la branche Google News apparaît, pas avant ; l'ajouter plus tôt aurait été du code mort.
5. *(Lot 2)* Le tourniquet se re-clé sur `source_id` (il retombe aujourd'hui sur `sourceName`) ;
   `source_catalog_id` propagé jusqu'à `veille_articles` ; échec explicite si la vue renvoie 0.

**INTEL-033** :
1. `include_sector_corpus` (payload, `Validate Payload`, défaut `true`).
2. Branche corpus après `Load Company Details` : ≤ 12 requêtes `site:<search_domain>` × variantes de nom, priorité `pack=minimal` puis `utility_score`.
3. **Tourniquet re-clé de `sourceType` vers `sourceKey`** — sinon les 12 domaines corpus s'écrasent entre eux dans la file `news_media`.
4. Filtre administratif déterministe avant `Build Qualification Prompt` (rejet NAF/SIREN/siège **sans verbe d'événement** ; conservation transfert de siège, fusion, acquisition, nomination, radiation, liquidation, capital, attribution). Compteur `excluded_static_count`.
5. `sourceCatalogId` / `corpusId` / `collectedVia` dans `technical_metadata`.
6. Aucune convergence touchée : `include_public_records=false`, `include_tenders=false`, 0 item, 0 signal, 0 lien, failure callback.

⚠️ **Les deux workflows sont importés à la main par Guillaume.** Et `n8n:status` ne voit pas
`n8n/veille_ia/` — à déplacer sous `n8n/workflows/` pendant le Lot 0.

### 3.5 UI

**Adaptive plein, mais serré** : un launcher, des contrats et composants feuilles partagés,
**deux shells**. Le contenu diverge réellement (Desktop = tableau dense famille/catégorie/état ;
Mobile = divulgation progressive). Jamais de composant Desktop monté puis caché en CSS.

```
src/features/source-management/
  domain/source-registry-output.ts      ← parseur du JSON E3 (miroir de competitive-map-output.ts)
  domain/source-management-contracts.ts ← types, catégories KREDO, validateurs URL
  data/get-source-management-snapshot.ts
  data/resolve-source-corpus-import.ts  ← résolution LECTURE SEULE
  actions/source-management-actions.ts  ← CRUD source manuelle, toggles corpus/item
  actions/ingest-source-corpus.ts       ← RPC SECURITY DEFINER
  components/SourceManagementLauncher.tsx
  components/SourceManagementDialogDesktop.tsx
  components/SourceManagementDrawerMobile.tsx
  components/SourceCorpusImportWizard.tsx
  components/{SourceBaseList,SourceCorpusCard,ManualSourceForm}.tsx
  __tests__/
```

> Convention `src/features/` (CLAUDE.md), pas `lib/` + `components/`. Le rapport proposait
> `src/components/veille/sources/` + `_data/` — c'est le patron ancien, et ce domaine est
> destiné à sortir de la veille (Knowledge Hub, cockpit compte).

Sections, conformes à la demande :
- **Sources actualités IT** — socle 14 verrouillé (famille + catégorie, groupé par catégorie),
  sources manuelles, corpus activés pour `news`.
- **Sources veille sectorielle** — corpus par segment, verdict G1 en badge, nb sources
  collectables/total, activation par usage, modulation source par source, et l'effet sur les
  comptes du segment.
- **+ Ajouter une source** et **+ Ajouter un corpus** / **Importer un corpus** : états internes
  du même shell, jamais de dialog imbriqué.

Nettoyage : suppression des champs **Familles de sources** et **Catégories surveillées** de
« Configurer la veille » et de `GlobalWatchSettings` (`enabled`, `cadence`, `maxArticles` restent).

---

## 4. Séquencement

> **Inversion majeure par rapport au rapport.** Il place l'UI en Lot 2 et ne corrige jamais le
> collecteur. E3 §6 précaution 3 : *« On branche avant de peindre. Le premier consommateur d'un
> corpus doit être un workflow, pas une interface d'édition. »*

| Lot | Périmètre | Gate de sortie | Valeur si on s'arrête là |
|---|---|---|---|
| **0 — Débloquer le collecteur** ✅ **LIVRÉ 2026-08-14** | n8n veille hebdo seul : tourniquet par source, dédup douce sur titre, `nb_sources_actives` honnête, déplacement sous `n8n/workflows/`. **Aucune table, aucune UI.** → `HANDOFF-LOT0.md` | Harnais Node 29/29 ; contre-épreuve : ancien code 2/14 sources, nouveau 14/14 | ✅ La veille actuelle s'améliore immédiatement |
| **1 — Socle base** | 3 tables + vue + RLS + RPC d'ingestion + seed des 14 + `include_sector_corpus` + `veille_articles.source_catalog_id` + `db:types` | Assertions SQL, advisors sécurité/perf, isolation workspace | Rien de visible |
| **2 — Branchement veille hebdo** | Le workflow lit la vue. Toujours aucune UI. | Run : 14 socle, source en erreur isolée, échec si 0 ligne | ✅ Les sources sont pilotées par la base |
| **3 — UI Gérer les sources** | Launcher, dialog Desktop, drawer Mobile, source manuelle, activation/modulation corpus, nettoyage des champs morts | typecheck · test · server-boundary · lint · build ; QA 1440×900 et 390×844 (Guillaume) | ✅ La demande 1→5 est livrée |
| **4 — Import de corpus** | Parseur E3, résolution lecture seule, wizard 3 étapes, RPC | Import du corpus parfumerie : 29 sources, 21 collectables, 8 `static` exclues et expliquées | ✅ Demandes 6 et 7 |
| **5 — INTEL-033 sectoriel** | `include_sector_corpus`, branche corpus, tourniquet re-clé, filtre administratif | Compte avec segment / fallback macro / sans corpus ; 0 item ; erreur isolée | ✅ Héritage sectoriel |
| **6 — V2 scoring** *(hors chantier)* | Exploitation de `source_catalog_id` | — | — |

**Après le Lot 2, la feature est utile. Après le Lot 3, elle est visible. À aucun moment on ne
peint sur un tuyau bouché.**

Ordre d'application en production, quand tout est vert : migration → déploiement app →
import/publication veille hebdo → publication INTEL-033 → smoke tests.
**Aucun commit, push, migration live, déploiement ou import n8n sans ordre explicite.**

---

## 5. Recette

| Cas | Attendu |
|---|---|
| **Tourniquet (Lot 0)** | Sur un run réel, ≥ 10 des 14 sources contribuent au moins 1 candidat. Aujourd'hui : ~3 |
| Socle | 14 lignes, verrouillées ; `update` par `authenticated` **refusé par la RLS**, pas par l'UI |
| Ajout manuel RSS | `pending`, visible, collectée au run suivant |
| Doublon de domaine | Refus explicite + proposition d'activer la source existante |
| Corpus `draft` | Visible, badge Brouillon, activation impossible |
| Corpus activé | Seuls ses items `news_eligible` + `is_enabled` entrent dans la vue |
| Source `static` | Visible dans le corpus, **absente de la vue**, motif affiché |
| Source `manual_only` | **Présente**, dépriorisée — pas exclue (voir C2) |
| Import parfumerie | 29 sources, 21 collectables, 8 `static` exclues nommément, packs disjoints et couvrants |
| Compte segmenté | Corpus du segment ; à défaut, du macro ; **jamais les deux** |
| Compte sans corpus | Les 4 collecteurs continuent sans erreur |
| Flux en erreur | Le run continue, source tracée `unreachable` |
| Désactivation | Aucun article, signal ou preuve historique supprimé |
| Provenance | Un article collecté via Google News écrit l'**éditeur réel**, pas `news.google.com` |

Commandes, dans l'ordre : `typecheck` → `test` → `check:server-boundary` → `lint` → `build`,
plus assertions SQL, advisors Supabase et tests structurels n8n.

---

## 6. Risques

| Risque | Traitement |
|---|---|
| **Le tourniquet augmente le coût LLM** | Non : le plafond reste 40. Il change *quels* 40, pas *combien* |
| **Un corpus élargit la collecte au-delà de 40** | Le plafond global tient. Effet réel : plus de diversité, pas plus de coût |
| Google News `site:` ne renvoie rien sur un domaine institutionnel | Attendu et acceptable. Tracé, source marquée `unreachable` après N runs à vide |
| CGU : « pas de scraping de masse » sur 17 sources | Une requête `site:` est une recherche, pas une aspiration. C'est déjà le mécanisme d'INTEL-033. `automation_fit` reste affiché et dépriorise |
| Import n8n manuel oublié | Les Lots 2 et 5 sont sans effet tant que le VPS n'est pas à jour. À vérifier explicitement à chaque gate |
| `n8n/veille_ia/` hors de `n8n:status` | Déplacé au Lot 0 |

---

## 7. Ce que je demande de trancher

1. **La primitive de collecte est `search_domain`, pas `collection_url`** (C2), et `manual_only`
   dépriorise sans exclure. C'est la décision qui fait passer un corpus de 2 à 21 sources
   utilisables. Sans elle, le chantier n'a pas d'objet.
2. **Découplage verdict G1 / activation opérationnelle** (C5) : tu actives ce que tu veux
   collecter, le verdict reste affiché comme badge et ne verrouille rien.
3. **L'ordre des lots** : le collecteur d'abord (Lot 0), l'UI en Lot 3. Le rapport faisait
   l'inverse.
4. **La section 2 reste sectorielle**, pas « comptes » (C6).
5. Périmètre du Lot 0 : le porter **seul**, tout de suite, indépendamment de la suite ?
