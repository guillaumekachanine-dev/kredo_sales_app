# KREDO — Cadrage : Enrichissement Business Intelligence (Accueil · Analyse sectorielle · Playbook)

**Statut** : Cadrage v1.1 — intègre les arbitrages de Dosta du 22/08/2026, remplace la v1.0
**Identifiant catalogue** : à assigner par Dosta (proposition : famille INTEL, prolonge INTEL-011)
**Document source** : `04-secteur.md` (étude E4 — Compositions & ingrédients B2B, segment `seg-parfumerie-compositions-b2b`)

**Changements depuis la v1.0** :
1. Accueil devient l'onglet **Synthèse & Conclusions** — il accueille désormais Cadre + Message sectoriel + Trajectoires, en plus des 5 thèses (déplacement depuis Analyse sectorielle).
2. Le tableau comparatif des comptes a une architecture de données identifiée et vérifiée : table `competitive_map_entries`.
3. Séquencement confirmé : Repopulation des autres secteurs = **dernier chantier**, après Mode Terrain inclus.
4. Mode Terrain fait l'objet d'un document de cadrage séparé, produit en parallèle de celui-ci.

---

## 1. Contexte & objectif

Inchangé depuis la v1.0 : double objectif outil réel + portfolio, sur trois zones de l'app (Accueil, Analyse sectorielle, Playbook).

## 2. État des lieux vérifié en base

### 2.1 Ce qui existe déjà (rappel v1.0)

Voir tableau détaillé en v1.0 — non reproduit ici pour éviter la redondance. Résumé : la quasi-totalité du contenu de `04-secteur.md` est déjà injectée en base pour `seg-parfumerie-compositions-b2b` (thèses, risques×opportunités, fronts technologiques, modèles économiques, dépendances critiques, chaîne de valeur en graphe, régulation, événements, pain points, registre de sources à 28 entrées, trous déclarés).

### 2.2 Nouveau : le tableau comparatif des comptes est déjà modélisé

J'ai cherché où pourrait vivre le tableau comparatif (nom, catégorie, empreinte/5, maturité/5, appétence/25, angle, confiance) que tu veux à côté d'Écosystème & acteurs clés. Il existe déjà, et il est même **beaucoup plus riche** que ce que demandait le fichier source :

**Table `competitive_map_entries`** (liée à `companies` via `company_id`, à un secteur via `sector_id`, éventuellement à un segment via `segment_id`) :
- Les colonnes du tableau comparatif : `category` (leader/challenger/…), `empreinte_metier`, `maturite_numerique`, `appetence_score`, `accessibilite_score`, `confiance`, `angle_entree`, `positioning`, `forces`, `vulnerabilite`
- Un champ `profile_json` qui contient l'intégralité de la **fiche par compte** décrite dans la méthodologie « Business Intelligence — prompt étude sectorielle » : les 6 grilles (financière, empreinte, réputation, innovation/écart IA annoncé-vs-déployé, avantages, trajectoire), la couche ESN (décideur SI, ESN en place, modèle d'achat, voie d'entrée probable), les triggers events, les contrats majeurs, et même une **traduction commerciale prête à l'emploi** (angle, accroches, à ne pas dire) — sourcée avec le même format tier/atteste/url que le reste de l'étude.

**État de population** :

| Secteur (slug) | Nb comptes dans `competitive_map_entries` |
|---|---|
| `parfumerie-aromes` (macro, référence historique) | 8 |
| `aeronautique-spatial-defense` | 10 |
| `tourisme-hotellerie-loisirs` | 5 |
| `seg-parfumerie-compositions-b2b` (notre pilote) | **0** |

Le tableau comparatif existe donc déjà pour le secteur macro « Parfumerie, Arômes & Cosmétique », mais pas encore pour le segment pilote « Compositions & ingrédients B2B ». À trancher en Lot 0 : soit on réutilise les 8 comptes déjà qualifiés du secteur macro pour la démo (ils sont probablement pertinents, une maison de composition B2B est un sous-ensemble de cet univers), soit on en qualifie un sous-ensemble propre au segment. Je recommande la première option pour aller vite en démo, en le signalant clairement dans l'UI (« comptes issus de l'étude sectorielle Parfumerie, Arômes & Cosmétique »).

### 2.3 Ce qui manque réellement (mis à jour)

1. **Cadre** (périmètre, hors champ, règle de comparabilité) — aucun emplacement en base.
2. **Message sectoriel** — aucun emplacement en base.
3. **Blocs clients** séparés proprement des **modèles économiques** — aujourd'hui mélangés dans `playbook->'economic_models'`.
4. **Trajectoires et budgets à 18-36 mois** — aucun emplacement en base.

