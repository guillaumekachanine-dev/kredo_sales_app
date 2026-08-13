# État des lieux — 13/08/2026

**Tous les chiffres de ce document ont été relevés en production** sur `jvzgmhvwirsbdkjpmvla`
le 13/08/2026, par requête directe. Ils périment vite : `account_signals`, `account_facts` et
`intelligence_sources` dérivent de jour en jour. **Vérifier en base avant de s'appuyer sur un
chiffre**, y compris ceux-ci.

Ce document existe pour une raison précise : les trois documents d'architecture antérieurs
(11/08 et 12/08) portent des compteurs qui ont été dépassés en 24 à 48 heures, et l'un d'eux
porte une affirmation factuellement fausse. **Un instantané daté vaut mieux qu'un chiffre non
daté qui a l'air d'une règle.**

---

## 1. Ce qui a bougé depuis le 12/08

| Objet | Architecture du 12/08 | Live 13/08 | Lecture |
|---|---:|---:|---|
| `companies` | 96 → 98 | **109** | +13 comptes, dont 10 `mapped` issus de l'ingestion cartographie |
| `companies.siren` | 6 | **28** | Lot socle identité France livré (migration 073) |
| `companies.naf_code` | 3 | **27** | idem — le NAF est découplé de la résolution d'identité |
| `account_facts` | 53 / 5 comptes | **857 / 36 comptes** | ×16. Familles identité livrées |
| `competitive_map_entries` | **0** | **15** | Table alimentée (migrations 074, 075) — 2 secteurs |
| `companies.depth_level='mapped'` | 0 | **10** | Premier import de cartographie réalisé |
| `intelligence_sources` | 167 | **450** | Journal de collecte qui grossit, pas un registre |
| `ai_intelligence_results` | 113 | **326** | Vivant |

**Trois lots de l'architecture du 12/08 ont été livrés en 24 h** : Lot 0 (résolution sectorielle
héritée), Lot 1 (socle identité France), Lot 2 (ingestion des cartographies). C'est le contexte
dans lequel ce corpus est établi.

---

## 2. La fracture macro / segment — mesurée

C'est le constat qui commande l'axiome A4.

| | Macro (15 fiches) | Segment (38 fiches) |
|---|---:|---:|
| **Comptes rattachés** (`companies.segment_id`) | **0** | **109** |
| Fiches avec `description` | 15 / 15 | **1 / 38** |
| Fiches avec `playbook` rempli (personas) | 12 / 15 | **1 / 38** |
| Fiches avec `attractiveness_score` | 12 / 15 | 1 / 38 |
| Items réglementaires | **61** | **3** |
| Pain points | **77** | **6** |
| Événements sectoriels | **47** | **5** |

