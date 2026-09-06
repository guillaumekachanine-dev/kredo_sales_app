# Account Knowledge V4 — audit, arbitrages et plan de refonte

**Statut :** cadrage. Aucun code, aucune migration, aucun workflow modifié par ce document.
**Date :** 2026-09-06. Tous les chiffres sont **relevés en base de production** ce jour, ou lus dans
le code du dépôt à `HEAD` (`9a00995a`).
**Objet :** remplacer le processus `intel-030-account-knowledge` V3 par un **moteur de
compréhension d'entreprise**, dans l'esprit des études FOLIO, au standard KREDO.

> Ce document **supersède** `INTEL-030-ACCOUNT-KNOWLEDGE-V3-CONTRACT.md` (déclaré « gelé »,
> aujourd'hui invalidé par ses propres résultats) et **amende** le §8 de
> `ARCHITECTURE-CONNAISSANCE-UTILE.md` — l'arbitrage est explicité au §5.1, il n'est pas escamoté.

---

## 0. Résumé exécutif

1. **La V3 ne produit rien d'exploitable, et c'est structurel, pas accidentel.** Le dernier run
   (Tournaire, 04/09) a consommé 24 124 tokens et 133 s pour publier **5 phrases**, toutes tirées
   d'**une seule source**, et toutes **fausses** : elles décrivent une autre entreprise.
2. **Défaut le plus grave, jamais identifié auparavant : la résolution d'entité.** Le workflow a
   apparié « Tournaire » (fabricant d'emballages, Grasse, NAF 25.92Z, SIREN 415550110) avec
   `TOURNAIRE`, **SIREN 505063438, Lyon, NAF 43.99C — une entreprise de travaux de construction**.
   Le « vérificateur indépendant » a confirmé les 5 affirmations, la porte de qualité affiche
   `passed: true` sur les 12 contrôles, et **4 propositions d'enrichissement à 0,85–0,95 de
   confiance attendent d'écraser la fiche CRM avec l'identité de la mauvaise société**. Elles sont
   encore en statut `proposed` en base à cette heure.
3. **L'architecture maximise la prouvabilité et minimise l'utilité.** Le prompt plafonne à
   « ~30 affirmations », interdit toute lecture sectorielle, interdit toute recommandation, et le
   nœud d'assemblage **supprime toute affirmation non confirmée**. Une déduction juste et utile est
   mécaniquement détruite ; une paraphrase de code NAF survit.
4. **La V3 est une régression mesurable sur la V2** : 5 et 11 affirmations publiées en V3, contre
   15 à 27 en V2, pour un coût comparable.
5. **Deux des trois canaux de collecte sont morts en production** : le flux Google News répond 200
   avec un corps vide (`unreachable_200`), et le site officiel a été écarté avec le motif
   `no_safe_url` **alors que l'URL `https://www.tournaire.fr/` passe le garde-fou du dépôt** — ce
   qui prouve que **le workflow déployé sur le VPS n'est pas celui du dépôt**.
6. **La matière est déjà là et n'atteint jamais le prompt** : 88 fiches `companies.description`
   déjà rédigées et denses, 93 études FOLIO Phase 1, 81 études FOLIO Phase 2, 38/38 segments
   sectoriels avec description résolue, 66 items réglementaires, 87 pain points, 23 entrées de
   cartographie concurrentielle. La RPC d'hydratation n'en sert **aucun**, filtre les signaux
   archivés (Tournaire : 8 signaux, 8 archivés, 0 vu) et ne retient que les faits `verified_at`
   (152 sur 648, soit 23 %).
7. **FOLIO est la bonne référence de fond et de forme, pas de méthode.** Sa richesse vient de
   12 recherches Serper, d'un seul appel LLM à 16 000 tokens de sortie et d'un schéma à champs
   libres. Sa faiblesse est l'absence totale de qualification : l'étude Medipath cite « SciNote,
   CrelioHealth LIMS, Labguru » comme concurrents d'un laboratoire d'anatomopathologie — trois
   éditeurs de logiciels, ramassés dans des snippets.
8. **La V4 doit donc combiner les deux** : l'ampleur de collecte et la prose de FOLIO, la
   traçabilité et la discipline de KREDO — mais avec une **qualification épistémique à quatre
   niveaux** au lieu d'un filtre binaire, et une **résolution d'entité déterministe** en amont de
   tout.
9. Le plan tient en **6 lots**, tous additifs et réversibles, sans nouvelle table, en conservant
   V1/V2/V3 lisibles et la V3 exécutable jusqu'à la bascule.
10. **Le Lot 1 est un correctif de sécurité de la donnée**, livrable seul et immédiatement.

---

# PARTIE A — Rôle, utilité et finalité d'Account Knowledge dans KREDO

## 1. Ce que le processus est censé faire

`intel-030-account-knowledge` est l'**étape 1 de la chaîne de décision ADR-0012**
(Connaissance → Secteur → Enjeux → Stratégie → Roadmap). C'est le seul processus de KREDO dont
l'objet est **l'entreprise elle-même**, par opposition à :

| Processus | Objet | Écrit dans |
|---|---|---|
| `intel-010-refresh` | attributs CRM du compte | `enrichment_proposals` → `companies`, `account_facts` |
| **`intel-030-account-knowledge`** | **compréhension de l'entreprise** | `ai_intelligence_results` (`result_type='account_knowledge'`) |
| `intel-031-issues-map` | enjeux priorisés | `account_issues` |
| `intel-032-strategy` | angles commerciaux | `commercial_strategy` |
| `intel-033` / scheduler | veille datée | `account_signals` |
| MASTER STUDY | secteur et concurrence | `sector_intelligence`, `competitive_map_entries` |

Sa finalité réelle, telle qu'elle ressort du code : **alimenter l'onglet « Entreprise » du hub
`/prospection/accounts/[companyId]`**, et servir de socle aux étapes 3 à 5. En pratique, un seul
consommateur applicatif existe aujourd'hui hors de cet onglet : le provider de corpus des missions
d'intelligence (`src/features/intelligence-missions/data/corpus/account-context-provider.ts`), qui
ne lit d'ailleurs pas l'artefact mais recompose son propre contexte.

**Conséquence structurante : l'artefact `account_knowledge` n'est aujourd'hui la source de
personne.** C'est une page, pas une brique. La V4 doit changer cela — c'est le sens de la « vision
jumeau de compréhension » : une compréhension écrite une fois, projetée dans plusieurs vues.

## 2. Ce que le processus doit devenir, selon la nouvelle philosophie

La question posée par la V3 était : *« qu'est-ce que KREDO peut affirmer avec certitude ? »*.
La question de la V4 est : *« comment permettre à un Business Manager de comprendre rapidement et
profondément cette entreprise pour agir ? »*.

Cinq conséquences non négociables :

- **La compréhension prime sur la preuve.** Une déduction argumentée et qualifiée vaut mieux
  qu'un blanc.
- **La déduction est un livrable, pas un déchet.** Elle doit être visible, étiquetée, et jamais
  confondue avec un fait.
- **La prose est le format de restitution.** Le JSON reste le contrat machine ; il ne dicte plus
  le style.
- **La connaissance interne KREDO est une preuve de premier rang.** Elle n'est ni moins fiable ni
  moins citable qu'un article de presse.
- **La vérification documentaire devient une fonctionnalité séparée, à la demande.** Elle cesse
  d'être une taxe sur chaque génération.

## 3. Surface applicative concernée (relevé de code)

| Couche | Fichier | Impact V4 |
|---|---|---|
| Déclenchement | `src/components/accounts-contacts/intelligence/use-account-knowledge-run.ts:57` | 1 ligne (`accountKnowledgeSchemaVersion: 4`) |
| Déclenchement (hub) | `src/components/intelligence/AccountAnalysisHub.tsx:152` | idem + `includedSubjects` à réviser |
| Contrat trigger | `src/lib/n8n/types.ts:350` (`AccountKnowledgeTriggerInput`) | littéral `2 \| 3` → `2 \| 3 \| 4` |
| Contrats | `src/lib/intelligence/account-intelligence-contracts.ts` (26 Ko) | ajout additif V4 |
| Validation | `src/lib/intelligence/intelligence-validators.ts:1000` (`parseAccountKnowledgeArtifact`) | ajout d'une branche `schema_version === 4` |
| Ingestion | `src/lib/intelligence/account-knowledge-ingest.ts:250` | vérification des `source_refs` à étendre |
| Callback | `src/app/api/n8n/callback/route.ts:115` | inchangé (portail générique) |
| Lecture | `client-intelligence-company.ts`, `ClientIntelligenceCompanyTab.tsx:45-75` | ajout d'une branche `version === 4` |
| Restitution | `src/components/accounts-contacts/intelligence/folio-v3/*` (1 088 lignes) | **réutilisable**, à étendre d'un rendu narratif |
| RPC | `public.get_account_knowledge_context` | **à ne pas modifier** — nouvelle RPC à côté |

La bonne nouvelle : **la couche de restitution FOLIO existe déjà** (`FolioNarrativeBlock`,
`FolioEditorialList`, `FolioSourceMarker`, `FolioSourceDisclosure`, `FolioEvidenceState`,
`FolioIdentityGrid`). Elle rend aujourd'hui des `Claim` atomiques ; il lui manque un rendu de
paragraphes. Ce n'est pas une réécriture.

> ⚠️ Dette au passage : `folio-v3/FolioStudyPrimitives.tsx` code en dur `#243B63`, `#334155`,
> `#D89B16`, `#CBD5E1`, `#64748B` — interdit par CLAUDE.md (« PAS de HEX en dur dans le JSX »).
> À corriger au Lot 4, pas avant.

## 4. La matière KREDO réellement disponible (relevé live 2026-09-06)

| Gisement | Volume | Vu par la V3 ? |
|---|---:|---|
| `companies.description` rédigées (> 200 car.) | **88 / 112** | passé au prompt, **jamais citable** (pas dans le catalogue de sources) |
| FOLIO Phase 1 (`metadata.analysis_data`) | **93 / 112** | tronqué à 800 caractères, en « indice », interdit de citation |
| FOLIO Phase 2 (`metadata.sector_analysis`) | **81 / 112** | idem |
| `account_facts` courants | 648 | **152 seulement** (filtre `verified_at`) |
| `account_signals` | 843 dont **120 actifs** | filtre RPC : les `archived` sont invisibles |
| `contacts` / `interactions` | 642 / 185 | passés, **sans destination** (bloc `organisation` retiré en V3) |
| `opportunities` / `missions` | 32 / 33 | 5 éléments max, segment B uniquement |
| `v_sector_knowledge_resolved` | **38 / 38 segments avec description** | **jamais lu** |
| `sector_regulatory_items` / `sector_pain_points` | 66 / 87 | **jamais lus** |
| `competitive_map_entries` | 23 | **jamais lu** |
| `account_issues` | 52 | **jamais lu** |
| `intelligence_documents` | 95 | **jamais lu** |
| `intelligence_sources` | 548 | seulement celles liées à un fait vérifié |

Exemple concret, sur le compte Tournaire : la connaissance résolue de son segment
(*Équipements & emballages industriels*, héritée du macro) décrit une convergence réglementaire
2026-2027 — **PPWR, CSRD, facturation électronique, Cyber Resilience Act, écoconception** — et
nomme cinq acteurs de référence. La section `regulatory_environment` de l'étude publiée est vide.

---

# PARTIE B — Audit critique de `intel-030-account-knowledge` V3

## 5. Anatomie : 66 nœuds, 4 appels LLM

La branche V3 (26 nœuds sur les 66) suit ce chemin :

```
Validate Entity → Hydrate Context (RPC) → V3 Prepare Context & Research Plan
  → V3 Fetch Official Site / Public Registry / Company News
  → V3 Consult & Normalize Sources → V3 Build Source Catalogue
  → V3 Upsert Sources → V3 Resolve Source Ids
  → V3 Assemble Draft Prompt
      → LLM Draft A (identité, positionnement)    ┐
      → LLM Draft B (offres, chaîne de valeur)    ├ 3 appels
      → LLM Draft C (réglementaire, actualité)    ┘
  → V3 Merge Segments → V3 Parse Draft
  → V3 Assemble Verification Prompt → LLM Verify  ← 4ᵉ appel
  → V3 Parse Verification → V3 Assemble Artifact (filtrage)
  → V3 Validate Artifact → propositions → callback
```

## 6. La preuve par le dernier run — Tournaire, 2026-09-04

`ai_intelligence_results.id = 4be14477-d5f5-45ae-9182-a76152a6a478`
`tokens_input = 12 315 · tokens_output = 11 809 · duration_ms = 133 185 · 1 source · 5 claims`

**Ce que KREDO savait déjà, et qui figurait littéralement dans le payload du prompt :**

> « Tournaire est un acteur industriel français de référence, **fondé en 1833**, spécialisé dans les
> **emballages techniques haute performance** et les équipements d'extraction. […] 280 à 300
> collaborateurs basés à **Grasse**, distribution dans 70 à 80 pays […] Motion Equity Partners au
> capital […] index égalité 89/100. »
> — `companies.description`, présent dans `canonical` au run

**Ce que l'étude a publié :**

| Chemin | Texte publié | Vérité |
|---|---|---|
| `identity.company_name` | « TOURNAIRE (**SIREN 505063438**) » | SIREN de TOURNAIRE SA = **415550110** |
| `identity.legal_name` | « TOURNAIRE » | « Groupe Tournaire (Tournaire SA) » |
| `identity.headquarters` | « **Lyon (69006)** » | **Grasse (06)** |
| `identity.primary_activity` | « NAF **43.99C** » (travaux de construction) | **25.92Z** (emballages métalliques légers) |
| `account_summary` | « aucune donnée fiable sur son activité, sa taille, son CA ou son positionnement » | 270 M€ et 70 salariés au CRM, description de 8 lignes juste au-dessus |

Sections **entièrement vides** : `market_positioning` (7 sous-blocs), `offers_and_customers`
(12 champs), `value_chain` (7 champs), `regulatory_environment` (3 blocs), `trends_and_news`.

**Reproduction de l'erreur** (appel à la même API publique que le workflow, ce jour) :

```
GET recherche-entreprises.api.gouv.fr/search?q=Tournaire&per_page=3
→ 1. 505063438  TOURNAIRE            43.99C  LYON     ← retenu par le workflow
  (…)
→ 5. 415550110  TOURNAIRE SA         25.92Z  GRASSE   ← la vraie entité, hors des 3 résultats
     914494778  TOURNAIRE GROUP HOLDING 70.10Z GRASSE
```

**Mécanique exacte du défaut**, trois erreurs cumulées dans `V3 Consult & Normalize Sources` :

1. La requête utilise `canonical.name` (« Tournaire ») alors que le scoring compare à
   `legal_name || name` (« Groupe Tournaire (Tournaire SA) ») — deux chaînes différentes.
2. `per_page=3` : la bonne entité est en 5ᵉ position, elle n'est jamais candidate.
3. Le score d'appariement retient `target.includes(candidate)` → **0,6**, exactement le seuil
   d'acceptation. Aucun contrôle croisé n'est fait sur la commune, le code NAF ou le secteur, tous
   présents au CRM et tous contradictoires.

**Et rien n'a arrêté l'erreur en aval :**

- le « vérificateur indépendant » a rendu 5 `confirmed` — il vérifie l'accord *claim ↔ source*,
  jamais *source ↔ entité*, ni *source ↔ CRM* ;
- `source_coverage` : `{ passed: true, coverage_rate: 1 }` ;
- `qa_flags` : **12 contrôles, 12 `passed: true`**, dont
  `all_claims_verified_confirmed` et `external_research_performed` ;
- 4 `enrichment_proposals` créées, statut `proposed`, confiance 0,85 à 0,95, prêtes à écrire
  `siren=505063438`, `naf_code=43.99C`, `hq_location='LYON 69006'`, `legal_name='TOURNAIRE'`
  dans `companies`.

> **C'est le point le plus grave de l'audit.** Le dispositif de qualité ne mesure que la cohérence
> interne du pipeline. Il ne mesure ni la vérité, ni l'utilité, ni même l'identité du sujet étudié.
> Et il a produit une contamination de la donnée canonique qui n'attend qu'un clic.

## 7. Diagnostic — sept causes, par ordre de gravité

### D1 — Aucune résolution d'entité
Le workflow ne se demande jamais *de quelle personne morale il parle*. Il prend le premier résultat
plausible d'une recherche par nom. Sur un référentiel de 112 comptes dont **seulement 37 portent un
SIREN**, c'est une bombe à retardement. *Absent du contrat V3, absent du rapport ChatGPT.*

### D2 — Le filtre de publication détruit la connaissance
`V3 Assemble Artifact` supprime tout claim dont le verdict n'est pas `confirmed` **avec** au moins
une source de confirmation. Il n'existe aucun état intermédiaire : une déduction solide, une
déclaration de l'entreprise non corroborée, une lecture argumentée du marché — tout est jeté.

### D3 — Le prompt plafonne la richesse par construction
Extraits littéraux de `SHARED_RULES` (`V3 Assemble Draft Prompt`) :

- « Volume borné : **au plus 3 entrées par tableau, environ 30 affirmations au total** » ;
- « Préfère 3 affirmations solides à 10 diluées » ;
- « **Aucune macro-sectorielle** (taille de marché, croissance du secteur) » ;
- « Aucune recommandation commerciale, aucun plan d'action » ;
- « Une section sans matière solide reste VIDE ».

Un moteur de compréhension à qui l'on interdit le contexte de marché et que l'on plafonne à
30 phrases ne peut pas raconter une histoire.

### D4 — Le format interdit la prose
Chaque champ du contrat V3 est un `Claim` : `{ text, nature, attribution, source_refs, confidence,
verified_at }`. **Il n'existe aucun champ narratif dans tout le schéma.** Une étude V3 est un
tableau de phrases isolées ; la prose FOLIO est structurellement impossible.

### D5 — Deux canaux de collecte sur trois sont morts
`researchDiagnostic` du run Tournaire :

```
official_site : consulted=false, reason="no_safe_url"
registry      : consulted=true,  matchScore=0.6      ← mauvaise entité
press         : consulted=false, reason="unreachable_200"
```

- `unreachable_200` = Google News RSS répond 200 avec un corps vide. Le canal presse est
  inopérant en production.
- `no_safe_url` sur `https://www.tournaire.fr/` est **impossible avec le code du dépôt** (garde-fou
  rejoué : il retourne `true`). **Le workflow qui tourne sur le VPS n'est donc pas celui du
  dépôt.** À réconcilier avant toute intervention.
- Par ailleurs, même quand il fonctionne, le canal presse ne transmet que **les titres** des
  articles : la règle « toute URL citée doit avoir été réellement consultée » du contrat V3 est
  **violée par sa propre implémentation**, puisqu'on cite l'URL de l'article sans jamais l'ouvrir.

### D6 — La V3 est une régression mesurée sur la V2

| Version | Runs réussis | Affirmations publiées | Tokens moyens |
|---|---:|---:|---:|
| V1 (07/2026) | 9 | — | ~7 000 |
| **V2** (08/2026) | 7 | **15 à 27** | ~30 000 |
| **V3** (08–09/2026) | **2** | **5 et 11** | ~26 000 |

Sept échecs `failed` sur la période, dont 4 sur la branche V3.

### D7 — Le coût réel n'est pas celui qu'on croit
`intel-030` est le workflow **par compte** le plus cher : **0,0924 $/run** en moyenne (18 runs,
1,66 $ cumulés), contre 0,047 $ pour la veille et 0,050 $ pour les enjeux. Ce n'est pas le montant
qui est un problème — c'est le **ratio** : ~24 000 tokens et **107 secondes en moyenne (133 à
151 s en V3)** pour 5 phrases. La V4 doit viser un coût par run *comparable ou supérieur* mais un
rendement dix fois meilleur ; ce n'est pas un chantier d'économie, c'est un chantier de valeur.

---

# PARTIE C — FOLIO : ce qu'il faut reprendre, ce qu'il faut jeter

## 8. Anatomie des deux workflows legacy

| | Phase 1 — fiche client | Phase 2 — étude sectorielle |
|---|---|---|
| Recherches Serper | **3** | **12** (2 par thème × 6 thèmes) |
| Scraping | site officiel, 8 000 car. | — (hérite de Phase 1) |
| Appels LLM | 1 | **1** |
| `max_tokens` | 4 096 | **16 000** |
| Température | 0,2 | 0,2 |
| Sourcing | **aucun** | **aucun** |
| Vérification | **aucune** | **aucune** |
| Chaînage | — | reçoit `synthese_consultant` + `positionnement` de la Phase 1 |

Les 12 requêtes de la Phase 2, **c'est le plan de recherche qu'il faut reprendre** :

```
marché      : "<secteur> taille marché France 2025 2026 chiffres"
              "<secteur> croissance marché tendances prévisions"
acteurs     : "<secteur> principaux acteurs leaders France"
              "<secteur> startups émergentes nouveaux entrants"
chaîne      : "<secteur> chaîne de valeur fournisseurs distributeurs"
              "<secteur> écosystème partenaires dépendances"
normatif    : "<secteur> réglementation lois normes France 2025 2026"
              "<secteur> RGPD conformité certification obligations"
concurrence : "<compte> concurrents directs comparatif"
              "<compte> parts de marché positionnement prix"
clientèle   : "<secteur> profil clients segmentation marché B2B B2C"
              "<secteur> comportement achat tendances consommation"
```

## 9. Pourquoi FOLIO produisait davantage — quatre causes, toutes reproductibles

1. **Volume de collecte** : 12 recherches × 5 résultats = **60 extraits** contre 1 à 3 preuves
   en V3.
2. **Un seul appel, un seul contexte** : le modèle voit tout le dossier d'un coup et peut croiser.
   La segmentation A/B/C de la V3 empêche le croisement — le segment C ne reçoit même pas
   `canonical.description`.
3. **Un plafond de sortie généreux** : 16 000 tokens contre 6 000 par segment, avec des champs
   libres et non plafonnés en nombre d'entrées.
4. **Aucune taxe de publication** : le modèle écrit ce qu'il comprend. Toute la richesse survit.

## 10. Ce qu'il ne faut surtout pas reprendre

**FOLIO invente, et rien ne l'en empêche.** Preuve, sur l'étude de référence citée par Guillaume
(Medipath, `metadata.analysis_data`) :

> `concurrents_identifies: [ …, "SciNote", "CrelioHealth LIMS", "Labguru ELN LIMS" ]`

Ce sont trois **éditeurs de logiciels de laboratoire**, présentés comme concurrents d'un groupe
d'anatomopathologie. Ils viennent d'une requête `"Medipath concurrents comparatif"` qui a ramené
des pages de comparatifs LIMS. La même étude place le siège de Medipath à « 83600 » (un code
postal), sa forme juridique et son effectif à « Non trouvé », et son code NAF à « Non trouvé ».

Autres défauts à ne pas reconduire :
- **le marqueur « Non trouvé »** pollue la restitution (la V3 avait raison de l'interdire) ;
- **zéro traçabilité** : aucune URL, aucune date de consultation, rien de vérifiable ;
- **la Phase 2 raisonne au secteur libre** (`companies.sector`, texte), pas au segment KREDO —
  or KREDO dispose désormais de 38 segments résolus et d'un référentiel de 53 fiches ;
- **écriture directe** dans les tables métier, sans mécanisme de proposition.

## 11. Ce qu'il faut reprendre, précisément

| De FOLIO | Comment le porter en V4 |
|---|---|
| 12 recherches thématiques | plan de recherche déterministe, **ancré sur l'entité résolue** et sur le segment KREDO |
| 1 appel LLM, `max_tokens` élevé | 1 appel de synthèse, 16 000 tokens, garde anti-troncature déjà présente |
| Champs libres, listes non plafonnées | schéma V4 à `narrative` + `key_points` sans plafond arbitraire |
| `synthese_consultant` / `synthese_sectorielle` | la section **Synthèse** de la V4, écrite en dernier, dense, 10 à 15 lignes |
| Chaînage Phase 1 → Phase 2 | remplacé par le **dossier unifié** : KREDO + FOLIO historique + secteur + web |
| Le ton : paragraphes analytiques, listes courtes commentées | **règle de style explicite dans le prompt**, avec longueurs cibles par bloc |
| La mise en page (blocs, sous-titres, listes à puces commentées) | déjà implémentée dans `folio-v3/*`, à étendre |

---

# PARTIE D — Analyse critique du rapport ChatGPT

## 12. Ce qui est juste, et qu'il faut garder

- **Le diagnostic de fond est exact** : la philosophie de vérification est inscrite dans
  l'architecture, pas dans un prompt. Vérifié : le contrat TS impose un
  `AccountKnowledgeVerificationResultV3` par claim publié, et l'assemblage jette le reste.
- **Les chiffres cités sont exacts.** 24 124 et 28 094 tokens, 133 et 151 s, 1 source chacun :
  contrôlés en base, ils correspondent aux runs Tournaire et Ciffreo Bona.
- **Réintroduire Serper comme moteur de découverte** : validé, c'est la cause n°1 de l'écart de
  richesse avec FOLIO.
- **Un seul appel LLM de synthèse, suppression du vérificateur systématique** : validé.
- **Qualification épistémique à 4 niveaux plutôt qu'un filtre binaire** : validé, c'est le bon
  remplacement du filtre destructeur.
- **Aucune nouvelle table, `schema_version: 4`, V1/V2/V3 préservés** : validé, l'ajout est
  strictement additif (`parseAccountKnowledgeArtifact` est un simple aiguillage sur la version).
- **Benchmark avant bascule sur 3 à 5 comptes** : validé, et rendu facile par les 93 études FOLIO
  et 18 artefacts V1/V2/V3 déjà en base.
- **La vérification devient une capacité séparée** : validé — et le patron existe déjà,
  `intel-034-account-signal-verification` fait exactement cela pour un signal.

## 13. Ce qui est faux, et qu'il ne faut pas suivre

**13.1 — L'alerte de sécurité sur la clé Serper est infondée.**
Le rapport conclut : « la clé Serper apparaissant dans le code collé dans ton message doit
désormais être considérée comme exposée. Il faut la révoquer/rotater ». **Contrôlé : c'est faux.**
Les deux JSON FOLIO lisent `$env.SERPER_API_KEY` et `$env.ANTHROPIC_API_KEY` ; les blocs
`credentials` ne contiennent que des **identifiants** de credentials n8n (`SePATj44dGEhults`,
`Kdm59ewFVMq5hBtF`), jamais leur valeur. Un balayage des chaînes de 32 caractères et plus dans les
deux fichiers ne rend que des UUID de nœuds et l'`instanceId` n8n. **Aucun secret n'a été exposé,
aucune rotation n'est nécessaire.** Une recommandation de sécurité fausse coûte du temps et
décrédibilise les vraies.

**13.2 — Le défaut le plus grave est totalement absent du rapport.**
ChatGPT n'a pas ouvert le contenu des artefacts : il compte les claims (« 5 claims ») sans lire ce
qu'ils disent. Il n'a donc pas vu que l'étude Tournaire décrit **une autre entreprise**, ni que
4 propositions d'enrichissement toxiques attendent d'être appliquées. **Sa roadmap livrerait une
V4 assise sur le même SIREN faux.**

**13.3 — « La RPC hydrate déjà une partie importante de cette matière » : vrai mais trompeur.**
Il faut dire ce qui manque, sinon le Lot 1 sera sous-dimensionné :
- filtre `verified_at` → **496 faits sur 648 écartés** ;
- filtre `status not in (…,'archived')` → **723 signaux sur 843 invisibles** ; sur les deux
  comptes réellement étudiés en V3, **100 % des signaux étaient archivés** ;
- **zéro** connaissance sectorielle (`v_sector_knowledge_resolved`, `v_sector_knowledge_items`),
  zéro cartographie concurrentielle, zéro enjeu, zéro document, ni SIREN ni NAF.

**13.4 — L'inventaire « KREDO possède 648 faits, 843 signaux, 52 enjeux… » induit en erreur.**
Ce sont des volumes *workspace*. Sur Tournaire : **0 fait, 0 signal actif, 2 contacts,
0 interaction, 0 opportunité, 0 enjeu**. Le problème n'est pas le volume, c'est la **distribution**
(52 enjeux concentrés sur 9 comptes, 648 faits sur 47 comptes). La V4 doit être bonne **sur un
compte pauvre**, sinon elle ne servira sur presque aucun compte. C'est un critère de benchmark, pas
un détail.

**13.5 — Il ne dit pas d'arrêter l'hémorragie.**
« Ne pas toucher à la V3 pendant les lots 0–2 » est raisonnable pour le code, mais la V3 **écrit
des propositions d'enrichissement fausses à chaque run**. Il faut soit désactiver le bouton, soit
geler les propositions issues d'un appariement faible — c'est le Lot 1, il passe devant tout.

**13.6 — Sur Serper, il ne pose aucun garde-fou anti-empoisonnement.**
« Serper pour explorer → récupération des sources intéressantes → synthèse » est la bonne forme,
mais sans règle de cohérence métier, on reproduit exactement l'erreur « CrelioHealth LIMS » de
FOLIO. Il faut une doctrine explicite (§16).

**13.7 — Il escamote le conflit avec `ARCHITECTURE-CONNAISSANCE-UTILE.md`.**
Ce document conclut noir sur blanc : « **cesser de produire une encyclopédie** », C7 et C8 étant les
catégories les moins décisives. La commande de Guillaume demande précisément une encyclopédie
narrative. Ce conflit doit être **arbitré**, pas contourné : voir §5.1 ci-dessous.

**13.8 — Détails.** Son tableau annonce « 5 lots seulement » puis en liste six (0 à 5) ; il propose
d'auditer `src/lib/intelligence/account-knowledge-state.ts` et une UI `folio-v3/*` sans avoir
constaté que cette UI est déjà écrite et réutilisable ; il ne mentionne ni la mort du canal presse,
ni la dérive VPS ↔ dépôt, deux faits qui invalident son hypothèse de départ (« trois canaux de
collecte fonctionnent, ils sont juste trop étroits »).

**Verdict global : direction juste, instruction insuffisante.** Le rapport est un bon cadrage
philosophique et un mauvais audit technique — il n'a pas ouvert les artefacts, pas rejoué les
appels externes, pas lu les prompts en entier. Ses lots sont réutilisables ; sa liste de défauts ne
l'est pas.

---

# PARTIE E — Plan de refonte

## 14. L'arbitrage de périmètre (§5.1 — décision demandée)

Deux commandes coexistent dans le dépôt et se contredisent :

| | `ARCHITECTURE-CONNAISSANCE-UTILE.md` (26/08) | Commande V4 (06/09) |
|---|---|---|
| Objet | l'entreprise **comme acheteuse de prestations IT** | l'entreprise **comme entreprise** |
| Priorité | C1 adressabilité, C2 décision, C5 notre position | métier, marché, concurrents, histoire, ambitions |
| Moyen | **saisie humaine** (formulaire) | **recherche et rédaction** (LLM) |

**Les deux ont raison, et elles ne parlent pas du même livrable.** Ma décision, à valider :

> **`intel-030` V4 est le moteur de compréhension. Il ne couvre ni C1 ni C2.**
> L'adressabilité (canal d'achat, référencement, ESN en place, échéances de panel) et
> l'organisation de la décision (rôle, niveau de relation) **ne se cherchent pas, elles se
> saisissent** : elles relèvent d'un formulaire de qualification, chantier distinct et
> non concurrent.
> **Mais la V4 restitue C5** — missions, TJM pratiqué, opportunités gagnées et perdues et leurs
> motifs — car c'est en base, gratuit, et directement narratif (« ce que nous avons déjà fait chez
> eux »). C'est le seul emprunt au document du 26/08.

