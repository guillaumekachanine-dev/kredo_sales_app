import type { ReactNode } from "react"
import Image from "next/image"
import { Select } from "@/components/ui/Select"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { formatDate, formatEuro } from "@/lib/formatters"
import type { OpportunityStandingProfile } from "@/types/database-domain"

interface OpportunityStandingPanelProps {
  profiles: OpportunityStandingProfile[]
  className?: string
  headerActions?: ReactNode
  practice: string
  requiresStaffing: boolean
  isEditing: boolean
  isPending: boolean
  onStartEdit: () => void
  onCancel: () => void
  onSave: () => void
  onPracticeChange: (value: string) => void
  onRequiresStaffingChange: (value: boolean) => void
}

const STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  preselectionne: "Présélectionné",
  propose_interne: "Proposé interne",
  envoye_client: "Envoyé client",
  entretien_planifie: "Entretien planifié",
  entretien_realise: "Entretien réalisé",
  retenu: "Retenu",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

function normalizeLabel(value: string | null) {
  if (!value) return "—"
  return value.replace(/_/g, " ")
}

function getStatusLabel(value: string) {
  return STATUS_LABELS[value] || normalizeLabel(value)
}

function PanelTitle({ title, iconSrc }: { title: string; iconSrc?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-1 select-none">
      {iconSrc && (
        <Image src={iconSrc} alt="" width={28} height={28} className="object-contain shrink-0" />
      )}
      <div className="flex flex-col">
        <h2 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {title}
        </h2>
        <div className="w-8 h-0.5 mt-1.5 rounded-full bg-primary" />
      </div>
    </div>
  )
}

const PRACTICE_OPTIONS = [
  "Data",
  "Cloud",
  "Cybersecurity",
  "Digital",
  "Infrastructure",
  "Workplace",
  "SAP",
  "Project Management",
  "Architecture",
  "AI",
]

function StandingProfileList({
  profiles,
  emptyLabel,
}: {
  profiles: OpportunityStandingProfile[]
  emptyLabel: string
}) {
  if (profiles.length === 0) {
    return <p className="text-xs text-muted italic py-2">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="rounded border border-border/50 bg-canvas/30 p-2.5 flex flex-col gap-1.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-heading truncate">{profile.full_name}</p>
              <p className="text-[10px] text-muted capitalize">
                {[profile.seniority, profile.availability].filter(Boolean).map(normalizeLabel).join(" · ") || "Profil candidat"}
              </p>
            </div>
            {profile.internal_score !== null && (
              <span className="shrink-0 rounded border border-success/20 bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                {Math.round(Number(profile.internal_score))}%
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-muted">
              {getStatusLabel(profile.opportunity_status)}
            </span>
            {profile.expected_daily_rate !== null && (
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                {formatEuro(profile.expected_daily_rate)}
              </span>
            )}
            {profile.proposed_at && (
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                Proposé le {formatDate(profile.proposed_at)}
              </span>
            )}
          </div>

          {(profile.summary || profile.comment || profile.next_action) && (
            <p className="text-[10px] leading-relaxed text-body line-clamp-2">
              {profile.comment || profile.next_action || profile.summary}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export function OpportunityStandingPanel({
  profiles,
  className,
  headerActions,
  practice,
  requiresStaffing,
  isEditing,
  isPending,
  onStartEdit,
  onCancel,
  onSave,
  onPracticeChange,
  onRequiresStaffingChange,
}: OpportunityStandingPanelProps) {
  const selectedProfiles = profiles.filter((profile) => profile.origin === "pressenti")
  const aiProfiles = profiles.filter((profile) => profile.origin === "ia")

  return (
    <SurfaceCard className={cn("border-y-0 border-r-0 border-l-4 border-primary p-5 md:p-6 shadow-sm flex flex-col gap-4 bg-gradient-to-r from-primary/[0.03] to-transparent", className)}>
      <div className="flex items-start justify-between gap-4">
        <PanelTitle title="Staffing" iconSrc="/icons_set/recrutement.png" />
        <div className="flex items-center gap-2 shrink-0">
          {headerActions}
          {isEditing ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-canvas border border-border text-muted hover:text-heading transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isPending}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-success text-success-fg hover:bg-success/90 transition-colors disabled:opacity-40"
              >
                {isPending ? "…" : "Enregistrer"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className="p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
              title="Modifier cette section"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/40 bg-canvas/20 p-3 flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Practice</span>
        {isEditing ? (
          <Select
            value={practice}
            onChange={(e) => onPracticeChange(e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"
            disabled={isPending}
          >
            <option value="">— Sélectionner —</option>
            {PRACTICE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-xs font-semibold text-heading">{practice || "—"}</p>
        )}

        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted mt-2">Pilotage staffing</span>
        {isEditing ? (
          <label className="inline-flex items-center gap-2 text-xs font-medium text-heading mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresStaffing}
              onChange={(e) => onRequiresStaffingChange(e.target.checked)}
              disabled={isPending}
            />
            Besoin à staffer
          </label>
        ) : (
          <p className="text-xs font-semibold text-heading mt-1">
            {requiresStaffing ? "Oui (besoin à staffer)" : "Non"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-heading">
              Profils pressentis
            </h3>
            <span className="text-[10px] font-semibold text-muted">{selectedProfiles.length}</span>
          </div>
          <StandingProfileList
            profiles={selectedProfiles}
            emptyLabel="Aucun profil pressenti."
          />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-heading">
              Propositions IA
            </h3>
            <span className="text-[10px] font-semibold text-muted">{aiProfiles.length}</span>
          </div>
          <StandingProfileList
            profiles={aiProfiles}
            emptyLabel="Aucune proposition IA."
          />
        </section>
      </div>
    </SurfaceCard>
  )
}
