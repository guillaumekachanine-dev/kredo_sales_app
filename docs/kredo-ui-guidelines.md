# Kredo UI Guidelines

## Card Accent Rule

- **No Colored Left Borders**: No card or panel in Kredo should ever use a colored lateral border (such as `border-l-4`, `border-l-primary`, etc.) as an accent or to represent a status.
- **Surface Accent Wash Pattern**: Use the `Surface Accent Wash` pattern instead. This is implemented via the `<SurfaceCard>` primitive component (`src/components/ui/SurfaceCard.tsx`).
- **Subtle Accents**: Card accents and statuses must be carried through:
  - A subtle background color wash/gradient (e.g. `bg-gradient-to-r from-[color]/[0.03] to-transparent`).
  - Fine neutral borders (`border-border`).
  - Discretely placed status dots, badges, labels, or micro-variations in text colors.
- **Business Status Representation**: Business statuses (like success, warning, danger, pending) must never be highlighted with a solid colored left border.
