import type { ReactNode } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro } from "@/lib/formatters"
import type { EngagementMissionDetail } from "@/app/(app)/missions/_data/get-engagement-mission-detail"
import {
  BadgeCheckIcon,
  BadgeEuroIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  FileTextIcon,
  WrenchIcon,
} from "./engagement-icons"

function parseDateParts(dateStr: string | null): { day: string; month: string; year: string } | null {
  if (!dateStr) return null
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return { year: match[1], month: match[2], day: match[3] }
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear())
  return { day, month, year }
}

export function formatPeriod(start: string | null, end: string | null): string {
  const startParts = parseDateParts(start)
  const endParts = parseDateParts(end)

  if (startParts && endParts) {
    return `${startParts.day}/${startParts.month} - ${endParts.day}/${endParts.month}/${endParts.year}`
  }
  if (startParts) {
    return `${startParts.day}/${startParts.month}/${startParts.year} - En cours`
  }
  if (endParts) {
    return `Jusqu’au ${endParts.day}/${endParts.month}/${endParts.year}`
  }
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
    <div className="flex gap-3 py-3">
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
  const clientName = company?.name ?? "Compte non renseigné"
  const marketSegment = company?.segment ?? company?.sector ?? null

  return (
    <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[820px] px-8 py-7">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="border-b border-border pb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Mission AT</p>
              <h1 className="mt-2 font-heading text-2xl font-bold leading-8 tracking-tight text-heading">
                {mission.title}
              </h1>
              <p className="mt-2 text-sm text-body">
                <strong className="font-bold text-heading">{clientName}</strong>
                {marketSegment ? ` - ${marketSegment}` : ""}
              </p>
            </div>
            <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-border bg-surface p-2 shadow-2xs">
              <CompanyLogo
                name={clientName}
                logoPath={company?.logoPath ?? null}
                website={company?.website ?? null}
                size="2xl"
                fill
                className="border-0 bg-transparent"
              />
            </div>
          </div>
        </header>

        {/* ── Contexte de la mission (cadre au fond légèrement contrasté) ── */}
        <section className="my-6 rounded-[var(--radius-medium)] border border-border bg-surface p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-primary">
            <span className="size-4">
              <FileTextIcon />
            </span>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              Contexte de la mission
            </h2>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body">
            {mission.description?.trim() || "Aucun contexte renseigné pour cette mission."}
          </p>
        </section>

        {/* ── Poste · Séniorité · TJM · Période ───────────────────────── */}
        <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Field icon={<BriefcaseIcon />} label="Poste / rôle demandé">
            {mission.roleTitle || mission.practice || "—"}
          </Field>
          <Field icon={<BadgeCheckIcon />} label="Séniorité requise">
            {mission.seniority || "—"}
          </Field>
          <Field icon={<BadgeEuroIcon />} label="TJM">
            <span className="font-mono font-semibold text-heading">{formatEuro(mission.tjm)}</span>
            <span className="ml-1.5 text-xs text-muted">/ jour</span>
          </Field>
          <Field icon={<CalendarRangeIcon />} label="Période">
            {formatPeriod(mission.startDate, mission.endDate)}
          </Field>
        </div>

        {/* ── Compétences requises ──────────────────────────────────── */}
        <section className="pt-6">
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
