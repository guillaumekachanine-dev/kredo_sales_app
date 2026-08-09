# Lot 3 Business Intelligence - Playbooks Sectoriels & Stabilisation

Ce document décrit l'architecture, les données exploitées, les corrections apportées et l'état de stabilisation de l'intégration des playbooks sectoriels (Lot 3) sur KREDO.

## Architecture de la Modale

La modale `SectorPlaybooksModal` utilise le composant structurel `IntelligenceSplitModalShell` pour offrir un affichage divisé en deux volets :
1. **Volet gauche (32%)** : Recherche temps réel et liste des secteurs séparés entre *Études opérationnelles* (statut `active`) et *Secteurs en veille* (statut `watch`), enrichis de métriques synthétiques et de badges de complétude.
2. **Volet droit** :
   - Pour les secteurs actifs : Présentation des personas, pain points avec verbatims réels, ROI arguments, objections et réponses préparées, échéances réglementaires ordonnées, acteurs PACA et nationaux, et méthodologie consultable (caveats et sources).
   - Pour les secteurs en veille : Affichage d'un état d'attente clair (*Étude sectorielle en préparation*) excluant toute information fictive.

## Données Exploitées

Les données proviennent directement de la base Supabase via le snapshot de Business Intelligence :
- **Secteurs** : `sector_intelligence` (chiffres marché, maturité, TJMs, caveats, playbook, updatedAt).
- **Pain Points** : `sector_pain_points` (verbatim, kredoPractice, frequencyCount).
- **Échéances** : `sector_regulatory_items` (date, urgence, source).
- **Comptes liés** : Table `company` (attractivenessScore, linkedAccountCount, etc.).

## Corrections de Stabilisation

1. **UUID Canonique** : Utilisation stricte de l'UUID `sectorId` au lieu de `sectorSlug` pour tout l'état interactif de la page (classement, filtres, callback `onApplySector`). Le slug est réservé aux URLs.
2. **Retrait des SetState dans Render** : La sélection de compte lors du changement de secteur a été réécrite pour dériver dynamiquement `activeAccountId` sans aucun appel à `setState` dans `useMemo`.
3. **Chargement Différé** : La modale `SectorPlaybooksModal` est importée de manière asynchrone via `next/dynamic` (`ssr: false`) et n'est montée sur le DOM que lorsqu'elle est ouverte, préservant la restauration de focus.
4. **Matrice SVG Kredo** : Représentation graphique SVG sur-mesure conforme au style de graphiques de KREDO (grilles, graduation, quadrants 50%), avec projection de lignes pointillées et info-bulle interactive accessible.
5. **Métriques Watch** : Correction de l'attractivité (affiche `attractivenessScore` au lieu de taille marché) et du nombre de comptes liés (affiche le vrai nombre de comptes de la base au lieu de la liste prioritaire).
6. **Ouverture de Compte** : Raccordement du bouton au parcours réel `/prospection/accounts/[companyId]` qui pointe vers la page d'intelligence client existante.
7. **Restauration de Fichier Missions** : Restauration de `engagements-overview-types.ts` à son état au commit parent `3a9d73ee` pour éliminer tout effet de bord sur le module Missions.

## QA Effectuée & Limitations

- **QA Réalisée** :
  - Filtre Desktop interactif par UUID.
  - Sélection automatique du premier compte visible après filtre.
  - Fermeture Escape et restauration du focus.
  - Test des variations de période 30/90/180 jours.
  - Non-régression de la suite de tests (601 tests OK).
- **Limitations** :
  - La version Mobile de la BI est factice (vue temporaire d'attente Lot 4).
  - La modale Playbooks sectoriels n'est pas optimisée pour les écrans de taille mobile.
