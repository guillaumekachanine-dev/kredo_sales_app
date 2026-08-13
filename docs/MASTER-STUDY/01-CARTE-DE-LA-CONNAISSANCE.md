# 01 — Carte de la connaissance

**La nomenclature des blocs est la clé de jointure entre ce corpus, les tables Supabase et les
écrans.** Un bloc a un identifiant stable ; tout le reste — prompts, schémas, contrôles,
composants — y fait référence. Renommer un bloc est un changement d'architecture.

37 blocs · 4 familles · 3 portées.
Portée : `M` macro · `G` segment · `A` compte.
Régime : `D` déterministe · `R` recherche sourcée · `H` humain · `X` calculé.

> Reprise intégrale de la nomenclature établie dans
> `sector_intelligence/ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §3, corrigée sur trois
> points : le compte est **37**, pas 36 (C2 et C2b sont deux blocs, pas un) ; l'état de
> remplissage est celui du 13/08/2026 ; la portée par défaut est le **segment** (axiome A4).

---

## 1. Famille S — Connaissance sectorielle

| Id | Bloc | Portée | Régime | Table cible | État 13/08 |
|---|---|:-:|:-:|---|---|
| **S1** | Périmètre et définition du marché, ce qui est hors champ | G | R | `sector_intelligence.description` + `caveats` | 15/15 macro · **1/38 segment** |
| **S2** | Volume FR/UE, évolution 5 ans, moteurs de croissance | G/M | R | `market_size_eur_bn`, `market_growth_pct` | 6/15 macro |
| **S3** | Modèles économiques et blocs clients — qui paie, quand, qui signe | G | R | `playbook.economic_models` ★ | **0** |
| **S4** | Fronts technologiques, zones de transition | G | R | `playbook.tech_fronts` ★ | **0** |
| **S5** | Dynamique récente — chronologie datée des ruptures | G | R | `sector_events` | 52 lignes, 47 au macro |
| **S6** | Risques × opportunités | G | R | `playbook.risks` ★ | **0** |
| **S7** | **Environnement réglementaire → calendrier daté** | M+G | D+H | `sector_regulatory_items` | 64 lignes · **13 fiches / 53** |
| **S8** | **Chaîne de valeur** : maillons, dépendances, vulnérabilités, captation | M | R+H | `value_chain_nodes/actors/links` | 1 secteur (BTP) |
| **S9** | Pain points sectoriels | G | R | `sector_pain_points` | 83 lignes, 77 au macro |
| **S10** | Personas et leurs enjeux | G | R | `playbook.personas` | 12/15 macro · **1/38 segment** |
| **S11** | Objections et réponses | G | R+H | `playbook.objections` | idem |
| **S12** | Arguments ROI, fit practices | G | R | `playbook.roi_arguments`, `practices_fit` | idem |
| **S13** | Message sectoriel + discours par catégorie d'acteur, 5 thèses | G | R | `playbook.entry_points`, `playbook.market_thesis` ★ | idem |
| **S14** | Registre de sources du secteur | G | D | `intelligence_sources` + `intelligence_source_links` | 450 lignes, non qualifiées |

★ = clé de `playbook` à créer. **Aucune table nouvelle.**

---

## 2. Famille C — Environnement concurrentiel

| Id | Bloc | Portée | Régime | Table cible | État 13/08 |
|---|---|:-:|:-:|---|---|
| **C1** | Segmentation et justification des catégories | G | R | `competitive_map_entries.category` + `positioning` | 15 entrées, 2 secteurs |
| **C2** | **Matrice de positionnement** — empreinte × maturité, taille = CA | G | X | `competitive_map_entries` | livrée |
| **C2b** | **Carte de priorisation** — appétence /35 × accessibilité | G | X | idem + `accessibilite_score` | colonne livrée (migr. 075) |
| **C3** | Fiches des comptes cartographiés | G/A | R | `competitive_map_entries.profile_json` + `companies` `mapped` | 10/15 avec profil |
| **C4** | Tableau comparatif | G | X | vue sur C3 | dérivé |
| **C5** | Acteurs écartés et motif | G | R | `is_benchmark_account` + réserve | 1 benchmark |
| **C6** | **ESN déjà en place** | G/A | D+H | `account_facts` `incumbent_esn` ★ | **0** |

---

## 3. Famille A — Connaissance compte

| Id | Bloc | Portée | Régime | Table cible | État 13/08 |
|---|---|:-:|:-:|---|---|
| **A1** | **Identité juridique France** : SIREN, entité, NAF, IDCC, effectif, siège, création | A | **D** | `companies` + `account_facts` (`legal_id`, `naf_code`, `collective_agreement`, `headcount_france`, `establishment`, `executive`, `incorporation_date`) | **28/109 SIREN** · 26 comptes avec `legal_id` |
| **A2** | Identité commerciale : 7 axes, tier, relation, régime d'achat | A | X+H | `companies` (migration 068) | **109/109** ✅ |
| **A3** | Contacts et organisation, décideur SI | A | D+H | `contacts`, `persons` | 83 % sans rôle · **0 DSI** |
| **A4** | Positionnement, offre de valeur, clients, fournisseurs, concurrents | A | R | `account_facts` (12 types narratifs) | 857 faits / 27 comptes |
| **A5** | Maturité IT / IA, environnement technologique | A | R+D | `account_facts` `technology`, `it_maturity` ★ | 23 faits / 13 comptes |
| **A6** | **Accessibilité** : canal d'achat, panel, habilitation, taille DSI, politique d'externalisation | A | H+D | `account_facts` ★ | **0** |
| **A7** | Chantiers technologiques **observés** (offres d'emploi, communiqués) | A | **D** | `account_signals` `hiring_signal` / `it_transformation` | 22 lignes |
| **A8** | Signaux et actualité + veille dédiée | A | D | `account_signals`, `account_watch_settings` | 808 dont 83 % `company_context` |
| **A9** | Enjeux | A | R+H | `account_issues` | 46 / 8 comptes |
| **A10** | Activité : interactions, opportunités, missions, événements | A | D | tables CRM | vivant |
| **A11** | Roadmap d'adressage + contenu commercial | A | X+H | `account_roadmap_actions`, `intelligence_documents` | **0** |
| **A12** | Position sur la matrice et dans la chaîne de valeur | A | X | `competitive_map_entries`, `value_chain_actors` | 50 acteurs (BTP) |

---

## 4. Famille P — Produits d'action : jamais produits, toujours dérivés

| Id | Bloc | Dérivé de | Forme |
|---|---|---|---|
| **P1** | Brief stratégique | S13 + C2b + A7 A8 A9 + `account_score_current` | Vue + prompt sous seuil de confiance |
| **P2** | Fenêtres d'opportunité | S7 S9 S5 + A8 A9 | **Vue dérivée, jamais une table** |
| **P3** | Roadmap et campagnes | P2 + A6 A3 | `account_roadmap_actions` en `draft` |
| **P4** | Playbook sectoriel interactif | S9→S13 + C1 C3 + `offers` | RPC de projection |

**Un bloc P ne s'écrit pas.** L'écrire, c'est dupliquer cinq sources qui divergeront. Le module
est interactif *parce qu'*il est dérivé.

---

## 5. Ce que produit une Master Study — couverture

| Étape | Blocs produits |
|---|---|
| E2 socle déterministe | A1 · S7 (dates) · A7 · A3 (partiel) |
| E3 corpus de sources | S14 |
| E4 étude sectorielle | S1 S2 **S3 S4** S5 **S6** S7 (conversion) S9 S10 S11 S12 **S13** |
| E5 cartographie + comptes | C1 C2 C2b C3 C5 **C6** · A4 A5 **A6** A12 |
| E6 chaîne de valeur | S8 · A12 |
| Hors master (lots / CRM / dérivé) | A2 A8 A9 A10 A11 · P1-P4 |

**Une Master Study complète produit 28 blocs sur 37.** Les 9 restants sont soit purement CRM
(A2 A3 A10), soit périssables (A8 A9), soit dérivés (P1-P4), soit hors périmètre d'une étude
(A11). C'est la traduction directe de l'axiome A5.

---

## 6. Les trois blocs transverses — et pourquoi ils manquent tous les trois

`S7` (calendrier daté), `C2b` (priorisation) et `A6` (accessibilité) traversent quasiment tous
les écrans (`02-DISTRIBUTION-DANS-KREDO.md` §5). Ce ne sont pas trois oublis indépendants :
**un bloc transverse est précisément celui dont l'absence se voit partout**, donc celui qu'on
remet toujours à après.

| Bloc | Pourquoi il résiste | Ce qui le débloque |
|---|---|---|
| **S7** | Confondu avec de la veille. C'est du déterministe (Légifrance, EUR-Lex), pas de la recherche | E2, régime déterministe, avant l'étude |
| **C2b** | Suppose l'accessibilité, donc A6. Sans A6, la carte a un axe mort | E5 §4 refuse de scorer sous plancher de preuve |
| **A6** | Traité comme un tout insoluble. Décomposé, trois quarts deviennent accessibles | E5 §4.3, six sous-blocs, trois canaux |

---

## 7. Extensions de contrat à créer

Aucune table nouvelle. Trois familles d'extension, toutes déjà spécifiées ailleurs et
rassemblées ici pour référence unique.

### 7.1 `account_facts.fact_type` — familles à ajouter

| Famille | `fact_type` | Régime | Cardinalité |
|---|---|:-:|---|
| Technologie | `it_maturity`, `ai_maturity`, `tech_stack`, `it_hiring_intensity` | D+R | multi |
| **Accessibilité** | `access_channel`, `supplier_panel`, `clearance_required`, `incumbent_esn`, `it_decision_owner`, `outsourcing_policy` | H+D | multi |

Les familles Identité (`legal_id`, `naf_code`, `collective_agreement`, `headcount_france`,
`establishment`, `executive`, `incorporation_date`) **existent déjà en production** depuis la
migration 073 — 48 `legal_id` sur 26 comptes au 13/08.

**Règle absolue** : tout fait porte `origin`, `primary_source_id`, `effective_at`,
`confidence_score`. **Un fait sans source ne s'écrit pas.**

### 7.2 `sector_intelligence.playbook` — clés à ajouter

Existantes et conservées : `personas`, `objections`, `entry_points`, `roi_arguments`
(présentes sur les 53 fiches, remplies sur 13).
À ajouter : `economic_models` (S3), `tech_fronts` (S4), `risks` (S6), `market_thesis` (S13).

⚠️ La résolution segment → macro fusionne le playbook **clé par clé**, jamais le blob : 37
des 38 segments portent un squelette de seed aux tableaux vides qui écraserait les playbooks
macro remplis (migration 071).

### 7.3 Registre de sources

Le standard v1.0 (tier T1-T4, rôle `proof|corroboration|discovery|watch`, score d'utilité
/100, `automation_fit`) se porte dans `intelligence_sources.technical_metadata`, le lien vers
le secteur via `intelligence_source_links`.

**Amendement du 13/08** : cette décision (« pas de table dédiée ») tient pour la **preuve**.
Elle ne tient pas pour la **configuration** — un corpus de sources réutilisable et éditable est
une entité de premier rang, et `intelligence_sources` porte une seule policy RLS `SELECT`,
donc est structurellement inéditable. Voir `06-ETAPE-E3-CORPUS-DE-SOURCES.md` §6, qui pose la
frontière : *où l'on peut chercher* ≠ *ce qu'on a trouvé*.

### 7.4 `result_type` et `document_type`

| Valeur | Sur | Usage | État |
|---|---|---|---|
| `competitive_map` | `ai_intelligence_results.result_type` | Ingestion E5 | à créer |
| `sector_study` | idem | Livrable E4 (`company_id` est **nullable**, vérifié live — le stockage à la maille secteur est possible) | à créer |
| `sector_source_registry` | idem | Livrable E3 | à créer |
| `master_study` | enum `intelligence_document_type` | Consultation dans le Knowledge Hub | **à créer — 1 ligne de migration** |

`intelligence_documents.primary_entity_type` accepte déjà `sector`
(enum `intelligence_entity_type`, vérifié live) : **la Master Study peut être rattachée à un
segment sans aucune modification de structure.**
