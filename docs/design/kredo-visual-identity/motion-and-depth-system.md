# Systeme motion et profondeur

## Objectif

Le design reste principalement flat. Le relief sert a signaler l'action, la selection, un panneau temporaire ou un moment IA exceptionnel. Aucune animation ne doit etre purement decorative ou permanente hors etat de chargement/generation.

## Tokens recommandes

```css
--motion-duration-fast: 120ms;
--motion-duration-standard: 180ms;
--motion-duration-emphasis: 280ms;
--motion-duration-panel: 320ms;
--motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
--motion-ease-emphasis: cubic-bezier(0.16, 1, 0.3, 1);
--motion-ease-exit: cubic-bezier(0.4, 0, 1, 1);
--motion-distance-hover: 2px;
--motion-distance-panel: 24px;
```

## Ombres tokenisees

```css
--shadow-interactive: 0 10px 26px -18px rgba(19, 36, 75, 0.42);
--shadow-panel: 0 20px 46px -28px rgba(19, 36, 75, 0.50);
--shadow-drawer: 0 28px 64px -28px rgba(19, 36, 75, 0.30);
--shadow-selected: 0 0 0 1px var(--domain-ring), 0 18px 40px -28px var(--domain-color);
--shadow-ai-exception: 0 0 0 1px var(--ai-ring), 0 0 32px -12px var(--color-domain-ai);
```

Roles:

- Surface interactive: hover ou focus d'une carte/action.
- Panneau temporaire: popover, menu, quick action panel.
- Drawer/dialog: contexte modal.
- Element selectionne: row/table/card active.
- Moment IA exceptionnel: generation, resultat, recommandation critique.

## Etats

### Hover

- Deplacement: `translateY(-1px)` a `translateY(-2px)`.
- Border: melange 35-50% avec couleur de domaine.
- Surface: tint 6-10%.
- Duree: 120-180ms.
- Pas de changement de taille ou de reflow.

### Active

- Retour a `translateY(0)` avec scale optionnel `0.99`.
- Duree: 120ms.
- Ne jamais deplacer les voisins.

### Selected

- Rail ou bordure de domaine visible.
- Fond teinte 8-12%.
- Ring inset ou box-shadow tokenise.
- Pas de shadow forte sur les rows de table.

### Focus clavier

- Anneau 3px, offset 2px.
- Couleur brand ou domaine.
- Doit rester visible sur surface claire et sombre.

### Disabled

- Opacite 45-50%.
- Pas de mouvement.
- Cursor not allowed si bouton.
- Texte fonctionnel toujours lisible si l'element reste informatif.

## Patterns par composant

### Cartes KPI

- Entree: opacity 0 -> 1, translateY 8px -> 0, 180ms, stagger 40ms si groupe.
- Hover seulement si clickable.
- Progress bar: transition width 280ms.
- Les chiffres ne changent pas de taille au hover.

### Tables

- Hover row: surface tint et leger deplacement horizontal 2px maximum.
- Selected row: rail gauche ou ring inset.
- Sticky header: aucune ombre permanente; bordure basse suffit.

### Onglets

- Selection: underline qui glisse depuis le centre ou translateX.
- Duree: 180ms.
- Mobile rail: apparition 180-220ms, translateY 8px maximum.

### Drawers

- Desktop: entre depuis la droite, 24-36px, 280-320ms.
- Mobile: monte depuis le bas, 20-24px, 240-280ms.
- Sortie: 180-220ms.
- Backdrop: fade 120-180ms.
- Focus initial obligatoire.

### Dialogs

- Fade + scale 0.98 -> 1.
- Duree 180-220ms.
- Shadow overlay, pas de rebond.

### IA

- Signal IA dormant: icon/anneau statique.
- Generation: anneau ou progress line 240-320ms boucle courte, `prefers-reduced-motion` -> statique.
- Resultat: reveal opacity + translateY 8px, 220ms.
- Moment exceptionnel: glow 1 a 2 secondes, puis retour repos.

### Transitions liste -> detail

- Desktop: panneau detail lateral, slide 24px.
- Mobile: sheet bottom ou nouvelle section verticale.
- Les listes gardent leur position; aucun layout shift global.

## Reduced motion

Regle obligatoire:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

Application plus fine possible par scope pour ne pas casser les transitions systeme, mais le Design Lab applique une coupure complete via `data-motion="off"` et media query.

## Direction A

- Motion precise et discrete.
- Lift 2px sur cartes actionnables.
- Anneau IA prisme rare.
- Drawer conserve l'esprit actuel.

## Direction B

- Motion la plus calme.
- Transition de surface, underline, fade.
- Pas de glow sauf IA.
- Profondeur par composition plutot que shadow.

## Direction C

- Motion la plus expressive.
- Rails lumineux, scanline discret, glow court.
- A limiter aux vues cockpit/analytiques.
- Necessite QA renforcee sur fatigue visuelle.