> **100 % de la connaissance vit sur les macros. 100 % des comptes vivent sur les segments.**
> Un seul segment sur 38 porte une fiche remplie (Nutraceutique, héritée d'une étude v1).

Les vues `v_sector_knowledge_resolved` et `v_sector_knowledge_items` (migrations 069-071)
résolvent la **lecture** — substitution champ par champ pour les scalaires et le playbook,
union pour les items. **Rien n'écrit encore à la maille segment.** C'est la première chose
qu'une Master Study doit changer, et le premier invariant que G1 vérifie.

---

## 3. Les compteurs qui décident du plan

| Objet | Table | 13/08/2026 | Lecture |
|---|---|---|---|
| Identité juridique | `companies.siren` / `naf_code` | **28 / 109** · 27 / 109 | Le socle existe, il n'a pas fini de tourner |
| Faits sourcés | `account_facts` | **857** lignes / 36 comptes / 24 `fact_type` · **817 avec `primary_source_id`** (95 %) | Le contrat « un fait sans source ne s'écrit pas » est presque tenu |
| Familles identité | `legal_id` 48 · `establishment` 27 · `headcount_france` 42 · `collective_agreement` 43 · `incorporation_date` 47 · `executive` 84 | 100 % sourcés | Livré et propre |
| Familles accessibilité | `access_channel`, `supplier_panel`, `clearance_required`, `incumbent_esn`, `it_decision_owner`, `outsourcing_policy` | **0** | **Le bloc A6 n'existe toujours pas** |
| Cartographie | `competitive_map_entries` | **15** — 10 Spatial (avec `profile_json`), 5 Tourisme (sans) | Chaîne d'ingestion prouvée |
| Signaux | `account_signals` | **808**, dont **673 `company_context` sur 93 comptes** | Le moteur tourne, le carburant est du contexte |
| Signaux actionnables | `hiring_signal` 11 (1 compte) · `it_transformation` 11 (5) · `leadership_change` 5 (3) · `public_tender` 1 (1) | **28 lignes / ~10 comptes** | Q4 n'est pas servie |
| Enjeux | `account_issues` | 46 / 8 comptes | Amorcé |
| Roadmap | `account_roadmap_actions` | **0** | Gate ADR-0012 Lot 7, non franchi |
| Réglementaire | `sector_regulatory_items` | 64 lignes · 51 datées · **33 futures** · **13 fiches / 53** | Le meilleur actif, sous-exploité |
| Chaîne de valeur | `value_chain_*` | 10 nœuds / 50 acteurs / 20 liens — **1 secteur** | Pilote validé en interne, jamais montré à un client |
| Sources | `intelligence_sources` | **450**, dont **347 `news_media`** et 27 `job_board` | Journal de collecte, pas registre |
| Contacts | `contacts` | 642, dont **533 sans rôle (83 %)** et **0 DSI** | L'enum a la valeur, personne ne l'utilise |
| Documents | `intelligence_documents` | 112 | Vivant. Pas de type `master_study` |

---

## 4. Ce qui existe côté interface

Les coquilles sont largement construites — c'est la bonne nouvelle sous-estimée du chantier.

| Page | Route | État |
|---|---|---|
| Business Intelligence | `/intelligence` | **5 onglets** : Brief · Fenêtres · Analyse sectorielle · Chaîne de valeur · **Environnement concurrentiel** |
| Environnement concurrentiel | — | **Chaîne complète livrée** : `CompetitiveMapImportWizard` → `CompetitiveMatrix` → `CompetitiveActorProfiles` → `CompetitiveActorSummary`, desktop et mobile |
| Chaîne de valeur | — | `SectorEcosystemDesktop`, `SectorValueDesktop`, `SectorMapMobile`, lisant `value_chain_*` en base |
| Prospection | `/prospection-intelligence` | Coquille, desktop seul |
| Cockpit compte | `/prospection/accounts/[id]` | **7 onglets câblés** : Accueil · Socle · Connaissance · Secteur · Enjeux · Stratégie · Roadmap |
| Knowledge Hub | `/knowledge` | 6 domaines, dont **Clients & Marchés** — la Master Study y trouve sa place |

Le contrat de sortie E5 est **implémenté et testé** :
`src/features/competitive-map/domain/competitive-map-output.ts` (544 lignes) avec ses tests.
C'est le seul contrat de ce corpus qui soit exécutable aujourd'hui.

---

## 5. Corrections apportées aux documents antérieurs

| Document | Affirmation | Correction |
|---|---|---|
| `ANALYSE-CRITIQUE-ET-ARCHITECTURE-CIBLE.md` §2.10 | « `ai_intelligence_results.company_id` est NOT NULL — le détournement pour un corpus sectoriel est impossible » | **Faux.** La colonne est **nullable** (`information_schema`, 13/08). Un `result_type = 'sector_study'` est stockable sans contorsion |
| `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §3 | « 36 blocs » | **37** — C2 et C2b sont deux blocs distincts (positionnement et priorisation), et ils n'ont ni le même axe ni le même usage |
| `ARCHITECTURE-…` §1.2 | `competitive_map_entries` : 0 · `account_facts` : 53 · `siren` : 6/98 | 15 · 857 · 28/109 |
| `CLAUDE.md` § état de la base | 96 comptes, `sector_intelligence` 53 fiches | 109 comptes ; 53 fiches confirmé |

---

## 6. Les trois métriques du chantier

Elles se calculent, elles ne se cochent pas (axiome A10). Elles sont à afficher, pas à archiver.

```
Couverture identité         =  28 / 109   =  26 %      → cible 100 %
Segments avec connaissance  =   1 /  38   =   3 %      → la métrique du chantier
Couche accessibilité (A6)   =   0         =   0 %      → le bloc transverse manquant
```

**La deuxième est celle qui compte.** Tant qu'elle ne monte pas, chaque étude produite est
invisible à la maille où les comptes la lisent — et le travail est perdu au moment même où il
est fait.