Une section supplémentaire, **« Ce que cela implique pour KREDO »**, est ajoutée en fin d'étude :
3 à 5 paragraphes reliant la compréhension aux practices Kredo. Elle lève l'interdiction V3
« aucune recommandation commerciale », qui vidait l'étude de sa raison d'être commerciale.

## 15. Architecture cible

```
                      ┌─ companies (+ description, siren, naf)
                      ├─ account_facts (TOUS, avec leur niveau de preuve)
                      ├─ account_signals (TOUS, avec leur statut et leur date)
   CONTEXTE KREDO ────┼─ contacts · interactions · opportunities · missions
   (RPC v2)           ├─ account_issues · intelligence_documents
                      ├─ v_sector_knowledge_resolved + v_sector_knowledge_items
                      ├─ competitive_map_entries · value_chain_*
                      └─ FOLIO historique (analysis_data + sector_analysis) — cité comme "legacy"
                              │
   RÉSOLUTION D'ENTITÉ ───────┤  déterministe, avant toute recherche
   (SIREN, NAF, siège)        │  → verrouille le sujet de l'étude
                              │
   EXPLORATION EXTERNE ───────┤  Serper ×10-12 (découverte) + fetch de 3-6 pages (preuve)
                              │  + registre public (identité) + site officiel
                              ▼
                      DOSSIER DE COMPRÉHENSION  (déterministe, aucun LLM)
                              │
                      1 APPEL DE SYNTHÈSE  (16 000 tokens, prose + structure)
                              │
                      GARDE-FOUS DÉTERMINISTES  (chiffres, entités, sources)
                              ▼
              ai_intelligence_results · account_knowledge · schema_version: 4
                              │
        ┌─────────────┬───────┴────────┬──────────────────┐
     rapport      briefing RDV     contexte enjeux    contexte rédaction
    éditorial     (projection)      (intel-031)        (intel-020)
```

