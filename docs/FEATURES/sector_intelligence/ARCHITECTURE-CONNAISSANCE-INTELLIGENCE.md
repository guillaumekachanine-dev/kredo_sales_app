> 🟡 **ARCHIVE — raisonnement conservé, application interdite** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Colonne vertébrale du chantier, reprise intégralement dans le corpus (nomenclature des blocs, décisions D-A→D-H). Ses compteurs du 12/08 sont périmés — voir `MASTER-STUDY/registre/ETAT-DES-LIEUX-2026-08-13.md`. Le compte de blocs est 37, pas 36.
> **Référence à appliquer : `MASTER-STUDY/01-CARTE-DE-LA-CONNAISSANCE.md` + `02-DISTRIBUTION-DANS-KREDO.md`**

---

# Architecture de la connaissance — pages Intelligence

**Colonne vertébrale du chantier.** Ce document fait autorité sur : le périmètre métier de chaque page et onglet, la nomenclature unique des blocs de connaissance, l'état réel de chacun, qui le produit, où il est rangé, et dans quel ordre on construit.

Snapshot : **12/08/2026** · Tous les chiffres de base ont été relevés en production le 11 et 12/08/2026.
Amont : `cartographie-concurrentielle/08` (audit des deux études) et `/09` (méthode ultime) · ADR-0018 (shell) · ADR-0019 (profondeur de compte) · `sources_intelligence_standards/` (standard sources v1.0).
Aval attendu : un ADR-0020 qui grave les décisions D-A à D-H ci-dessous.

---

## 0. Résumé exécutif

**La question posée** — étude « master » unique, ou lots de connaissance indépendants ? — a une réponse tranchée, et ce n'est pas « un peu des deux » au hasard :

> **La cohérence impose le master. La fraîcheur impose les lots.**
> Un bloc qui doit être vrai *en même temps* que les autres ne peut pas être un lot indépendant : il se contredirait. Un bloc qui périme plus vite que l'étude ne peut pas être dans le master : il la ferait pourrir entière.

Ce critère unique découpe les 36 blocs de connaissance en trois régimes (§7), et il tombe presque exactement sur la frontière des trois régimes de production du document 09 (déterministe / génératif sourcé / humain).

**Le constat qui commande tout le reste** : la connaissance sectorielle vit à **95 % sur les macro-secteurs**, les comptes à **100 % sur les segments**. Le pont existe — `companies.sector_id` est rempli sur 98/98 et coïncide avec `segment.parent_id` dans **100 % des cas** — mais il est **unidirectionnel et grossier** : toute l'application lit `sector_id`, donc le macro, et **rien ne lit le segment**. Conséquences : les trois comptes du segment « 5.1 Spatial, défense & systèmes critiques » voient exactement ce que voit n'importe quel compte aéronautique ; et surtout, **la méthode 08/09 produit au niveau segment — cette production serait aujourd'hui invisible à l'écran.**

**Les trois chaînons manquants, dans l'ordre de blocage** :
1. La résolution sectorielle héritée `segment ∪ macro` (une vue, 0,5 j). Effet visible immédiat quasi nul — c'est un lot d'**infrastructure** : il rend lisible la maille à laquelle toutes les études futures écrivent.
2. `competitive_map_entries` : table livrée par la migration 067, **0 ligne** — donc pas de matrice, pas de fiches concurrents, pas de tableau comparatif, pas de priorisation. Trois études sont prêtes à y entrer.
3. L'identité France : **6 comptes sur 98 ont un SIREN**.

---

## 1. L'état réel — ce que la base contient vraiment

### 1.1 La fracture macro / segment

| | Macro (15 fiches) | Segment (38 fiches) |
|---|---:|---:|
| Comptes rattachés directement | **0** | **98** |
| Comptes atteignables via enfants | 98 | 0 |
| Items réglementaires | **61** | 3 |
| Pain points | **77** | 6 |
| Événements commerciaux | **47** | 5 |
| Actualités | **7** | 0 |
| Fiches avec description | 15/15 | **1/38** |
| Playbooks réellement remplis (personas/objections/entry_points/roi) | **13/15** | **2/38** |
| `attractiveness_score` | 13/15 | 2/38 |
| `market_size_eur_bn` | 6/15 | 1/38 |

Les 36 segments en statut `development` portent un playbook **structurellement présent mais vide** : les 4 clés existent, les 4 tableaux sont à zéro. C'est un squelette posé par la migration de taxonomie, pas de la connaissance.

**Ce qui marche déjà, et qu'il ne faut pas casser** — vérifié le 12/08 : `companies.sector_id` est renseigné sur **98/98**, pointe sur un **macro dans 100 % des cas**, et **égale `segment.parent_id` dans 100 % des cas** (0 incohérence, 0 segment orphelin). La cohérence est maintenue par `apply_account_classification()` (migration 068), qui écrit les deux colonnes ensemble. Les loaders lisent tous `sector_id` : `account-panel-data.ts`, `intelligence-data.ts` (→ `getSectorSnapshot`), `get-portfolio-intelligence-snapshot.ts`.

**Ce qui ne marche pas** :
- **Personne ne lit le segment.** Les 3 comptes de « 5.1 Spatial » voient les 5 items réglementaires et 6 pain points du macro « Aéronautique, Spatial & Défense » — les mêmes que tout compte aéro. La granularité fine de la taxonomie n'a aucun consommateur.
- **La production future est invisible.** Une étude conduite selon la méthode 08/09 porte sur un **segment**. Écrite au bon niveau, elle ne s'afficherait nulle part.
- **19 comptes sur 98 ne voient réellement rien** : 3 macros sur 15 sont à zéro item réglementaire, zéro pain point, zéro persona — « Secteur public, ESR » (10 comptes), « Services aux entreprises » (8), « Non rattaché » (1).
- **`sector_id` est une dénormalisation.** Cohérente aujourd'hui parce qu'une seule RPC l'écrit ; un `update` direct la ferait diverger en silence, sans qu'aucun test ne le voie.

