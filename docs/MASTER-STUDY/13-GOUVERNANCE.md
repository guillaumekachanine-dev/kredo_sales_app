# 13 — Gouvernance

---

## 1. Péremption — ce qui pourrit, et à quelle vitesse

Une cartographie est vraie **à une date**. Chaque livrable porte sa date de snapshot et ses
dates de péremption **calculées**, pas déclarées.

| Bloc | Péremption | Signal |
|---|---|---|
| **S7 — réglementaire** | **au jour du run** | Toujours revalider avant citation. C'est le seul bloc à péremption immédiate |
| A7 A8 — signaux, emploi | 3 mois | `expires_at` sur `account_signals` |
| Triggers par compte | 3 mois | Champ `date` du trigger |
| A1 — identité | 12 mois | Registre courant |
| A6 — accessibilité | 12 mois | Changement de DSI |
| C1-C5 — cartographie, catégories | 12 mois | `study_snapshot_date` |
| Chiffres financiers | 12 mois | Publication des comptes du secteur |
| S2 — taille de marché | 24 mois | — |
| S3 S4 S8 — modèles, fronts, chaîne | 24 mois | Sauf rupture déclarée |

**Le rythme de rejeu qui en découle** : V3 trimestrielle (triggers + chantiers), V4 annuelle
(chiffres + catégories), V0 tous les 24 mois (refonte). Voir `11-VARIANTES.md`.

---

## 2. Métriques — affichées, jamais cochées

Une case cochée par le producteur ne mesure rien. Ces cinq taux se calculent, et se lisent sur
la page de garde de chaque étude et sur le tableau de bord du chantier.

| Métrique | Formule | 13/08/2026 | Cible |
|---|---|---|---|
| Couverture identité | comptes avec SIREN ou motif d'échec / total | **28 / 109** | 109/109 |
| Couche ESN | comptes prioritaires complets / comptes prioritaires | **0** | 100 % |
| Segments avec échéance datée future | fiches avec ≥ 1 item futur / fiches étudiées | **13 / 53** | 100 % des étudiées |
| Segments avec connaissance propre | segments `description IS NOT NULL` / 38 | **1 / 38** | croissant |
| Sources résolvables | src_id avec URL répondant / total cité | non instrumenté | 100 % |

**La quatrième est la métrique du chantier.** Elle mesure la résorption de la fracture
macro/segment : 15 macros portent 100 % de la connaissance, 38 segments portent 100 % des
comptes. Tant qu'elle ne monte pas, chaque étude produite est invisible à la maille où les
comptes la lisent.

---

## 3. Qui a le droit de changer quoi

| Objet | Qui | Procédure |
|---|---|---|
| Contenu d'un document du corpus | Guillaume, ou un agent sur sa demande | Édition + entrée au journal §5 |
| **Structure du corpus** — une étape, un gate, une section du squelette | Guillaume | **ADR obligatoire.** La structure est immuable par construction |
| Un bloc de `01-CARTE-DE-LA-CONNAISSANCE.md` | Guillaume | Amende **aussi** `02-DISTRIBUTION…` — un bloc sans écran n'existe pas |
| Un schéma de `schemas/` | Guillaume + code | Le schéma **et** le parseur TypeScript, dans le même commit |
| Un prompt de `prompts/` | Guillaume, ou un agent | Version + date en tête du fichier. Un prompt non versionné est intraçable |
| La taxonomie (segments, macros) | Guillaume | `REFERENTIEL-CLASSIFICATION.md` §9, migration SQL |
| Un seuil (plancher de preuve, quotas, notes) | Guillaume | **Jamais en cours de run.** Changer un seuil pendant une étude invalide sa comparabilité |

**Règle de préséance, en cas de conflit** :

```
le code et la base   >   ce corpus   >   les archives   >   CLAUDE.md   >   la mémoire d'un agent
```

Ce n'est pas de la modestie documentaire : un agent qui écrit du SQL de mémoire produit du SQL
faux, et ce corpus a été écrit après avoir lu la base, pas l'inverse.

---

## 4. Amendements de décisions antérieures