Aucune nouvelle table. Aucune nouvelle vérité persistée : l'artefact reste **une lecture datée**,
et les lectures dérivées (§7 du document du 26/08) restent calculées.

## 16. Doctrine des sources et de la qualification

### 16.1 Quatre niveaux, un seul champ

| Niveau | Définition | Source obligatoire ? | Rendu |
|---|---|---|---|
| `established` | fait vérifiable dans une source consultée **ou** donnée relationnelle KREDO | **oui** | encre normale, marqueur `[n]` |
| `declared` | propos tenu par l'entreprise ou un tiers identifié, non corroboré | **oui** (celle qui porte le propos) | guillemets + « déclaré » |
| `inferred` | déduction argumentée à partir d'éléments cités | **oui** (les éléments mobilisés) | italique + « déduit » |
| `hypothesis` | lecture plausible, cohérente, à confirmer | non | italique grisé + « hypothèse » |

Trois règles :
- **une `hypothesis` n'est jamais un chiffre** — un chiffre est `established` ou n'est pas ;
- **une `inferred` doit citer ce dont elle part** ; sans référence, elle est rétrogradée en
  `hypothesis` par le validateur, jamais supprimée ;
- **`internal_crm` et `human_note` sont des sources de premier rang** ; elles ne dégradent pas la
  confiance. Un fait tenu de Guillaume vaut mieux qu'une paraphrase de code NAF.

