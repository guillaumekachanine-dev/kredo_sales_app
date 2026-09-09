import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — primitive de layout 3 panneaux (Lot 2)
//
//  Châssis « Liste │ Vue principale │ Détails » repris de `/reports` et
//  `/missions` (Engagements). Local à la feature Opportunités : ne PAS le
//  promouvoir en `src/components/layout/` tant qu'aucun second consommateur hors
//  Opportunités ne le justifie (OPP-06).
//
//  Consommateurs prévus : chapitres Besoins & staffing (Lot 6), Avant-vente
//  (Lot 7), Planning (Lot 9). Le chapitre Synthèse est une exception pleine
//  largeur et n'utilise PAS cette primitive (OPP-05).
//
//  Invariants :
//   - grille `minmax(230px,280px) │ minmax(0,1fr) │ minmax(238px,300px)` ;
//   - chaque panneau : `min-h-0 min-w-0 overflow-hidden` → le scroll est interne
//     au contenu du slot (qui pose son propre `overflow-y-auto`), jamais sur le
//     body ; aucun débordement horizontal ;
//   - rail droit : dégrade en `<aside aria-hidden />` quand `details` est absent
//     (patron Engagements), sauf `detailsEmpty` explicite.
//
//  Desktop only — la primitive n'est jamais montée sur Mobile (pas de `hidden`
//  CSS sur un arbre Desktop).
// ─────────────────────────────────────────────────────────────────────────────

interface OpportunitiesTriPanelProps {
  /** Rail gauche — liste d'entités. */
  list: ReactNode
  /** Colonne centrale — vue principale de l'entité sélectionnée. */
  main: ReactNode
  /** Rail droit — détails de l'entité sélectionnée. Absent → rail neutre. */
  details?: ReactNode
  /**
   * Rendu alternatif du rail droit quand `details` est absent. Par défaut :
   * `<aside className="border-l border-border bg-surface" aria-hidden />`.
   */
  detailsEmpty?: ReactNode
  /** Libellé accessible du conteneur (optionnel). */
  ariaLabel?: string
  className?: string
}

const PANEL_BASE = "flex min-h-0 min-w-0 flex-col overflow-hidden"

export function OpportunitiesTriPanel({
  list,
  main,
  details,
  detailsEmpty,
  ariaLabel,
  className,
}: OpportunitiesTriPanelProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)] overflow-hidden",
        className,
      )}
    >
      <div className={cn(PANEL_BASE, "border-r border-border bg-surface")}>{list}</div>

      <div className={cn(PANEL_BASE, "bg-canvas")}>{main}</div>

      {details ? (
        <aside className={cn(PANEL_BASE, "border-l border-border bg-surface")}>
          {details}
        </aside>
      ) : (
        detailsEmpty ?? <aside className="border-l border-border bg-surface" aria-hidden />
      )}
    </div>
  )
}
