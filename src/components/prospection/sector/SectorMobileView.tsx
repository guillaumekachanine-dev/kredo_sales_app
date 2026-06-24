"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SectorWithRelations, PracticeKey, Urgency } from "@/types/sector"
import { formatDate } from "@/lib/formatters"

// ─── Référentiels ─────────────────────────────────────────────────────────────

const PRACTICE_LABEL: Record<PracticeKey | 'multi', string> = {
  data_ai: "Data & IA", cloud_eng: "Cloud Eng.", product: "Product", cyber: "Cyber", multi: "Multi",
}

const URGENCY_STYLE: Record<Urgency, string> = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high:     "bg-warning/10 text-warning border-warning/30",
  medium:   "bg-accent/10 text-accent border-accent/30",
  low:      "bg-border/40 text-muted border-border",
}

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: "Critique", high: "Haute", medium: "Moyenne", low: "Faible",
}

const LIFECYCLE_LABEL: Record<string, string> = {
  client_actif: "Client actif", prospect: "Prospect", cible: "Cible",
  client_dormant: "Dormant", ancien_client: "Ancien client",
  partenaire: "Partenaire", non_prioritaire: "Non prio.", exclu: "Exclu",
}

const MATURITY_LABEL: Record<string, string> = { low: "Faible", medium: "Moyenne", high: "Élevée" }


// ─── Composant ───────────────────────────────────────────────────────────────

