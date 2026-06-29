"use client"

import type {
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import type { AssistanceCasePerspective } from "@/hooks/use-staffing-drawer-store"
import { cn } from "@/lib/utils"
import type { CSSProperties } from "react"

interface AssistanceCaseHeaderProps {
  opportunity: AssistanceCaseOpportunity
  positioning: AssistanceCasePositioning | null
  perspective: AssistanceCasePerspective
  onPerspectiveChange: (perspective: AssistanceCasePerspective) => void
  onEdit: () => void
  editDisabled: boolean
}

function getCandidateName(positioning: AssistanceCasePositioning | null) {
  const person = positioning?.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Candidat"
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487 19.5 7.125m-1.638-4.276a1.875 1.875 0 1 1 2.652 2.652L7.125 18.89 3 20l1.11-4.125L17.862 2.85Z"
      />
    </svg>
  )
}

export function getAssistanceCaseHeaderStyle(
  perspective: AssistanceCasePerspective,
): CSSProperties {
  const isCandidate = perspective === "candidate"
  const surfaceColor = isCandidate ? "#9C27B0" : "#FFC107"
  const canvasColor = isCandidate ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.32)"
  const borderColor = isCandidate ? "#7E1F8E" : "#D8A400"
  const headingColor = isCandidate ? "#FFFFFF" : "#3A2A02"
  const mutedColor = isCandidate ? "#E6C8ED" : "#6C5300"

  return {
    "--color-surface": surfaceColor,
    "--color-bg-surface": surfaceColor,
    "--color-canvas": canvasColor,
    "--color-bg-canvas": canvasColor,
    "--color-border": borderColor,
    "--color-heading": headingColor,
    "--color-body": headingColor,
    "--color-muted": mutedColor,
    "--color-primary": headingColor,
    "--drawer-header-fade-start": isCandidate
      ? "rgba(156, 39, 176, 0.9)"
      : "rgba(255, 193, 7, 0.88)",
    "--drawer-header-fade-end": isCandidate
      ? "rgba(253, 252, 250, 0)"
      : "rgba(253, 252, 250, 0)",
    backgroundColor: surfaceColor,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  } as CSSProperties
}

export function AssistanceCaseHeader({
  opportunity,
  positioning,
  perspective,
  onPerspectiveChange,
  onEdit,
  editDisabled,
}: AssistanceCaseHeaderProps) {
  const isCandidate = perspective === "candidate"
  const title = isCandidate
    ? getCandidateName(positioning)
    : opportunity.title?.trim() || "Besoin non renseigné"
  const subtitle = isCandidate
    ? positioning?.candidate.current_title?.trim() || "Profil non renseigné"
    : opportunity.company?.name?.trim() || "Compte non renseigné"
  const editLabel = isCandidate
    ? positioning
      ? `Modifier le profil de ${title}`
      : "Modifier le profil candidat"
    : `Modifier l'opportunité ${title}`
  const switcherBaseClassName =
    "inline-flex items-center justify-start px-0 text-left text-[11px] font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-surface)]"

  return (
    <div className="flex min-w-0 flex-col gap-3 select-none">
      <div className="min-w-0">
        <p className="truncate text-[1.02rem] font-bold leading-tight text-heading">
          {title}
        </p>
        <p className="truncate pt-0.5 text-xs font-medium leading-snug text-muted">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onPerspectiveChange("opportunity")}
            className={cn(
              switcherBaseClassName,
              "h-11 min-w-0 sm:h-9",
              perspective === "opportunity"
                ? "font-black tracking-[0.11em] text-heading"
                : "text-muted/80 hover:text-heading",
            )}
            aria-pressed={perspective === "opportunity"}
          >
            Besoin
          </button>

          <span
            className="inline-flex h-11 w-6 shrink-0 items-center justify-center text-heading/70 sm:h-9 sm:w-5"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" />
            </svg>
          </span>

          <button
            type="button"
            disabled={!positioning}
            onClick={() => positioning && onPerspectiveChange("candidate")}
            className={cn(
              switcherBaseClassName,
              "h-11 min-w-0 sm:h-9",
              perspective === "candidate"
                ? "font-black tracking-[0.11em] text-heading"
                : "text-muted/80 hover:text-heading",
              !positioning && "cursor-not-allowed opacity-55 hover:text-muted",
            )}
            aria-pressed={perspective === "candidate"}
            title={positioning ? "Afficher la perspective candidat" : "Aucun candidat sélectionné"}
          >
            Candidat
          </button>
        </div>

        <button
          type="button"
          onClick={onEdit}
          disabled={editDisabled}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-medium)] border bg-surface transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-surface)] sm:h-9 sm:w-9",
            editDisabled
              ? "cursor-not-allowed border-transparent text-muted opacity-55"
              : "border-transparent text-heading hover:bg-surface/85",
          )}
          aria-label={editLabel}
          title={editLabel}
        >
          <span className="size-4" aria-hidden="true">
            <EditIcon />
          </span>
        </button>
      </div>
    </div>
  )
}
