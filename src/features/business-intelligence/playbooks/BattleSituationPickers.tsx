"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { BattleSituationSource } from "./battle-situation-contract"

// ─── Dynamic Playbooks · Lot 3 — primitives du configurateur ────────────────
//
// Purement présentationnel : ni état, ni fetch, ni logique métier. Le langage
// visuel est celui posé par le Lot 2 dans `BattleCardsSection` (petites cartes,
// bullets courts, labels majuscules brass) — aucune couleur nouvelle, aucun HEX
// en dur, uniquement des utilitaires Tailwind et les tokens `@theme`.

const SOURCE_BADGE_CLASSES: Record<BattleSituationSource, string> = {
  account: "border-brand-brass/30 bg-brand-brass/10 text-brand-brass",
  sector: "border-sky-400/25 bg-sky-500/10 text-sky-300",
}

const SOURCE_LABELS: Record<BattleSituationSource, string> = {
  account: "Compte",
  sector: "Secteur",
}

/**
 * Provenance d'un élément. Exigence R2 du cadrage : un enjeu sectoriel ne doit
 * jamais pouvoir être lu comme un fait spécifique au compte.
 */
export function SourceBadge({ source }: { source: BattleSituationSource }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
        SOURCE_BADGE_CLASSES[source],
      )}
    >
      {SOURCE_LABELS[source]}
    </span>
  )
}

/**
 * Nuance de provenance sectorielle (`segment` / `macro`) et niveau de preuve
 * d'un enjeu compte (`observed` / `inferred` / `weak`). Deux informations
 * ORTHOGONALES à `SourceBadge`, volontairement rendues plus discrètes.
 */
export function EvidenceHint({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-white/35">
      {children}
    </span>
  )
}

export const EVIDENCE_LEVEL_LABELS: Record<string, string> = {
  observed: "observé",
  inferred: "inféré",
  weak: "signal faible",
}

export const RESOLVED_LEVEL_LABELS: Record<string, string> = {
  segment: "segment",
  macro: "hérité du macro",
}

/** Bloc de paramètre : titre, statut obligatoire/facultatif, contenu. */
export function SituationBlock({
  step,
  label,
  requirement,
  hint,
  action,
  children,
}: {
  step: number
  label: string
  requirement: "required" | "optional"
  hint?: string | null
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-brass">
          <span
            aria-hidden="true"
            className="inline-flex size-4 items-center justify-center rounded border border-brand-brass/25 bg-brand-brass/10 font-mono text-[9px] text-brand-brass"
          >
            {step}
          </span>
          {label}
          <span
            className={cn(
              "font-medium normal-case tracking-normal",
              requirement === "required" ? "text-white/45" : "text-white/30",
            )}
          >
            {requirement === "required" ? "· requis" : "· facultatif"}
          </span>
        </h4>
        {action}
      </header>
      {hint ? <p className="text-[11px] leading-relaxed text-white/45">{hint}</p> : null}
      {children}
    </section>
  )
}

/**
 * Carte sélectionnable. Un clic sélectionne ; un second clic sur une option
 * facultative la désélectionne (`isClearable`) — le retour arrière ne doit
 * jamais imposer de recharger la vue.
 */
export function OptionCard({
  isSelected,
  onSelect,
  title,
  detail,
  badges,
  footer,
  isMobile,
}: {
  isSelected: boolean
  onSelect: () => void
  title: string
  detail?: string | null
  badges?: ReactNode
  footer?: ReactNode
  isMobile: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "w-full rounded-lg border px-3 text-left outline-none transition-colors motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-brand-brass",
        isMobile ? "min-h-11 py-2.5" : "py-2",
        isSelected
          ? "border-brand-brass/60 bg-brand-brass/[0.08]"
          : "border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-xs font-semibold leading-snug",
            isSelected ? "text-white" : "text-white/85",
          )}
        >
          {title}
        </span>
        {badges ? <span className="flex shrink-0 items-center gap-1 pt-px">{badges}</span> : null}
      </span>
      {detail ? (
        <span className="mt-1 block text-[11px] leading-relaxed text-white/50">{detail}</span>
      ) : null}
      {footer}
    </button>
  )
}

/** Liste d'options en colonne unique (Mobile) ou en deux colonnes (Desktop). */
export function OptionGrid({ isMobile, children }: { isMobile: boolean; children: ReactNode }) {
  return (
    <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>{children}</div>
  )
}

/**
 * Absence de matière — jamais un état d'erreur, jamais un contenu de
 * remplacement. `tone: "blocking"` quand la dimension est obligatoire : c'est
 * alors la génération elle-même qui est impossible.
 */
export function NoOptionState({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "blocking"
}) {
  return (
    <p
      className={cn(
        "rounded-lg border border-dashed px-3 py-2.5 text-[11px] leading-relaxed",
        tone === "blocking"
          ? "border-rose-500/25 bg-rose-950/20 text-rose-200/80"
          : "border-white/10 bg-white/[0.02] text-white/45",
      )}
    >
      {children}
    </p>
  )
}