> **D-B — Règle de résolution héritée.** La connaissance d'un compte = `union(sa fiche segment, sa fiche macro parente)`, le segment primant sur le macro champ par champ. C'est une vue SQL, pas une migration de données : on ne recopie rien, on résout à la lecture. `sector_id` cesse d'être une source de lecture et redevient ce qu'il est — une projection.

### 1.2 Les compteurs qui décident du plan

| Objet | Table | État 12/08/2026 | Lecture |
|---|---|---|---|
| Identité juridique | `companies.siren` / `naf_code` | **6 / 98** | Le socle déterministe n'existe pas |
| Taille / CA / site | `companies` | 68 / 66 / 82 sur 98 | Hérité FOLIO, non sourcé |
| Faits sourcés | `account_facts` | 53 lignes, **5 comptes**, 12 `fact_type` tous narratifs | Aucun fait d'identité ni d'accessibilité |
| Cartographie concurrentielle | `competitive_map_entries` | **0** | Table livrée, jamais alimentée (ADR-0019 Lot 5) |
| Profondeur de compte | `companies.depth_level` | `active`/`noted`/`qualified` — **aucun `mapped`** | Confirme qu'aucune étude n'a été ingérée |
| Signaux | `account_signals` | 808 dont **673 `company_context`** ; actionnables : 28 lignes / **14 comptes** | Le moteur tourne, le carburant est du contexte |
| Enjeux | `account_issues` | 46 lignes / **8 comptes** | Amorcé |
| Roadmap | `account_roadmap_actions` | **0** | Non amorcé (gate ADR-0012 Lot 7) |
| Échéances datées | `sector_regulatory_items` | 64 lignes, 51 datées, **35 futures**, 13 secteurs / 53 | Le meilleur actif inexploité |
| Chaîne de valeur | `value_chain_*` | 10 nœuds / 50 acteurs / 20 liens — **1 secteur (BTP)** | Pilote validé en interne, non industrialisé |
| Sources | `intelligence_sources` | 167 dont 110 `news_media`, **27 `job_board` < 90 j** | La brique emploi tourne déjà |
| Documents | `intelligence_documents` | 112, 13 types | Vivant |
| Contacts qualifiés | `contacts.relationship_role` | 533/644 sans rôle, **0 DSI** | L'enum a la valeur, personne ne l'utilise |
| Interactions récentes | `interactions` | 112 < 90 j | Vivant |

### 1.3 Ce qui existe déjà côté interface

Les coquilles sont largement construites — c'est une bonne nouvelle sous-estimée.

| Page | Route | Onglets existants | État |
|---|---|---|---|
| Business Intelligence | `/intelligence` | Brief stratégique · Fenêtres · Analyse sectorielle · Chaîne de valeur · Environnement concurrentiel | **5 onglets, données partielles** |
| Prospection | `/prospection-intelligence` | Stratégie · Fenêtres d'opportunités · Approches commerciales · Playbooks | **Coquille (68 lignes), desktop seul** |
| Cockpit compte | `/prospection/accounts/[id]` | Accueil · Socle · Entreprise · Secteur · Enjeux · Stratégie · Roadmap | **7 onglets câblés**, séquencement ADR-0012/0019 en place |

`get-business-intelligence-snapshot.ts` lit déjà `sector_intelligence`, `sector_pain_points`, `sector_events`, `sector_news`, `sector_regulatory_items`, `account_signals`, `account_score_current`, `account_score_components`. La plomberie de lecture existe ; **elle lit au mauvais niveau de taxonomie** (§1.1) et sur des tables trop peu remplies.

`getSectorMapCatalog()` lit bien `value_chain_*` en base — la chaîne de valeur n'est pas une maquette.

---

## 2. Périmètre métier et finalité — page par page, onglet par onglet

Principe de découpe : **une page = un lecteur, un moment, une question.** Si deux pages répondent à la même question, l'une des deux est de trop.

| Page | Lecteur | Moment | Question unique |
|---|---|---|---|
| **Business Intelligence** | Directeur commercial, business developer en préparation | Une fois par secteur, relu avant chaque campagne | *« Que faut-il savoir de ce marché pour y être crédible et y choisir ses cibles ? »* |
| **Prospection** | Business developer en action | Chaque matin, avant chaque appel | *« Que fais-je aujourd'hui, avec qui, avec quel discours ? »* |
| **Cockpit compte** | Business developer sur un compte nommé | Avant un rendez-vous, pendant l'instruction d'un compte | *« Que sais-je de ce compte, et quelle est la meilleure prochaine action ? »* |

> **D-D — La page Prospection ne produit aucune connaissance.** Elle compose et convertit ce que BI et le cockpit détiennent. Toute donnée qui n'apparaîtrait que là serait une troisième vérité à maintenir. C'est la règle qui empêche le « deuxième cockpit » explicitement interdit par l'ADR-0018.

### 2.1 Business Intelligence — 4 onglets

| Onglet | Finalité | Ce qu'il doit produire chez le lecteur | Blocs (§3) |
|---|---|---|---|
| **Étude sectorielle** | Comprendre le marché comme un praticien | Pouvoir tenir 3 minutes sans être interchangeable | S1 S2 S4 S5 S6 S9 S13 |
| **Environnement concurrentiel** | Savoir qui est qui, et qui viser | Une file d'attente de comptes, ordonnée et justifiée | C1 C2 C3 C4 C5 C6 |
| **Chaîne de valeur** | Savoir où se branche l'ESN et de quoi le secteur dépend | Un angle d'entrée par maillon + un outil de découverte en rendez-vous | S8 (+ maillons clés / dépendances critiques / points de vulnérabilité) |
| **Calendrier réglementaire** | Savoir pourquoi maintenant | Un motif d'appel daté, vérifiable, prononçable | S7 |