### 16.2 Rôle de Serper et anti-empoisonnement

- **Un snippet Serper est un indice de découverte, jamais une preuve.** Il peut fonder au maximum
  une `declared` ou une `inferred`, jamais une `established`.
- **Seule une page réellement téléchargée fonde une `established` externe.** Le workflow sélectionne
  3 à 6 URL parmi les résultats (site officiel, registre, presse spécialisée, communiqué) et les
  récupère vraiment.
- **Toute requête nommant le compte est ancrée sur l'entité résolue** (raison sociale + commune du
  siège), jamais sur le seul nom d'usage.
- **Garde de cohérence métier** : un concurrent proposé dont l'activité déclarée n'a aucun rapport
  avec le NAF ou le segment du compte est rétrogradé en `hypothesis` et signalé en `qa_flags`
  (`competitor_domain_mismatch`). C'est le correctif direct du défaut « CrelioHealth LIMS ».
- **Garde des chiffres** : contrôle déterministe post-génération — tout nombre du récit portant
  `%`, `€`, `M€`, `Md€` ou comptant 4 chiffres et plus doit se retrouver dans le dossier ou dans un
  `statement`. Sinon `qa_flags: unsourced_figure` et rétrogradation du passage.

## 17. Contrat V4 — forme minimale

`result_type = 'account_knowledge'`, `content_json.schema_version = 4`.