export function SectorMobileView({ sector }: { sector: SectorWithRelations }) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [openSection, setOpenSection] = useState<string | null>("events")
  const [eventStatuses, setEventStatuses] = useState<Record<string, 'pending' | 'acted' | 'dismissed'>>(
    Object.fromEntries(sector.events.map(e => [e.id, e.status]))
  )
  const [activeSheet, setActiveSheet] = useState<{
    title: string
    body: string
    action: () => void
    actionLabel: string
  } | null>(null)

  const pendingEvents = sector.events.filter(e => (eventStatuses[e.id] ?? e.status) === "pending")

  function markEvent(id: string, status: 'acted' | 'dismissed') {
    setEventStatuses(prev => ({ ...prev, [id]: status }))
  }

  function toggle(section: string) {
    setOpenSection(prev => prev === section ? null : section)
  }

  function scrollCarousel() {
    carouselRef.current?.scrollBy({ left: 150, behavior: "smooth" })
  }

  const practiceKeys: PracticeKey[] = ["data_ai", "cloud_eng", "product", "cyber"]
  const practices = sector.practices_fit ?? {}

  return (
    <div className="flex flex-col gap-5 bg-canvas px-4 py-5 pb-24 min-h-screen select-none relative">

      {/* En-tête */}
      <header className="flex items-start justify-between border-b border-border/60 pb-3">
        <div>
          <h1 className="text-base font-extrabold font-heading text-heading tracking-tight">
            {sector.name}
          </h1>
          {sector.digital_maturity && (
            <p className="text-[10px] text-muted mt-0.5">
              Maturité digitale : {MATURITY_LABEL[sector.digital_maturity]}
            </p>
          )}
        </div>
        {sector.attractiveness_score !== null && (
          <div className="flex flex-col items-center bg-surface border border-border/80 rounded-xl px-3 py-2">
            <span className="text-xl font-bold text-heading">{sector.attractiveness_score}/10</span>
            <span className="text-[9px] font-bold text-muted uppercase tracking-wide">Attractivité</span>
          </div>
        )}
      </header>

      {/* Carrousel KPI */}
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {sector.market_size_eur_bn !== null && (
            <div className="w-36 shrink-0 bg-surface border border-border/80 rounded-xl p-3.5 snap-start">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Marché</span>
              <span className="text-xl font-bold text-heading mt-2 block">{sector.market_size_eur_bn} Md€</span>
            </div>
          )}
          {sector.market_growth_pct !== null && (
            <div className="w-36 shrink-0 bg-surface border border-border/80 rounded-xl p-3.5 snap-start">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Croissance</span>
              <span className="text-xl font-bold text-success mt-2 block">+{sector.market_growth_pct}%</span>
            </div>
          )}
          {(sector.avg_tjm_min !== null || sector.avg_tjm_max !== null) && (
            <div className="w-36 shrink-0 bg-surface border border-border/80 rounded-xl p-3.5 snap-start">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">TJM moyen</span>
              <span className="text-xl font-bold text-heading mt-2 block">
                {sector.avg_tjm_min ?? "—"}–{sector.avg_tjm_max ?? "—"} €
              </span>
            </div>
          )}
          {practiceKeys.map(key => {
            const score = toNum(practices[key])
            if (score === null) return null
            return (
              <div key={key} className="w-36 shrink-0 bg-surface border border-border/80 rounded-xl p-3.5 snap-start">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  {PRACTICE_LABEL[key]}
                </span>
                <span className="text-xl font-bold text-primary mt-2 block">{score}/10</span>
              </div>
            )
          })}
        </div>
        <button
          onClick={scrollCarousel}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-7 h-7 bg-surface/90 border border-border rounded-full flex items-center justify-center shadow-md text-body focus:outline-none"
          title="Faire défiler"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Trigger events urgents */}
      {pendingEvents.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => toggle("events")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted py-2 border-b border-border/40"
          >
            <span className="flex items-center gap-2">
              Trigger events
              <span className="bg-danger/10 text-danger border border-danger/20 rounded px-1.5 py-0.5 text-[9px] font-bold">
                {pendingEvents.length} en attente
              </span>
            </span>
            <svg className={cn("w-4 h-4 transition-transform", openSection === "events" && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === "events" && (
            <div className="flex flex-col gap-3 mt-3">
              {pendingEvents.map(ev => (
                <SurfaceCard key={ev.id} className="p-4 border border-warning/20">
                  <p className="text-xs font-bold text-heading mb-1 leading-snug">{ev.title}</p>
                  {ev.event_date && (
                    <p className="text-[10px] text-muted mb-2">{formatDate(ev.event_date)}</p>
                  )}
                  {ev.commercial_opportunity && (
                    <p className="text-[10px] text-primary italic mb-3 leading-relaxed">
                      {ev.commercial_opportunity}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSheet({
                        title: ev.title,
                        body: ev.commercial_opportunity ?? "Confirmer le traitement de cet événement déclencheur.",
                        actionLabel: "Marquer comme traité",
                        action: () => markEvent(ev.id, "acted"),
                      })
                    }
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary-deep text-white font-bold text-xs flex items-center justify-center transition-colors"
                  >
                    Traiter cet événement
                  </button>
                </SurfaceCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pain points */}
      <div>
        <button
          type="button"
          onClick={() => toggle("pains")}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted py-2 border-b border-border/40"
        >
          <span>Points de douleur ({sector.pain_points.length})</span>
          <svg className={cn("w-4 h-4 transition-transform", openSection === "pains" && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSection === "pains" && (
          <div className="flex flex-col gap-2 mt-3">
            {sector.pain_points.length === 0 ? (
              <p className="text-xs text-muted italic">Aucun pain point renseigné</p>
            ) : sector.pain_points.map(pp => (
              <div key={pp.id} className="bg-surface border border-border/60 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-heading leading-snug flex-1">{pp.title}</p>
                  {pp.kredo_practice && (
                    <span className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 shrink-0">
                      {PRACTICE_LABEL[pp.kredo_practice]}
                    </span>
                  )}
                </div>
                {pp.description && <p className="text-[10px] text-body leading-relaxed">{pp.description}</p>}
                <div className="flex items-center justify-between mt-1.5">
                  {pp.verbatim && (
                    <p className="text-[10px] text-muted italic flex-1 pr-2 border-l-2 border-border/60 pl-2">
                      &quot;{pp.verbatim}&quot;
                    </p>
                  )}
                  <span className="text-[10px] font-bold text-muted shrink-0">×{pp.frequency_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Réglementaire */}
      <div>
        <button
          type="button"
          onClick={() => toggle("regulatory")}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted py-2 border-b border-border/40"
        >
          <span>Calendrier réglementaire ({sector.regulatory_items.length})</span>
          <svg className={cn("w-4 h-4 transition-transform", openSection === "regulatory" && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSection === "regulatory" && (
          <div className="flex flex-col gap-2 mt-3">
            {sector.regulatory_items.length === 0 ? (
              <p className="text-xs text-muted italic">Aucune réglementation renseignée</p>
            ) : sector.regulatory_items.map(reg => (
              <div key={reg.id} className="bg-surface border border-border/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-heading leading-snug flex-1 pr-2">{reg.name}</p>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0", URGENCY_STYLE[reg.urgency])}>
                    {URGENCY_LABEL[reg.urgency]}
                  </span>
                </div>
                {reg.deadline_date && (
                  <p className="text-[10px] font-semibold text-body mb-1">Échéance : {formatDate(reg.deadline_date)}</p>
                )}
                {reg.commercial_angle && (
                  <p className="text-[10px] text-primary italic">{reg.commercial_angle}</p>
                )}
                {reg.is_commercial_window && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold text-secondary bg-secondary/10 border border-secondary/20 rounded px-1.5 py-0.5">
                    Fenêtre commerciale
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comptes */}
      <div>
        <button
          type="button"
          onClick={() => toggle("companies")}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted py-2 border-b border-border/40"
        >
          <span>Comptes liés ({sector.companies.length})</span>
          <svg className={cn("w-4 h-4 transition-transform", openSection === "companies" && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSection === "companies" && (
          <div className="flex flex-col gap-2 mt-3">
            {sector.companies.length === 0 ? (
              <p className="text-xs text-muted italic">Aucun compte lié</p>
            ) : sector.companies.map(company => (
              <Link
                key={company.id}
                href={`/prospection/accounts/${company.id}`}
                className="bg-surface border border-border/60 hover:border-primary/30 rounded-lg p-3 flex items-center justify-between transition-colors"
              >
                <span className="text-xs font-semibold text-heading">{company.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-semibold text-muted border border-border/50 rounded px-1.5 py-0.5">
                    {LIFECYCLE_LABEL[company.lifecycle_status] ?? company.lifecycle_status}
                  </span>
                  {company.ai_score !== null && (
                    <span className="text-[10px] font-bold text-heading">{company.ai_score}/5</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {activeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface border-t border-border rounded-t-2xl shadow-2xl w-full p-6 pb-8 max-w-md animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-5" />
            <h3 className="text-sm font-bold text-heading mb-2 leading-tight">{activeSheet.title}</h3>
            <p className="text-xs text-body leading-relaxed mb-6">{activeSheet.body}</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { activeSheet.action(); setActiveSheet(null) }}
                className="w-full h-11 bg-primary hover:bg-primary-deep text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                {activeSheet.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="w-full h-11 bg-canvas hover:bg-surface-hover border border-border text-body font-semibold text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null }
  return null
}
