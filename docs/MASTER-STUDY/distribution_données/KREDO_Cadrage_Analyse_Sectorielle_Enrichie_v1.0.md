# KREDO — Cadrage : Enrichissement Business Intelligence (Accueil · Analyse sectorielle · Playbook)

**Statut** : Cadrage v1.0 — en validation, aucune migration ni build lancés
**Date** : 22/08/2026
**Auteur** : Dosta + Claude (cadrage collaboratif)
**Identifiant catalogue** : à assigner par Dosta selon la convention CORE/INTEL/REC/… déjà en place (proposition : un ID de la famille INTEL, ce chantier prolonge INTEL-011 « étude sectorielle mutualisée »)
**Document source** : `04-secteur.md` (étude E4 — Compositions & ingrédients B2B, segment `seg-parfumerie-compositions-b2b`)

---

## 1. Contexte & objectif

Cette page sert un double objectif, comme toute la brique Business Intelligence de Kredo : outil de prospection réel (préparation de rendez-vous, argumentaires) et pièce de portfolio (démonstration de capacité d'intelligence commerciale niveau ESN/cabinet conseil). Le chantier consiste à faire passer trois zones de l'app — l'onglet **Accueil**, l'onglet **Analyse sectorielle**, et le module **Playbook** — d'un niveau de restitution simple (texte, tableaux) à une expérience structurée, interactive, et honnête sur ses propres limites.

Ce document fige le périmètre avant tout développement, conformément à la discipline déjà en place chez Kredo (« locker le scope et les invariants avant d'implémenter »).

---

## 2. État des lieux vérifié en base — à lire avant tout le reste

Avant de proposer une architecture, j'ai audité le schéma live (`jvzgmhvwirsbdkjpmvla`) plutôt que de partir d'hypothèses. Le résultat change la nature du chantier : **il est très majoritairement un chantier de restitution front-end, pas un chantier de modélisation de données.**

### 2.1 Ce qui existe déjà et fonctionne

| Section du fichier source | Table(s) porteuse(s) | État constaté sur `seg-parfumerie-compositions-b2b` |
|---|---|---|
| 5 thèses + DONC commercialement | `sector_intelligence.playbook->'market_thesis'` | 5 thèses peuplées, avec `src_ids` |
| Blocs clients + Modèles économiques | `sector_intelligence.playbook->'economic_models'` | 9 entrées peuplées — **mais les deux notions sont mélangées dans un seul tableau** (voir 5.2) |
| Chaîne de valeur par maillon | `value_chain_nodes` / `value_chain_links` / `value_chain_actors` | 6 nœuds peuplés — modélisée en **graphe**, pas en liste séquentielle (bien plus riche que le tableau du fichier source) |
| Fronts technologiques & zones de transition | `sector_intelligence.playbook->'tech_fronts'` | 5 entrées peuplées, avec `zone_de_transition: true/false` |
| Dépendances critiques supply chain | `sector_intelligence.playbook->'dependances_critiques'` | 6 entrées peuplées, avec criticité + practice + `donc_commercialement` |
| Régulation en couches | `sector_regulatory_items` | 2 lignes en base (le fichier source en documente 5 — écart à investiguer, voir 8) |
| Chronologie des ruptures | `sector_events` | 7 lignes en base — correspond au fichier source |
| Risques × opportunités | `sector_intelligence.playbook->'risks'` | 7 paires peuplées, avec `src_ids` |
| Pain points sectoriels | `sector_pain_points` | 4 lignes en base — correspond au fichier source |
| Personas / Objections / Points d'entrée / Arguments ROI | `sector_intelligence.playbook->'personas'/'objections'/'entry_points'/'roi_arguments'` | Peuplé — structure déjà utilisée par les 2 fiches de référence historiques (Parfumerie macro, Banque/Finance) |
| Registre des sources (Annexe A) | `source_corpora` + `source_corpus_items` | **28 sources déjà enregistrées** pour ce segment, avec `external_src_id`, `tier`, `atteste` |
| Incertitudes majeures / Trous déclarés | `source_corpora.gaps` (jsonb) | 6 entrées peuplées, avec `motif`, `famille`, `recherches_effectuees` |

Concrètement : **le fichier `04-secteur.md` a déjà été injecté en base**, sous le slug `seg-parfumerie-compositions-b2b` — ce n'est pas une donnée hypothétique à construire, c'est du contenu réel qui attend une interface pour être vu.

### 2.2 Ce qui manque réellement

Seulement quatre éléments n'ont aucun emplacement en base aujourd'hui :

1. **Cadre** — le paragraphe « Périmètre », le « Hors champ », la « Règle de comparabilité » (section 0 du fichier).
2. **Message sectoriel** — la phrase de synthèse (section 1.2).
3. **Blocs clients** proprement séparés des **modèles économiques** — aujourd'hui mélangés dans une seule clé `economic_models` (voir 5.2, correction mineure).
4. **Trajectoires et budgets à 18-36 mois** (section 2.9) — absent du `playbook`.

### 2.3 Ce qui reste à vérifier avant de lancer les lots (pas bloquant pour valider ce cadrage, mais à faire en Lot 0)

- **Le tableau comparatif « fichier compte »** que tu veux insérer dans le bloc Écosystème : je n'ai pas identifié où vivent ces données (table `companies` enrichie, ou nouvelle table dédiée aux comptes du segment). À auditer avant le Lot 3.
- **L'écart régulation** : 2 lignes en base contre 5 dans le fichier source — à vérifier si c'est un oubli d'injection ou un choix (peut-être seules les entrées « zone de transition active » ont été retenues).
- **La portée réelle de `sector_pain_points`** : le champ `verbatim` existe pour du diagnostic interne réel, mais rien ne distingue aujourd'hui un pain point *observé chez des leaders publics* (comme dans `04-secteur.md`, qui compte des occurrences chez des acteurs nommés) d'un pain point *issu d'un diagnostic client réel*. Mélanger les deux dans l'UI donnerait une fausse impression de preuve terrain.
- **Portée des autres secteurs actifs** : `seg-parfumerie-compositions-b2b` est aujourd'hui le **seul** secteur avec ce nouveau modèle rempli. Les ~14 autres secteurs `active` (Parfumerie macro, Banque/Finance, BTP, EHPAD, Transport, Santé, Logiciels, Industrie, Énergie, Commerce, Aéronautique, Tourisme, Nutraceutique) n'ont que l'ancien socle (`personas`/`objections`/`entry_points`/`roi_arguments`). C'est un **secteur pilote**, pas un rattrapage généralisé déjà fait.

### 2.4 Dette documentaire identifiée

Le fichier `references/schema-supabase.md` du skill `kredo-sector-intelligence` est **obsolète** : il ne mentionne ni `source_corpora`/`source_corpus_items`/`intelligence_sources`, ni les nouvelles clés `playbook` (`market_thesis`, `risks`, `tech_fronts`, `economic_models`, `dependances_critiques`). Si ce fichier n'est pas rafraîchi, une prochaine étude sectorielle risque d'être injectée selon l'ancien schéma documenté et de ne pas remplir les nouvelles sections. Je le note comme tâche de fond (Lot 0bis).

---

## 3. Périmètre fonctionnel (in scope)

- Onglet **Accueil** : 5 thèses + message sectoriel (nouveaux composants, lecture `playbook`)
- Onglet **Analyse sectorielle** : 13 sections listées en §6, restructurées et rendues interactives
- Module **Playbook** : enrichissement du rappel pain points + vérification de parité personas/objections/points d'entrée/ROI avec le nouveau contenu
- Les 4 compléments de données identifiés en §2.2
- Le concept **Mode Terrain** mobile est cadré dans ce document (§7) mais son implémentation est un lot distinct, priorisé après le desktop

## 4. Hors périmètre explicite

- Refonte du fonctionnement de l'onglet **Chaîne de valeur dédié** — chantier séparé, à cadrer indépendamment quand tu voudras le lancer
- Création d'un onglet **Supply chain dédié** — non prévu ; la section supply chain sur Analyse sectorielle doit rester autosuffisante (§6)
- **Repopulation des ~14 autres secteurs actifs** dans le nouveau modèle — nécessaire à terme pour que la page soit uniformément riche, mais c'est un effort de recherche (relance du skill `kredo-sector-intelligence` en mode enrichi), pas un effort d'architecture ; traité comme un chantier de fond au fil de l'eau (Lot 13), pas comme une condition de livraison du Lot 0 à 12
- Implémentation effective du Mode Terrain mobile — cadrage acté, build reporté

## 5. Invariants non négociables

1. **Single Source of Truth strict** : aucune donnée affichée sur Analyse sectorielle n'est dupliquée en stockage si elle existe déjà ailleurs (chaîne de valeur, sources, pain points). On construit des vues de lecture, jamais des copies.
2. **Aucune nouvelle table sans avoir vérifié qu'aucune table existante ne couvre déjà le besoin.** (Cet invariant existe précisément parce que ma première proposition, avant audit, aurait recréé plusieurs tables déjà présentes.)
3. **Transparence assumée** : le bandeau de confiance et les zones d'incertitude (`source_corpora.gaps`) sont toujours visibles, jamais masqués en fin de page.
4. **Toute donnée chiffrée affichée porte une source traçable** vers `source_corpus_items` — aucun chiffre « en dur » dans un composant front.
5. **Distinction stricte** entre pain point issu d'un diagnostic interne réel et pain point issu d'intelligence publique sur des leaders nommés — jamais présentés avec la même force de preuve.
6. **Mobile n'est jamais un sous-ensemble visuel du desktop caché en CSS** — toujours un composant dédié, conformément à la doctrine Kredo déjà actée.
7. **Le « DONC, commercialement » a un traitement visuel unique et reconnaissable partout où il apparaît.**
8. **Aucune migration de schéma n'est appliquée sans validation explicite de Dosta** — ce document est un cadrage, pas une autorisation d'exécution.

## 6. Répartition des sections & traitement (rappel consolidé)

| # | Section | Onglet | Source de données | Traitement |
|---|---|---|---|---|
| — | Bandeau de confiance (persistant) | Analyse sectorielle | `source_corpora` (score, tier mix, nb gaps) | Badge persistant, pas une section scrollable |
| 1 | Cadre (périmètre + hors champ) | Analyse sectorielle | **à créer** (§2.2) | Texte court + badges d'exclusion |
| 2 | Vue d'ensemble marché (fusion avec l'existant « Synthèse et dynamique ») | Analyse sectorielle | `sector_intelligence` (market_size, growth) + texte existant | Cartes-stat, y compris pour les valeurs « non publié » |
| 3 | Écosystème & acteurs clés + tableau comparatif | Analyse sectorielle | à vérifier (§2.3) | Grille filtrable + mini-scatter empreinte × maturité |
| 4 | Blocs clients | Analyse sectorielle | **à séparer** de `economic_models` (§2.2) | Cartes (1 par segment client) |
| 5 | Modèles économiques | Analyse sectorielle | `playbook->'economic_models'` (partie modèles) | Lignes accordéon |
| 6 | Chaîne de valeur (synthèse) | Analyse sectorielle | `value_chain_nodes` (lecture seule, allégée) | Ruban/pipeline horizontal, lien vers l'onglet dédié |
| 7 | Fronts technologiques | Analyse sectorielle | `playbook->'tech_fronts'` | Tuiles/badges « zone de transition » |
| 8 | Supply chain (autosuffisante) | Analyse sectorielle | `playbook->'dependances_critiques'` | Cartes complètes, badge criticité coloré |
| 9 | Frise réglementation + ruptures (fusionnées) | Analyse sectorielle | `sector_regulatory_items` + `sector_events` | Timeline unique, points pleins (passé) / pointillés (à venir) |
| 10 | Risques × opportunités | Analyse sectorielle | `playbook->'risks'` | Paires de cartes, tap/survol pour révéler l'offre |
| 11 | Trajectoires 18 mois | Analyse sectorielle | **à créer** (§2.2) | Cartes « budget ouvert » |
| 12 | Pain points sectoriels | Analyse sectorielle + rappel Playbook | `sector_pain_points` | Liste triée par fréquence, chips acteurs nommés |
| 13 | Panneau détaillé incertitudes/trous | Analyse sectorielle (déplié depuis le bandeau) | `source_corpora.gaps` | Panneau dépliable |
| — | 5 thèses + message sectoriel | Accueil | `playbook->'market_thesis'` + **message à créer** | Mode « story » ou cartes courtes |
| — | Personas / Objections / Points d'entrée / ROI | Playbook | `playbook->'personas'/'objections'/'entry_points'/'roi_arguments'` | Existant, vérifier parité de contenu |

Mécaniques transverses : nav latérale sticky avec ancre (desktop), puces-sources cliquables (lisent `source_corpus_items` par `external_src_id`), style visuel unique pour les callouts « DONC, commercialement », CTA contextuels (ex. lien vers Playbook Commercial à côté d'un point d'entrée réglementaire).

## 7. Mode Terrain — mobile (cadrage, implémentation en lot séparé)

Principe directeur : desktop se **lit** (préparation posée), mobile se **dégaine** (usage en rendez-vous ou entre deux rendez-vous).

- **Écran d'accueil mobile** : bandeau de confiance + jauge/compte à rebours sur l'échéance réglementaire la plus proche + carte « Angle du jour » (une thèse ou une paire risque↔opportunité) avec bouton « Copier l'accroche »
- **Mode Stories** : swipe vertical plein écran à travers les 5 thèses + message sectoriel
- **Mode Révision** : flashcards objections (recto/verso par tap) — prépare un rendez-vous plutôt que de restituer une étude
- **Top 3 classé** en cartes simples à la place du tableau comparatif / scatter / graphe chaîne de valeur — jamais de recréation dégradée du même composant, toujours un composant différent avec renvoi explicite vers le desktop
- **Sources** : tap → bottom sheet (pas de survol au doigt)
- **Navigation** : barre de navigation basse déjà en place dans Kredo, pas de rail d'ancres

Ce concept mérite son propre document de cadrage avant implémentation (effort de design UI nouveau, pas une simple adaptation responsive).

## 8. Découpage en lots & agents

| Lot | Contenu | Agent | Dépend de |
|---|---|---|---|
| 0 | Audit ciblé (tableau comparatif comptes, écart régulation 2 vs 5 lignes) + petits compléments de schéma (cadre, message sectoriel, séparation blocs clients/modèles éco, trajectoires) + rafraîchissement `schema-supabase.md` | Claude Code (Supabase MCP) + validation Dosta | — |
| 1 | Fondation transverse UI : composant `SourceChip`, bandeau de confiance, callout « DONC commercialement » | Claude Code | Lot 0 |
| 2 | Cadre + Vue d'ensemble marché | Claude Code | Lot 0, 1 |
| 3 | Écosystème & acteurs clés (tableau comparatif interactif + scatter) | Claude Code | Lot 0 (audit source des comptes) |
| 4 | Blocs clients + Modèles économiques | Claude Code | Lot 0 |
| 5 | Chaîne de valeur (vue allégée, lecture seule) | Claude Code | Lot 1 |
| 6 | Fronts technologiques | Claude Code | Lot 1 |
| 7 | Supply chain | Claude Code | Lot 1 |
| 8 | Frise réglementation + ruptures fusionnée | Claude Code | Lot 0 (écart à résoudre), Lot 1 |
| 9 | Risques × opportunités | Claude Code | Lot 1 |
| 10 | Trajectoires 18 mois | Claude Code | Lot 0 |
| 11 | Pain points (enrichi) + rappel croisé Playbook | Claude Code | Lot 1 |
| 12 | Accueil (thèses + message) | Claude Code | Lot 0, 1 |
| 13 | Repopulation des autres secteurs actifs (fond de dossier, un secteur à la fois, priorité par score d'attractivité) | Gemini (recherche) + Claude Code (injection) | Skill `kredo-sector-intelligence` en mode enrichi |
| 14 *(séparé)* | Mode Terrain mobile — cadrage dédié puis implémentation | À définir | Lots 2-12 livrés |
| 15 *(hors scope)* | Refonte de l'onglet Chaîne de valeur dédié | À définir | — |

**Chemin critique** : 0 → 1 → 2/3/4 → 5-12 (largement parallélisables une fois 0 et 1 posés, puisque la donnée existe déjà pour le pilote).

## 9. Jalons de démo

- **Démo 1 — Fondations & pilote** : bandeau de confiance, Cadre, Vue d'ensemble marché, Écosystème, Chaîne de valeur (lecture), Fronts technologiques, Supply chain, Frise, Risques×opportunités, Pain points — le tout sur `seg-parfumerie-compositions-b2b`, déjà peuplé à ~90 %. C'est un chantier d'habillage front, pas de collecte.
- **Démo 2 — Page complète** : Accueil (thèses + message) + Playbook (rappel croisé) sur le même segment pilote, parcours bout en bout.
- **Démo 3 — Généralisation** : un deuxième secteur repeuplé dans le nouveau modèle (candidat naturel : `banque-finance-assurance`, déjà référence qualité citée par le skill) — valide que le pattern n'est pas un artefact du pilote.
- **Démo 4 *(séparée)*** : Mode Terrain mobile.

## 10. Risques identifiés

1. **Écart régulation non expliqué** (2 lignes en base vs 5 dans le fichier source) — à résoudre avant le Lot 8, sous peine d'afficher une frise incomplète sans le savoir.
2. **Tableau comparatif « fichier compte »** : source de données non localisée — à auditer avant le Lot 3, sous peine de bloquer ce lot en plein sprint.
3. **Lot 13 sous-estimé** : repeupler ~14 secteurs dans le nouveau modèle est un effort de recherche comparable à relancer le skill sectoriel pour chacun — à traiter au fil de l'eau, jamais en un seul sprint, sous peine de dérailler le calendrier comme le principe « scope creep » déjà identifié sur Playbook Commercial.
4. **Dette documentaire** : si `schema-supabase.md` n'est pas rafraîchi (Lot 0bis), une future étude sectorielle risque d'être injectée selon l'ancien schéma et de ne pas alimenter les nouvelles sections — silencieusement.
5. **Mode Terrain** : concept neuf, risque de sous-estimer l'effort de design si mélangé au planning desktop — d'où son statut de lot séparé.
6. **Tentation de refondre l'onglet Chaîne de valeur « pendant qu'on y est »** — explicitement interdit par le hors-périmètre (§4) et l'invariant 1.

## 11. Ce qui n'est pas fait par ce document

- Aucune migration SQL n'a été exécutée
- Aucun composant front n'a été écrit
- Le tableau comparatif des comptes n'a pas été localisé en base (Lot 0)
- L'écart de 2 vs 5 lignes réglementaires n'a pas été investigué (Lot 0)
- Le Mode Terrain n'a pas de maquette, seulement un concept validé dans son principe

## 12. Checklist avant de lancer le Lot 0

- [ ] Dosta valide la répartition des sections (§6) et les invariants (§5)
- [ ] Dosta confirme l'emplacement souhaité pour Cadre/Message sectoriel/Trajectoires (nouvelles clés `playbook`, ou nouvelles colonnes `sector_intelligence` — à trancher en Lot 0)
- [ ] Dosta indique où vivent (ou doivent vivre) les données du tableau comparatif des comptes
- [ ] Dosta arbitre la priorité du Lot 13 (repopulation) par rapport au reste de sa roadmap (Playbook Commercial, INTEL-020, Veille)
- [ ] Dosta confirme si le Mode Terrain mérite son propre document de cadrage immédiatement ou plus tard

---

## Annexe — Requêtes de vérification utilisées pour ce cadrage

Pour traçabilité (et parce que c'est la même discipline que celle qu'on applique aux études sectorielles elles-mêmes : jamais affirmer sans avoir vérifié) :

- Inventaire des tables liées à la chaîne de valeur et à la supply chain (`information_schema.columns`)
- Inspection des clés `playbook` pour tous les secteurs (`jsonb_object_keys`)
- Inspection détaillée du contenu `playbook` pour `seg-parfumerie-compositions-b2b` (thèses, risques, fronts technologiques, modèles économiques, dépendances critiques)
- Inventaire des tables liées aux sources (`source_catalog`, `source_corpora`, `source_corpus_items`, `intelligence_sources`, `intelligence_source_links`)
- Contenu de `source_corpora.gaps` pour le segment pilote
- Comptage croisé `sector_events` / `sector_regulatory_items` / `sector_pain_points` / `value_chain_nodes` pour le segment pilote
- Recherche des secteurs disposant déjà des nouvelles clés `playbook` (résultat : un seul, `seg-parfumerie-compositions-b2b`)
