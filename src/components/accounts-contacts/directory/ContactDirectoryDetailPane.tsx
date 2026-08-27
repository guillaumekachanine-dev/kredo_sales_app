"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { departmentLabel, getContactDisplayDecisionPower, relationshipRoleAccentColor, relationshipRoleLabel } from "@/lib/accounts-contacts/contact-constants"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { formatDate } from "@/lib/formatters"

export type ContactDetailData = {
  contact: {
    id: string
    person_id: string
    company_id: string | null
    job_title: string | null
    relationship_role: string | null
    relationship_level: string | null
    decision_power: string | null
    department: string | null
    status: string
    is_priority: boolean | null
    persons: {
      id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
      primary_email: string | null
      phone: string | null
      linkedin_url: string | null
    } | null
    companies: {
      id: string
      name: string
      meta_logo_path?: string | null
      website: string | null
    } | null
  }
  interactions: Array<{
    id: string
    type: string
    occurred_at: string
    summary: string | null
    sentiment: string | null
    next_action: string | null
  }>
  calendarEvents: Array<{
    id: string
    title: string
    event_type: string
    status: string
    starts_at: string
    ends_at: string
    description: string | null
  }>
}

interface ContactDirectoryDetailPaneProps {
  data: ContactDetailData | null
  isLoading: boolean
  onCloseDetail: () => void
  onEditContact: (contactId: string) => void
  onScheduleContact: (contactId: string, company: { id: string; name: string } | null) => void
}

type TimelineItem = {
  id: string
  kind: "interaction" | "event"
  date: string
  title: string
  typeLabel: string
  statusLabel?: string | null
  summary?: string | null
}

function eventTypeLabel(type: string): string {
  return AGENDA_EVENT_TYPES[type]?.label ?? type.replaceAll("_", " ")
}

export function ContactDirectoryDetailPane({
  data,
  isLoading,
  onCloseDetail,
  onEditContact,
  onScheduleContact,
}: ContactDirectoryDetailPaneProps) {
  const activityTimeline = useMemo<TimelineItem[]>(() => {
    if (!data) return []
    const items: TimelineItem[] = []

    for (const inter of data.interactions || []) {
      items.push({
        id: `inter-${inter.id}`,
        kind: "interaction",
        date: inter.occurred_at,
        title: inter.summary || "Échange commercial",
        typeLabel: eventTypeLabel(inter.type),
        summary: inter.next_action ? `Prochaine action : ${inter.next_action}` : null,
      })
    }

    for (const evt of data.calendarEvents || []) {
      items.push({
        id: `evt-${evt.id}`,
        kind: "event",
        date: evt.starts_at,
        title: evt.title || "Événement agenda",
        typeLabel: eventTypeLabel(evt.event_type),
        statusLabel: evt.status === "confirmed" ? "Confirmé" : evt.status === "cancelled" ? "Annulé" : evt.status,
        summary: evt.description || null,
      })
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-brass" />
        <p className="mt-3 text-xs font-semibold text-white/60">Chargement de la fiche contact…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white/50">
        <p className="text-xs">Sélectionnez un contact pour afficher ses détails.</p>
      </div>
    )
  }

  const { contact } = data
  const person = contact.persons
  const company = contact.companies

  const firstName = person?.first_name || ""
  const lastName = person?.last_name || ""
  const fullName = person?.full_name || `${firstName} ${lastName}`.trim() || "Contact sans nom"
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?"
  const displayDecisionPower = getContactDisplayDecisionPower(contact.decision_power, contact.relationship_role)
  const accentColor = relationshipRoleAccentColor(contact.relationship_role)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0c1e]/60 text-white">
      {/* Top Header Controls */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCloseDetail}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white/65 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span>Fermer le détail</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onEditContact(contact.id)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          title="Modifier le contact"
          aria-label="Modifier le contact"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
      </div>

      {/* Main Detail Body Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Contact Identity Card */}
        <div className="relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          {accentColor ? (
            <span
              className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl"
              style={{ backgroundColor: accentColor }}
              aria-hidden="true"
            />
          ) : null}
          <div className="relative shrink-0">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-brass/20 border border-brand-brass/40 font-heading text-lg font-bold text-brand-brass shadow-md">
              {initials}
            </div>
            {company ? (
              <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-white/10 bg-[#0f122c] p-0.5 shadow">
                <CompanyLogo name={company.name} logoPath={company.meta_logo_path} website={company.website} fill className="size-full rounded-full" />
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-bold text-white truncate">{fullName}</h3>
            <p className="mt-0.5 text-xs font-semibold text-white/80 truncate">
              {contact.job_title || "Fonction non renseignée"}
            </p>
            <p className="mt-0.5 text-xs text-white/50 truncate">
              {company ? company.name : "Compte non rattaché"} · {departmentLabel(contact.department)}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Rôle relationnel</span>
            <p className="mt-0.5 font-bold text-white">{relationshipRoleLabel(contact.relationship_role)}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Pouvoir décisionnel</span>
            <p className="mt-0.5 font-bold text-white">{displayDecisionPower}</p>
          </div>
          {person?.primary_email ? (
            <div className="col-span-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Email</span>
              <p className="mt-0.5 truncate font-medium text-white/90">
                <a href={`mailto:${person.primary_email}`} className="hover:underline hover:text-white">
                  {person.primary_email}
                </a>
              </p>
            </div>
          ) : null}
          {person?.phone ? (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Téléphone</span>
              <p className="mt-0.5 font-medium text-white/90">
                <a href={`tel:${person.phone}`} className="hover:underline hover:text-white">
                  {person.phone}
                </a>
              </p>
            </div>
          ) : null}
          {person?.linkedin_url ? (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">LinkedIn</span>
              <p className="mt-0.5 font-medium text-white/90">
                <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-brass hover:underline">
                  Profil LinkedIn ↗
                </a>
              </p>
            </div>
          ) : null}
        </div>

        {/* Activity Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">Activité commerciale</h4>
          {activityTimeline.length > 0 ? (
            <ol className="relative space-y-3 border-l border-white/10 ml-2 pl-4">
              {activityTimeline.map((item) => (
                <li key={item.id} className="relative group">
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-brand-brass ring-4 ring-[#0f122c]" />
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-white/90">{item.typeLabel}</span>
                    <span className="text-[10px] text-white/50">{formatDate(item.date)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/75">{item.title}</p>
                  {item.summary ? <p className="mt-1 text-[11px] leading-relaxed text-white/55">{item.summary}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs italic text-white/40">Aucune activité enregistrée pour ce contact.</p>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onScheduleContact(contact.id, company ? { id: company.id, name: company.name } : null)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand-brass px-3.5 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-brand-brass/90 active:scale-98 cursor-pointer shadow-sm"
            >
              + Événement
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/5 px-6 py-4 bg-[#0a0c1e]/80">
        {company ? (
          <Link
            href={`/prospection/accounts/${company.id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-white transition-colors hover:bg-white/10 hover:border-white/30"
          >
            Consulter le compte
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => {
            openCommunicationComposer({
              origin: "contact",
              companyId: company?.id ?? null,
              companyName: company?.name ?? null,
              contactId: contact.id,
              primaryEntity: { type: "contact", id: contact.id },
              preset: {
                contactId: contact.id,
              },
            })
          }}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-brass px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-brand-brass/90 cursor-pointer"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          Rédiger
        </button>
      </div>
    </div>
  )
}