```
AccountKnowledgeContentV4
  schema_version: 4
  entity_resolution: { siren, legal_name, naf_code, hq_commune,
                       match_score, method, candidates[], needs_human_confirmation }
  sections: Section[]        ← ordre canonique figé, cf. ci-dessous
  sources: SourceRef[]       ← toutes les sources réellement mobilisées
  knowledge_gaps: Gap[]      ← ce qu'on n'a pas pu établir, et pourquoi
  coverage: { sections_written, statements_by_qualification, external_pages_fetched, … }
  generated_at

Section
  key: string                ← clé canonique
  title: string
  narrative: string[]        ← 2 à 6 paragraphes de prose analytique — LE cœur du livrable
  statements: Statement[]    ← couche machine réutilisable
  source_refs: string[]

Statement
  text: string
  qualification: 'established' | 'declared' | 'inferred' | 'hypothesis'
  source_refs: string[]
  confidence: number         ← 0..1
  entity?: { kind, name }    ← concurrent, partenaire, techno, dirigeant, réglementation…
```

**Les huit sections canoniques** — bâties sur la commande de Guillaume, pas sur le contrat V3 :

| # | Clé | Contenu |
|---|---|---|
| 1 | `synthesis` | l'histoire en 10 à 15 lignes — écrite en dernier, ne contient rien qui ne soit ailleurs |
| 2 | `identity` | identité juridique et opérationnelle, **entité résolue**, taille, implantations, actionnariat |
| 3 | `business_and_offering` | métier, offres, modèle, proposition de valeur, ce qui fait la différence |
| 4 | `customers_and_market` | clients types, segmentation, marché, dynamique, taille et croissance |
| 5 | `competition_and_positioning` | environnement concurrentiel, concurrents comparables, forces et menaces |
| 6 | `value_chain_and_dependencies` | chaîne de valeur, maillons, partenaires et dépendances critiques, vulnérabilités |
| 7 | `history_ambitions_and_news` | trajectoire, ambitions affichées, actualité récente datée, signaux |
| 8 | `implications_for_kredo` | ce que cela implique — practices, angles, moment. **Nouveau.** |

