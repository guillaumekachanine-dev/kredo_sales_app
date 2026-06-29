"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import { getOpportunityStageLabel } from "@/lib/opportunities/stages"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type {
  AssistanceCaseEvent,
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
  AssistanceCaseSkillRequirement,
} from "@/types/assistance-case"

interface OpportunityCaseTabProps {
  opportunity: AssistanceCaseOpportunity
  events?: AssistanceCaseEvent[]
  device: DashboardDevice
  onSelectPositioning: (positioning: AssistanceCasePositioning) => void
}

const POSITIONING_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien planifié",
  entretien_realise: "Entretien réalisé",
  retenu: "Retenu",
  gagne: "Gagné",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

const HIRING_STEP_LABELS: Record<string, string> = {
  prequalification: "Préqualification",
  entretien_manager: "Entretien manager",
  tests_techniques: "Tests techniques",
  proposition: "Proposition",
  signature: "Signature",
  integration: "Intégration",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "—"
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €${suffix}`
}

function fullName(positioning: AssistanceCasePositioning) {
  const person = positioning.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Candidat"
  )
}

function getContextText(opportunity: AssistanceCaseOpportunity) {
  if (opportunity.need_summary?.trim()) return opportunity.need_summary.trim()
  if (typeof opportunity.context === "string") return opportunity.context
  if (!opportunity.context || Array.isArray(opportunity.context)) return null

  const context = opportunity.context as Record<string, unknown>
  for (const key of ["summary", "description", "business_context", "details", "notes"]) {
    const value = context[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function positioningVariant(status: string) {
  if (["retenu", "gagne"].includes(status)) return "success" as const
  if (["refuse_client", "refuse_candidat"].includes(status)) return "danger" as const
  if (["abandonne"].includes(status)) return "neutral" as const
  return "warning" as const
}

function hiringVariant(status: string) {
  if (status === "hired") return "success" as const
  if (status === "rejected") return "danger" as const
  if (["withdrawn", "cancelled"].includes(status)) return "neutral" as const
  return "warning" as const
}

function getHiringProcess(positioning: AssistanceCasePositioning) {
  const processes = positioning.candidate_hiring_processes ?? []
  return (
    processes.find((process) => process.status === "active") ??
    [...processes].sort(
      (left, right) =>
        new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
    )[0] ??
    null
  )
}

function computeMatch(
  requirements: AssistanceCaseSkillRequirement[],
  positioning: AssistanceCasePositioning,
) {
  if (requirements.length === 0) return null
  const candidateSkills = new Map(
    (positioning.candidate.person?.person_skills ?? []).map((item) => [
      item.skill.id,
      item,
    ]),
  )

  const totalWeight = requirements.reduce(
    (sum, requirement) => sum + Math.max(1, requirement.weight || 1),
    0,
  )
  const earned = requirements.reduce((sum, requirement) => {
    const candidateSkill = candidateSkills.get(requirement.skill.id)
    if (!candidateSkill) return sum
    const levelOk =
      requirement.min_level === null ||
      (candidateSkill.level ?? 0) >= requirement.min_level
    const yearsOk =
      requirement.min_years === null ||
      (candidateSkill.years ?? 0) >= requirement.min_years
    const ratio = levelOk && yearsOk ? 1 : 0.55
    return sum + Math.max(1, requirement.weight || 1) * ratio
  }, 0)

  return Math.round((earned / totalWeight) * 100)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
      {children}
    </h4>
  )
}

function DataPoint({
  label,
  value,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] text-muted">{label}</span>
      <span
        className={`mt-0.5 block text-xs font-semibold leading-relaxed ${
          accent ? "text-primary" : "text-heading"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function RequirementPill({ requirement }: { requirement: AssistanceCaseSkillRequirement }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] border border-border bg-canvas px-2 py-1 text-[10px] font-semibold text-body">
      <span>{requirement.skill.name}</span>
      {requirement.min_level !== null && (
        <span className="text-muted">Niv. {requirement.min_level}</span>
      )}
      {requirement.importance === "obligatoire" && (
        <span className="text-danger">Requis</span>
      )}
    </span>
  )
}

