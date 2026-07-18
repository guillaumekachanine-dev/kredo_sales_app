"use client"

import { useState } from "react"
import type {
  ClientIntelligenceCommercialTimelineEntry,
  ClientIntelligenceContact,
  ClientIntelligenceMission,
  ClientIntelligenceOpportunity,
  ClientIntelligenceProject,
} from "@/lib/intelligence/intelligence-data"
import { relationshipRoleLabel } from "@/lib/accounts-contacts/contact-constants"
import { sortCompanyContacts } from "@/lib/intelligence/client-intelligence-company"

const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  detection: "Détection",
  qualification: "Qualification",
  besoin_confirme: "Besoin confirmé",
  recherche_profil: "Recherche profil",
  cv_envoyes: "CV envoyés",
  entretien_client: "Entretien client",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
  abandonne: "Abandonné",
}

const COMPLETED_PROJECT_STATUSES = new Set(["delivered", "closed", "cancelled"])

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatEuro(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
}

function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, " ")
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function CommercialTimeline({ entries }: { entries: ClientIntelligenceCommercialTimelineEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  const visibleEntries = expanded ? entries : entries.slice(0, 10)

  if (entries.length === 0) return <p className="text-xs italic text-muted">Aucun échange ni événement enregistré.</p>
  return (
    <div>
      <ol className="relative ml-1 border-l border-border">
        {visibleEntries.map((entry) => (
          <li key={entry.id} className="relative pb-5 pl-5 last:pb-0">
            <span className="absolute -left-1 top-1 size-2 rounded-full border border-surface bg-brand-brass" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-heading">{entry.title}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {humanize(entry.nature)}{entry.contactName ? ` · ${entry.contactName}` : ""}
                </p>
              </div>
              <time className="font-mono text-[10px] text-muted">{formatDate(entry.occurredAt)}</time>
            </div>
            {entry.summary && <p className="mt-1 text-[11px] leading-relaxed text-body">{entry.summary}</p>}
            {entry.status && <p className="mt-1 text-[10px] text-muted">Statut : {humanize(entry.status)}</p>}
          </li>
        ))}
      </ol>
      {entries.length > 10 && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 min-h-9 rounded border border-border px-3 text-[11px] font-bold text-body transition-colors hover:border-primary/45 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          {expanded ? "Réduire la timeline" : `Afficher ${entries.length - 10} entrée${entries.length - 10 > 1 ? "s" : ""} supplémentaire${entries.length - 10 > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  )
}

export function CompanyCommercialContent({
  timeline,
  opportunities,
  missions,
  projects,
  contacts,
}: {
  timeline: ClientIntelligenceCommercialTimelineEntry[]
  opportunities: ClientIntelligenceOpportunity[]
  missions: ClientIntelligenceMission[]
  projects: ClientIntelligenceProject[]
  contacts: ClientIntelligenceContact[]
}) {
  const sortedContacts = sortCompanyContacts(contacts)
  const engagements = [
    ...missions.map((mission) => ({
      id: `mission-${mission.id}`,
      title: mission.title,
      kind: "Assistance technique",
      status: mission.status,
      completed: mission.status === "ended",
      startDate: mission.startDate,
      endDate: mission.endDate,
      amount: null,
    })),
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      kind: project.billingModel === "regie" ? "Assistance technique" : "Projet au forfait",
      status: project.status,
      completed: COMPLETED_PROJECT_STATUSES.has(project.status),
      startDate: project.startDate,
      endDate: project.endDate,
      amount: project.contractAmount,
    })),
  ]

  return (
    <div className="space-y-8">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Échanges et événements</h3>
          <div className="mt-4"><CommercialTimeline entries={timeline} /></div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Opportunités</h3>
          {opportunities.length === 0 ? (
            <p className="mt-4 text-xs italic text-muted">Aucune opportunité enregistrée.</p>
          ) : (
            <div className="mt-4 overflow-x-auto border border-border">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Opportunité</th>
                    <th className="px-3 py-2">Étape</th>
                    <th className="px-3 py-2">Valeur</th>
                    <th className="px-3 py-2">Prochaine action</th>
                    <th className="px-3 py-2">Échéance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {opportunities.map((opportunity) => (
                    <tr key={opportunity.id}>
                      <td className="px-3 py-3 font-semibold text-heading">{opportunity.title}</td>
                      <td className="px-3 py-3 text-body">{OPPORTUNITY_STAGE_LABELS[opportunity.stage] ?? humanize(opportunity.stage)}</td>
                      <td className="px-3 py-3 font-mono text-body">{formatEuro(opportunity.estimatedGain)}</td>
                      <td className="px-3 py-3 text-body">{opportunity.nextActionLabel ?? "—"}</td>
                      <td className="px-3 py-3 text-body">{formatDate(opportunity.targetCloseDate ?? opportunity.nextActionAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="border-t border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Engagements</h3>
        {engagements.length === 0 ? (
          <p className="mt-4 text-xs italic text-muted">Aucune mission ni projet enregistré.</p>
        ) : (
          <div className="mt-4 divide-y divide-border border-y border-border">
            {engagements.map((engagement) => (
              <div key={engagement.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div>
                  <p className="text-xs font-bold text-heading">{engagement.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{formatDate(engagement.startDate)} → {formatDate(engagement.endDate)}</p>
                </div>
                <span className="w-fit rounded border border-border bg-canvas px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-body">
                  {engagement.kind}
                </span>
                <div className="flex items-center gap-2 sm:justify-end">
                  {engagement.amount !== null && <span className="font-mono text-[10px] font-bold text-heading">{formatEuro(engagement.amount)}</span>}
                  <span className={engagement.completed
                    ? "rounded border border-muted/30 bg-canvas px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-muted"
                    : "rounded border border-success/25 bg-success/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-success"}
                  >
                    {engagement.completed ? "Engagement terminé" : humanize(engagement.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border pt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Décideurs et contacts prioritaires</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Les offres sont des suggestions déterministes à qualifier, jamais des associations validées.</p>
          </div>
          <span className="font-mono text-[10px] text-muted">{sortedContacts.length} contact{sortedContacts.length > 1 ? "s" : ""}</span>
        </div>
        {sortedContacts.length === 0 ? (
          <p className="mt-4 text-xs italic text-muted">Aucun contact renseigné.</p>
        ) : (
          <div className="mt-4 overflow-x-auto border border-border">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Fonction / département</th>
                  <th className="px-3 py-2">Rôle commercial</th>
                  <th className="px-3 py-2">Relation</th>
                  <th className="px-3 py-2">Pouvoir décisionnel</th>
                  <th className="px-3 py-2">Offre KREDO suggérée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-heading">{contact.fullName}</p>
                        {contact.isPriority && <span className="rounded border border-brand-brass/30 bg-brand-brass/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-brass">Prioritaire</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-body">
                      <p>{contact.jobTitle ?? "Fonction non renseignée"}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{contact.department ?? "Département non renseigné"}</p>
                    </td>
                    <td className="px-3 py-3 text-body">{contact.relationshipRole ? relationshipRoleLabel(contact.relationshipRole) : "Non renseigné"}</td>
                    <td className="px-3 py-3 text-body">{contact.relationshipLevel ?? "Non renseigné"}</td>
                    <td className="px-3 py-3 text-body">{contact.decisionPower ?? "Non renseigné"}</td>
                    <td className="px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Suggestion</p>
                      <p className="mt-0.5 font-semibold text-heading">{contact.offerSuggestion?.offerName ?? "Offre à qualifier"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
