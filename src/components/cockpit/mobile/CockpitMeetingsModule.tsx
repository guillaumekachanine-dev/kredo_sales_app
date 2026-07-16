"use client"

import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { groupCockpitMeetingsByDay } from "@/lib/cockpit/mobile/cockpit-mobile-selectors"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

function formatDay(date: string) { return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`)) }
function formatTime(iso: string, allDay: boolean) { return allDay ? "Toute la journée" : new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) }

export function CockpitMeetingsModule({ snapshot, onComposerOpen }: { snapshot: CockpitMobileSnapshot; onComposerOpen: () => void }) {
  const groups = groupCockpitMeetingsByDay(snapshot.meetings.items)
  if (groups.length === 0) return <p className="cockpit-sheet-empty">Aucun rendez-vous commercial cette semaine.</p>
  return <div className="space-y-5">{groups.map((group) => <section key={group.date}><h3 className="mb-2 text-xs font-bold capitalize text-heading">{formatDay(group.date)}</h3><ul className="cockpit-sheet-list">{group.items.map((meeting) => <li key={meeting.id} className="cockpit-action-card"><div className="flex items-start gap-3"><span className="min-w-12 text-xs font-bold text-primary">{formatTime(meeting.startsAt, meeting.allDay)}</span><div className="min-w-0"><h4 className="text-sm font-bold text-heading">{meeting.title}</h4>{meeting.companyName ? <p className="text-xs text-body">{meeting.companyName}</p> : null}{meeting.contactName ? <p className="text-xs text-muted">Contact : {meeting.contactName}</p> : null}{meeting.opportunityTitle ? <p className="text-xs text-muted">Opportunité : {meeting.opportunityTitle}</p> : null}{meeting.location ? <p className="text-xs text-muted">{meeting.location}</p> : null}</div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { const preset = buildCommunicationEntryPreset("agenda_event_preparation", { origin: "calendar_event", eventId: meeting.id, eventTitle: meeting.title, eventType: meeting.eventType, eventStartsAt: meeting.startsAt, eventLocation: meeting.location, eventMeetingUrl: meeting.meetingUrl, companyId: meeting.companyId, companyName: meeting.companyName, contactId: meeting.contactId, contactName: meeting.contactName, opportunityId: meeting.opportunityId, opportunityTitle: meeting.opportunityTitle }); if (preset.ok) { onComposerOpen(); openCommunicationComposer(preset.request) } }}>Préparer le RDV</Button>{meeting.meetingUrl ? <a className="cockpit-inline-action" href={meeting.meetingUrl} target="_blank" rel="noreferrer">Rejoindre</a> : null}{meeting.companyId ? <Link className="cockpit-inline-action" href={`/prospection/accounts/${meeting.companyId}`}>Ouvrir le compte</Link> : null}<Link className="cockpit-inline-action" href={meeting.href}>Agenda</Link></div></li>)}</ul></section>)}</div>
}
