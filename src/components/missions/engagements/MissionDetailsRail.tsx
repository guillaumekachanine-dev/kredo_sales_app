import type { ReactNode } from "react"
import { formatEuro, formatPct } from "@/lib/formatters"
import type { MissionSummary } from "@/components/missions/mission-detail/mission-detail-types"
import {
  computeAnnualContractValueThroughYearEnd,
  computeEstimatedContractValue,
  computeTheoreticalMarginPct,
} from "@/components/missions/mission-detail/mission-detail-utils"
import type { EngagementMissionDetail } from "@/app/(app)/missions/_data/get-engagement-mission-detail"
import { ContactRoundIcon, UserRoundIcon, WalletCardsIcon } from "./engagement-icons"
import { ViewProfileButton } from "./ViewProfileButton"

// Rail droit — 3 sections continues (langage visuel de la fiche document /reports :
// aside border-l, divide-y, titres uppercase tracking).

const BILLING_CONDITION_LABELS: Record<string, string> = {
  "30j_net": "30 jours net",
  "45j_net": "45 jours net",
  "60j_net": "60 jours net",
  "30j_fin_de_mois": "30 jours fin de mois",
  "45j_fin_de_mois": "45 jours fin de mois",
  "60j_fin_de_mois": "60 jours fin de mois",
  paiement_a_reception: "Paiement à réception",
}

function billingLabel(raw: string | null): string | null {
  if (!raw) return null
  return BILLING_CONDITION_LABELS[raw] ?? raw.replace(/_/g, " ")
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function toMissionSummary(m: EngagementMissionDetail["mission"]): MissionSummary {
  return {
    id: m.id,
    title: m.title,
    status: m.status,
    start_date: m.startDate,
    end_date: m.endDate,
    role_title: m.roleTitle,
    practice: m.practice,
    seniority: m.seniority,
    tjm: m.tjm,
    cjm: m.cjm,
    gross_margin_pct: m.grossMarginPct,
    billing_condition: m.billingCondition,
    description: m.description,
    metadata: {},
    opportunity_id: null,
    collaborator_id: "",
    company_id: "",
    external_ref: m.externalRef,
  }
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-heading">
      <span className="size-3.5 text-primary">{icon}</span>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.08em]">{children}</h3>
    </div>
  )
}

function DataRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={
          strong
            ? "text-right font-mono text-xs font-semibold tabular-nums text-heading"
            : "text-right font-mono text-xs tabular-nums text-heading"
        }
      >
        {value}
      </span>
    </div>
  )
}

export function MissionDetailsRail({ detail }: { detail: EngagementMissionDetail }) {
  const { mission, collaborator, operationalContact } = detail

  const dailyMargin =
    mission.tjm > 0 && mission.cjm > 0 ? mission.tjm - mission.cjm : null
  const marginPct = mission.cjm > 0 ? computeTheoreticalMarginPct(toMissionSummary(mission)) : null

  const hasEnd = Boolean(mission.endDate)
  const missionSummary = toMissionSummary(mission)
  const contractValue = hasEnd
    ? computeEstimatedContractValue(missionSummary)
    : computeAnnualContractValueThroughYearEnd(missionSummary)
  const contractValueLabel = hasEnd ? "TCV" : "ACV"
  const contractValueHint = hasEnd ? "période contractuelle" : `jusqu’au 31/12/${new Date().getFullYear()}`

  const billing = billingLabel(mission.billingCondition)

  return (
    <aside
      className="engagements-scrollbar min-h-0 overflow-y-auto border-l border-border bg-surface"
      aria-label="Détails de la mission"
    >
      <div className="border-b border-border px-4 py-4">
        <h2 className="text-xs font-bold text-heading">Détails</h2>
      </div>

      <div className="divide-y divide-border px-4">
        {/* ── 12. Collaborateur ─────────────────────────────────────── */}
        <section className="py-4">
          <SectionTitle icon={<UserRoundIcon />}>Collaborateur</SectionTitle>
          {collaborator ? (
            <div>
              <div className="flex flex-col items-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/[0.09] font-heading text-lg font-bold text-primary">
                  {initials(collaborator.fullName)}
                </span>
                <p className="mt-2.5 text-sm font-bold text-heading">{collaborator.fullName}</p>
                <p className="mt-0.5 text-[11px] text-body">
                  {collaborator.currentTitle || collaborator.seniority || "Profil non renseigné"}
                </p>
              </div>
              <dl className="mt-4 space-y-2 border-t border-border pt-3">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Practice</dt>
                  <dd className="mt-0.5 text-xs font-semibold text-heading">
                    {collaborator.practice || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Séniorité</dt>
                  <dd className="mt-0.5 text-xs font-semibold text-heading">
                    {collaborator.seniority || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Expérience</dt>
                  <dd className="mt-0.5 text-xs font-semibold text-heading">—</dd>
                </div>
              </dl>
              <div className="mt-3.5">
                <ViewProfileButton collaboratorId={collaborator.id} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Aucun collaborateur affecté</p>
          )}
        </section>

        {/* ── 14. Conditions financières ────────────────────────────── */}
        <section className="py-4">
          <SectionTitle icon={<WalletCardsIcon />}>Conditions financières</SectionTitle>
          <div>
            <DataRow label="Coût journalier (CJM)" value={mission.cjm > 0 ? formatEuro(mission.cjm) : "—"} />
            <DataRow label="Prix de vente (TJM)" value={formatEuro(mission.tjm)} strong />
            <DataRow label="Taux de marge" value={marginPct === null ? "—" : formatPct(marginPct)} />
            <DataRow label="Marge journalière" value={dailyMargin === null ? "—" : formatEuro(dailyMargin)} />
            <DataRow
              label={contractValueLabel}
              value={
                contractValue === null ? (
                  "—"
                ) : (
                  <span>
                    {formatEuro(contractValue)}
                    <span className="ml-1.5 font-sans text-[10px] font-normal text-muted">
                      {contractValueHint}
                    </span>
                  </span>
                )
              }
              strong
            />
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Conditions de facturation
            </p>
            <p className="mt-1 text-xs font-semibold text-heading">{billing ?? "—"}</p>
          </div>
        </section>

        {/* ── 18. Contact client ────────────────────────────────────── */}
        <section className="py-4">
          <SectionTitle icon={<ContactRoundIcon />}>Contact client</SectionTitle>
          {operationalContact ? (
            <div>
              <p className="text-sm font-bold text-heading">{operationalContact.fullName}</p>
              {operationalContact.role ? (
                <p className="mt-0.5 text-xs text-body">{operationalContact.role}</p>
              ) : null}
              {operationalContact.email || operationalContact.phone ? (
                <div className="mt-2 flex flex-col gap-1">
                  {operationalContact.email ? (
                    <a
                      href={`mailto:${operationalContact.email}`}
                      className="truncate text-xs text-primary hover:underline"
                    >
                      {operationalContact.email}
                    </a>
                  ) : null}
                  {operationalContact.phone ? (
                    <a
                      href={`tel:${operationalContact.phone}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {operationalContact.phone}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted">Aucun contact opérationnel renseigné</p>
          )}
        </section>
      </div>
    </aside>
  )
}
