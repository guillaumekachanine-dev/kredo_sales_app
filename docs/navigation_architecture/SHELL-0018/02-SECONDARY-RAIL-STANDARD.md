# SHELL-0018 — Standard canonique du menu secondaire Desktop

## 1. Objet

Ce document définit le rendu obligatoire de tout menu secondaire Desktop de KREDO.

Il s'applique au châssis de navigation. Il ne remplace pas les règles métier propres à chaque page.

## 2. Anatomie obligatoire

```text
┌──────────────────────────┐
│       PAGE PRINCIPALE    │  ← chapeau navy, bouton
├──────────────────────────┤
│ CHAPITRES                │
│ ▍ Icône  Onglet actif    │
│   Icône  Onglet          │
│   Icône  Onglet          │
│                          │
│        espace flexible   │
│                          │
├──────────────────────────┤
│ MODULES                  │  ← facultatif
│   Icône  Module contexte │
│   Icône  Module contexte │
└──────────────────────────┘
```

Le rail ne porte pas les actions transverses de KREDO. Elles restent centralisées dans Cockpit Intelligence.

## 3. Conteneur

Valeur canonique :

```tsx
className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
```

Contraintes :

- largeur fixe : `11.5rem` ;
- aucun `min-width` additionnel ;
- aucun scroll horizontal ;
- le rail reste fixe pendant le scroll du contenu principal ;
- si sa propre liste devient trop haute, seule sa zone de chapitres peut devenir scrollable.

## 4. Chapeau

### 4.1 Contenu

Le texte du chapeau est **toujours le titre de la page principale**.

Exemples conceptuels :

- `Engagements`
- `Business Intelligence`
- `Veille & actualités`

Le chapeau ne contient jamais :

- le nom de l'onglet courant ;
- une description ;
- un badge ;
- une action secondaire.

### 4.2 Style

Le chapeau est un bouton navy avec :

- texte blanc ;
- texte gras ;
- texte `text-xs` ;
- contenu centré horizontalement ;
- contenu centré verticalement ;
- `min-h-10` ;
- bordure navy ;
- `rounded-md` ;
- focus visible.

Référence de classe :

```tsx
className={cn(
  "inline-flex min-h-10 w-full items-center justify-center rounded-md border border-edito-navy px-3",
  "text-center text-xs font-bold text-white",
  "bg-edito-navy hover:bg-edito-navy/90",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
)}
```

### 4.3 Comportement

Le clic renvoie vers l'état racine de la page principale.

La cible peut être :

- une route ;
- une query canonique ;
- un callback contextuel.

Le rail n'impose pas le mécanisme.

## 5. Séparation après chapeau

La zone `Chapitres` commence après :

```tsx
className="mt-5 border-t border-edito-border pt-4"
```

Cette séparation est obligatoire.

## 6. Titre `Chapitres`

Style canonique :

```tsx
className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted"
```

Le mot affiché est `Chapitres`.

Une page ne le remplace pas par `Sections`, `Navigation` ou un terme local équivalent.

## 7. Items de chapitre

Style de base :

```tsx
className="flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors"
```

Focus :

```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30
```

Actif :

```tsx
border-l-edito-brass bg-edito-surface text-edito-navy
```

Inactif :

```tsx
border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body
```

## 8. Icônes

- taille : `size-4` ;
- `shrink-0` ;
- stroke fin cohérent avec le design system ;
- couleur navy ;
- opacité réduite pour l'item inactif si nécessaire ;
- pas d'icône décorative sans valeur de repérage.

La primitive peut recevoir des icônes en `ReactNode` afin de ne pas imposer un registre d'icônes global à cette étape.

## 9. Libellés

Les libellés doivent rester lisibles dans `184px`.

Règles :

- une ligne quand possible ;
- deux lignes maximum pour les libellés longs ;
- `min-w-0` sur le conteneur texte ;
- `leading-[1.15]` pour un label sur deux lignes ;
- pas d'élargissement du rail ;
- pas de scroll horizontal.

