# SHELL-0018 — Hub canonique du chantier V2

> **Statut : actif**  
> **Baseline : 2026-09-07**  
> **Branche de rebaseline : `feat/shell-0018-00-rebaseline`**  
> **Point de départ Git : `d9c7fc9edb9d35cc6d2fc889d9e251ad0fa311a1`**

Ce dossier est désormais le **point d'entrée obligatoire** de tout agent intervenant sur SHELL-0018 et sur la standardisation de la navigation secondaire Desktop.

Les anciens documents SHELL-0018 datés d'août 2026 restent dans le dépôt à titre historique. Ils **ne doivent plus être utilisés comme cible d'implémentation** sans vérification contre ce dossier et le code réel.

## Ordre de lecture

1. `00-CURRENT-STATE-AUDIT-2026-09-07.md`
2. `01-ADR-0018-SHELL-NAVIGATION-V2.md`
3. `02-SECONDARY-RAIL-STANDARD.md`
4. `03-IMPLEMENTATION-LEDGER.md`
5. `04-CURRENT-NAVIGATION-INVENTORY.md`

## Directives produit normatives

Les règles suivantes sont validées par le décideur et ne sont pas à réinterpréter pendant l'implémentation :

- le menu secondaire Desktop contient uniquement la navigation locale de la page et ses **modules contextuels** ;
- les actions transverses n'ont pas leur place dans le menu secondaire : elles sont portées par le panneau latéral **Cockpit Intelligence** en Desktop, selon la même logique de centralisation que sur Mobile ;
- le chapeau du menu secondaire est un bouton **navy**, avec le **titre de la page principale**, en **gras**, **blanc** et **centré horizontalement et verticalement** ;
- le chapeau ramène à l'accueil / état racine de la page principale ;
- le nom de l'onglet actif est toujours affiché dans le **header de la section principale** ;
- le titre de page dans le chapeau et le titre d'onglet dans le header sont deux informations distinctes et doivent rester visibles simultanément ;
- largeur canonique du rail Desktop : `11.5rem` (`184px`) ;
- la section `Modules` n'affiche que des modules contextuels réellement disponibles dans la page concernée ;
- aucun bouton mort, aucun placeholder fonctionnel trompeur ;
- aucune configuration de navigation n'est stockée en base de données ; la configuration reste dans le code TypeScript.

## Périmètre V2

Le chantier est découpé en deux niveaux :

1. **standardisation du menu secondaire** : primitive partagée, anatomie visuelle, comportement URL, header et modules contextuels ;
2. **refonte du Shell global** : comportement du menu principal Desktop, interactions avec Cockpit Intelligence, nettoyage des anciens mécanismes de navigation.

La standardisation du menu secondaire est livrée avant toute refonte profonde du Shell global.

## Règle de vérité

En cas de divergence :

1. le code réel ;
2. les décisions de `01-ADR-0018-SHELL-NAVIGATION-V2.md` ;
3. le standard de `02-SECONDARY-RAIL-STANDARD.md` ;
4. le ledger courant ;
5. les documents historiques.

Toute divergence découverte doit être inscrite dans le ledger avant modification du code concerné.
