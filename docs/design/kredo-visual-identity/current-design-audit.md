# Audit du design actuel KREDO

Date d'audit: 2026-07-02. Branche de travail: `design/kredo-visual-identity-exploration`.

## Etat Git initial

`git status --short --branch` avant intervention:

```text
## main...origin/main
```

Aucune modification preexistante n'a ete detectee. La branche dediee a ete creee avant les edits.

## Fichiers inspectes

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/(app)/layout.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/DesktopSidebar.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/MobileSectionRail.tsx`
- `src/components/layout/section-tab-styles.ts`
- `src/components/templates/DesktopAnalyticalPage.tsx`
- `src/components/templates/MobileActionPage.tsx`
- primitives `Button`, `SurfaceCard`, `KpiCard`, `Badge`, `StatusPill`, `DataTable`, `AppDrawer`, `AppDialog`, `InsightCard`
- vues Cockpit, Comptes & Contacts, Staffing, Recruitment, Consultants, Missions et Finance
- recherche globale des couleurs hardcodees, gradients, ombres et classes arbitraires

## Synthese

La doctrine actuelle "Cobalt Franc" est coherente et largement tokenisee. Elle pose un socle credible: cobalt principal, navy pour la navigation, brass/ambre pour la personnalite, surfaces claires chaudes, faible relief et composants B2B denses. Le systeme reste cependant trop prudent visuellement et souffre de trois problemes: categories et statuts se recouvrent, les effets IA utilisent des couleurs multicolores hardcodees, et la profondeur n'a pas encore une grammaire suffisamment explicite.

## Couleurs existantes

### Identite et surfaces

- `--color-primary`, `--color-brand-blue`, `--color-brand-primary`: cobalt `#2554B8`.
- `--color-primary-deep`, `--color-brand-primary-deep`: cobalt recessed `#1E4596`.
- `--color-sidebar-bg`: navy `#162650`.
- `--color-brand-brass`: brass `#C89A2B`.
- `--color-brand-ember`: ember `#D97020`.
- `--color-canvas`: fond chaud `#F4F2ED`.
- `--color-surface`: carte/panneau `#FDFCFA`.
- `--color-surface-hover`: hover `#EDF0F7`.
- `--color-border`: bordure `#DBE0EB`.

### Texte

- `--color-heading`: `#1A2540`.
- `--color-body`: `#526074`.
- `--color-muted`: `#93A0B0`.
- aliases `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`.

### Statuts

- `--color-success`: `#2C7D5C`.
- `--color-warning`: `#C08A20`.
- `--color-danger`: `#BE3E3E`.
- `--color-info`: `#2E7D8C`.
- aliases `--color-status-*`.

### Categories et cas metier

- `--color-case-need`: `#FFC107`.
- `--color-case-candidate`: `#9C27B0`.
- `--color-cat-success`, `--color-cat-active`, `--color-cat-urgent`, `--color-cat-warning`, `--color-cat-idea`, `--color-cat-info`.
- dataviz `--color-dataviz-1` a `--color-dataviz-7`.

## Tokens reellement utilises

- Layout: sidebar widths, header height, bottom nav height, drawer width, intelligence panel width, z-index, safe areas.
- Interaction: `--motion-duration-fast`, `--motion-duration-base`, `--motion-duration-slow`, overlay durations et easings.
- Accessibilite: `--focus-ring-color`, `--focus-ring-width`, `--focus-ring-offset`, disabled colors et opacity.
- Surfaces: `bg-canvas`, `bg-surface`, `border-border`, `bg-surface-hover`.
- Primitives: boutons, cartes, KPI, badges, status pills, drawers et tables consomment majoritairement les tokens.

## Couleurs codees en dur restantes

Les zones les plus visibles:

- `src/app/globals.css`: effets IA multicolores hardcodes (`#5b57f5`, `#7c4fff`, `#b84dff`, `#ff004d`, `#ff7a00`, `#ffb700`, `#33d17a`, `#00c2ff`, etc.).
- `src/app/globals.css`: overrides cockpit et lecture longue avec hex directs.
- `src/components/recruitment/dashboard/RecruitmentDesktopDashboard.tsx`: plusieurs hex et couleurs Tailwind arbitraires dans les KPI, sparklines et colonnes Kanban.
- `src/components/proposals/*`: nombreux hex dans graphiques SVG, badges, boutons et barres.
- `src/components/consultants/synthese/ConsultantsSyntheseDesktop.tsx`: couleurs Tailwind directes `bg-emerald-500`, `bg-amber-500`, `bg-blue-500`, etc.
- composants ponctuels: `text-white`, `bg-heading`, `shadow-sm/xl/2xl` restent utilises comme raccourcis.

Ces dettes sont preexistantes et ne sont pas modifiees dans ce chantier.

## Incoherences semantiques

- `--color-cat-success`, `--color-cat-urgent` et `--color-cat-warning` sont des categories mais portent des noms et usages de statut.
- Besoin = ambre et warning = ambre/ocre: collision possible entre domaine metier et etat d'attention.
- Candidat = pourpre et innovation/idee = pourpre: collision entre domaine et meta-signal.
- Finance utilise parfois vert/success pour marge positive, ce qui peut masquer la couleur de domaine finance.
- IA utilise un arc-en-ciel hardcode qui n'est pas encore un systeme semantique avec roles distincts: generation, confiance, recommandation, moment exceptionnel.
- `--color-status-warning-ink` semble reference dans `Badge`, `StatusPill`, `AppDrawer`, mais n'apparait pas dans l'extrait de tokens globaux inspecte.
- Certains tokens typographiques utilises (`--font-size-label-xs`, `--line-height-label-xs`) ne sont pas visibles dans l'extrait global inspecte.