Les onglets actuels « Brief stratégique » et « Fenêtres » **migrent vers Prospection** (ADR-0018 les y place déjà) : ce sont des produits d'action, pas de connaissance. BI garde la matière, Prospection garde l'usage.

### 2.2 Prospection — 4 onglets

| Onglet | Finalité | Contrat de composition |
|---|---|---|
| **Brief stratégique** | Recommandations IA argumentées, adossées à la connaissance disponible **au-dessus d'un seuil de confiance** | Ne consomme que des blocs marqués `verified_fact`/`declared_fact` ; cite ses sources ; se tait sur ce qu'il ignore |
| **Fenêtres d'opportunité** | Compiler toute source d'opportunité en objets actionnables | Vue dérivée (D-18 de l'ADR-0018), **jamais une table** : réglementaire + événements + pain points + actualités + enjeux comptes + signaux |
| **Roadmap & campagnes** | Séquencer dans le temps, avec objectifs mesurables | Écrit dans `account_roadmap_actions` (draft) ; la matérialisation en `tasks`/`calendar_events`/`opportunities` reste gatée (ADR-0012 D-2) |
| **Playbook sectoriel** | Hub de préparation : réviser, rôder le discours, tester des approches | **Projection calculée**, pas un document — voir D-E |

**Anatomie d'une fenêtre d'opportunité** (le contrat, tel que décrit dans la demande) :
```
déclencheur (réglementaire | actualité | événement | pain point | signal | enjeu)
  → exposé de la fenêtre et des enjeux induits
  → argumentaire de l'intérêt commercial
  → adéquation offres Kredo (practice_id, offer_id)
  → synthèse de l'angle d'approche
  → comptes concernés, ordonnés par la carte de priorisation de l'étude
  → prochaine meilleure action + interlocuteur
  → génération de contenu + export « fiche de fenêtre »
```
Les six premières lignes sont **calculables** dès que S7/S9/C2 sont remplis. Les deux dernières demandent A3 (contacts) et A6 (accessibilité).

> **D-E — Le playbook sectoriel est une projection, pas un contenu.** Il se calcule depuis `sector_intelligence.playbook` (personas, objections, entry_points, roi_arguments) × `sector_pain_points` × `sector_regulatory_items` × `competitive_map_entries` × `offers`. Écrire un playbook à la main serait dupliquer cinq sources qui divergeraient. Le module est interactif *parce qu'*il est dérivé.

### 2.3 Cockpit compte — 7 onglets

L'arborescence cible (ADR-0018 D-16/D-17) et le code sont déjà alignés. Reste à remplir.

| Onglet | Finalité | Blocs |
|---|---|---|
| **Accueil** | Une seule action recommandée (D-6 ADR-0019) | dérivé |
| **Socle** | Fiche d'identité vérifiable | A1 A2 |
| **Entreprise** | Connaissance de l'entreprise + contacts et organisation | A3 A4 A5 A6 A7 |
| **Secteur** | Replacer le compte dans son segment, sur la matrice, dans la chaîne de valeur | A12 + héritage S/C |
| **Enjeux** | Synthèse des enjeux réglementaires, propres et événementiels | A9 |
| **Actualités** | Signaux détectés + paramétrage de veille dédiée | A8 |
| **Stratégie / Roadmap** | Activité passée et programmée + plan d'adressage + contenu commercial | A10 A11 |

La « fiche d'identité » demandée (métiers, NAF, SIREN, secteur/segment, convention collective, siège, création, effectifs, CA, croissance, **régime d'achat**, site, tier, relation) recoupe exactement A1 + A2 : les 7 axes de classification de la migration 068 couvrent déjà `regime_achat`, `tier`, `relation_type`, `modele_eco`, `moment`, `vertical_client`, `segment`. **Le contrat existe ; il manque le remplissage déterministe de la moitié identité.**

---

## 3. Nomenclature unique des blocs de connaissance

36 blocs, 4 familles, 3 portées. **Cette nomenclature est la clé de jointure entre le plan documentaire, les tables et les écrans.** Tout ce qui suit y fait référence.

Portée : `M` macro · `G` segment · `A` compte. Régime : `D` déterministe · `R` recherche sourcée · `H` humain · `X` calculé/dérivé.

### Famille S — Connaissance sectorielle

| Id | Bloc | Portée | Régime | Table cible |
|---|---|---|---|---|
| S1 | Périmètre et définition du marché, ce qui est hors champ | G | R | `sector_intelligence.description` + `caveats` |
| S2 | Volume FR/UE, évolution 5 ans, moteurs de croissance | G/M | R | `market_size_eur_bn`, `market_growth_pct` |
| S3 | Modèles économiques et blocs clients (qui paie, quand, qui signe) | G | R | `playbook.economic_models` ★ nouveau |
| S4 | Tendances et fronts technologiques, zones de transition | G | R | `playbook.tech_fronts` ★ |
| S5 | Dynamique récente — chronologie datée des ruptures | G | R | `sector_events` |
| S6 | Opportunités et menaces (risque × opportunité) | G | R | `playbook.risks` ★ |
| S7 | **Environnement réglementaire → calendrier daté** | M+G | D+H | `sector_regulatory_items` |
| S8 | **Chaîne de valeur** : maillons, dépendances critiques, vulnérabilités, captation | M | R+H | `value_chain_nodes/actors/links` |
| S9 | Pain points sectoriels | G | R | `sector_pain_points` |
| S10 | Personas et leurs enjeux | G | R | `playbook.personas` |
| S11 | Objections et réponses | G | R+H | `playbook.objections` |
| S12 | Arguments ROI, fit practices | G | R | `playbook.roi_arguments`, `practices_fit` |
| S13 | Message sectoriel + discours par catégorie d'acteur | G | R | `playbook.entry_points` |
| S14 | Registre de sources du secteur | G | D | `intelligence_sources` + `intelligence_source_links` |

### Famille C — Environnement concurrentiel

