# SHELL-0018 — Hub canonique du chantier V2

> **Statut : actif — Phase 6 (Shell global) ✅ CLOSED le 2026-09-09 ; Phase 7 en cours — livrés : 7.0, 7.1, 7.2, 7.3A, 7.4, 7.6, 7.7, 7.8, 7.9 ; reste 7.3B, 7.3C, 7.5, 7.10**
> **Baseline : 2026-09-07**  
> **Branche de travail unique : `main`**
> **Point de départ Git : `d9c7fc9edb9d35cc6d2fc889d9e251ad0fa311a1`**
> **Clôture Phase 6 : `10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md`**
> **Plan d'exécution Phase 7 : `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md`**

Ce dossier est désormais le **point d'entrée obligatoire** de tout agent intervenant sur SHELL-0018 et sur la standardisation de la navigation secondaire Desktop.

Tout lot SHELL-0018 est préparé, validé et committé directement sur `main`, après
synchronisation avec `origin/main`. Aucune branche dédiée au chantier ne doit être créée.

Les anciens documents SHELL-0018 datés d'août 2026 restent dans le dépôt à titre historique. Ils **ne doivent plus être utilisés comme cible d'implémentation** sans vérification contre ce dossier et le code réel.

> **Cible canonique de navigation : `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md`** (Lot 6.3R).
> Ce document fixe la **destination fonctionnelle et informationnelle finale** (menu principal
> Desktop + architecture interne des workspaces : chapitres, modules) et **supersède les anciennes
> cibles lorsqu'elles divergent** — notamment `04-CURRENT-NAVIGATION-INVENTORY.md`,
> `07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md`, `08-…` §8 (taxonomie de menu) et
> `docs/adr/ADR-0018-refonte-shell-navigation-desktop.md`. `01-ADR-0018-SHELL-NAVIGATION-V2.md`
> et `02-SECONDARY-RAIL-STANDARD.md` **ne sont pas supersédés** (loi de la primitive `SectionRail`).

## Ordre de lecture

1. `01-ADR-0018-SHELL-NAVIGATION-V2.md` — ADR architecture (non supersédé)
2. `02-SECONDARY-RAIL-STANDARD.md` — standard `SectionRail` (non supersédé)
3. **`09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` — architecture cible finale (menu + workspaces)**
4. **`10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md` — preuve de conformité technique du Shell (Phase 6 CLOSED)**
5. **`11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` — plan d'exécution Phase 7 (CURRENT → TARGET, lots 7.1 → 7.10)**
6. `12-PHASE-7.3A-PROFITABILITY-DATA-CONTRACT-2026-09-10.md` — décision + livraison du contrat Data de rentabilité mission (Lot 7.3A)
7. `03-IMPLEMENTATION-LEDGER.md` — journal d'implémentation détaillé lot par lot

**Historique (consultable, non normatif) :** `00-CURRENT-STATE-AUDIT-2026-09-07.md`,
`04-CURRENT-NAVIGATION-INVENTORY.md`, `05-CONTEXTUAL-MODULES-MATRIX.md`,
`06-PHASE-4-CLOSURE-AUDIT-2026-09-08.md`, `07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md`,
`08-PHASE-6-ENTRY-AUDIT-AND-TARGET-ARCHITECTURE.md`.

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
4. la **cible canonique `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md`** (taxonomie de
   menu, chapitres et modules des workspaces) ;
5. le ledger courant ;
6. les documents historiques (dont les anciennes cibles supersédées).

Toute divergence découverte doit être inscrite dans le ledger avant modification du code concerné.
