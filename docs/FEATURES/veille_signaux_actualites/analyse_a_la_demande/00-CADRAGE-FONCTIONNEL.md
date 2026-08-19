# 00 — Cadrage fonctionnel

## 1. Problème à résoudre

La page **Veille & actualités** sait aujourd'hui afficher les briefings de veille, les signaux comptes et une analyse stratégique mensuelle. L'analyse mensuelle est produite automatiquement à partir des contenus du mois écoulé.

Le besoin est d'ajouter une action **Générer une analyse** permettant à l'utilisateur de choisir lui-même le corpus d'analyse et de formuler une intention simple.

La fonctionnalité doit rester une action rapide de la Veille. Elle ne doit pas devenir une version parallèle des **Missions d'intelligence**.

## 2. Proposition fonctionnelle V1

L'utilisateur ouvre un compositeur depuis la page Veille.

Le compositeur contient :

- **Source 1 — principale**, préremplie avec le digest actuellement consulté lorsque le contexte le permet ;
- **Source 2 — complémentaire**, optionnelle ;
- **Source 3 — complémentaire**, optionnelle ;
- un champ **Intention de l'analyse** ;
- un bouton **Lancer l'analyse**.

Aucun autre paramètre utilisateur n'est nécessaire en V1.

## 3. Familles de sources V1

### 3.1 Digest & articles de veille

L'utilisateur peut sélectionner :

- un digest complet ;
- ou un sous-ensemble d'articles appartenant à ce digest.

Tables concernées : `veille_digests`, `veille_articles`.

### 3.2 Signaux comptes

L'utilisateur peut sélectionner un ou plusieurs signaux déjà présents dans KREDO.

Table concernée : `account_signals`.

### 3.3 Rapports & documents

L'utilisateur peut sélectionner un ou plusieurs documents exploitables depuis la bibliothèque KREDO.

Table concernée : `intelligence_documents`.

### 3.4 Listes & Corpus

L'utilisateur peut sélectionner une Liste ou un Corpus existant. La collection est résolue côté serveur à partir de son seul `collectionId` en réutilisant le mécanisme existant `resolveKnowledgeScope()`.

Tables concernées : `content_collections`, `content_collection_items`.

Le contrat actuel des collections ne permet d'y référencer directement que `veille_article` et `intelligence_document`. Les `account_signal` restent donc une famille de sélection directe en V1.

## 4. Parcours UX

### Desktop — intention : analyse

Le bouton **Générer une analyse** ouvre une modale large fondée sur la grammaire visuelle de `IntelligenceSplitModalShell`.

Écran 1 : compositeur avec les trois cartes de source et l'intention.

Cliquer sur une carte fait passer le **même shell** sur un écran de sélection. Il ne faut pas empiler deux modales.

Le sélecteur doit reprendre les principes de navigation de `CompanyDocumentsModal` sans réutiliser sa logique de consultation, d'édition, de versioning ou de suppression.

### Mobile — intention : action

Utiliser un composant mobile dédié/full-screen. Ne pas charger le composant Desktop puis le masquer en CSS.

Les cartes sont empilées, les cibles tactiles font au moins 44 px, puis viennent l'intention et le CTA de lancement.

Le CTA doit être accessible depuis l'onglet **Analyses** mobile sans dégrader son fonctionnement consultatif actuel.

## 5. Résultat attendu

L'analyse conserve la structure métier familière d'INTEL-021 :

- synthèse exécutive ;
- tendances majeures ;
- signaux faibles ;
- évolutions réglementaires ;
- opportunités commerciales ;
- risques / points de veille ;
- actions prioritaires.

Le changement principal porte sur la traçabilité : en V2, une conclusion ne peut plus référencer uniquement des `articleIds`. Elle doit utiliser des références génériques `evidenceRefs` pointant vers les contenus effectivement fournis au modèle.

## 6. Persistance

Le résultat reste un `strategic_watch_analysis` et doit être visible :

- dans l'onglet **Analyses** de Veille ;
- dans **Rapports & rédaction** via `intelligence_documents`.

Une analyse à la demande est un **document autonome**. Deux analyses différentes portant sur la même période ne doivent pas être fusionnées comme deux versions d'une même analyse mensuelle.

Le comportement historique de versioning par période reste réservé au chemin mensuel existant.

## 7. Frontière avec Missions d'intelligence

La fonctionnalité **Générer une analyse** est une action rapide : corpus choisi explicitement, une intention, résultat immédiat.

Une Mission d'intelligence reste une démarche pilotée par un preset métier, des contraintes, un budget de corpus et le contrat `MissionReportV1`.

Conséquences :

- ne pas ajouter ce besoin dans `MISSION_CATALOG` ;
- ne pas modifier `mission-001-run` ;
- ne pas élargir `userAddition` de la mission mensuelle existante pour contourner le besoin ;
- ne pas faire dépendre cette feature d'ADR-0020 au-delà du respect de sa frontière.

## 8. Hors périmètre V1

- recherche web ou scraping au moment de l'analyse ;
- choix du modèle IA ;
- réglage de profondeur ;
- prompt avancé ou éditeur de system prompt ;
- plus de trois groupes de sources ;
- création automatique d'opportunités/tâches depuis le résultat ;
- modification du framework Missions ;
- nouvelles tables Supabase ;
- refonte complète de la page Veille.

## 9. Critères de succès fonctionnels

La V1 est terminée lorsque l'utilisateur peut :

1. lancer une analyse depuis Desktop et Mobile ;
2. choisir entre 1 et 3 groupes de sources supportés ;
3. saisir une intention ;
4. obtenir une analyse dont chaque conclusion est traçable vers le corpus choisi ;
5. retrouver le résultat dans Analyses et Rapports & rédaction ;
6. continuer à utiliser l'analyse mensuelle historique sans régression.
