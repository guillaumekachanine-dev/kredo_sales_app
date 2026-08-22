# Les blocs de connaissance et leur destination

**Un bloc a un identifiant stable.** C'est la clé de jointure entre le corpus, les tables Supabase
et les écrans — prompts, schémas, contrôles et composants y font référence. Renommer un bloc est un
changement d'architecture, pas une correction de rédaction.

Ce fichier donne la **maille utile à l'exécution** : quelle étape produit quoi, où ça atterrit, qui
le lit. Le détail des 37 blocs fait autorité ailleurs et ne se recopie pas :

| Besoin | Document |
|---|---|
| Les 37 blocs : identifiant, portée, régime, table cible, état de remplissage | `docs/MASTER-STUDY/01-CARTE-DE-LA-CONNAISSANCE.md` |
| Où chaque bloc s'affiche : page, onglet, composant, contrat de vue | `docs/MASTER-STUDY/02-DISTRIBUTION-DANS-KREDO.md` |
| Le schéma réel des tables | `information_schema` et `supabase/migrations/` — **jamais un tableau recopié** |

---

## 1. Les quatre familles

| Famille | Contenu | Portée par défaut |
|---|---|---|
| **S1→S14** | Connaissance sectorielle : marché, modèles, chaîne, régulation, pain points, playbook, sources | **segment** |
| **C1→C6** | Environnement concurrentiel : segmentation, matrices, fiches, ESN en place | segment |
| **A1→A12** | Connaissance compte : identité, accessibilité, chantiers, signaux, enjeux, roadmap | compte |
| **P1→P4** | Produits d'action : brief, fenêtres, roadmap, playbook interactif | dérivé |

**Un bloc P ne s'écrit jamais.** L'écrire, c'est dupliquer cinq sources qui divergeront. Le playbook
sectoriel est une *projection* calculée depuis `sector_intelligence.playbook` × `sector_pain_points`
× `sector_regulatory_items` × `competitive_map_entries` × `offers`. Le module est interactif
*parce qu'*il est dérivé.

---

## 2. Ce que produit chaque étape

| Étape | Blocs | Atterrit dans |
|---|---|---|
| **E2** socle | A1 · S7 (dates) · A7 · A3 partiel | `account_facts`, `companies.siren`/`naf_code`, `sector_regulatory_items`, `account_signals` |
| **E3** sources | S14 | `intelligence_sources` + `intelligence_source_links` |
| **E4** étude | S1 S2 **S3 S4** S5 **S6** S7 (conversion) S9 S10 S11 S12 **S13** | `sector_intelligence` (description, caveats, market_*, playbook, practices_fit), `sector_events`, `sector_pain_points` |
| **E5** cartographie | C1 C2 C2b C3 C5 **C6** · A4 A5 **A6** A12 | `competitive_map_entries`, `companies` en `depth_level='mapped'`, `account_facts` |
| **E6** chaîne | S8 · A12 | `value_chain_nodes` / `_actors` / `_links` |
| **E7** ingestion | le document lui-même | `intelligence_documents` type `master_study`, `primary_entity_type='sector'` |
| **Hors master** | A2 A8 A9 A10 A11 · P1-P4 | CRM, lots périssables, vues dérivées |

**Une Master Study complète produit 28 blocs sur 37.** Les 9 restants sont soit purement CRM, soit
périssables, soit dérivés — c'est la traduction directe de l'axiome A5 : *un bloc qui périme plus
vite que l'étude ne peut pas être dans l'étude, il la ferait pourrir entière.*

**Aucune table nouvelle n'est jamais nécessaire.** Le besoin est une taxonomie de `fact_type`
étendue, pas du DDL. Si tu te surprends à vouloir créer une table pour l'identité, l'accessibilité,
les échéances ou le registre de sources — `account_facts`, `account_signals`,
`sector_regulatory_items` et `intelligence_sources` les hébergent déjà.

---

## 3. Les quatre surfaces qui lisent

**Une page = un lecteur, un moment, une question.** Si deux pages répondent à la même question,
l'une des deux est de trop.

