# KREDO Mobile Overview Shell

Statut : standard officiel pour les vues mobiles d’entrée de type **Accueil**, **Synthèse**, **Vue d’ensemble** ou **Overview**.

## Rôle

`MobileOverviewShell` standardise le contenant visuel des vues d’ensemble mobiles KREDO. Il ne connaît aucun domaine métier, ne charge aucune donnée et ne possède ni loader, ni fetch, ni état applicatif.

Chaque page métier est implémentée individuellement. Le shell standardise le contenant, pas le contenu. Chaque illustration Hero est un asset dédié conçu séparément. L’ajout d’une nouvelle page ne doit pas entraîner de modification structurelle du shell sauf besoin transversal démontré.

## Structure et géométrie

```text
MobileOverviewShell
├── Hero coloré — 258 px
│   ├── pictogramme — zone 92 × 92 px, top 5 px, left 0
│   ├── forme décorative — 260 × 219 px, top 29 px, right -11 px
│   ├── artwork — zone 316 × 237 px, top -20 px, right 8 px
│   └── contenu Hero optionnel
└── Surface blanche
    └── children métier
```

La surface commence visuellement à `y = 198px` grâce à une superposition de `60px` sur le Hero. Sa largeur est `min(100% - 38px, 352px)`, ses gutters internes sont de `24px` et ses rayons supérieurs de `28px`. Son fond est le blanc réel `--color-edito-surface`. Elle se prolonge jusqu’au bas utile de la page et réserve l’espace défini par `--layout-mobile-content-bottom-offset`.

La Bottom Navigation, le rail de navigation, l’Intelligence FAB et l’indicateur d’exécution restent extérieurs au shell et sous la responsabilité de `AppShell` / `MobileNav`.

## Couleur et forme décorative

La prop `tone` accepte uniquement les clés sémantiques du registre permanent `--color-page-*` de `src/app/globals.css`. Le composant ne contient aucune valeur HEX et ne crée pas de second registre de couleurs.

La grande forme douce est générée par le shell avec un léger `linear-gradient()` entre deux variantes calculées par `color-mix()` à partir de la couleur primaire de la page et de blanc. Elle n’appartient donc pas au bitmap de l’illustration et s’adapte automatiquement au module. Aucun glow, verre dépoli ou ombre décorative n’est ajouté.

## Pictogramme et illustration

`icon` reçoit le pictogramme de la page. Il doit provenir en priorité du système d’icônes de navigation KREDO existant. Le shell ne choisit jamais l’icône métier.

`artwork` reçoit l’asset propre à la page. Sa zone stable applique un comportement équivalent à `object-fit: contain` : des ratios différents sont tolérés sans recadrage. `artworkClassName` permet un ajustement léger de position ou de taille pour un asset atypique. `decorativeShapeClassName` offre le même niveau d’ajustement à la forme. Ces deux échappatoires ne doivent pas devenir un moteur de coordonnées ou un système parallèle de variantes.

## API

```tsx
<MobileOverviewShell
  tone="opportunities"
  heroLabel="Synthèse des opportunités"
  surfaceLabel="Contenu de la synthèse des opportunités"
  icon={<OpportunityIcon />}
  artwork={<Image src={artwork} alt="" />}
  heroContent={<PageSpecificHeroControls />}
  artworkClassName={styles.optionalArtworkAdjustment}
  decorativeShapeClassName={styles.optionalShapeAdjustment}
>
  <OpportunityOverview />
</MobileOverviewShell>
```

Props :

- `tone` : clé sémantique obligatoire reliée aux tokens `--color-page-*`.
- `heroLabel` : nom accessible obligatoire du Hero.
- `icon` : pictogramme fourni par la page.
- `artwork` : illustration fournie par la page.
- `children` : contenu métier libre de la surface blanche.
- `heroContent` : contenu optionnel propre à la page, par exemple une date ou une action.
- `surfaceLabel` : nom accessible de la surface ; une valeur générique est fournie par défaut.
- `className` : classe racine optionnelle pour le contexte métier.
- `artworkClassName` et `decorativeShapeClassName` : ajustements visuels légers et locaux.

## Adaptive Design

Le shell est réservé à la branche Mobile. Il ne doit pas être chargé puis masqué sur Desktop. Les versions Desktop restent des compositions structurelles distinctes. Le scroll vertical appartient au scroll root mobile de `AppShell`; le shell empêche uniquement l’overflow horizontal accidentel.

Le contenu de la surface demeure libre. Finance constitue la première déclinaison analytique de référence : deux KPI compacts, puis une zone graphique dominante organisée en carousel Mobile de visualisations métier dédiées. Ce pattern reste une composition Finance et n’est pas abstrait dans le shell générique.

## Création d’une future page

Traiter les pages une par une :

1. auditer le contenu mobile existant ;
2. sélectionner les KPI utiles, le cas échéant ;
3. adapter les graphiques au Mobile ;
4. concevoir séparément l’illustration dédiée ;
5. sélectionner la clé `tone` du registre KREDO ;
6. intégrer le contenu dans `MobileOverviewShell` ;
7. exécuter une QA individuelle, dont absence de clipping et d’overflow horizontal.

Ne modifier le shell qu’en présence d’un besoin transversal démontré par plusieurs pages.
