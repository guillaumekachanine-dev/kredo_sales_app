# KREDO — Cadrage : Mode Terrain (expérience mobile Business Intelligence)

**Statut** : Cadrage v1.0 — en validation, aucun build lancé
**Identifiant catalogue** : à assigner par Dosta
**Document lié** : `KREDO_Cadrage_Analyse_Sectorielle_Enrichie_v1.1.md` (le Mode Terrain consomme les mêmes données, sans les dupliquer)

---

## 1. Contexte & objectif

Ce document cadre l'expérience **mobile** de la page Business Intelligence (Accueil / Synthèse, Analyse sectorielle, Playbook). Il complète le cadrage desktop sans le refaire : le Mode Terrain lit les mêmes tables, ne crée aucune donnée nouvelle, et ne peut être livré qu'après que les Lots 0-12 du cadrage desktop aient rendu ce contenu disponible.

**Principe directeur, déjà acté avec Dosta** : desktop se **lit** (préparation posée, avant un rendez-vous) ; mobile se **dégaine** (en rendez-vous, ou entre deux rendez-vous). Ce n'est pas la même intention d'usage, donc pas le même écran — conformément à la doctrine Kredo « jamais de dégradation gracieuse d'un composant lourd, toujours un sous-composant dédié à l'intention mobile ».

## 2. Périmètre fonctionnel

### 2.1 Écran d'accueil du Mode Terrain

Un tableau de bord d'une seule vue, pas un scroll de sections :
- **Badge de confiance** de l'étude (lu depuis `source_corpora`)
- **Jauge/compte à rebours** sur l'échéance réglementaire la plus proche (lu depuis `sector_regulatory_items` / `sector_events`, filtré sur les échéances futures)
- **Carte « Angle du jour »** : une thèse (`playbook->'market_thesis'`) ou une paire risque↔opportunité (`playbook->'risks'`), avec un bouton « Copier l'accroche » en gros format tactile (cible tactile > 44 px, conformément à la règle Kredo déjà en place)

### 2.2 Mode Stories

Swipe vertical plein écran à travers les 5 thèses + le message sectoriel (une fois disponible depuis l'Accueil/Synthèse desktop). Une idée par écran, gros caractères, lecture en moins de 30 secondes.

### 2.3 Mode Révision (flashcards objections)

Flashcards recto (objection) / verso (réponse, au tap) sur le contenu Playbook (`playbook->'objections'`). Sert littéralement à se préparer avant un rendez-vous — c'est l'usage mobile le plus probable de cette page.

### 2.4 Top 3 classé (comptes prioritaires)

Remplace le tableau comparatif desktop et la mini-matrice scatter (`competitive_map_entries`) par un classement simple des 3 comptes les mieux notés (score d'appétence), en cartes. Pas de recréation compressée du même tableau — un composant différent, avec renvoi explicite « Voir le détail complet sur desktop ».

### 2.5 Chaîne de valeur & Supply chain — traitement mobile

Même logique que 2.4 : pas de graphe ni de ruban sur mobile. Un condensé des 2 points les plus critiques (`value_chain_nodes` triés par `capture_valeur`, `playbook->'dependances_critiques'` triés par criticité), avec le même renvoi vers desktop.

### 2.6 Sources — bottom sheet

Le survol n'existe pas au doigt : chaque puce source devient un **tap → bottom sheet** affichant éditeur, tier, ce que la source atteste, et le lien (lecture de `source_corpus_items`).

### 2.7 Navigation

Barre de navigation basse déjà en place dans Kredo. Pas de rail d'ancres façon desktop — un bouton d'action flottant peut ouvrir un sommaire en feuille modale si besoin de sauter directement à une section.

## 3. Hors périmètre explicite

- Aucune nouvelle table ou colonne : le Mode Terrain est un chantier de restitution pure, il lit exactement les mêmes données que le desktop (invariant Single Source of Truth du cadrage principal)
- Aucune recréation, même simplifiée, du tableau comparatif complet, du graphe de chaîne de valeur, ou de la frise chronologique — ces contenus restent desktop-only avec renvoi explicite
- Aucune fonctionnalité de saisie ou d'édition depuis le mobile dans cette V1 (le Mode Terrain est un mode de consultation et de préparation, pas un mode d'administration des fiches)

## 4. Invariants spécifiques au Mode Terrain

1. **Jamais un sous-ensemble visuel du desktop caché en CSS** — chaque écran mobile est un composant distinct, pensé pour l'action.
2. **Cibles tactiles > 44 px** sur tous les boutons d'action.
3. **Le survol n'existe pas** : toute interaction desktop basée sur le hover devient un tap explicite sur mobile (bottom sheet, flip de carte).
4. **Aucune donnée n'est recalculée ou reformattée côté mobile** — les mêmes champs, la même source de vérité, seulement une présentation différente.
5. **Le renvoi vers le desktop est assumé et explicite** partout où un contenu dense n'est pas recréé, jamais une simple absence silencieuse.

## 5. Découpage en lots (indicatif, à affiner une fois le desktop livré)

| Lot | Contenu | Dépend de |
|---|---|---|
| M0 | Maquettes d'interaction (écran d'accueil, stories, flashcards, top 3, bottom sheet) — à valider avec Dosta avant tout code | Cadrage desktop Lots 0-2 livrés (pour avoir de la donnée réelle à maquetter) |
| M1 | Écran d'accueil Mode Terrain (badge confiance + jauge/countdown + carte Angle du jour) | M0 |
| M2 | Mode Stories (5 thèses + message) | M0, Accueil/Synthèse desktop livré |
| M3 | Mode Révision (flashcards objections) | M0, Playbook existant |
| M4 | Top 3 classé (comptes) | M0, Lot 4 desktop (tableau comparatif) livré |
| M5 | Condensés chaîne de valeur & supply chain | M0, Lots 6 et 8 desktop livrés |
| M6 | Bottom sheet sources | M0, Lot 1 desktop (`SourceChip`) livré |
| M7 | Navigation & sommaire modal | M1-M6 |

## 6. Risques identifiés

1. **Dépendance forte au desktop** : le Mode Terrain ne peut pas être développé en avance de phase sur les Lots desktop qui produisent la donnée qu'il consomme (Accueil/Synthèse, tableau comparatif, chaîne de valeur, supply chain). Le séquencement doit être respecté même si le cadrage mobile est produit dès maintenant.
2. **Sous-estimation du design d'interaction** : stories, flashcards et countdown sont des patterns UI nouveaux dans Kredo — prévoir un temps de maquette (Lot M0) avant tout code, plutôt que de coder directement sur la base des descriptions de ce document.
3. **Tentation d'ajouter de la donnée mobile-only** (ex. un résumé reformulé spécifiquement pour mobile) — interdit par l'invariant 4 : toute reformulation deviendrait une deuxième source de vérité à maintenir.

## 7. Ce qui n'est pas fait par ce document

- Aucune maquette visuelle n'a été produite (Lot M0 à faire)
- Aucun composant n'a été codé
- Le contenu du sommaire modal (M7) n'est pas détaillé — dépend des retours sur M0

## 8. Checklist avant de lancer le Lot M0

- [ ] Dosta valide le principe des 6 écrans/modes proposés (§2)
- [ ] Dosta valide que le Mode Terrain démarre seulement après livraison des Lots desktop dont il dépend (pas de développement en parallèle sur des données non stabilisées)
- [ ] Dosta arbitre si un mode supplémentaire (ex. partage direct d'une carte vers Slack/email) doit entrer dans le périmètre V1 ou attendre une V2