function OpportunityIdentity({ opportunity }: { opportunity: AssistanceCaseOpportunity }) {
  return (
    <div className="flex items-center gap-3">
      <CompanyLogo
        name={opportunity.company?.name ?? "Client"}
        logoPath={
          opportunity.company?.metadata &&
          typeof opportunity.company.metadata === "object" &&
          !Array.isArray(opportunity.company.metadata) &&
          typeof (opportunity.company.metadata as Record<string, unknown>).logo_path === "string"
            ? ((opportunity.company.metadata as Record<string, unknown>).logo_path as string)
            : null
        }
        website={opportunity.company?.website}
        size="md"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-heading">{opportunity.title}</p>
        <p className="truncate text-xs text-muted">
          {opportunity.company?.name ?? "Compte non renseigné"}
        </p>
      </div>
    </div>
  )
}

function DesktopOpportunityNeed({ opportunity }: { opportunity: AssistanceCaseOpportunity }) {
  const contextText = getContextText(opportunity)

  return (
    <div className="space-y-4">
      <SurfaceCard className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <OpportunityIdentity opportunity={opportunity} />
          <StatusPill
            label={getOpportunityStageLabel(opportunity.stage)}
            variant="brand"
            dot
          />
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
          <DataPoint label="Priorité" value={opportunity.priority || "—"} />
          <DataPoint label="Conviction" value={`${opportunity.conviction}%`} accent />
          <DataPoint
            label="Profils requis"
            value={String(opportunity.required_headcount || 1)}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-4">
        <SectionTitle>Besoin client</SectionTitle>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-body">
          {contextText || "Le besoin détaillé n’est pas encore renseigné."}
        </p>
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
          <DataPoint label="Practice" value={opportunity.practice || "—"} />
          <DataPoint label="Séniorité" value={opportunity.seniority || "—"} />
          <DataPoint label="Localisation" value={opportunity.location || "—"} />
          <DataPoint label="Télétravail" value={opportunity.remote_policy || "—"} />
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-4">
        <SectionTitle>Compétences attendues</SectionTitle>
        {opportunity.opportunity_skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {[...opportunity.opportunity_skills]
              .sort((left, right) => right.weight - left.weight)
              .map((requirement) => (
                <RequirementPill key={requirement.id} requirement={requirement} />
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted">Aucune compétence structurée.</p>
        )}
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-4">
        <SectionTitle>Cadre économique et calendrier</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <DataPoint
            label="TJM cible"
            value={formatCurrency(opportunity.target_daily_rate, "/j")}
            accent
          />
          <DataPoint
            label="Marge cible"
            value={
              opportunity.target_margin_pct !== null
                ? `${opportunity.target_margin_pct}%`
                : "—"
            }
          />
          <DataPoint label="ACV" value={formatCurrency(opportunity.acv)} />
          <DataPoint label="Démarrage" value={formatDate(opportunity.start_date)} />
          <DataPoint
            label="Clôture cible"
            value={formatDate(opportunity.target_close_date)}
          />
          <DataPoint
            label="Durée"
            value={
              opportunity.duration_days !== null
                ? `${opportunity.duration_days} jours`
                : "—"
            }
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 border-l-4 border-l-primary p-4">
        <SectionTitle>Décision et prochaine action</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <DataPoint
            label="Action"
            value={opportunity.next_action_label || "À définir"}
            accent
          />
          <DataPoint
            label="Échéance"
            value={formatDate(opportunity.next_action_at)}
          />
        </div>
      </SurfaceCard>
    </div>
  )
}

function MobileOpportunityNeed({ opportunity }: { opportunity: AssistanceCaseOpportunity }) {
  const contextText = getContextText(opportunity)

  return (
    <div className="space-y-3">
      <SurfaceCard className="space-y-3 p-4">
        <OpportunityIdentity opportunity={opportunity} />
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <StatusPill label={getOpportunityStageLabel(opportunity.stage)} variant="brand" dot />
          <span className="font-heading text-2xl font-bold text-primary">
            {opportunity.conviction}%
          </span>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-2 p-4">
        <SectionTitle>Décision immédiate</SectionTitle>
        <p className="text-sm font-bold text-heading">
          {opportunity.next_action_label || "Définir la prochaine action"}
        </p>
        <p className="text-xs text-muted">
          Échéance : {formatDate(opportunity.next_action_at)}
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-4">
        <SectionTitle>Besoin synthétique</SectionTitle>
        <p className="line-clamp-5 text-xs leading-relaxed text-body">
          {contextText || "Besoin non renseigné."}
        </p>
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
          <DataPoint label="Démarrage" value={formatDate(opportunity.start_date)} />
          <DataPoint
            label="TJM cible"
            value={formatCurrency(opportunity.target_daily_rate, "/j")}
            accent
          />
          <DataPoint label="Séniorité" value={opportunity.seniority || "—"} />
          <DataPoint label="Localisation" value={opportunity.location || "—"} />
        </div>
      </SurfaceCard>

      {opportunity.opportunity_skills.length > 0 && (
        <SurfaceCard className="space-y-3 p-4">
          <SectionTitle>Compétences prioritaires</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {[...opportunity.opportunity_skills]
              .sort((left, right) => right.weight - left.weight)
              .slice(0, 6)
              .map((requirement) => (
                <RequirementPill key={requirement.id} requirement={requirement} />
              ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}

export function OpportunityCaseNeedTab({
  opportunity,
  device,
}: OpportunityCaseTabProps) {
  return device === "mobile" ? (
    <MobileOpportunityNeed opportunity={opportunity} />
  ) : (
    <DesktopOpportunityNeed opportunity={opportunity} />
  )
}

function CoverageCard({ opportunity }: { opportunity: AssistanceCaseOpportunity }) {
  const retained = opportunity.opportunity_candidates.filter((item) =>
    ["retenu", "gagne"].includes(item.status),
  ).length
  const required = Math.max(1, opportunity.required_headcount || 1)
  const coverage = Math.min(100, Math.round((retained / required) * 100))

  return (
    <SurfaceCard className="space-y-3 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionTitle>Couverture du besoin</SectionTitle>
          <p className="mt-1 font-heading text-2xl font-bold text-heading">
            {retained} / {required}
          </p>
        </div>
        <span className="text-xs font-bold text-primary">{coverage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${coverage}%` }}
        />
      </div>
      <p className="text-[10px] text-muted">
        {opportunity.opportunity_candidates.length} profil(s) positionné(s) au total.
      </p>
    </SurfaceCard>
  )
}

function DesktopStaffingList({
  opportunity,
  onSelectPositioning,
}: Pick<OpportunityCaseTabProps, "opportunity" | "onSelectPositioning">) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="grid grid-cols-[1.4fr_0.8fr_0.75fr_0.65fr] gap-3 border-b border-border bg-canvas px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-muted">
        <span>Profil</span>
        <span>Étape</span>
        <span>Adéquation</span>
        <span>Disponibilité</span>
      </div>
      {opportunity.opportunity_candidates.map((positioning) => {
        const match = computeMatch(opportunity.opportunity_skills, positioning)
        return (
          <button
            key={positioning.id}
            type="button"
            onClick={() => onSelectPositioning(positioning)}
            className="grid min-h-16 w-full grid-cols-[1.4fr_0.8fr_0.75fr_0.65fr] items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-primary/[0.04]"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-heading">
                {fullName(positioning)}
              </span>
              <span className="block truncate text-[10px] text-muted">
                {positioning.candidate.current_title || "Profil non renseigné"}
              </span>
            </span>
            <StatusPill
              label={POSITIONING_LABELS[positioning.status] ?? positioning.status}
              variant={positioningVariant(positioning.status)}
              dot
            />
            <span className="text-xs font-bold text-heading">
              {match === null ? "—" : `${match}%`}
            </span>
            <span className="text-[10px] text-body">
              {positioning.candidate.available_from
                ? formatDate(positioning.candidate.available_from)
                : positioning.candidate.availability_notes ||
                  positioning.candidate.availability ||
                  "—"}
            </span>
          </button>
        )
      })}
    </SurfaceCard>
  )
}

function MobileStaffingList({
  opportunity,
  onSelectPositioning,
}: Pick<OpportunityCaseTabProps, "opportunity" | "onSelectPositioning">) {
  return (
    <div className="space-y-3">
      {opportunity.opportunity_candidates.map((positioning) => {
        const match = computeMatch(opportunity.opportunity_skills, positioning)
        return (
          <button
            key={positioning.id}
            type="button"
            onClick={() => onSelectPositioning(positioning)}
            className="min-h-24 w-full rounded-[var(--radius-large)] border border-border bg-surface p-4 text-left transition-transform active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-heading">
                  {fullName(positioning)}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {positioning.candidate.current_title || "Profil non renseigné"}
                </p>
              </div>
              {match !== null && (
                <span className="font-heading text-xl font-bold text-primary">
                  {match}%
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <StatusPill
                label={POSITIONING_LABELS[positioning.status] ?? positioning.status}
                variant={positioningVariant(positioning.status)}
                dot
              />
              <span className="text-[10px] font-semibold text-primary">
                Ouvrir le dossier →
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function OpportunityCaseStaffingTab(props: OpportunityCaseTabProps) {
  const { opportunity, device } = props
  return (
    <div className="space-y-4">
      <CoverageCard opportunity={opportunity} />
      {opportunity.opportunity_candidates.length > 0 ? (
        device === "mobile" ? (
          <MobileStaffingList {...props} />
        ) : (
          <DesktopStaffingList {...props} />
        )
      ) : (
        <div className="flex min-h-36 items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border px-6 text-center text-xs text-muted">
          Aucun profil n’est encore positionné sur ce besoin.
        </div>
      )}
    </div>
  )
}

function RecruitmentPositioningCard({
  positioning,
  onSelect,
}: {
  positioning: AssistanceCasePositioning
  onSelect: () => void
}) {
  const process = getHiringProcess(positioning)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-[var(--radius-large)] border border-border bg-surface p-4 text-left transition-colors hover:bg-primary/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-heading">
            {fullName(positioning)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {positioning.candidate.current_title || "Profil non renseigné"}
          </p>
        </div>
        {process ? (
          <StatusPill
            label={process.status === "active" ? "En cours" : process.status}
            variant={hiringVariant(process.status)}
            dot={process.status === "active"}
          />
        ) : (
          <StatusPill label="Non lancé" variant="neutral" />
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
        <DataPoint
          label="Étape recrutement"
          value={
            process
              ? HIRING_STEP_LABELS[process.current_step] ?? process.current_step
              : "Aucune"
          }
          accent={Boolean(process?.status === "active")}
        />
        <DataPoint
          label="Démarrage du process"
          value={process ? formatDate(process.started_at) : "—"}
        />
      </div>
      {positioning.next_action && (
        <p className="mt-3 border-t border-border/60 pt-3 text-[10px] leading-relaxed text-body">
          <span className="font-bold text-muted">Prochaine action : </span>
          {positioning.next_action}
        </p>
      )}
    </button>
  )
}

export function OpportunityCaseRecruitmentTab({
  opportunity,
  onSelectPositioning,
}: OpportunityCaseTabProps) {
  const processesStarted = opportunity.opportunity_candidates.filter((positioning) =>
    Boolean(getHiringProcess(positioning)),
  ).length
  const activeProcesses = opportunity.opportunity_candidates.filter(
    (positioning) => getHiringProcess(positioning)?.status === "active",
  ).length

  return (
    <div className="space-y-4">
      <SurfaceCard className="grid grid-cols-2 gap-3 p-4">
        <DataPoint
          label="Processus lancés"
          value={`${processesStarted} / ${opportunity.opportunity_candidates.length}`}
          accent
        />
        <DataPoint label="Processus actifs" value={String(activeProcesses)} />
      </SurfaceCard>

      {opportunity.opportunity_candidates.length > 0 ? (
        <div className="space-y-3">
          {opportunity.opportunity_candidates.map((positioning) => (
            <RecruitmentPositioningCard
              key={positioning.id}
              positioning={positioning}
              onSelect={() => onSelectPositioning(positioning)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-36 items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border px-6 text-center text-xs text-muted">
          Aucun candidat n’est disponible pour démarrer un recrutement.
        </div>
      )}
    </div>
  )
}