L'environnement réglementaire n'est plus une section : il est **injecté depuis
`v_sector_knowledge_items` et `sector_regulatory_items`** et commenté dans les sections 4, 6 et 8.
On ne fait pas régénérer par un LLM ce que la base sait déjà.

## 18. Roadmap — 6 lots

> Aucun lot ne supprime la V3. Le déclenchement V4 est explicite
> (`accountKnowledgeSchemaVersion: 4`), la bascule n'intervient qu'après le Lot 5.
> **Prérequis transverse : réconcilier le workflow VPS avec le dépôt** (§D5) — sans quoi tout
> constat de terrain est ininterprétable. Import et activation restent manuels, faits par Guillaume.

### Lot 1 — Résolution d'entité et arrêt de la contamination *(sécurité de la donnée)*
- **Objectif** : plus jamais publier ni proposer l'identité d'une autre société.
- **Périmètre** : nouveau module `src/lib/intelligence/entity-resolution.ts` (déterministe, testé) :
  requête sur `legal_name` **et** `name`, `per_page=10`, scoring multi-critères (nom normalisé,
  commune du siège vs `hq_location`, cohérence NAF vs secteur/segment, tranche d'effectif vs
  `employee_count`), seuil de publication élevé, sinon `needs_human_confirmation`.
  Nœud n8n correspondant dans la branche V3 **et** V4. Blocage des `enrichment_proposals`
  d'identité en dessous du seuil.
