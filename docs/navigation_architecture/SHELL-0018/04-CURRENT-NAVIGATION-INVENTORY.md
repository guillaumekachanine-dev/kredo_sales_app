# SHELL-0018 V2 — Inventaire des navigations secondaires Desktop

## 1. Objet

Inventaire opérationnel des surfaces à migrer vers `SectionRail`.

Ce document décrit le code actuel. Il ne redéfinit pas le métier des pages.

## 2. Matrice

| Ordre | Surface | Fichier principal | Mécanisme | Largeur | Chapeau | Chapitres | Modules contextuels | État URL | Priorité |
|---:|---|---|---|---:|---|---|---|---|---|
| 1 | Account Intelligence | `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx` | rail local | `11.5rem` | navy centré | oui | oui | client-state / contexte page | Golden Master |
| 2 | Business Intelligence | `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx` | rail local | `11.5rem` | clair statique | oui | oui | `?tab=` | haute |
| 3 | Veille | `src/components/veille/VeilleLocalNavigation.tsx` | rail local | `11.5rem` | clair statique | oui | oui | principalement client-state | haute |
| 4 | Rapports | `src/components/reports/ReportsDesktopView.tsx` | rail inline | `11.5rem` | clair statique | oui | partiel | chapitre client-state | haute |
| 5 | Automatisations | `src/components/automations/AutomationsLocalNavigation.tsx` | rail local | `11.5rem` | clair + shadow | oui | non | client-state | haute |
| 6 | Engagements | `src/components/missions/engagements/EngagementsDesktopView.tsx` | rail inline | `11.5rem` | clair statique | implicite | non | `?vue=` | haute |
| 7 | Prospection | `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx` | rail local | `15rem` | clair statique | intitulé `Sections` | partiel | client-state | moyenne |
| 8 | Knowledge Hub | `src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx` | rail contextuel local | `12.5rem` | navy centré | navigation contextuelle | oui | client-state | moyenne |
| 9 | Finance | `src/components/finance/FinanceTabs.tsx` | tabs horizontaux | — | — | horizontal | — | client-state | après primitive |
| 10 | Routes legacy / tabbed | `src/components/layout/SectionNavBar.tsx` + `SectionNavBarSlot.tsx` | barre horizontale routée | — | — | horizontal | — | pathname | phase Shell |

## 3. Account Intelligence

### À conserver

- `w-[11.5rem]` ;
- bouton navy ;
- texte blanc gras ;
- centrage du chapeau ;
- titre `Chapitres` ;
- items 40px ;
- filet brass actif ;
- icônes fines ;
- section `Modules`.

### À vérifier lors du lot 2.1

- que le texte du chapeau correspond bien au titre de page principal ;
- que le header principal affiche systématiquement le nom de l'onglet actif ;
- que chaque module affiché est bien contextuel ;
- que la section Modules puisse être placée en bas sans casser les petits écrans Desktop.

## 4. Business Intelligence

### État

Le rail est déjà `11.5rem` et sa navigation est pilotée par le workspace mono-segment.

### À changer

- chapeau clair → bouton navy canonique ;
- remplacement du JSX local par `SectionRail` ;
- positionnement Modules en bas ;
- conserver strictement `?segment=` et `?tab=` ;
- header principal = nom du chapitre actif.

### À ne pas changer

- modèle mono-segment ;
- loaders ;
- contrat de workspace ;
- stratégie URL ;
- contenu métier des chapitres.

## 5. Veille

### État

Rail `11.5rem`, section Chapitres et modules contextuels existants.

### À changer

- chapeau clair → navy ;
- composant local → `SectionRail` ;
- modules contextuels en bas ;
- header principal systématiquement aligné sur l'onglet courant.

### À ne pas changer

- logique Actualités / Veille ciblée / Analyses / Archives ;
- dialogues et workflows métier.

## 6. Rapports

### Dette principale

`ReportsLocalNavigation` est défini inline dans `ReportsDesktopView.tsx`.

### À changer

- extraction / suppression du clone ;
- `SectionRail` ;
- chapeau navy ;
- vraie section Modules si la page possède des modules contextuels ;
- header avec nom exact de l'onglet ;
- dans une phase ultérieure, rendre le chapitre URL-addressable.

