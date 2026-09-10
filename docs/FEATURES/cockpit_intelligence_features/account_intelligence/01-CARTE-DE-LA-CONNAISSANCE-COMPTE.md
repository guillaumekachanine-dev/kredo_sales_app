# 01 — Carte de la connaissance compte

Ce document décrit **le savoir**, indépendamment de son stockage, de son producteur et du
niveau d'analyse qui le produit. C'est volontaire : laisser un contrat technique décider de ce
qu'il est pertinent de savoir est exactement l'erreur de la V3, dont le schéma a figé une
définition appauvrie de la compréhension d'une entreprise.

La destination de chaque bloc est fixée par `02-DISTRIBUTION-DANS-KREDO.md`.
Son rattachement à un niveau est fixé par `03-CONTRAT-NIVEAUX-ET-MODULES.md`.

---

## 1. Les six familles

| Famille | Question du commercial | Blocs |
|---|---|---|
| **F1 — Identité** | *À qui ai-je affaire, exactement ?* | I1→I7 |
| **F2 — Métier et modèle** | *Comment cette entreprise gagne-t-elle son argent ?* | M1→M7 |
| **F3 — Marché et clients** | *À qui vend-elle, et dans quel jeu ?* | C1→C6 |
| **F4 — Écosystème et concurrence** | *Qui l'entoure, de qui dépend-elle ?* | E1→E6 |
| **F5 — Trajectoire et enjeux** | *Qu'est-ce qui la pousse, qu'est-ce qui la contraint ?* | T1→T8 |
| **F6 — Surface IT et relation KREDO** | *Où pouvons-nous intervenir, et que savons-nous déjà d'eux ?* | K1→K7 |

**F6 est la famille qui manquait aux études FOLIO comme aux V1→V4.** C'est pourtant celle qui
décide si un compte est adressable : une compréhension générique d'entreprise ne dit pas si
l'organisation achète de la prestation externe, par quel canal, ni quelles ESN sont déjà en
place. Une grande partie de cette matière est **interne** (contacts, opportunités, missions),
pas sur le web.

---

## 2. F1 — Identité

| # | Bloc | Régime attendu | Note |
|---|---|---|---|
| **I1** | Raison sociale, forme juridique, SIREN/SIRET | **Déterministe** | Registre uniquement (A4) |
| **I2** | Code NAF et activité déclarée | **Déterministe** | Ne dit pas le métier réel — I2 ≠ M1 |
| **I3** | Siège, établissements, implantations | Déterministe + site officiel | |
| **I4** | Effectif | Déterministe, **avec conflit exposé** | Tranche INSEE vs déclaratif divergent souvent |
| **I5** | Chiffre d'affaires, résultat, capitaux | Déterministe (comptes publiés) | Jamais déduit (A4) |
| **I6** | Actionnariat, groupe, filiales, opérations capitalistiques | Établi, sourcé | Un LBO change tout le discours commercial |
| **I7** | Dirigeants et gouvernance | Établi, sourcé | Personne physique nommée : jamais déduite |

> **I4 est le cas d'école du conflit de sources.** Si le CRM dit 1 300 salariés et le registre
> une tranche 250–499, le système **n'arbitre pas** et ne produit pas deux paragraphes comme si
> de rien n'était : il expose la divergence et propose une vérification. Voir `04` §5.

---

## 3. F2 — Métier et modèle

| # | Bloc | Régime |
|---|---|---|
| **M1** | Métier réel, ce que l'entreprise fabrique ou opère | Établi / déclaré |
| **M2** | Offres, gammes, lignes de produits | Déclaré (site officiel) |
| **M3** | Modèle économique : d'où vient la marge | Déduit, appuyé |
| **M4** | Outil industriel, sites de production, capacités | Établi / déclaré |
| **M5** | Certifications, agréments, homologations | **Déterministe / établi** — jamais déduit |
| **M6** | Réalisations et références significatives | Déclaré |
| **M7** | Saisonnalité, cycles, structure de coûts | Déduit |

---

## 4. F3 — Marché et clients

| # | Bloc | Régime |
|---|---|---|
| **C1** | Segments de clientèle servis | Déduit, appuyé |
| **C2** | Poids relatif des segments | Déduit — rarement publié |
| **C3** | Zone géographique commerciale | Établi / déclaré |
| **C4** | Concentration client, dépendance à un donneur d'ordre | Déduit — **signal de risque majeur** |
| **C5** | Tendances comportementales de ses clients | Projeté du secteur (A7) |
| **C6** | Besoins non couverts, angles morts | Hypothèse assumée |

---

## 5. F4 — Écosystème et concurrence

