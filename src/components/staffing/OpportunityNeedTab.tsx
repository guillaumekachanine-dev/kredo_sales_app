"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/Badge"
import {
  OPPORTUNITY_ACTIVE_STAGES,
  getOpportunityPipelineIndex,
} from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"
import type { AssistanceCaseOpportunity } from "@/types/assistance-case"
import type { Json } from "@/types/database"

interface OpportunityNeedTabProps {
  opportunity: AssistanceCaseOpportunity
}

const IMPORTANCE_LABELS: Record<string, string> = {
  indispensable: "Indispensable",
  souhaitee: "Souhaitée",
  bonus: "Bonus",
}

const IMPORTANCE_VARIANTS = {
  indispensable: "danger",
  souhaitee: "brand",
  bonus: "neutral",
} as const

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(value: number | null) {
  if (value === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getContextText(context: Json) {
  if (typeof context === "string") return context
  if (!context || typeof context !== "object" || Array.isArray(context)) return null

  const record = context as Record<string, unknown>
  const keys = ["summary", "description", "business_context", "mission", "objectives"]
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function DataItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="mt-1 text-xs font-semibold leading-snug text-heading">{value}</div>
    </div>
  )
}

function OpportunityNeedTimeline({ stage }: { stage: string }) {
  const currentIndex = getOpportunityPipelineIndex(stage)

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-case-need-muted)]">
        Progression du besoin
      </p>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-[34rem] items-start px-1">
          {OPPORTUNITY_ACTIVE_STAGES.map((step, index) => {
            const isCurrent = index === currentIndex
            const isCompleted = index < currentIndex
            const isLast = index === OPPORTUNITY_ACTIVE_STAGES.length - 1

            return (
              <div key={step.value} className="relative flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-surface text-[10px] font-bold transition-colors",
                      isCurrent && "ring-2 ring-offset-2",
                    )}
                    style={{
                      borderColor: "var(--color-case-need)",
                      background: isCompleted || isCurrent
                        ? "var(--color-case-need)"
                        : "var(--color-surface)",
                      color: isCompleted || isCurrent
                        ? "var(--color-case-need-fg)"
                        : "var(--color-case-need)",
                      ...(isCurrent
                        ? {
                            "--tw-ring-color": "color-mix(in srgb, var(--color-case-need) 34%, white)",
                            "--tw-ring-offset-color": "var(--color-surface)",
                          }
                        : {}),
                    }}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>

                  {!isLast ? (
                    <div
                      className="mx-2 h-1 flex-1 rounded-full"
                      style={{
                        background: index < currentIndex
                          ? "linear-gradient(90deg, var(--color-case-need) 0%, #ffd45a 100%)"
                          : "var(--color-border)",
                      }}
                    />
                  ) : null}
                </div>

                <div className="mt-2 w-full px-1 text-center">
                  <p
                    className="text-[11px] font-semibold leading-tight"
                    style={{
                      color: isCompleted || isCurrent
                        ? "var(--color-heading)"
                        : "var(--color-muted)",
                    }}
                  >
                    {step.label}
                  </p>
                  <p
                    className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      color: isCurrent
                        ? "var(--color-case-need)"
                        : isCompleted
                          ? "var(--color-case-need-muted)"
                          : "var(--color-muted)",
                    }}
                  >
                    {isCurrent ? "En cours" : isCompleted ? "Validé" : "À venir"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function OpportunityNeedTab({ opportunity }: OpportunityNeedTabProps) {
  const activeStatuses = new Set([
    "preselectionne",
    "propose_interne",
    "envoye_client",
    "entretien_planifie",
    "entretien_realise",
    "retenu",
  ])
  const engagedProfiles = opportunity.opportunity_candidates.filter((positioning) =>
    activeStatuses.has(positioning.status),
  ).length
  const retainedProfiles = opportunity.opportunity_candidates.filter(
    (positioning) => positioning.status === "retenu",
  ).length
  const contextText = opportunity.need_summary ?? getContextText(opportunity.context)

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-large)] border border-border bg-surface p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
              Décision attendue
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-heading">
              {opportunity.next_action_label ?? "Qualifier la prochaine action sur le besoin"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {opportunity.next_action_at
                ? `Échéance ${formatDate(opportunity.next_action_at)}`
                : "Aucune échéance renseignée"}
            </p>
          </div>
          <Link
            href={`/missions/opps/${opportunity.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-case-need-border)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-case-need-fg)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-surface)]"
            style={{
              background: "color-mix(in srgb, var(--color-case-need) 18%, white)",
            }}
          >
            Ouvrir l&apos;opportunité
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
            </svg>
          </Link>
        </div>

        <OpportunityNeedTimeline stage={opportunity.stage} />

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Postes</p>
            <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
              {opportunity.required_headcount}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Engagés</p>
            <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
              {engagedProfiles}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Retenus</p>
            <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
              {retainedProfiles}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Cadre du besoin
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <DataItem label="Practice" value={opportunity.practice ?? "—"} />
          <DataItem label="Séniorité" value={opportunity.seniority ?? "—"} />
          <DataItem label="Localisation" value={opportunity.location ?? "—"} />
          <DataItem label="Télétravail" value={opportunity.remote_policy ?? "—"} />
          <DataItem label="Démarrage" value={formatDate(opportunity.start_date)} />
          <DataItem
            label="Durée"
            value={opportunity.duration_days ? `${opportunity.duration_days} jours` : "—"}
          />
          <DataItem
            label="TJM cible"
            value={
              opportunity.target_daily_rate
                ? `${Math.round(opportunity.target_daily_rate)} € / j`
                : "—"
            }
          />
          <DataItem
            label="Marge cible"
            value={
              opportunity.target_margin_pct !== null
                ? `${opportunity.target_margin_pct} %`
                : "—"
            }
          />
          <DataItem label="Valeur estimée" value={formatCurrency(opportunity.acv ?? opportunity.estimated_gain)} />
        </div>
      </section>

      <section className="rounded-[var(--radius-large)] border border-border bg-surface p-3.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Contexte et mission
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-body">
          {contextText ?? "Le contexte détaillé du besoin reste à compléter."}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Compétences recherchées
          </h3>
          <span className="text-[10px] font-semibold text-muted">
            {opportunity.opportunity_skills.length} critères
          </span>
        </div>

        {opportunity.opportunity_skills.length > 0 ? (
          <div className="space-y-2">
            {opportunity.opportunity_skills
              .slice()
              .sort((left, right) => right.weight - left.weight)
              .map((requirement) => (
                <div
                  key={requirement.id}
                  className="flex items-start justify-between gap-3 rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-heading">{requirement.skill.name}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted">
                      {[
                        requirement.min_level ? `Niveau ${requirement.min_level}/5` : null,
                        requirement.min_years !== null
                          ? `${requirement.min_years} an${requirement.min_years > 1 ? "s" : ""} min.`
                          : null,
                        requirement.comment,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Critère non détaillé"}
                    </p>
                  </div>
                  <Badge
                    variant={IMPORTANCE_VARIANTS[requirement.importance]}
                    size="sm"
                  >
                    {IMPORTANCE_LABELS[requirement.importance]}
                  </Badge>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-large)] border border-dashed border-border py-8 text-center text-xs text-muted">
            Aucune compétence requise n&apos;est encore structurée.
          </div>
        )}
      </section>
    </div>
  )
}