Ce corpus amende trois décisions écrites. Chacune appelle un ADR, et est listée ici en
attendant.

| Décision antérieure | Amendement | Motif |
|---|---|---|
| `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §9.3 — « le registre de sources se porte dans `intelligence_sources.technical_metadata`, **pas de table dédiée** » | Tient pour la **preuve**, ne tient pas pour la **configuration** | `intelligence_sources` porte une seule policy RLS `SELECT`, donc est inéditable ; et 450 lignes sur 450 sont un journal de collecte, pas un registre. Un corpus réutilisable est une entité de premier rang |
| `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §9.4 — `result_type = 'sector_source_registry'` (S14) | Conservé, complété par une table de configuration | idem |
| `ANALYSE-CRITIQUE-ET-ARCHITECTURE-CIBLE.md` §2.10 — « `ai_intelligence_results.company_id` est NOT NULL, le détournement pour un corpus sectoriel est impossible » | **Factuellement faux au 13/08** : la colonne est nullable (`information_schema`) | Un `result_type = 'sector_study'` est donc stockable sans contorsion |

**Un amendement de décision écrite ne se fait pas par une note dans un cahier
d'implémentation.** Il se fait par un ADR qui référence la décision, explique ce qui a changé,
et met à jour le document d'origine. C'est la seule façon de savoir, dans six mois, laquelle
des deux versions fait foi.

---

## 5. Journal du corpus

| Version | Date | Ce qui change |
|---|---|---|
| **1.1** | 13/08/2026 | **Premier run exécuté et rejeté** (`2026-08-aero-spatial-defense`, G1 16/13). Ajout de [`registre/ROADMAP-CORRECTIONS.md`](registre/ROADMAP-CORRECTIONS.md) et réécriture du `README.md` §6 en état d'exécution. Bandeaux de défaut ouvert sur `08-ETAPE-E5` §8 et `schemas/competitive-map.schema.json` (roadmap A4). Migration `076_master_study_document_type` appliquée. Gate G1 outillé : `scripts/audit-master-study.py`. Amendement tranché par Guillaume : **un compte client compte dans le seuil G0 et figure dans la cartographie** — `comptes_exclus` d'E0 signifie « hors cibles de prospection », pas « hors périmètre d'étude » |
| **1.0** | 13/08/2026 | Établissement. Consolide `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE`, `cartographie-concurrentielle/00`→`09`, `sources_intelligence_standards/`, `taxonomie-sectorielle/`, `chaine-de-valeur/`, `_legacy/PROCESS-ETUDE-SECTORIELLE`. Établit le registre de légitimité, les 12 axiomes, les 7 étapes, les 4 gates, le squelette en 8 sections, les schémas de sortie et les 5 variantes |

**Chaque modification ultérieure s'ajoute ici en une ligne**, avec sa date et son motif. Un
corpus dont l'évolution n'est pas journalisée redevient un ensemble de documents qui dérivent.

---

## 6. Registre des études produites

Il vit dans [`registre/README.md`](registre/README.md) : une ligne par run, avec son segment,
sa date de snapshot, son verdict de gate, ses dates de péremption et le lien vers son dossier.

C'est ce registre qui répond à la seule question de gouvernance qui compte au quotidien :
**« sur quels secteurs sommes-nous crédibles aujourd'hui, et jusqu'à quand ? »**

---

## 7. Ce qui déclenche une révision de ce corpus

Quatre signaux, et quatre seulement. Le reste est du bruit d'usage.

1. **Un mode d'échec se reproduit sur deux runs différents.** C'est un défaut d'architecture,
   pas de rédaction — c'est la leçon des deux couches ESN vides sur deux secteurs, deux outils
   et deux auteurs.
2. **Un gate passe alors que le livrable est mauvais.** Le gate est mal spécifié.
3. **Un bloc de la carte n'a été produit par aucune étude en 12 mois.** Soit il est inutile,
   soit son régime de production est faux.
4. **Un écran affiche une donnée qui n'est dans aucun bloc.** Une deuxième vérité est née ; il
   faut la nommer ou la supprimer.