| Id | Bloc | Portée | Régime | Table cible |
|---|---|---|---|---|
| C1 | Segmentation et justification des catégories | G | R | `competitive_map_entries.category` + justification |
| C2 | **Matrice de positionnement** (empreinte × maturité, taille = CA) | G | X | `competitive_map_entries` |
| C2b | **Carte de priorisation** (appétence × accessibilité) | G | X | idem + A6 |
| C3 | Fiches des comptes cartographiés | G/A | R | `competitive_map_entries` + `companies` `mapped` |
| C4 | Tableau comparatif | G | X | vue sur C3 |
| C5 | Acteurs écartés et motif | G | R | `competitive_map_entries.is_benchmark_account` |
| C6 | **ESN déjà en place** (concurrence ESN) | G/A | D+H | `account_facts` `incumbent_esn` ★ |

### Famille A — Connaissance compte

| Id | Bloc | Portée | Régime | Table cible |
|---|---|---|---|---|
| A1 | **Identité juridique France** : SIREN, entité, NAF, IDCC, effectif, siège, création | A | **D** | `companies` + `account_facts` |
| A2 | Identité commerciale : 7 axes, tier, relation, régime d'achat | A | X+H | `companies` (migration 068) |
| A3 | Contacts et organisation (départements, décideur SI) | A | D+H | `contacts`, `persons` |
| A4 | Positionnement, offre de valeur, clients, fournisseurs, concurrents directs | A | R | `account_facts` (12 types existants) |
| A5 | Maturité IT / IA, environnement technologique | A | R+D | `account_facts` ★ |
| A6 | **Accessibilité** : canal d'achat, panel, habilitation, taille DSI, politique d'externalisation | A | H+D | `account_facts` ★ |
| A7 | Chantiers technologiques observés (prouvés par offres d'emploi / communiqués) | A | **D** | `account_signals` `hiring_signal`/`it_transformation` |
| A8 | Signaux et actualité + veille dédiée | A | D | `account_signals`, `account_watch_settings` |
| A9 | Enjeux | A | R+H | `account_issues` |
| A10 | Activité : interactions, opportunités, missions, événements | A | D | tables CRM |
| A11 | Roadmap d'adressage + contenu commercial | A | X+H | `account_roadmap_actions`, `intelligence_documents` |
| A12 | Position sur la matrice et dans la chaîne de valeur | A | X | `competitive_map_entries`, `value_chain_actors` |

### Famille P — Produits d'action (jamais produits, toujours dérivés)

| Id | Bloc | Dérivé de |
|---|---|---|
| P1 | Brief stratégique | S13 + C2b + A7 A8 A9 + score |
| P2 | Fenêtres d'opportunité | S7 S9 S5 + A8 A9 |
| P3 | Roadmap et campagnes | P2 + A6 A3 |
| P4 | Playbook sectoriel interactif | S9→S13 + C1 C3 + offres |

★ = famille de `fact_type` ou clé de `playbook` à créer. **Aucune nouvelle table.**

---

## 4. Cartographie de l'existant — verdict bloc par bloc

Trois verdicts : **RÉUTILISER** (conforme au cahier des charges méthodologique) · **RÉPARER** (matière bonne, contrat ou portée à corriger) · **REMPLACER** (ne respecte pas le standard, ne pas recycler dans les nouvelles pages).

| Bloc | Source actuelle | Volume | Fraîcheur | Conforme méthode ? | Verdict |
|---|---|---:|---|---|---|
| S1 S2 | `sector_intelligence` 13 macros | 13/53 | 16/07→09/08 | Partiel — non sourcé ligne à ligne | **RÉPARER** — garder, ajouter registre de sources, descendre au segment |
| S1 S2 (segments) | 36 fiches `development` | 0 | — | Non | **PRODUIRE** |
| S3 S4 S6 | Étude B (PDF spatial), étude Tourisme | 2 secteurs, hors base | 08/2026 | Oui pour B (90 sources) | **RÉUTILISER** — à ingérer |
| S5 | `sector_events` | 52, portée macro | variable | Partiel | **RÉPARER** — portée |
| S7 | `sector_regulatory_items` | 64 / 51 datées / **35 futures**, 13 secteurs | à revalider au jour du run | **Oui** — schéma exemplaire | **RÉUTILISER** — meilleur actif du parc |
| S8 | `value_chain_*` BTP | 1 secteur, 26/26 acteurs sourcés | 09/08/2026 | **Oui** — contrainte SQL sur la source | **RÉUTILISER** — non industrialisé |
| S9 | `sector_pain_points` | 83, portée macro | variable | Partiel | **RÉPARER** — portée + `verbatim` |
| S10-S13 | `playbook` JSONB, 13 macros | 13/53 | 08/2026 | Partiel — pas de traçabilité | **RÉPARER** |
| S14 | `intelligence_sources` | 167 (66 % news) | 27 job_board < 90 j | Partiel — pas de tier/rôle/score | **RÉPARER** — porter le standard v1.0 dans `technical_metadata` |
| S14 | Référentiels Tourisme / Électronique B2B | 2 docs, hors base | 09/08/2026 | **Non** — scorecard auto-notée, journal à 5 requêtes, `OFFRE_ESN` mal amorcé | **RÉPARER** avant ingestion |
| C1-C5 | Études markdown BTP / Spatial A / Tourisme | 3 études, ~34 comptes | 08/2026 | Partiel — cf. audit 08 (D1 D2 D3) | **RÉUTILISER après correction** — corriger le top 3, le plancher de preuve, les sources |
| C1-C5 | `competitive_map_entries` | **0 ligne** | — | Schéma conforme D-4 ADR-0019 | **CHAÎNON MANQUANT n°1** |
| C6 | — | 0 | — | — | **PRODUIRE** |
| A1 | `companies.siren/naf` | **6/98** | — | Non | **PRODUIRE** (déterministe) |
| A2 | `companies` 7 axes (migration 068) | 96/96 classifiés | 08/2026 | **Oui** — RPC atomique, contrôles §10 | **RÉUTILISER** |
| A3 | `contacts` | 644, **0 DSI**, 83 % sans rôle | — | Non | **RÉPARER** |
| A4 | `account_facts` 12 types narratifs | 53 / 5 comptes | 08/2026 | Oui (provenance + source) | **RÉUTILISER**, étendre |
| A4 legacy | `companies.metadata` FOLIO (`analysis_data`, `meta_has_*`) | ~50 comptes | 2025-2026 | **Non** — 5 clés sans source, `legacy_folio_score` déprécié | **REMPLACER** — lecture seule en fallback, jamais recyclé dans un nouveau bloc |
| A5 A6 A7 | — | 0 | — | — | **PRODUIRE** |
| A8 | `account_signals` | 808 dont 673 `company_context` | scoring versionné | Moteur oui, carburant non | **RÉPARER** — sortir `company_context` de la vue « actualité » |
| A9 | `account_issues` | 46 / 8 comptes | 07-08/2026 | Oui (ADR-0012, provenance) | **RÉUTILISER** |
| A10 | CRM (interactions, opportunités, missions) | 112 interactions < 90 j | vivant | Oui | **RÉUTILISER** |
| A11 | `account_roadmap_actions` | **0** | — | Schéma prêt, gate Lot 7 | **PRODUIRE** |
| A12 | `value_chain_actors` | 50 (BTP) | 09/08 | Oui | **RÉUTILISER** |
| P1 | `StrategicBrief.tsx` + modèle BI | vivant | — | À requalifier : consomme des blocs sous seuil | **RÉPARER** |
| P2 | `SectorWindowsTimeline` + `sector-activation-types` | vivant | — | Oui structurellement | **RÉPARER** — portée macro/segment |
| P4 | `SectorPlaybooksModal` + 13 playbooks macro | vivant | — | Partiel | **RÉPARER** — projeter, ne pas stocker |

### Les blocs à ne pas recycler

| Bloc obsolète | Pourquoi | Que faire |
|---|---|---|
| `companies.legacy_folio_score` | Score legacy déprécié, non recalculé (ADR-0011 Lot 0) | Ne jamais l'afficher dans les nouvelles pages ; `account_score_current` fait autorité |
| `companies.metadata.analysis_data` | 5 clés sans source, jamais rafraîchies | Fallback lecture seule jusqu'à couverture par `account_facts`, puis extinction |
| `sector_news` (7 lignes) | Quasi vide, aucune fraîcheur garantie | Ne pas bâtir l'onglet Actualités dessus ; passer par `account_signals` + veille |
| Diagnostic process FOLIO (4 comptes) | Couverture 4/98, non reproductible | Sortir du séquencement des pages neuves |
| Scorecards auto-notées des référentiels de sources | Producteur = juge (défaut E1 du doc 09) | Rejouer la gate G1/G2 avant toute ingestion |

---

## 5. Ce que produit la méthode 08/09 — cartographie de sortie

L'étude cible (couches 0-3 du doc 08) produit exactement ces blocs. **Chaque section du livrable est désormais l'écriture d'un bloc identifié, pas un paragraphe.**

| Couche du livrable 08 | Section | Bloc produit | Écrit dans |
|---|---|---|---|
| 0 — Cadre | Page de garde, accès sources, périmètre | S1 + métadonnées de confiance | `sector_intelligence.caveats` |
| 1 — Décider | Marché en 5 thèses | S13 | `playbook.entry_points` |
| | **Calendrier daté** | S7 | `sector_regulatory_items` |
| | Top 3 comptes / 3 écartés | C2b + C5 | `competitive_map_entries` |
| | Message sectoriel | S13 | `playbook` |
| 2 — Comprendre | Économie, blocs clients | S2 | `market_*` |
| | Modèles économiques | **S3** ★ | `playbook.economic_models` |
| | Chaîne de valeur par maillon | **S8** | `value_chain_*` |
| | Fronts technologiques | **S4** ★ | `playbook.tech_fronts` |
| | Dépendances supply chain | **S8** (vulnérabilités) | `value_chain_nodes.description` |
| | Régulation en couches | S7 | `sector_regulatory_items` |
| | Chronologie des ruptures | S5 | `sector_events` |
| | Risques × opportunités | **S6** ★ | `playbook.risks` |
| 3 — Attaquer | Segmentation | C1 | `competitive_map_entries` |
| | Carte de priorisation | C2b | idem |
| | Tableau comparatif | C4 | vue |
| | Fiche compte B1 identité | **A1** | `companies` + `account_facts` |
| | B2 métier / chaîne de valeur | A4 A12 | `account_facts` |
| | B3 six grilles | A4 A5 | `account_facts` |
| | **B4 couche ESN** | **A6 A7 C6** | `account_facts` ★ |
| | B5 traduction commerciale | P4 | projection |
| | Battle card | P4 | projection |
| | Réserve à qualifier | C3 sous plancher | `depth_level='mapped'` |
| Annexes | Registre de sources | S14 | `intelligence_sources` |
| | Journal de recherche | métadonnée | `ai_intelligence_results.input_snapshot` |

**Couverture** : la méthode 08/09 produit **28 des 36 blocs**. Les 8 restants sont soit purement CRM (A3 A10), soit dérivés (P1-P4), soit déterministes hors étude (A1 partiellement, A8) — ce qui est cohérent avec le principe de subsidiarité.

---

## 6. Matrice bloc × page — le rangement

| Bloc | BI · Étude | BI · Concurrence | BI · Chaîne | BI · Calendrier | Prosp · Brief | Prosp · Fenêtres | Prosp · Roadmap | Prosp · Playbook | Cockpit |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| S1 S2 | ● | | | | | | | ○ | ○ Secteur |
| S3 | ● | | ○ | | | ○ | | ○ | ○ Entreprise |
| S4 | ● | ○ | | | | ○ | | ○ | ○ Secteur |
| S5 | ● | | | ○ | ○ | ● | | | ○ Actualités |
| S6 | ● | | | | ○ | ● | | ○ | |
| S7 | ○ | | | ● | ○ | ● | ○ | ○ | ● Enjeux |
| S8 | | ○ | ● | | | | | ○ | ● Secteur |
| S9 | ● | | | | ○ | ● | | ● | ○ Enjeux |
| S10-S13 | ○ | | | | ● | ○ | | ● | ○ Stratégie |
| S14 | ○ | ○ | ○ | ○ | | | | | ○ |
| C1 C4 C5 | | ● | | | | | | ○ | |
| C2 C2b | | ● | | | ● | ○ | ● | | ● Secteur |
| C3 | | ● | ○ | | | | | | ● (fiche) |
| C6 | | ● | | | ○ | | ○ | ● | ● Entreprise |
| A1 A2 | | ○ | | | | | | | ● Socle |
| A3 | | | | | ● | ● | ● | | ● Entreprise |
| A4 A5 | | ○ | | | ○ | | | | ● Entreprise |
| A6 | | ● | | | ● | ● | ● | ○ | ● Entreprise |
| A7 A8 | | | | | ● | ● | | | ● Actualités |
| A9 | | | | ○ | ● | ● | ● | | ● Enjeux |
| A10 | | | | | ○ | | ● | | ● Stratégie |
| A11 | | | | | ○ | ○ | ● | | ● Roadmap |
| A12 | | ● | ● | | | | | | ● Secteur |

● bloc principal de la vue · ○ bloc consommé en contexte

**Lecture** : trois blocs traversent tout — **S7 (calendrier), C2b (priorisation), A6 (accessibilité)**. Ce sont les trois qui manquent le plus. Ce n'est pas une coïncidence : les blocs transverses sont ceux dont l'absence se voit partout.

---

## 7. L'architecture retenue — socle master, lots rejouables

### 7.1 La décision

> **D-A — Trois régimes de production, découpés par le couple (cohérence, péremption).**

| Régime | Critère d'appartenance | Blocs | Cadence | Produit par |
|---|---|---|---|---|
| **SOCLE PERMANENT** | Déterministe et stable ; ne dépend d'aucune interprétation | A1, S7, S14, A3 (partiel), A10 | Cron / à la demande | n8n + APIs publiques |
| **ÉTUDE MASTER** | Doit être cohérent avec les autres au même instant ; se contredit s'il est produit en morceaux | S1-S6, S8-S13, C1-C5, A4, A12 | 1 run / secteur, péremption 12 mois | Deep Research sourcé + ingestion |
| **LOTS REJOUABLES** | Périme plus vite que l'étude ; indépendant des autres | A7, A8, C6, A6, A9, S5 (mise à jour) | 7 à 90 jours | Workflows n8n dédiés |
| **DÉRIVÉ** | Ne se produit pas, se calcule | P1-P4, C2, C2b, C4, A11 | À la lecture | Vues / RPC |

**Pourquoi la segmentation, la matrice et le message sectoriel ne peuvent pas être des lots** : le document 08 a montré qu'un score produit dans un run et un top 3 produit dans un autre se contredisent (défaut D1). Ces blocs partagent un même jugement ; les séparer, c'est fabriquer la contradiction.

**Pourquoi les signaux, les offres d'emploi et les contacts ne peuvent pas être dans le master** : ils périment en semaines. Les enfermer dans une étude annuelle, c'est garantir qu'à trois mois le livrable est faux — et faux de façon invisible, ce qui est pire.

### 7.2 Les autres décisions structurantes

> **D-C — Toute donnée porte sa portée.** `macro` / `segment` / `compte`. Un bloc déclare sa portée native et sa règle d'héritage. Interdiction d'écrire une connaissance de segment sur un macro « parce que la fiche existe ».

> **D-F — `competitive_map_entries` est le chaînon manquant n°1** et il est déjà spécifié (ADR-0019 Lot 5, D-3/D-4/D-5). Rien à concevoir : contrat `CompetitiveMapOutput`, résolution d'entité `AccountScanResolution` réutilisée, bac d'arbitrage, `depth_level='mapped'`. **Trois études sont prêtes à y entrer** (BTP, Spatial, Tourisme).

> **D-G — Un seul score de priorisation.** `account_score_current` (ADR-0011) fait autorité pour les comptes du portefeuille ; l'appétence /35 des études ne vaut que pour les comptes `mapped` non encore qualifiés, et reste marquée `appetence_provisoire` tant que A6 n'est pas renseigné. **Deux échelles, jamais mélangées dans un même tri.**

> **D-H — Seuil de confiance à l'entrée du brief.** P1 ne consomme que des blocs dont le statut est `verified_fact` ou `declared_fact` au sens de `02_CONTROLE_QUALITE §3`. Un bloc `single_source` ou `estimate` est affiché en contexte mais ne peut pas fonder une recommandation. C'est la garantie que le brief IA ne recycle pas du FOLIO non sourcé.

---

## 8. Plan d'action — 9 lots

Ordre = valeur débloquée / coût. Les lots 0 à 2 conditionnent tout le reste.

### Lot 0 — Résolution sectorielle héritée *(1 j)* 🔴 bloquant — **infrastructure, effet visible faible**
**Fonctionnel** : un compte voit la connaissance de son segment **et** de son macro parent, le segment primant. Aucune régression sur l'existant : le macro reste aujourd'hui la seule source remplie.
**Technique** : vues `v_sector_knowledge_resolved` (une ligne par fiche, champs scalaires et `playbook` résolus segment→macro) et `v_sector_knowledge_items` (items réglementaires, pain points, événements, actualités, avec `resolved_level`). Basculer les quatre loaders qui lisent `companies.sector_id` en dur — `sector-snapshot-data.ts`, `account-panel-data.ts`, `intelligence-data.ts`, `get-portfolio-intelligence-snapshot.ts` — vers `segment_id` + résolution.
**Pourquoi maintenant, malgré un effet écran quasi nul** : c'est ce qui rend lisible la maille à laquelle **toutes les études futures écrivent**. Sans ce lot, le Lot 2 ingère une cartographie au niveau segment que personne n'affiche.
**Sortie** : `resolved_level` visible sur chaque item ; les 19 comptes des 3 macros vides sont identifiés comme tels au lieu d'afficher un onglet muet.

### Lot 1 — Socle identité France *(3 j)* 🔴 bloquant
**Fonctionnel** : onglet Socle du cockpit renseigné pour 98 comptes.
**Technique** : workflow `intel-040-identite-france` — API Sirene INSEE → RNE/INPI → BODACC ; écriture `account_facts` avec les `fact_type` `legal_id`, `naf_code`, `collective_agreement`, `headcount_france`, `establishment`, `executive`, `origin='relational'`, `primary_source_id` renseigné ; promotion `companies.siren/naf_code` **uniquement** après résolution non ambiguë.
⚠️ `entreprise.api.gouv.fr` est réservée aux administrations — socle = Sirene + open data (+ Pappers si besoin).
**Sortie** : 98/98 avec SIREN ou motif d'échec explicite. Aujourd'hui : 6/98.

### Lot 2 — Ingestion des cartographies *(4 j)* 🔴 bloquant — ADR-0019 Lot 5
**Fonctionnel** : les 3 études existantes deviennent la matrice, les fiches concurrents et le tableau comparatif de BI.
**Technique** : contrat `CompetitiveMapOutput` ; import JSON dans un bac d'arbitrage (l'ADR **écarte explicitement un workflow n8n sur ce lot**) ; résolution `resolved | ambiguous | not_found` via `AccountScanResolution` ; création `depth_level='mapped'`, `origin='competitive_map'` ; chiffres → `account_facts`, analyse → `competitive_map_entries`. D-3 : un `mapped` n'entre ni dans les stats, ni dans les combobox, ni ne porte de contact.
**Prérequis qualité** : corriger dans les études, avant import, les 3 défauts de l'audit 08 — top 3 aligné sur le tableau (R3), plancher de preuve (R2), sources résolvables.
**Sortie** : `competitive_map_entries` > 0 ; onglet Environnement concurrentiel non vide ; ~30 comptes `mapped`.