Ces quatre éléments vivront désormais sur l'onglet **Accueil / Synthèse** (voir §3). Le choix technique (nouvelles clés `playbook`, vs nouvelles colonnes sur `sector_intelligence`) reste à trancher en Lot 0 par Claude Code — Dosta n'a pas d'avis sur ce point technique, seulement sur l'emplacement de restitution.

### 2.4 Dette documentaire (rappel v1.0, inchangé)

`references/schema-supabase.md` du skill `kredo-sector-intelligence` ne mentionne ni `source_corpora`/`source_corpus_items`, ni les nouvelles clés `playbook`, ni `competitive_map_entries`. À rafraîchir en Lot 0bis.

---

## 3. Périmètre fonctionnel (in scope) — mis à jour

- **Onglet Accueil, renommé conceptuellement « Synthèse & Conclusions »** : 5 thèses + message sectoriel + Cadre + Trajectoires 18 mois. Positionnement narratif : « voici ce que l'étude complète conclut », avant le détail probatoire.
- **Onglet Analyse sectorielle** : les 11 sections restantes (voir §6 mis à jour), incluant désormais le tableau comparatif des comptes à côté d'Écosystème & acteurs clés.
- **Module Playbook** : inchangé depuis la v1.0.
- **Mode Terrain mobile** : cadré dans un document séparé, produit en parallèle (`KREDO_Cadrage_Mode_Terrain_v1.0.md`).

## 4. Hors périmètre explicite (inchangé depuis la v1.0)

Refonte de l'onglet Chaîne de valeur dédié, création d'un onglet Supply chain dédié, implémentation du Mode Terrain dans ce lot-ci (cadrage oui, build non).

## 5. Invariants non négociables (inchangé depuis la v1.0 — validés par Dosta)

Voir v1.0 §5 — les 8 invariants sont confirmés sans changement.

## 6. Répartition des sections & traitement — mise à jour

### Onglet Accueil — « Synthèse & Conclusions »

| Section | Source de données | Traitement |
|---|---|---|
| 5 thèses | `playbook->'market_thesis'` | Mode story ou cartes courtes |
| Message sectoriel | à créer (Lot 0) | Citation en exergue, gros caractères |
| Cadre (périmètre + hors champ) | à créer (Lot 0) | Texte court + badges d'exclusion |
| Trajectoires 18 mois | à créer (Lot 0) | Cartes « budget ouvert » |

### Onglet Analyse sectorielle

| # | Section | Source de données | Traitement |
|---|---|---|---|
| — | Bandeau de confiance (persistant) | `source_corpora` | Badge persistant |
| 1 | Vue d'ensemble marché (fusion avec l'existant) | `sector_intelligence` + texte existant | Cartes-stat |
| 2 | Écosystème & acteurs clés | `sector_intelligence` (texte existant) | Texte enrichi |
| 3 | **Tableau comparatif des comptes** (nouveau, complète la section 2) | `competitive_map_entries` + `companies` | Grille filtrable + mini-scatter empreinte × maturité, drill-down vers la fiche compte complète (`profile_json`) |
| 4 | Blocs clients | à séparer de `economic_models` | Cartes (1 par segment client) |
| 5 | Modèles économiques | `playbook->'economic_models'` (partie modèles) | Lignes accordéon |
| 6 | Chaîne de valeur (synthèse) | `value_chain_nodes` (lecture seule) | Ruban/pipeline, lien vers l'onglet dédié |
| 7 | Fronts technologiques | `playbook->'tech_fronts'` | Tuiles/badges |
| 8 | Supply chain (autosuffisante) | `playbook->'dependances_critiques'` | Cartes, badge criticité |
| 9 | Frise réglementation + ruptures (fusionnées) | `sector_regulatory_items` + `sector_events` | Timeline unique |
| 10 | Risques × opportunités | `playbook->'risks'` | Paires de cartes |
| 11 | Pain points sectoriels | `sector_pain_points` | Liste triée par fréquence |
| 12 | Panneau détaillé incertitudes/trous | `source_corpora.gaps` | Panneau dépliable |

## 7. Découpage en lots & agents — mis à jour