La troncature est autorisée uniquement lorsqu'un libellé est impossible à rendre proprement en deux lignes et qu'un `title`/accessible name conserve le texte complet.

## 10. Zone Chapitres et scroll

Structure recommandée :

```text
rail
├── chapeau            flex-none
├── chapitres          flex-1 min-h-0 overflow-y-auto
└── modules            flex-none mt-auto
```

Le scroll du rail ne doit jamais déplacer le chapeau ni faire disparaître les Modules lorsque l'espace disponible permet de les conserver visibles.

## 11. Section `Modules`

### 11.1 Rôle

`Modules` contient uniquement les outils contextuels de la page courante.

Un module contextuel doit satisfaire les trois conditions suivantes :

1. il a une utilité directe dans la page / l'entité / le workspace courant ;
2. il reçoit le contexte nécessaire sans demander à l'utilisateur de reconstruire manuellement ce contexte ;
3. son point d'ouverture est réellement fonctionnel.

### 11.2 Position

La section est placée en bas du rail avec séparation :

```tsx
className="mt-auto border-t border-edito-border pt-4"
```

Si aucun module contextuel n'est disponible, la section entière n'est pas rendue.

### 11.3 Titre

Même style que `Chapitres` :

```tsx
className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted"
```

### 11.4 Items

Même grammaire que les chapitres, sans état actif sauf si le module possède réellement un état d'ouverture persistant pertinent.

Interdits :

- boutons morts ;
- `coming soon` ;
- modules simplement globaux ;
- duplication de capacités déjà centralisées ailleurs.

## 12. Header de la zone principale

La navigation secondaire n'est complète que si le header principal affiche le nom de l'onglet actif.

Règle absolue :

> **le nom de l'onglet actif doit toujours être écrit dans le header de sa page, dans la section principale.**

Le header peut contenir d'autres informations, mais le titre d'onglet ne doit pas disparaître au profit d'un titre de page générique.

Exemple :

```text
Chapeau : Engagements
Header  : Missions AT
```

et non :

```text
Chapeau : Engagements
Header  : Engagements
```

lorsque l'onglet courant est `Missions AT`.

## 13. Navigation URL

Le rail supporte trois formes d'action :

- `<Link href="/route">` ;
- `<Link href="/route?tab=x">` ;
- callback qui met à jour l'URL via le routeur.

La primitive n'encapsule pas de logique métier de routing.

L'URL doit cependant toujours permettre de reconstruire l'onglet courant.

## 14. Accessibilité

- `nav` possède un `aria-label` spécifique à la page ;
- l'item actif porte `aria-current="page"` ;
- le chapeau est un vrai bouton ou lien ;
- focus clavier visible ;
- les zones cliquables font au minimum 40px de haut sur Desktop ;
- les icônes purement graphiques sont `aria-hidden` ;
- le libellé complet reste accessible si le texte visuel est tronqué.

## 15. Interdictions

Un rail conforme ne doit pas :

- varier de largeur selon la page ;
- avoir un chapeau clair ;
- aligner le titre du chapeau à gauche ;
- utiliser des ombres décoratives sur les items ;
- remplacer `Chapitres` par un terme local ;
- cacher le nom de l'onglet actif hors du header principal ;
- afficher des actions transverses ;
- introduire de la logique Supabase ;
- importer un composant métier lourd seulement pour ouvrir un outil ;
- charger une branche Mobile puis la masquer en CSS.

## 16. Critères d'acceptation visuelle

Pour chaque page migrée :

- rail = `184px` ;
- chapeau navy ;
- titre chapeau blanc, gras, centré ;
- `Chapitres` conforme ;
- actif brass ;
- header principal = nom exact de l'onglet actif ;
- modules uniquement contextuels ;
- section Modules en bas ;
- aucun overflow horizontal ;
- contenu principal conserve sa largeur et son scroll attendus.