### Lot 3 — Calendrier réglementaire complet *(3 j)*
**Fonctionnel** : onglet Calendrier de BI + bloc Enjeux du cockpit alimentés pour tout secteur étudié.
**Technique** : Légifrance (API PISTE) + EUR-Lex + curation humaine → `sector_regulatory_items` au niveau **segment** quand c'est spécifique, macro sinon. Champs obligatoires : `deadline_date`, `authority`, `source_url` officiel, `commercial_angle`, `kredo_practice`.
**Sortie** : ≥ 1 échéance datée future par secteur étudié. Aujourd'hui : 13 secteurs / 53.

### Lot 4 — Mesure de l'intensité SI *(2 j)*
**Fonctionnel** : « besoins SI probables » remplacé par un comptage sourcé, dans A7 et dans les fiches.
**Technique** : API France Travail par SIREN (donc dépend du Lot 1) → classification par practice Kredo → `account_fact` `it_hiring_intensity` + `account_signal` `hiring_signal` daté au franchissement de seuil.
**Sortie** : signal d'embauche sur les comptes actifs. Aujourd'hui : 11 lignes.

### Lot 5 — Couche accessibilité *(4 j, comptes prioritaires)*
**Fonctionnel** : le bloc A6 qui manque partout — canal d'achat, panel, habilitation, DSI, ESN en place.
**Technique** : `fact_type` `access_channel`, `supplier_panel`, `clearance_required`, `incumbent_esn`, `it_decision_owner`, `outsourcing_policy`. Alimentation : OSINT ciblé (pages « devenir fournisseur »), TED/BOAMP, CRM interne, qualification humaine 45 min/compte. Apollo/Lusha à authentifier en session interactive.
**Sortie** : 100 % des comptes prioritaires. Aujourd'hui : 0.

