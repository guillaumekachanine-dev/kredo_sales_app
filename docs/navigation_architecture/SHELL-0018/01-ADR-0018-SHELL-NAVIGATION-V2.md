# ADR-0018 V2 — Shell Desktop et navigation secondaire

**Statut :** Accepté pour reprise du chantier  
**Date :** 2026-09-07  
**Décideur :** Guillaume Kasanin  
**Remplace comme cible opérationnelle :** ADR-0018 du 2026-08-06  
**Périmètre :** Desktop en priorité ; Mobile protégé mais hors refonte visuelle

## 1. Contexte

Depuis le cadrage initial de SHELL-0018, KREDO a fortement évolué. Plusieurs pages ont adopté des rails secondaires verticaux, mais sans composant partagé. D'autres utilisent encore des tabs horizontaux ou des états locaux. Le Mobile a également développé sa propre architecture de navigation et dépend de contrats partagés qui ne peuvent plus être supprimés sans migration explicite.

Le chantier V2 poursuit donc un objectif plus précis :

> **standardiser d'abord la navigation secondaire réellement utilisée dans KREDO, puis refondre le Shell global autour de ce standard stabilisé.**

## 2. Décisions normatives

### D2-1 — Une primitive unique `SectionRail`

Toutes les navigations secondaires Desktop compatibles utilisent à terme une primitive présentationnelle commune `SectionRail`.

Le composant ne connaît ni Supabase, ni n8n, ni les données métier de la page.

### D2-2 — Largeur canonique

La largeur du rail Desktop est fixée à :

```text
11.5rem = 184px
```

Une page ne peut pas élargir le rail pour accommoder un libellé long.

### D2-3 — Anatomie du rail

Ordre obligatoire :

```text
Chapeau
────────────
Chapitres
...

[espace flexible]

────────────
Modules
...
```

La section `Modules` est facultative. Si elle existe, elle contient uniquement les modules contextuels réellement disponibles dans la page.

### D2-4 — Chapeau canonique

Le chapeau est toujours :

- un **bouton** ;
- fond **navy** ;
- texte **blanc** ;
- texte **gras** ;
- contenu **centré horizontalement et verticalement** ;
- contenu = **titre de la page principale** ;
- action = retour à l'accueil / état racine de cette page principale.

Le chapeau n'affiche jamais le nom de l'onglet actif.

### D2-5 — Le nom de l'onglet actif vit dans le header principal

Chaque onglet / chapitre sélectionné doit avoir son nom affiché dans le **header de la zone principale**.

Exemple conceptuel :

```text
Rail gauche                       Zone principale
┌──────────────────┐              ┌──────────────────────────────┐
│ [ ENGAGEMENTS ]  │              │ Missions AT                 │
│                  │              ├──────────────────────────────┤
│ CHAPITRES        │              │ contenu de l'onglet         │
│ ...              │              │                              │
└──────────────────┘              └──────────────────────────────┘
```

La combinaison `titre de page dans le chapeau + nom de l'onglet dans le header` est un invariant visuel.

### D2-6 — Modules contextuels uniquement

Le menu secondaire n'est pas un lanceur global d'outils KREDO.

`Modules` contient uniquement des outils contextualisés par la page affichée. Toute action transverse relève de Cockpit Intelligence et reste hors du rail secondaire.

### D2-7 — Pas de bouton mort

Un module contextuel n'est rendu que si son action est réellement disponible dans le contexte courant.

Les placeholders décoratifs, boutons disabled permanents ou modules « à venir » dans le rail sont interdits.

### D2-8 — État de navigation URL-addressable

Le chapitre actif doit être représenté dans l'URL et respecter :

- deep-link ;
- refresh ;
- back / forward ;
- restauration déterministe.

Le mécanisme peut être :

- pathname ;
- query param.

Le `useState` seul ne constitue pas une source de vérité suffisante pour la navigation secondaire.

### D2-9 — Le `SectionRail` n'impose pas le routage

La primitive reçoit un état actif et des actions/hrefs. Elle ne décide pas si un chapitre utilise un pathname ou un query param.

### D2-10 — Mobile protégé

SHELL-0018 V2 ne refond pas le rendu Mobile.

Toute configuration ou helper partagé avec Mobile est une dépendance protégée jusqu'à migration explicite de son consommateur.

### D2-11 — Pas de persistance en base

Les descriptions de rail, les chapitres et les modules contextuels restent dans le code TypeScript.

Aucune migration Supabase n'est nécessaire pour ce chantier sauf besoin métier indépendant explicitement validé.

### D2-12 — Le Shell global est une phase séparée

La standardisation du menu secondaire est livrée avant :

- la refonte du comportement du menu principal Desktop ;
- la remise à plat de `useSidebarCollapse` ;
- le retrait de l'ancien mécanisme `SectionNavBar` ;
- toute réorganisation fonctionnelle profonde du menu principal.

Cette séparation réduit le risque et évite de mélanger refactor technique et décisions produit.

