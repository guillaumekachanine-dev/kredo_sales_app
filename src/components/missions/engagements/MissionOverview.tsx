import type { ReactNode } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { formatDateFr, formatEuro } from "@/lib/formatters"
import type { EngagementMissionDetail } from "@/app/(app)/missions/_data/get-engagement-mission-detail"
import {
  BadgeCheckIcon,
  BadgeEuroIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  FileTextIcon,
  MapPinIcon,
  WrenchIcon,
} from "./engagement-icons"

const MISSION_STATUS: Record<string, { label: string; variant: StatusPillVariant }> = {
  active: { label: "En cours", variant: "success" },
  paused: { label: "Suspendue", variant: "neutral" },
  ended: { label: "Terminée", variant: "neutral" },
  cancelled: { label: "Annulée", variant: "danger" },
}

function formatPeriod(start: string | null, end: string | null): string {
  if (start && end) return `Du ${formatDateFr(start)} au ${formatDateFr(end)}`
  if (start) return `Depuis le ${formatDateFr(start)} · mission ouverte`
  if (end) return `Jusqu’au ${formatDateFr(end)}`
  return "—"
}

function Field({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 py-4">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-primary">
        <span className="size-4">{icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
        <div className="mt-1 text-sm leading-6 text-body">{children}</div>
      </div>
    </div>
  )
}

export function MissionOverview({ detail }: { detail: EngagementMissionDetail | null }) {
  if (!detail) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center">
        <div>
          <span className="mx-auto block size-6 text-muted">
            <BriefcaseIcon />
          </span>
          <h2 className="mt-3 text-sm font-bold text-heading">Sélectionnez une mission</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
            Le détail de la mission et sa fiche s’afficheront dans cet espace.
          </p>
        </div>
      </div>
    )
  }

  const { mission, company, requiredSkills } = detail
  const status = MISSION_STATUS[mission.status] ?? { label: mission.status, variant: "neutral" as const }
  const clientName = company?.name ?? "Compte non renseigné"

  return (
    <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[820px] px-8 py-7">
        {/* ── 9.1 Header ─────────────────────────────────────────────── */}
        <header className="border-b border-border pb-6">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Mission AT</p>
              <h1 className="mt-2 font-heading text-2xl font-bold leading-8 tracking-tight text-heading">
                {mission.title}
              </h1>
            </div>
            <StatusPill label={status.label} variant={status.variant} className="mt-1 shrink-0" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <CompanyLogo
              name={clientName}
              logoPath={company?.logoPath ?? null}
              website={company?.website ?? null}
              size="sm"
              denseList
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">{clientName}</p>
              {company?.segment || company?.sector ? (
                <p className="truncate text-xs text-muted">{company.segment ?? company.sector}</p>
              ) : null}
            </div>
            {mission.externalRef ? (
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">{mission.externalRef}</span>
            ) : null}
          </div>
        </header>

        {/* ── Contexte de la mission (pleine largeur) ────────────────── */}
        <section className="border-b border-border py-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="size-4">
              <FileTextIcon />
            </span>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              Contexte de la mission
            </h2>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-body">
            {mission.description?.trim() || "Aucun contexte renseigné pour cette mission."}
          </p>
        </section>

        {/* ── Poste · Séniorité · Lieu · Période · TJM ───────────────── */}
        <div className="divide-y divide-border">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <Field icon={<BriefcaseIcon />} label="Poste / rôle demandé">
              {mission.roleTitle || mission.practice || "—"}
            </Field>
            <Field icon={<BadgeCheckIcon />} label="Séniorité requise">
              {mission.seniority || "—"}
            </Field>
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <Field icon={<MapPinIcon />} label="Lieu de delivery">
              {mission.deliveryLocation || "—"}
            </Field>
            <Field icon={<BadgeEuroIcon />} label="TJM">
              <span className="font-mono font-semibold text-heading">{formatEuro(mission.tjm)}</span>
              <span className="ml-1.5 text-xs text-muted">/ jour</span>
            </Field>
          </div>
          <Field icon={<CalendarRangeIcon />} label="Période">
            {formatPeriod(mission.startDate, mission.endDate)}
          </Field>
        </div>

        {/* ── Compétences requises ──────────────────────────────────── */}
        <section className="border-t border-border py-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="size-4">
              <WrenchIcon />
            </span>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              Compétences requises
            </h2>
          </div>
          {requiredSkills.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {requiredSkills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-[var(--radius-small)] border border-primary/20 bg-primary/[0.05] px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Compétences non renseignées.</p>
          )}
        </section>
      </div>
    </div>
  )
}