| Lot | Contenu | Agent | Dépend de |
|---|---|---|---|
| 0 | Audit + compléments de schéma : Cadre/Message/Trajectoires (nouvel emplacement à trancher), séparation blocs clients/modèles éco, décision sur la réutilisation des 8 comptes `parfumerie-aromes` pour le pilote, rafraîchissement `schema-supabase.md` | Claude Code | — |
| 1 | Fondation transverse UI (`SourceChip`, bandeau de confiance, callout « DONC commercialement ») | Claude Code | Lot 0 |
| 2 | Accueil / Synthèse (thèses, message, cadre, trajectoires) | Claude Code | Lot 0, 1 |
| 3 | Vue d'ensemble marché + Écosystème | Claude Code | Lot 1 |
| 4 | Tableau comparatif des comptes (`competitive_map_entries`) | Claude Code | Lot 0 (décision de réutilisation) |
| 5 | Blocs clients + Modèles économiques | Claude Code | Lot 0 |
| 6 | Chaîne de valeur (vue allégée) | Claude Code | Lot 1 |
| 7 | Fronts technologiques | Claude Code | Lot 1 |
| 8 | Supply chain | Claude Code | Lot 1 |
| 9 | Frise réglementation + ruptures | Claude Code | Lot 0 (écart 2 vs 5 lignes à résoudre), Lot 1 |
| 10 | Risques × opportunités | Claude Code | Lot 1 |
| 11 | Pain points + rappel croisé Playbook | Claude Code | Lot 1 |
| 12 | Vérification de parité Playbook (personas/objections/points d'entrée/ROI) | Claude Code | — |
| 13 | **Mode Terrain mobile** — cadrage produit en parallèle, build après les Lots 0-12 | À définir | Lots 2-11 livrés |
| 14 | **Repopulation des autres secteurs actifs — dernier chantier, après tout le reste, y compris le Lot 13** | Gemini (recherche) + Claude Code (injection) | Tout le reste |
| — *(hors scope)* | Refonte de l'onglet Chaîne de valeur dédié | À définir | — |

## 8. Jalons de démo (inchangés dans leur logique, adaptés au nouveau séquencement)

- **Démo 1** : bandeau de confiance + Accueil/Synthèse + Vue d'ensemble marché + Écosystème + tableau comparatif (avec les 8 comptes réutilisés) + Chaîne de valeur (lecture) + Fronts technologiques + Supply chain + Frise + Risques×opportunités + Pain points, sur `seg-parfumerie-compositions-b2b`.
- **Démo 2** : Playbook (rappel croisé) + vérification de parité, parcours bout en bout.
- **Démo 3** : généralisation sur un deuxième secteur (candidat : `banque-finance-assurance`).
- **Démo 4** *(document séparé)* : Mode Terrain mobile.
- **Démo 5** *(dernier chantier)* : premiers secteurs supplémentaires repeuplés dans le nouveau modèle.

## 9. Risques (mis à jour)

1. Écart régulation (2 vs 5 lignes) à résoudre avant le Lot 9.
2. **Nouveau** : réutiliser les 8 comptes de `parfumerie-aromes` pour le pilote `seg-parfumerie-compositions-b2b` suppose qu'ils sont pertinents pour ce sous-segment plus étroit — à valider rapidement (probablement oui, mais pas vérifié ligne à ligne).
3. Lot 14 (repopulation) reste un effort de recherche substantiel — son statut de dernier chantier ne le rend pas plus petit, seulement moins urgent.
4. Dette documentaire (`schema-supabase.md`) à corriger avant toute prochaine étude sectorielle.
5. Tentation de refondre l'onglet Chaîne de valeur dédié « pendant qu'on y est » — toujours hors scope.

## 10. Checklist de validation avant Lot 0

- [x] Répartition des sections (§6) — validée
- [x] Invariants (§5) — validés
- [x] Emplacement Cadre/Message/Trajectoires — Accueil, tranché
- [x] Localisation tableau comparatif — `competitive_map_entries`, tranché
- [x] Priorité Lot 14 (repopulation) — dernier chantier, tranché
- [x] Mode Terrain — document séparé demandé, produit en parallèle
- [ ] Confirmer la réutilisation des 8 comptes `parfumerie-aromes` pour le pilote (ou qualifier un jeu propre à `seg-parfumerie-compositions-b2b`)
- [ ] Trancher le format technique de stockage Cadre/Message/Trajectoires (clés `playbook` vs colonnes dédiées) — délégué à Claude Code en Lot 0

---

## Annexe — Requêtes de vérification complémentaires (v1.1)

- Recherche de colonnes de scoring comparatif (`empreinte`, `appetence`, `categorie`) → découverte de `competitive_map_entries`
- Inspection complète des colonnes de `competitive_map_entries`
- Comptage des comptes qualifiés par secteur (`parfumerie-aromes` : 8, `aeronautique-spatial-defense` : 10, `tourisme-hotellerie-loisirs` : 5, `seg-parfumerie-compositions-b2b` : 0)
- Lecture complète de deux fiches compte (`profile_json`) pour V. Mane Fils et Robertet, confirmant la richesse et le format sourcé de la donnée déjà en place
