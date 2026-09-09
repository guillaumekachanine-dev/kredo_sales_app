"use client"

import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { getOpportunityStageLabel } from "@/lib/opportunities/stages"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import type { CockpitMobileSnapshot, CockpitOpportunityItem } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

function nextStepLabel(item: CockpitOpportunityItem, now: string) {
  if (!item.nextActionLabel) return "Prochaine action à définir"
  if (item.nextActionAt && Date.parse(item.nextActionAt) < Date.parse(now)) return `En retard · ${item.nextActionLabel}`
  return item.nextActionAt ? `${item.nextActionLabel} · ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(item.nextActionAt))}` : item.nextActionLabel
}
function coverageLabel(item: CockpitOpportunityItem) { return item.coverageStatus === "not_required" ? "Staffing non requis" : `${item.coveringPositioningCount} positionnement(s) sur ${item.requiredHeadcount}` }

export function CockpitOpportunitiesModule({ snapshot, onComposerOpen }: { snapshot: CockpitMobileSnapshot; onComposerOpen: () => void }) {
  if (snapshot.opportunities.items.length === 0) return <p className="cockpit-sheet-empty">Aucune opportunité ouverte nécessitant une action.</p>
  return <ul className="cockpit-sheet-list cockpit-week-modal__opportunity-list">{snapshot.opportunities.items.map((item) => {
    const isOverdue = Boolean(item.nextActionAt && Date.parse(item.nextActionAt) < Date.parse(snapshot.generatedAt))
    return <li key={item.id} className="cockpit-action-card cockpit-week-modal__opportunity" data-overdue={isOverdue || undefined}>
      <p className="cockpit-week-modal__opportunity-step">{nextStepLabel(item, snapshot.generatedAt)}</p>
      <h3 className="text-sm font-bold text-heading">{item.title}</h3>
      <p className="cockpit-week-modal__opportunity-account">{item.companyName ?? "Entreprise non renseignée"} <span>{getOpportunityStageLabel(item.stage)}</span></p>
      <p className="cockpit-week-modal__coverage">{coverageLabel(item)}</p>
      <div className="cockpit-week-modal__actions"><Link href={item.href} className="cockpit-inline-action cockpit-inline-action--primary">Ouvrir l’opportunité</Link>{item.companyId ? <Button variant="secondary" size="sm" onClick={() => { const preset = buildCommunicationEntryPreset("prospection_follow_up", { origin: "opportunity", companyId: item.companyId, companyName: item.companyName, opportunityId: item.id, opportunityTitle: item.title }); if (preset.ok) { onComposerOpen(); openCommunicationComposer(preset.request) } }}>Rédiger une relance</Button> : null}{item.requiredHeadcount > 0 ? <Link href={item.href} className="cockpit-inline-action">Gérer le staffing</Link> : null}</div>
    </li>
  })}</ul>
}