### Lot 6 — Fenêtres d'opportunité *(3 j)*
**Fonctionnel** : le contrat en 8 lignes du §2.2, à deux portées (portefeuille et compte), un seul calcul.
**Technique** : vue dérivée (D-18) sur `sector_regulatory_items` ∪ `sector_events` ∪ `sector_pain_points` ∪ `account_signals` ∪ `account_issues`, avec urgence calculée et `kredo_fit`. **Pas de table.**
**Sortie** : onglet Fenêtres alimenté ; fiche de fenêtre exportable.

### Lot 7 — Playbook sectoriel projeté *(3 j)*
**Fonctionnel** : hub de préparation interactif — réviser, rôder objections, tester des approches.
**Technique** : RPC de projection `get_sector_playbook(sector_id, scope)` assemblant playbook résolu (Lot 0) + pain points + réglementaire + `competitive_map_entries` + `offers`. Génération de variantes d'approche via `intelligence_documents`.
**Sortie** : remplace `SectorPlaybooksModal` par une projection ; les 13 playbooks macro deviennent 53 playbooks résolus.

### Lot 8 — Brief stratégique sous seuil de confiance *(3 j)*
**Fonctionnel** : recommandations argumentées et traçables, silencieuses là où la donnée est faible.
**Technique** : appliquer D-H — filtre de statut à l'entrée du prompt ; chaque recommandation cite ses `source_ids` ; sortie en actions datées avec contact et discours.
**Sortie** : le brief ne recommande plus rien sur un compte dont la connaissance est `single_source`.

