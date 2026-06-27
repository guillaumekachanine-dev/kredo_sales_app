"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { DashboardLabAccount, DataOrigin, DataTrustMeta } from "@/lib/prospection/dashboard-lab-data"
import type {
  DashboardLabConcept,
  DashboardLabInspection,
} from "./dashboard-lab-types"

const ORIGIN_LABELS: Record<DataOrigin, string> = {
  REAL_NATIVE: "Native",
  REAL_LEGACY: "Legacy",
  PROXY: "Proxy",
  FUTURE_DEMO: "Démo",
}

const ORIGIN_VARIANTS: Record<DataOrigin, "brand" | "warning" | "info" | "danger"> = {
  REAL_NATIVE: "brand",
  REAL_LEGACY: "warning",
  PROXY: "info",
  FUTURE_DEMO: "danger",
}

const CONCEPT_COPY: Record<DashboardLabConcept, { title: string; decision: string; rationale: string }> = {
  "command-center": {
    title: "Command Center",
    decision: "Où concentrer l'effort commercial cette semaine",
    rationale: "Trie une shortlist d'actions à arbitrer tout de suite.",
  },
  "account-intelligence": {
    title: "Account Intelligence",
    decision: "Quels comptes à fort potentiel restent sous-couverts",
    rationale: "Expose les écarts entre potentiel, reach et momentum.",
  },
  "sector-signal": {
    title: "Sector & Signal Intelligence",
    decision: "Quelles fenêtres sectorielles activer avant refroidissement",
    rationale: "Relie secteurs, playbooks et comptes exposés.",
  },
}

const COMPARISON_SCORES: Record<
  DashboardLabConcept,
  {
    decisionValue: number
    readability: number
    differentiation: number
    dataHonesty: number
    scalability: number
    complexity: number
  }
> = {
  "command-center": {
    decisionValue: 5,
    readability: 4,
    differentiation: 4,
    dataHonesty: 4,
    scalability: 4,
    complexity: 3,
  },
  "account-intelligence": {
    decisionValue: 5,
    readability: 4,
    differentiation: 5,
    dataHonesty: 5,
    scalability: 5,
    complexity: 4,
  },
  "sector-signal": {
    decisionValue: 4,
    readability: 4,
    differentiation: 5,
    dataHonesty: 4,
    scalability: 3,
    complexity: 4,
  },
}

export function getConceptCopy(concept: DashboardLabConcept) {
  return CONCEPT_COPY[concept]
}

export function ProvenanceBadge({
  origin,
  className,
}: {
  origin: DataOrigin
  className?: string
}) {
  return (
    <Badge variant={ORIGIN_VARIANTS[origin]} size="sm" className={className}>
      {ORIGIN_LABELS[origin]}
    </Badge>
  )
}

export function BlockFrame({
  title,
  subtitle,
  meta,
  onInspect,
  actions,
  children,
  className,
}: {
  title: string
  subtitle?: string
  meta: DataTrustMeta
  onInspect: (inspection: DashboardLabInspection) => void
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-[var(--radius-large)] border border-border bg-surface", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-heading">{title}</h2>
            <ProvenanceBadge origin={meta.primaryOrigin} />
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-body">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Inspecter ${title}`}
            onClick={() => onInspect({
              title,
              summary: subtitle ?? meta.formula,
              meta,
            })}
          >
            Inspecter
          </Button>
        </div>
      </header>
      {children}
    </section>
  )
}

export function MetricStrip({
  label,
  value,
  tone = "neutral",
  context,
}: {
  label: string
  value: string
  tone?: "neutral" | "success" | "warning" | "danger"
  context?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn(
        "font-heading text-2xl font-bold leading-none",
        tone === "neutral" && "text-heading",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-danger",
      )}>
        {value}
      </p>
      {context ? <p className="text-xs text-body">{context}</p> : null}
    </div>
  )
}

export function AccountIdentityLine({
  account,
  selected = false,
}: {
  account: DashboardLabAccount
  selected?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className={cn("truncate font-semibold", selected ? "text-heading" : "text-body")}>{account.name}</h3>
        {account.priority === "haute" ? <Badge variant="warning">Haute</Badge> : null}
      </div>
      <p className="truncate text-xs text-muted">
        {account.sector} · {account.lifecycle.replaceAll("_", " ")}
      </p>
    </div>
  )
}

export function LabEmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string
  body: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <SurfaceCard padding="spacious" className="border-dashed">
      <div className="space-y-3 text-center">
        <h3 className="font-heading text-lg font-bold text-heading">{title}</h3>
        <p className="mx-auto max-w-xl text-sm leading-6 text-body">{body}</p>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </SurfaceCard>
  )
}

export function ConfidencePanel({
  inspection,
}: {
  inspection: DashboardLabInspection | null
}) {
  if (!inspection) {
    return (
      <div className="space-y-2">
        <h3 className="font-heading text-base font-bold text-heading">Inspection</h3>
        <p className="text-sm leading-6 text-body">
          Sélectionne un bloc pour afficher sa provenance, sa formule et ses limites.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base font-bold text-heading">{inspection.title}</h3>
          <ProvenanceBadge origin={inspection.meta.primaryOrigin} />
        </div>
        <p className="text-sm leading-6 text-body">{inspection.summary}</p>
      </div>
      <dl className="space-y-3 text-sm text-body">
        <div>
          <dt className="font-semibold text-heading">Formule</dt>
          <dd className="mt-1 leading-6">{inspection.meta.formula}</dd>
        </div>
        <div>
          <dt className="font-semibold text-heading">Fraîcheur</dt>
          <dd className="mt-1">{inspection.meta.freshness.label}</dd>
        </div>
        <div>
          <dt className="font-semibold text-heading">Complétude</dt>
          <dd className="mt-1">{inspection.meta.completeness.label}</dd>
        </div>
        <div>
          <dt className="font-semibold text-heading">Limites</dt>
          <dd className="mt-1 space-y-1">
            {inspection.meta.limitations.map((limitation) => (
              <p key={limitation}>{limitation}</p>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function ComparisonPanel({
  activeConcept,
}: {
  activeConcept: DashboardLabConcept
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-base font-bold text-heading">Comparatif rapide</h3>
      <div className="space-y-3">
        {Object.entries(COMPARISON_SCORES).map(([concept, scores]) => {
          const typedConcept = concept as DashboardLabConcept
          const meta = getConceptCopy(typedConcept)
          const isActive = typedConcept === activeConcept

          return (
            <div
              key={concept}
              className={cn(
                "rounded-[var(--radius-medium)] border px-4 py-3",
                isActive ? "border-primary bg-primary/[0.04]" : "border-border bg-surface",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-heading">{meta.title}</p>
                  <p className="text-xs text-body">{meta.decision}</p>
                </div>
                {isActive ? <Badge variant="brand">Actif</Badge> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-body">
                <ScoreLine label="Valeur" value={scores.decisionValue} />
                <ScoreLine label="Lisibilité" value={scores.readability} />
                <ScoreLine label="Diff." value={scores.differentiation} />
                <ScoreLine label="Honnêteté" value={scores.dataHonesty} />
                <ScoreLine label="Évolutivité" value={scores.scalability} />
                <ScoreLine label="Complexité" value={scores.complexity} reverse />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreLine({
  label,
  value,
  reverse = false,
}: {
  label: string
  value: number
  reverse?: boolean
}) {
  const filled = reverse ? 6 - value : value
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="flex items-center gap-1" aria-label={`${label} ${value}/5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={`${label}-${index}`}
            className={cn(
              "h-1.5 w-4 rounded-full",
              index < filled ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </span>
    </div>
  )
}
