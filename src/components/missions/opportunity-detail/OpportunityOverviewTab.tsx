"use client"

import { OpportunityContactsPanel } from "./OpportunityContactsPanel"
import { OpportunitySkillsPanel } from "./OpportunitySkillsPanel"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDate, formatEuro, formatPct } from "@/lib/formatters"
import { getOpportunityStageLabel } from "@/lib/opportunities/stages"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"

interface OpportunityOverviewTabProps {
  data: OpportunityDetailData
  isMobile: boolean
  onRefresh: () => void
}

function getDurationLabel(durationDays: number | null) {
  if (!durationDays) return "—"
  if (durationDays >= 60) {
    const months = Math.round(durationDays / 30)
    return `${months} mois`
  }
  return `${durationDays} jours`
}

function getSentProfilesCount(data: OpportunityDetailData) {
  return data.standingProfiles.filter((profile) =>
    ["envoye_client", "entretien_planifie", "entretien_realise", "retenu"].includes(profile.opportunity_status),
  ).length
}

function getInterviewSummary(data: OpportunityDetailData) {
  const completed = data.standingProfiles.filter((profile) => profile.opportunity_status === "entretien_realise").length
  const planned = data.standingProfiles.filter((profile) => profile.opportunity_status === "entretien_planifie").length
  return `${completed} réalisé${completed > 1 ? "s" : ""} · ${planned} planifié${planned > 1 ? "s" : ""}`
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,0.7fr)_minmax(0,1.3fr)] gap-5 border-b border-border/70 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium text-body">{label}</dt>
      <dd className="text-xs font-semibold text-heading">{value}</dd>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border/70 py-2 text-xs last:border-b-0">
      <span className="text-body">{label}</span>
      <span className="font-semibold text-heading">{value}</span>
    </div>
  )
}

export function OpportunityOverviewTab({ data, isMobile, onRefresh }: OpportunityOverviewTabProps) {
  const { opportunity } = data
  const milestone = opportunity.next_action_label ?? "Prochain jalon à qualifier"
  const milestoneDate = opportunity.next_action_at ? formatDate(opportunity.next_action_at) : "Échéance non renseignée"
  const context = opportunity.need_summary ?? opportunity.need_detail ?? opportunity.client_context ?? "Le contexte détaillé du besoin reste à compléter."
  const weightedGain = opportunity.weighted_gain ?? (opportunity.acv === null ? null : opportunity.acv * opportunity.conviction / 100)

  if (isMobile) {
    return (
      <section className="space-y-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-heading">Situation commerciale</h2>
          <div className="mt-3 flex items-center justify-between border-b border-border/70 pb-3 text-xs">
            <span className="text-body">Étape actuelle</span>
            <StatusPill label={getOpportunityStageLabel(opportunity.stage)} variant="inProgress" />
          </div>
        </div>

        <div className="border-l-[3px] border-warning pl-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-status-warning-ink)]">Prochain jalon</p>
          <p className="mt-1 text-sm font-bold text-heading">{milestone}</p>
          <p className="mt-0.5 text-xs text-body">{milestoneDate}</p>
        </div>

        <div className="border-t border-border/70 pt-4">
          <h3 className="text-sm font-bold text-heading">Besoin synthétique</h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-body">
            {[opportunity.searched_profile, opportunity.practice, opportunity.location].filter(Boolean).join(" · ") || opportunity.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Démarrage {opportunity.start_date ? `le ${formatDate(opportunity.start_date)}` : "à préciser"} · {getDurationLabel(opportunity.duration_days)}
          </p>
        </div>

        <div className="border-t border-border/70">
          <SummaryRow label="Positionnements" value={String(data.standingProfiles.length)} />
          <SummaryRow label="Profils envoyés" value={String(getSentProfilesCount(data))} />
          <SummaryRow label="Entretiens" value={getInterviewSummary(data)} />
        </div>

        <p className="border-t border-border/70 pt-3 text-xs leading-5 text-danger">
          <span className="font-bold">Alerte · </span>Le prochain feedback client doit rester sécurisé dans le plan d’action.
        </p>
        <p className="border-t border-border/70 pt-3 text-xs leading-5 text-body">
          <span className="font-bold text-heading">Prochaine action · </span>{opportunity.next_action_label ?? "Qualifier la prochaine action"}
        </p>
      </section>
    )
  }

  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">01 — Besoin</p>
      <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Cadre de l’opportunité</h2>

      <div className="mt-7 grid gap-10 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.9fr)]">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-heading">Contexte du besoin</h3>
          <p className="mt-3 max-w-[70ch] text-sm leading-6 text-body">{context}</p>

          <dl className="mt-6 max-w-2xl">
            <DetailRow label="Profil recherché" value={opportunity.searched_profile ?? opportunity.title} />
            <DetailRow label="Practice" value={opportunity.practice ?? "—"} />
            <DetailRow label="Séniorité" value={opportunity.seniority ?? "—"} />
            <DetailRow label="Localisation" value={opportunity.location ?? "—"} />
            <DetailRow label="Télétravail" value={opportunity.remote_policy ?? "—"} />
            <DetailRow label="Démarrage" value={opportunity.start_date ? formatDate(opportunity.start_date) : "—"} />
            <DetailRow label="Durée" value={getDurationLabel(opportunity.duration_days)} />
            <DetailRow label="Capacité" value={`${opportunity.required_headcount} profil${opportunity.required_headcount > 1 ? "s" : ""}`} />
          </dl>

          <OpportunitySkillsPanel
            opportunityId={opportunity.id}
            skills={data.skills}
            onRefresh={onRefresh}
            embedded
            readOnly
            className="mt-8 max-w-2xl"
          />
        </div>

        <aside className="space-y-6 border-l border-border pl-8">
          <OpportunityContactsPanel
            opportunityId={opportunity.id}
            companyId={data.account?.id ?? null}
            contacts={data.contacts}
            onRefresh={onRefresh}
            embedded
            readOnly
          />

          <div className="border-l-[3px] border-warning pl-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-status-warning-ink)]">Prochain jalon</p>
            <p className="mt-1 text-sm font-bold text-heading">{milestone}</p>
            <p className="mt-0.5 text-xs text-body">{milestoneDate}</p>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-heading">Prochaines actions</h3>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-body">
              <li>• {opportunity.next_action_label ?? "Qualifier la prochaine action"}</li>
              <li>• Préparer le jalon commercial suivant</li>
            </ul>
          </div>

          <dl className="border-t border-border pt-4">
            <SummaryRow label="TJM cible" value={formatEuro(opportunity.target_daily_rate)} />
            <SummaryRow label="ACV" value={formatEuro(opportunity.acv)} />
            <SummaryRow label="Gain pondéré" value={formatEuro(weightedGain)} />
            <SummaryRow label="Marge cible" value={formatPct(opportunity.target_margin_pct)} />
          </dl>
        </aside>
      </div>
    </section>
  )
}