### Lot 9 — Chaîne de valeur, 2 secteurs de plus *(4 j)*
**Fonctionnel** : onglet Chaîne de valeur + section texte « maillons clés / dépendances critiques / points de vulnérabilité ».
**Technique** : la note d'exploitation tranche déjà les cibles — **Parfumerie & Arômes** et **Santé** — et pose la règle anti-poster (pas de chaîne sans étude concurrentielle préalable). Ajouter les trois champs texte manquants au modèle de nœud.
**Prérequis** : passer le test terrain Audemard sur le pilote BTP avant d'industrialiser.

### Séquencement

```
Lot 0 ──┬─► Lot 3 ──┬─► Lot 6 ──► Lot 8
        │           │
Lot 1 ──┼─► Lot 4 ──┘
        │
Lot 2 ──┴─► Lot 7
            Lot 5 (parallèle dès Lot 1)
            Lot 9 (indépendant, après recette BTP)
```

**Total ≈ 29,5 jours.** Chemin critique : `0 → 1 → 4 → 6 → 8` ≈ 11,5 j.

**Jalon de démonstration à J+8** : Lots 0 + 1 + 2 livrés → l'onglet Environnement concurrentiel de BI affiche la matrice du Spatial, l'onglet Socle affiche l'identité des 98 comptes, et le cockpit d'un compte spatial affiche enfin les échéances de son macro-secteur. C'est le premier moment où les trois pages cessent d'être des coquilles.