| # | Bloc | Régime | Source prioritaire |
|---|---|---|---|
| **E1** | Segment et macro-secteur de rattachement | **Déterministe** | `companies.segment_id` |
| **E2** | Concurrents directs nommés | Établi / déduit | `competitive_map_entries` **d'abord** |
| **E3** | Leaders et structure du marché | **Projeté, jamais recalculé** | Master Study |
| **E4** | Position relative du compte | Déduit comparatif | |
| **E5** | Place dans la chaîne de valeur, maillon occupé | Déduit | `value_chain_*` |
| **E6** | Dépendances amont critiques (fournisseurs, matières, techno) | Déduit, appuyé | |

> **E3 est le piège de coût du chantier.** Dix comptes d'un même segment ne déclenchent pas dix
> recherches « taille du marché » et « tendances des quinze dernières années » (A7). Pour un
> compte dont le segment porte une Master Study, F4 se **lit** — la recherche externe ne porte
> que sur l'écart propre au compte.

---

## 6. F5 — Trajectoire et enjeux

| # | Bloc | Régime |
|---|---|---|
| **T1** | Histoire, étapes structurantes | Établi |
| **T2** | Actualité récente datée | Établi, **daté obligatoirement** |
| **T3** | Ambitions et stratégie annoncées | **Déclaré** — jamais converti en vérité |
| **T4** | Investissements, projets, ouvertures de sites | Établi / déclaré |
| **T5** | Contraintes réglementaires applicables | Projeté (`sector_regulatory_items`) + spécifique |
| **T6** | Échéances datées et fenêtres | **Établi, daté** — le « pourquoi maintenant » |
| **T7** | Enjeux organisationnels, tensions internes | Déduit / hypothèse |
| **T8** | Vulnérabilités et risques | Déduit, appuyé |

> **T3 exige une discipline particulière.** *« L'entreprise vise 80 M€ en 2025 »* est un fait
> **sur un discours**, pas sur une performance. Le fait établi est *« l'entreprise a déclaré
> viser 80 M€ »*, avec le support et la date de la déclaration. Perdre cette distinction, c'est
> transformer une communication corporate en donnée financière.

---

## 7. F6 — Surface IT et relation KREDO

C'est la famille qui décide de l'adressabilité. Elle se nourrit **majoritairement de sources
internes**, ce qui la rend peu coûteuse et très différenciante.

| # | Bloc | Source dominante | Régime |
|---|---|---|---|
| **K1** | Organisation IT : DSI, périmètre, rattachement | Contacts CRM + web | Établi / déduit |
| **K2** | Capacité et habitude d'achat de prestation externe | **Interne** (opportunités, missions) | Déduit |
| **K3** | Canal d'achat : gré à gré, panel, référencement, appel d'offres | **Interne** + web | Établi / déduit |
| **K4** | ESN et partenaires déjà en place | **Interne** + offres d'emploi | Déduit |
| **K5** | Stack et technologies observables | Offres d'emploi, site, presse | Déduit |
| **K6** | Programmes de transformation en cours | Presse + déclaratif | Déclaré / déduit |
| **K7** | Historique KREDO : missions, opportunités, gains/pertes, interlocuteurs | **Interne, déterministe** | **Établi** |

> **K7 n'est jamais produit par une recherche.** Il est lu dans les tables relationnelles. Une
> analyse qui « redécouvrirait » sur le web une relation commerciale déjà en base est une
> anomalie, pas un enrichissement.
>
> **K2/K3/K4 sont les blocs à plus fort rendement du corpus** : peu coûteux (internes ou offres
> d'emploi), rarement produits par les études généralistes, directement actionnables.

---

## 8. Blocs volontairement exclus

| Exclu | Pourquoi |
|---|---|
| Score global de priorité du compte | ADR-0011 LOT 1 — aucun consumer runtime |
| Offres KREDO recommandées, messages, personas | INTEL-032 (A6) |
| Plan d'actions, roadmap | Aval gated |
| Histoire du secteur sur 15 ans stockée **au compte** | Master Study, lue par référence (A7) |
| Notation de fiabilité d'une source par un LLM | Fausse précision — voir `05` §5 |

---

## 9. Ce que la carte impose au producteur

1. **Un bloc a un régime de preuve**, fixé ici, opposable au workflow. Un `established` sur T7
   (tensions internes supposées) est un défaut de contrat, pas une opinion.
2. **Un bloc a une temporalité.** I1 (SIREN) ne périme pas ; T2 (actualité) périme en semaines ;
   I4/I5 (effectif, CA) en exercices. La fraîcheur est portée par bloc, pas par rapport — voir
   `03` §4.
3. **Un bloc non documenté reste vide, et le dit.** Jamais de « Non renseigné », jamais de
   remplissage de politesse. Un `knowledge_gap` explicite vaut mieux qu'un paragraphe creux.