- **Action immédiate hors code** : les 4 propositions `proposed` sur Tournaire
  (`siren`, `naf_code`, `hq_location`, `legal_name`) sont à **rejeter**, et un contrôle est à passer
  sur les propositions d'identité en attente des autres comptes.
- **Acceptation** : sur Tournaire, la résolution rend `415550110 / 25.92Z / GRASSE` ou
  `needs_human_confirmation`, jamais `505063438`. Tests unitaires sur 10 cas réels du portefeuille.
- **Rollback** : le module est additif ; retirer le nœud n8n restaure le comportement actuel.

### Lot 2 — Contexte unifié et contrat V4
- **Objectif** : donner au moteur toute la matière KREDO, et figer le contrat machine.
- **Périmètre** :
  - nouvelle RPC `public.get_account_understanding_context(p_workspace_id, p_company_id)`
    (`security invoker`, `search_path = ''`, `EXECUTE` au seul `service_role`, même doctrine que
    l'existante) ajoutant : `siren`/`naf_code`, **tous** les faits courants avec leur niveau de
    preuve, **tous** les signaux avec statut et date, `account_issues`, `intelligence_documents`,
    `v_sector_knowledge_resolved`, `v_sector_knowledge_items`, `competitive_map_entries`,
    `value_chain_*`, FOLIO historique complet ;
  - `AccountKnowledgeContentV4` + `validateAccountKnowledgeV4` + branche
    `schema_version === 4` dans `parseAccountKnowledgeArtifact` ;
  - `AccountKnowledgeTriggerInput` : `2 | 3 | 4`.
- **Dépendances** : aucune. **La RPC existante n'est pas touchée** (la V3 continue de tourner).
- **Acceptation** : `npm test` vert ; la RPC rend un contexte non vide sur un compte pauvre
  (Tournaire) comme sur un compte riche ; le validateur accepte un artefact dense et un artefact
  honnêtement partiel, rejette un `hypothesis` portant un chiffre.
- **Rollback** : `drop function` + retrait de la branche de version ; aucun artefact existant
  n'est affecté.

### Lot 3 — Workflow `intel-030` V4
- **Objectif** : la branche de génération, sur le patron trigger → run → n8n → callback existant.
- **Périmètre** : nouvelle branche `Route Account Knowledge Version` → V4, **~14 nœuds** :
  `V4 Prepare Dossier` → `V4 Resolve Entity` → `V4 Plan Research` → `V4 Serper Discovery` (10-12
  requêtes) → `V4 Fetch Selected Pages` (3-6) → `V4 Fetch Registry` → `V4 Build Dossier` →
  `V4 Upsert Sources` / `Resolve Ids` → `V4 Assemble Prompt` → **1 appel LLM** (16 000 tokens) →
  `V4 Parse & Guard` (chiffres, cohérence métier, rétrogradation) → `V4 Validate` →
  `V4 Prepare Callback`.
  **Suppression du vérificateur systématique** et du filtre de publication destructeur.
  `SERPER_API_KEY` à poser dans l'environnement n8n du VPS (jamais en clair dans le JSON).
- **Dépendances** : Lots 1 et 2.
- **Acceptation** : un run V4 sur un compte pauvre produit ≥ 6 sections rédigées et ≥ 25
  `statements` ; les 4 qualifications sont représentées ; ≥ 5 sources distinctes dont ≥ 3
  réellement téléchargées ; aucune section vide sans `knowledge_gap` correspondant.
  Harnais Node avec mocks + `npm run test:n8n` (le compteur d'assertions est lu, pas le code de
  sortie).
- **Rollback** : la branche V4 est inatteignable sans `accountKnowledgeSchemaVersion: 4`.

### Lot 4 — Restitution éditoriale Desktop et Mobile
- **Objectif** : rendre la prose lisible, dans la charte FOLIO déjà en place.
- **Périmètre** : `AccountKnowledgeV4Desktop` / `AccountKnowledgeV4Mobile` sur les primitives
  `folio-v3/*` existantes ; nouveau `FolioProseBlock` (paragraphes + marqueurs de source) ;
  badges de qualification (4 états au lieu des 3 de `FolioEvidenceState`) ; panneau de sources ;
  bloc `knowledge_gaps` ; correction des HEX en dur au passage.
  Adaptive : **responsive CSS** (ADR-0006, écran de lecture, pas de dashboard dense).
- **Dépendances** : Lot 2 (contrat) — peut être développé en parallèle du Lot 3 sur fixtures.
- **Acceptation** : rendu conforme aux études FOLIO de référence ; V1/V2/V3 toujours affichés par
  leur lecteur historique ; `npm run build` vert.
- **Rollback** : la branche `version === 4` de `ClientIntelligenceCompanyTab`.

### Lot 5 — Benchmark et bascule
- **Objectif** : décider sur pièces, pas sur impression.
- **Périmètre** : 5 comptes — 1 riche (contacts + veille + missions), 2 moyens, **2 pauvres**
  (Tournaire en fait partie, c'est le cas qui a cassé). Pour chacun : FOLIO legacy vs V3 vs V4.
  Sept mesures : richesse informationnelle, compréhension obtenue, pertinence pour un BM, qualité
  éditoriale, durée, tokens/coût, diversité des sources réellement mobilisées.
  **Un critère bloquant : zéro erreur d'entité sur les 5 comptes.**
- **Dépendances** : Lots 3 et 4.
- **Rollback** : ne pas basculer ; la V3 reste le défaut.

### Lot 6 — Vérification à la demande *(hors périmètre V4)*
- **Frontière** : entrée = un `statement` ou un passage narratif ; sortie = verdict
  (`confirmed` / `contradicted` / `insufficient_evidence`) + sources consultées + date ;
  déclenchement = geste utilisateur explicite (« vérifier avant le RDV »).
- **Pourquoi séparé** : cycle de vie propre, coût assumé au moment où il a de la valeur, et le
  patron existe déjà — `intel-034-account-signal-verification` fait exactement cela pour un signal.
- Aucune implémentation dans les lots 1 à 5.

## 19. Décisions qui demandent une validation humaine

1. **L'arbitrage de périmètre du §14** : V4 = compréhension ; C1/C2 (adressabilité, rôles de
   décision) restent hors de son champ et relèvent d'un formulaire de saisie. C'est le seul
   arbitrage qui engage la suite du chantier.
2. **La section 8 `implications_for_kredo`** : elle lève une interdiction explicite de la V3
   (« aucune recommandation commerciale »). À confirmer.
3. **Le sort des 4 propositions d'enrichissement Tournaire** — rejet recommandé, immédiat.
4. **Serper** : abonnement à réactiver et clé à poser sur le VPS. Coût à valider (ordre de grandeur
   FOLIO : 12 requêtes par run).
5. **Le budget cible d'un run V4** : ~35 000 tokens d'entrée / ~10 000 de sortie, soit environ
   0,12 à 0,15 $ — supérieur à la V3, pour un rendement sans commune mesure. À assumer explicitement.
6. **La maille compte** : entité juridique ou groupe (`entity_resolution` rendra le choix visible,
   mais la règle par défaut doit être tranchée — question déjà ouverte par le README A7 et par le
   document du 26/08).

## 20. Ce que ce document ne tranche pas

- Le sort des 18 artefacts V1/V2/V3 déjà en base : ils restent lisibles, leur remplacement est un
  lot à part.
- La réconciliation VPS ↔ dépôt des 12 workflows dérivés (dette connue, cf. CLAUDE.md).
- Le formulaire de qualification C1/C2 : chantier distinct, à cadrer séparément.
- La réutilisation de l'artefact V4 par `intel-031` et `intel-020` (les « projections ») : le
  contrat V4 la rend possible, le branchement est un lot ultérieur.