---

## 9. Contrats de données

### 9.1 Extensions `account_facts.fact_type`

Aucune table nouvelle. Familles à ajouter :

| Famille | `fact_type` | Régime | Cardinalité |
|---|---|---|---|
| Identité | `legal_id`, `naf_code`, `collective_agreement`, `headcount_france`, `establishment`, `executive`, `incorporation_date` | D | single sauf `establishment`/`executive` |
| Technologie | `it_maturity`, `ai_maturity`, `tech_stack`, `it_hiring_intensity` | D+R | multi |
| Accessibilité | `access_channel`, `supplier_panel`, `clearance_required`, `incumbent_esn`, `it_decision_owner`, `outsourcing_policy` | H+D | multi |

Règle : tout fait porte `origin`, `primary_source_id`, `effective_at`, `confidence_score`. Un fait sans source ne s'écrit pas.

### 9.2 Extensions `sector_intelligence.playbook`

Clés existantes conservées (`personas`, `objections`, `entry_points`, `roi_arguments`). À ajouter : `economic_models` (S3), `tech_fronts` (S4), `risks` (S6), `market_thesis` (S13, les 5 thèses).

### 9.3 Registre de sources

Le standard v1.0 (tier T1-T4, rôle `proof|corroboration|discovery|watch`, score d'utilité /100, `automation_fit`) se porte dans `intelligence_sources.technical_metadata`, le lien vers le secteur via `intelligence_source_links`. **Pas de table dédiée.**

### 9.4 Nouveaux `result_type`

`competitive_map` (ingestion Lot 2), `sector_source_registry` (S14), `sector_study` (couche 2 de l'étude). Cohérent avec les 15 `result_type` existants.

---

## 10. Gouvernance : fraîcheur, confiance, gates

| Bloc | Péremption | Signal de péremption |
|---|---|---|
| A1 identité | 12 mois | Registre courant |
| S7 réglementaire | **au jour du run** | Toujours revalider avant citation |
| A8 signaux / A7 emploi | 3 mois | `expires_at` |
| C1-C5 cartographie | 12 mois | `study_snapshot_date` |
| S2 marché | 24 mois | — |
| A6 accessibilité | 12 mois | Changement de DSI |

**Trois gates, dont deux hors du producteur** (doc 09 §5) : G1 conformité (script déterministe), G2 red team (contexte séparé / NotebookLM sur corpus fermé), G3 recette métier. Une étude ne peut pas se déclarer `production_ready` elle-même.

**Métrique affichée, pas cochée** : taux de renseignement par bloc et par page. Exemple aujourd'hui — A6 : 0/98 · A1 : 6/98 · C2 : 0 secteur · S7 : 13/53 secteurs.

---

## 11. Risques et ce qu'on ne fait pas

| Risque | Parade |
|---|---|
| Les ~530 comptes `mapped` (53 segments × ~10) noient les 98 comptes réels | D-3 ADR-0019, à appliquer à **chaque** nouveau consommateur de `companies` |
| Deux échelles de priorisation mélangées | D-G : `account_score_current` pour le portefeuille, appétence /35 pour les `mapped`, jamais dans le même tri |
| Le brief IA recycle du FOLIO non sourcé | D-H : seuil de confiance à l'entrée |
| La page Prospection devient un second cockpit | D-D : elle ne produit rien, elle compose |
| Chaîne de valeur industrialisée trop tôt | Règle anti-poster : pas de chaîne sans étude concurrentielle ; 2 secteurs, pas 13 |
| Le playbook diverge des sources | D-E : projection, jamais stockage |

**Ce qu'on ne fait pas** : aucune table nouvelle · aucun workflow n8n sur le Lot 2 (écarté par l'ADR-0019) · aucun enrichissement de masse Apollo/Lusha · aucune reprise des scores FOLIO · aucun quatrième moteur de recherche générative.

---

## 12. Le test d'acceptation du chantier

Le chantier est réussi quand, sur un secteur étudié, un business developer peut enchaîner sans changer d'outil :

1. **BI · Étude sectorielle** → il tient 3 minutes de conversation métier.
2. **BI · Chaîne de valeur** → il sait à quel maillon Kredo se branche et qui y est déjà.
3. **BI · Calendrier** → il a une échéance datée, vérifiable, prononçable.
4. **BI · Concurrence** → il sait quel compte appeler en premier, et pourquoi celui-là.
5. **Prospection · Fenêtres** → il a l'angle, l'offre, les comptes concernés, la prochaine action.
6. **Cockpit · Socle** → il sait à qui il parle et si Kredo a le droit d'intervenir.
7. **Cockpit · Roadmap** → il a le contenu commercial prêt.
8. Et si le DSI demande « vous tenez ça d'où ? », **il ouvre la source**.

Aujourd'hui, les points 1 et 2 sont partiellement tenus sur un secteur (BTP). Les six autres, sur aucun.