### Risque

Le composant de page est déjà volumineux. Le lot de migration doit éviter toute refonte opportuniste du lecteur de documents ou des actions métier.

## 7. Automatisations

### Divergences

- `shadow-sm` sur le chapeau ;
- `shadow-xs` sur l'actif ;
- `role="tab"` / `aria-selected` ;
- absence de Modules.

### Cible

- chapeau navy ;
- grammaire visuelle commune ;
- header = `Journal d'exécution`, `Santé des workflows` ou `Coûts` selon l'état courant ;
- section Modules absente si aucun module contextuel n'est requis.

## 8. Engagements

### État

Le shell récent a copié le pattern `11.5rem` mais ne possède ni titre `Chapitres` ni section Modules.

Les vues sont déjà URL-addressables via `?vue=`.

### Cible

- chapeau `Engagements` en navy, blanc, gras, centré ;
- `Chapitres` ;
- items via `SectionRail` ;
- header = nom de la vue active (`Synthèse`, `Missions AT`, `Projets`, etc.) ;
- conserver `?vue=`.

## 9. Prospection

### Divergences

- `15rem` ;
- `Sections` au lieu de `Chapitres` ;
- chapeau clair ;
- module injecté dans le flux de chapitres.

### Cible

- `11.5rem` ;
- `Chapitres` ;
- chapeau navy centré ;
- modules uniquement contextuels dans la zone basse ;
- header = nom de l'onglet actif.

## 10. Knowledge Hub

### Particularité à conserver

Le contenu de navigation dépend du domaine actif et peut changer dynamiquement.

### Châssis à standardiser

- `12.5rem → 11.5rem` ;
- chapeau navy conservé mais contrat aligné ;
- rendu des items aligné sur le standard ;
- `Modules` en bas ;
- header principal = nom de la vue / section active ;
- conserver la logique de domaines et sections.

## 11. Finance

### État

`FinanceTabs.tsx` garde trois tabs horizontaux avec état client.

### Migration cible

1. définir un état URL canonique ;
2. ajouter le header de tab explicite ;
3. remplacer `FinanceTabs` par `SectionRail` ;
4. ne pas changer le contenu Finance dans le même lot.

Finance intervient après preuve de la primitive sur plusieurs rails existants.

## 12. `SectionNavBar` / `SectionNavBarSlot`

Ces composants restent utilisés dans plusieurs layouts et sont également liés à des contrats consommés sur Mobile.

Ils ne sont pas supprimés pendant la Phase 1/2.

Condition de suppression :

- toutes les pages Desktop concernées migrées ;
- chaque consommateur Mobile identifié ;
- helper/config remplacé ou conservé explicitement ;
- aucun chemin de navigation routé encore dépendant.

## 13. `useSidebarCollapse`

Le hook est utilisé par plusieurs surfaces Desktop, dont certaines nouvellement refondues.

Il ne doit pas être modifié pendant les migrations de rail, sauf nécessité locale démontrée.

Un audit autonome est prévu en phase Shell global.

## 14. Headers — checklist transversale

Pour chaque migration, vérifier dans le composant de zone principale :

| Question | Réponse attendue |
|---|---|
| Le titre affiché correspond-il à l'onglet actif ? | oui |
| Le titre de page principal reste-t-il dans le chapeau ? | oui |
| Les deux titres sont-ils visibles simultanément ? | oui |
| Le header est-il dans la section principale et non dans le rail ? | oui |
| Un changement d'onglet met-il immédiatement à jour le header ? | oui |

## 15. Ordre de migration confirmé

```text
Account Intelligence
        ↓
Business Intelligence
        ↓
Veille
        ↓
Rapports
        ↓
Automatisations
        ↓
Engagements
        ↓
Prospection
        ↓
Knowledge Hub
        ↓
Finance / anciens tabs
```

Cet ordre commence par la référence la plus mature, prouve ensuite la compatibilité avec différents modèles URL, puis traite les écarts de largeur et enfin les mécanismes horizontaux.