| Surface | Route | Question unique |
|---|---|---|
| **Business Intelligence** | `/intelligence` | *« Que faut-il savoir de ce marché pour y être crédible et y choisir ses cibles ? »* |
| **Prospection** | `/prospection-intelligence` | *« Que fais-je aujourd'hui, avec qui, avec quel discours ? »* |
| **Cockpit compte** | `/prospection/accounts/[id]` | *« Que sais-je de ce compte, et quelle est la meilleure prochaine action ? »* |
| **Knowledge Hub** | `/knowledge` | *« Où est le document qui dit ça, et d'où il sort ? »* |

**BI garde la matière, Prospection garde l'usage.** La page Prospection ne produit aucune
connaissance : elle compose et convertit ce que BI et le cockpit détiennent. Toute donnée qui
n'apparaîtrait que là serait une troisième vérité — c'est la règle qui empêche le « deuxième
cockpit » interdit par l'ADR-0018.

**Depuis ADR-0021 (L4/L5, livré 20/08/2026), « lecture, jamais recopie » a un mécanisme
concret** : BI et le cockpit ne relisent pas `sector_intelligence` brute, ils passent par
`SectorKnowledgeReadModel` (résolution segment→macro déjà appliquée) et
`AccountSectorPerspective` (perspective secteur d'un compte). Avant leur livraison, BI chargeait
les 53 fiches + 745 signaux sans filtre `level` — c'était la vraie cause du symptôme « BI ne voit
pas la Master Study ». Tout nouveau consommateur transverse (§7) passe par ces read models, pas
par une nouvelle requête directe sur les tables sectorielles.

Le cockpit compte suit les 7 onglets d'ADR-0012 : Accueil · **Socle** (A1 A2) · **Entreprise**
(A3 A4 A5 A6 A7) · **Secteur** (A12 + héritage S/C) · **Enjeux** (A9, S7) · **Stratégie**
(A10, S10-S13) · **Roadmap** (A11).

---

## 4. Les trois blocs qui traversent tout — et qui manquent tous les trois

| Bloc | Ce qu'il porte | Pourquoi il résiste |
|---|---|---|
| **S7** — calendrier réglementaire daté | Le « pourquoi maintenant » | Confondu avec de la veille. C'est du **déterministe** (Légifrance, EUR-Lex), pas de la recherche → E2 |
| **C2b** — carte de priorisation | L'ordre d'attaque | Suppose l'accessibilité. Sans A6, la carte a un axe mort |
| **A6** — accessibilité | Le droit d'intervenir | Traité comme un tout insoluble. Décomposé en six sous-blocs, trois quarts deviennent accessibles |

Ce ne sont pas trois oublis indépendants : **un bloc transverse est précisément celui dont l'absence
se voit partout**, donc celui qu'on remet toujours à après. Si tu dois arbitrer où mettre l'effort
d'un run, c'est ici.

---

## 5. Deux règles que tout consommateur doit appliquer

**Un compte `mapped` n'entre ni dans les statistiques, ni dans les combobox, ni ne porte de
contact** (ADR-0019 D-3). ~530 comptes `mapped` potentiels noieraient sinon les comptes réels.

**L'appétence /35 et `account_score_current` ne se trient jamais ensemble** (axiome A6). Deux
échelles dans un même tri produisent un classement qui ne veut rien dire. `account_score_current`
fait autorité pour les comptes du portefeuille ; l'appétence /35 ne vaut que pour les comptes
`mapped` non encore qualifiés, et reste marquée `appetence_provisoire` tant que A6 n'est pas
renseigné.

---

## 6. Le seuil de confiance à l'entrée du brief

Le brief stratégique ne consomme que des blocs `verified_fact` ou `declared_fact`. Un bloc
`single_source` ou `estimate` s'affiche en contexte mais **ne fonde aucune recommandation**.

C'est un filtre **à l'entrée du prompt**, pas un avertissement à la sortie — et c'est ce qui empêche
l'application de recycler du FOLIO non sourcé sous couvert d'IA.