## Ombres, rayons et elevation

- Le systeme cible un flat design: `--shadow-surface`, `--shadow-card`, `--shadow-kpi`, `--shadow-table`, `--shadow-button`, `--shadow-input` sont a `none`.
- Les overlays ont des ombres tokenisees: `--shadow-overlay-sm/md/lg`.
- Des vues metier reintroduisent `shadow-sm`, `shadow-xl`, `shadow-2xl` localement.
- Les rayons globaux sont petits ou nuls: `--radius-small` 4px, `--radius-medium` 6px, grands rayons a 0. Certaines vues utilisent `rounded-xl`, `rounded-2xl`, `rounded-lg` directement.
- Les drawers ont une elevation et une animation convaincantes; les cartes analytiques manquent souvent de differenciation entre repos, hover et selection.

## Bordures et niveaux de surface

- Bordures fines et constantes: tres lisible en desktop.
- Desktop sidebar inverse sur navy; header blanc/surface; contenu canvas chaud.
- Mobile bottom nav reprend cobalt primaire; rail mobile utilise cobalt profond.
- `SurfaceCard` fournit border/surface/interactif/selected, mais l'accent ne couvre que primary/success/warning/danger/brass.
- Les niveaux de surface sont peu nombreux: canvas, surface, hover, raised. C'est maintenable mais limite la profondeur identitaire.

## Etats interactifs

- Boutons: focus visible tokenise, disabled clair, hover par changement de couleur.
- Cards: hover par couleur/border; peu de lift sauf vues metier specifiques.
- DataTable: rows interactives avec `kredo-hover-reference`, deplacement horizontal subtil et focus ring.
- Drawers: bonne animation entree/sortie, focus initial et restauration du focus.
- Mobile rail: apparition rapide, underline anime.
- IA: animations visibles mais parfois permanentes. Les media queries `prefers-reduced-motion` sont presentes pour la plupart des effets.

## Differences Desktop / Mobile

- Desktop: `AppShell` avec sidebar persistante, header, espace scrollable, panel IA.
- Mobile: pas de sidebar/header desktop; bottom nav fixe, rail contextuel, padding safe area, tap target 44px.
- Templates dedies: `DesktopAnalyticalPage` et `MobileActionPage` confirment une intention differente.
- Les vues Cockpit et Staffing ont des composants mobile distincts; certaines vues restent encore tres desktop dans leur densite.

## Composants a fort potentiel identitaire

- Sidebar Desktop: marque, navigation, groupe module, rail actif.
- Mobile bottom nav et rail: signature quotidienne de l'app.
- Cockpit Intelligence: theme immersif, actions IA, score/confiance, recommandations.
- KPI cards: numerique et statut.
- DataTable: lecture operationnelle dense.
- Drawers/dialogs: contexte et action.
- Badges/status pills: resolution indispensable des collisions semantiques.
- Talent/Staffing pipeline: domaine le plus favorable aux rails de couleur.
- Finance mini-viz: opportunite de dataviz sans nouvelle librairie.

## Piliers a conserver

- Cobalt comme actif de marque.
- Navy de navigation, tres credible B2B.
- Surfaces claires legerement chaudes.
- Flat design dominant et ombres rares.
- Bonne separation desktop/mobile.
- Primitives accessibles: focus, dialogs, drawers, tap target.
- Densite analytique desktop.

## Elements a renforcer

- Architecture couleur par familles: marque, surface, texte, statut, domaine, dataviz, IA, interaction.
- Distinction stricte entre statut et categorie.
- Rails ou marqueurs de domaine plus memorables.
- Hierarchie typographique des headers.
- Etats hover/selected avec relief cible.
- Dataviz tokenisee par role.
- IA tokenisee: confiance, generation, recommandation, resultat.

## Incoherences a corriger

- Categories nommees comme statuts.
- Ambre utilise a la fois pour besoin, warning et brand accent.
- Pourpre utilise pour candidat et idee/innovation.
- Effets IA arc-en-ciel non namespaced par role.
- Ombres locales non gouvernees.
- Rayons locaux trop variables.
- Couleurs hardcodees dans dashboards non centraux.

## Elements pouvant etre abandonnes

- Usage decoratif permanent du rainbow IA.
- Carte systematique quand une section/table simple suffit.
- Gros rayons dans certains dashboards metier.
- `shadow-xl/2xl` pour des cartes permanentes.
- Couleurs Tailwind directes pour domaines ou statuts.

## Opportunites de differenciation

- Donner a chaque domaine un marqueur stable: rail, dot, tab underline, jauge ou header band.
- Faire du Cockpit IA une experience plus identifiable que le reste, sans generaliser l'immersion a toute l'app.
- Creer trois modes de profondeur: surface interactive, panneau temporaire, moment IA exceptionnel.
- Transformer les KPI en instruments de lecture plutot qu'en simples cartes.
- Utiliser la couleur pour orienter la lecture, pas pour teinter uniformement les pages.