## 3. Contrat cible de `SectionRail`

Le contrat exact TypeScript sera figé au Lot 1.0, mais doit rester équivalent à :

```ts
type SectionRailEntry = {
  key: string
  label: string
  icon: ReactNode
  active: boolean
  onSelect?: () => void
  href?: string
}

type SectionRailSection = {
  title: string
  entries: SectionRailEntry[]
}

type SectionRailProps = {
  title: string
  onHome: () => void
  sections: SectionRailSection[]
  contextualModules?: SectionRailEntry[]
}
```

Le composant doit rester présentationnel.

## 4. Règles visuelles

### N2-1 — Conteneur

```text
flex h-full w-[11.5rem] shrink-0 flex-col
border-r border-edito-border
bg-edito-canvas
px-3 py-5
```

### N2-2 — Chapeau

Minimum 40px, navy, blanc, gras, centré, focus visible.

### N2-3 — Titres de section

```text
text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted
```

### N2-4 — Items

Minimum 40px. Icône fixe `size-4`. Filet gauche `2px`.

Actif : brass + surface + navy.  
Inactif : muted + hover surface.

### N2-5 — Libellés longs

Un libellé peut occuper deux lignes maximum. Il ne provoque ni scroll horizontal ni élargissement du rail.

### N2-6 — Modules en bas

La zone chapitres est flexible et scrollable si nécessaire. La section Modules est placée après l'espace flexible, avec `mt-auto` lorsque la hauteur le permet.

### N2-7 — Header principal

Le nom de l'onglet actif est obligatoire dans le header de la zone principale. Le rail n'est jamais le seul endroit où ce nom apparaît.

## 5. Périmètre fonctionnel exclu du Core

SHELL-0018 V2 ne profite pas de la migration du rail pour :

- réécrire les données métier ;
- inventer de nouvelles pages ;
- supprimer des vues fonctionnelles existantes ;
- fusionner des domaines métier ;
- ajouter de nouveaux workflows n8n ;
- créer de nouvelles RPC ;
- modifier Supabase sans nécessité démontrée ;
- reconstruire le panneau Cockpit Intelligence.

Tout besoin de ce type devient un chantier ou lot métier autonome.

## 6. Phasage décidé

### Phase 0 — Rebaseline documentaire

- audit actuel ;
- ADR V2 ;
- standard du rail ;
- ledger V2 ;
- inventaire des surfaces.

### Phase 1 — Primitive partagée

- contrats ;
- `SectionRail` ;
- tests unitaires ciblés.

### Phase 2 — Migration des rails verticaux existants

Ordre privilégié :

1. Account Intelligence ;
2. Business Intelligence ;
3. Veille ;
4. Rapports ;
5. Automatisations ;
6. Engagements ;
7. Prospection ;
8. Knowledge Hub.

Le comportement métier de chaque page doit rester inchangé pendant sa migration, sauf correction nécessaire pour respecter les invariants de navigation.

### Phase 3 — Standardisation des modules contextuels

Chaque page déclare uniquement ses modules contextuels. Les ouvertures locales peuvent être factorisées si plusieurs surfaces partagent exactement la même capacité et le même contrat de contexte.

### Phase 4 — URLisation

Migration progressive des navigations encore pilotées uniquement par état local.

Finance est une candidate prioritaire après stabilisation du rail partagé.

### Phase 5 — Shell global

- audit des consommateurs de `useSidebarCollapse` ;
- décision finale push/overlay du menu principal ;
- intégration avec Cockpit Intelligence ;
- retrait progressif de `SectionNavBar` et `SectionNavBarSlot` lorsque leurs consommateurs ont été migrés.

### Phase 6 — Architecture du menu principal

La taxonomie globale des groupes/modules est arbitrée séparément. Elle ne doit pas bloquer la standardisation du rail.

### Phase 7 — Nettoyage / clôture

Suppression des anciennes implémentations devenues orphelines, documentation finale et QA globale.

## 7. Gates de validation

À chaque lot de code :

```bash
npm run typecheck
npm run build
npm test
npm run check:server-boundary
npx eslint <fichiers touchés>
```

Plus :

- smoke test Desktop ;
- contrôle du scroll ;
- absence d'overflow horizontal ;
- contrôle du header d'onglet ;
- contrôle back/forward si navigation modifiée ;
- vérification Mobile si un contrat partagé est touché.

## 8. Critère de succès du chantier

SHELL-0018 V2 est réussi lorsque :

1. toutes les pages Desktop concernées utilisent la même primitive de rail ;
2. le chapeau et les chapitres respectent le standard visuel ;
3. chaque header principal affiche le nom de l'onglet actif ;
4. les Modules du rail sont exclusivement contextuels ;
5. la position de navigation est URL-addressable ;
6. l'ancien système horizontal n'est plus nécessaire sur les pages migrées ;
7. le Mobile n'a subi aucune régression involontaire ;
8. aucune configuration de navigation n'a été introduite en base.
