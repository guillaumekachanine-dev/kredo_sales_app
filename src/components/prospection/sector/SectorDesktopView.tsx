"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SectorWithRelations, PracticeKey, Urgency } from "@/types/sector"
import { formatDate } from "@/lib/formatters"

// ─── Référentiels d'affichage ─────────────────────────────────────────────────

const PRACTICE_LABEL: Record<PracticeKey | 'multi', string> = {
  data_ai:   "Data & IA",
  cloud_eng: "Cloud Eng.",
  product:   "Product",
  cyber:     "Cyber",
  multi:     "Multi",
}

const URGENCY_STYLE: Record<Urgency, string> = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high:     "bg-warning/10 text-warning border-warning/30",
  medium:   "bg-accent/10 text-accent border-accent/30",
  low:      "bg-border/40 text-muted border-border",
}

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: "Critique",
  high:     "Haute",
  medium:   "Moyenne",
  low:      "Faible",
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  regulatory:  "Réglementaire",
  market:      "Marché",
  competitor:  "Concurrent",
  appointment: "RDV",
  tender:      "Appel d'offres",
  report:      "Rapport",
  other:       "Autre",
}

const LIFECYCLE_LABEL: Record<string, string> = {
  client:          "Client",
  client_actif:    "Client actif",
  prospect:        "Prospect",
  cible:           "Cible",
  client_dormant:  "Dormant",
  ancien_client:   "Ancien client",
  partenaire:      "Partenaire",
  non_prioritaire: "Non prioritaire",
  exclu:           "Exclu",
}

const LIFECYCLE_STYLE: Record<string, string> = {
  client:          "bg-success/10 text-success border-success/30",
  client_actif:    "bg-success/10 text-success border-success/30",
  prospect:        "bg-warning/10 text-warning border-warning/30",
  cible:           "bg-primary/10 text-primary border-primary/30",
  client_dormant:  "bg-accent/10 text-accent border-accent/30",
  ancien_client:   "bg-border/40 text-muted border-border",
  partenaire:      "bg-success/10 text-success border-success/30",
  non_prioritaire: "bg-border/40 text-muted border-border",
  exclu:           "bg-danger/10 text-danger border-danger/30",
}

const MATURITY_LABEL: Record<string, string> = { low: "Faible", medium: "Moyenne", high: "Élevée" }
const MATURITY_STYLE: Record<string, string> = {
  low:    "bg-danger/10 text-danger border-danger/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high:   "bg-success/10 text-success border-success/30",
}

const STATUS_LABEL: Record<string, string> = { active: "Actif", development: "En développement", watch: "Veille" }
const STATUS_STYLE: Record<string, string> = {
  active:      "bg-success/10 text-success border-success/30",
  development: "bg-warning/10 text-warning border-warning/30",
  watch:       "bg-border/40 text-muted border-border",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 10 }: { value: number | null; max?: number }) {
  const pct = value !== null ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}


// ─── Composant principal ──────────────────────────────────────────────────────

export function SectorDesktopView({ sector }: { sector: SectorWithRelations }) {
  const [activeTab, setActiveTab] = useState<"playbook" | "players">("playbook")
  const [eventStatuses, setEventStatuses] = useState<Record<string, 'pending' | 'acted' | 'dismissed'>>(
    Object.fromEntries(sector.events.map(e => [e.id, e.status]))
  )

  const pendingEvents = sector.events.filter(e => (eventStatuses[e.id] ?? e.status) === "pending")
  const actedEvents   = sector.events.filter(e => (eventStatuses[e.id] ?? e.status) === "acted")

  function markEvent(id: string, status: 'acted' | 'dismissed') {
    setEventStatuses(prev => ({ ...prev, [id]: status }))
  }

  const practices = sector.practices_fit ?? {}
  const practiceKeys: PracticeKey[] = ["data_ai", "cloud_eng", "product", "cyber"]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-6 select-none">

      {/* ── En-tête secteur ──────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
              {sector.name}
            </h1>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", STATUS_STYLE[sector.status] ?? STATUS_STYLE.watch)}>
              {STATUS_LABEL[sector.status] ?? sector.status}
            </span>
            {sector.digital_maturity && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", MATURITY_STYLE[sector.digital_maturity])}>
                Maturité digitale : {MATURITY_LABEL[sector.digital_maturity]}
              </span>
            )}
          </div>
          {sector.description && (
            <p className="text-xs text-body max-w-2xl leading-relaxed">{sector.description}</p>
          )}
        </div>

        {/* KPI capsules */}
        <div className="flex items-center gap-3 shrink-0">
          {sector.attractiveness_score !== null && (
            <div className="flex flex-col items-center bg-surface border border-border/80 rounded-xl px-4 py-2.5 min-w-[80px]">
              <span className="text-2xl font-bold text-heading">{sector.attractiveness_score}/10</span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-0.5">Attractivité</span>
            </div>
          )}
          {sector.market_size_eur_bn !== null && (
            <div className="flex flex-col items-center bg-surface border border-border/80 rounded-xl px-4 py-2.5 min-w-[80px]">
              <span className="text-2xl font-bold text-heading">{sector.market_size_eur_bn} Md€</span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-0.5">Marché</span>
            </div>
          )}
          {(sector.avg_tjm_min !== null || sector.avg_tjm_max !== null) && (
            <div className="flex flex-col items-center bg-surface border border-border/80 rounded-xl px-4 py-2.5 min-w-[80px]">
              <span className="text-lg font-bold text-heading">
                {sector.avg_tjm_min ?? "—"}–{sector.avg_tjm_max ?? "—"} €
              </span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-0.5">TJM moyen</span>
            </div>
          )}
          {sector.market_growth_pct !== null && (
            <div className="flex flex-col items-center bg-surface border border-border/80 rounded-xl px-4 py-2.5 min-w-[72px]">
              <span className="text-2xl font-bold text-success">+{sector.market_growth_pct}%</span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-0.5">Croissance</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Grille principale 8+4 ────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5 items-start">

        {/* ── Colonne gauche (8) ──────────────────────────────────────────────── */}
        <div className="col-span-8 flex flex-col gap-5">

          {/* Fit des pratiques Kredo */}
          <SurfaceCard className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
              Adéquation pratiques Kredo
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {practiceKeys.map(key => {
                const score = toNum(practices[key])
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-body">{PRACTICE_LABEL[key]}</span>
                      <span className="text-xs font-bold text-heading">{score ?? "—"}/10</span>
                    </div>
                    <ScoreBar value={score} max={10} />
                  </div>
                )
              })}
            </div>
          </SurfaceCard>

          {/* Playbook / Acteurs clés — onglets internes */}
          <SurfaceCard className="p-5">
            <div className="flex items-center gap-1 border-b border-border/40 mb-4 -mt-1">
              {(["playbook", "players"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold transition-colors border-b-2 -mb-px",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-body"
                  )}
                >
                  {tab === "playbook" ? "Playbook commercial" : "Acteurs clés"}
                </button>
              ))}
            </div>

            {activeTab === "playbook" && (
              <div className="grid grid-cols-2 gap-6">
                {/* Personas */}
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Personas cibles</h3>
                  <div className="flex flex-col gap-3">
                    {sector.playbook.personas.map((p, i) => (
                      <div key={i} className="bg-canvas/50 border border-border/50 rounded-lg p-3">
                        <p className="text-xs font-bold text-heading mb-1">{p.role}</p>
                        <p className="text-[10px] text-body leading-relaxed mb-1">
                          <span className="font-semibold text-muted">Enjeu : </span>{p.enjeu}
                        </p>
                        <p className="text-[10px] text-danger/80 leading-relaxed">
                          <span className="font-semibold">Peur : </span>{p.peur}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arguments ROI + Points d'entrée */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Arguments ROI</h3>
                    <ul className="flex flex-col gap-1.5">
                      {sector.playbook.roi_arguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-body">
                          <span className="text-success mt-0.5 shrink-0">✓</span>
                          {arg}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Points d&apos;entrée</h3>
                    <ul className="flex flex-col gap-1.5">
                      {sector.playbook.entry_points.map((ep, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-body">
                          <span className="text-primary mt-0.5 shrink-0">→</span>
                          {ep}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Objections — largeur pleine */}
                <div className="col-span-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Objections & réponses</h3>
                  <div className="flex flex-col gap-2">
                    {sector.playbook.objections.map((obj, i) => (
                      <div key={i} className="grid grid-cols-2 gap-3 bg-canvas/40 border border-border/40 rounded-lg p-3">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-muted block mb-1">Objection</span>
                          <p className="text-[11px] text-body italic">&quot;{obj.objection}&quot;</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-success block mb-1">Réponse</span>
                          <p className="text-[11px] text-body">{obj.reponse}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "players" && (
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: "Acteurs PACA", players: sector.key_players_paca },
                  { label: "Acteurs nationaux", players: sector.key_players_national },
                ].map(({ label, players }) => (
                  <div key={label}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">{label}</h3>
                    {players.length === 0 ? (
                      <p className="text-xs text-muted italic">Aucun acteur renseigné</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {players.map((p, i) => (
                          <div key={i} className="bg-canvas/50 border border-border/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-heading">{p.name}</span>
                              <span className="text-[9px] font-semibold text-muted border border-border/60 rounded px-1.5 py-0.5">
                                {p.size}
                              </span>
                            </div>
                            <p className="text-[10px] text-body">{p.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Pain points */}
          <SurfaceCard className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
              Points de douleur ({sector.pain_points.length})
            </h2>
            {sector.pain_points.length === 0 ? (
              <p className="text-xs text-muted italic">Aucun pain point renseigné</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/30">
                    <th className="py-2 pr-3">Problème</th>
                    <th className="py-2 pr-3 w-28">Pratique</th>
                    <th className="py-2 text-right w-20">Fréquence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sector.pain_points.map(pp => (
                    <tr key={pp.id} className="hover:bg-canvas/30 transition-colors group">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-heading">{pp.title}</p>
                        {pp.description && (
                          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{pp.description}</p>
                        )}
                        {pp.verbatim && (
                          <p className="text-[10px] text-body italic mt-1 border-l-2 border-border/60 pl-2">
                            &quot;{pp.verbatim}&quot;
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {pp.kredo_practice ? (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                            {PRACTICE_LABEL[pp.kredo_practice]}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-bold text-heading">
                        {pp.frequency_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SurfaceCard>
        </div>

        {/* ── Colonne droite (4) ──────────────────────────────────────────────── */}
        <div className="col-span-4 flex flex-col gap-5">

          {/* Trigger events */}
          <SurfaceCard className="p-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Trigger events
              </h2>
              <div className="flex items-center gap-1.5">
                {pendingEvents.length > 0 && (
                  <span className="text-[9px] font-bold bg-danger/10 text-danger border border-danger/20 rounded px-1.5 py-0.5">
                    {pendingEvents.length} en attente
                  </span>
                )}
                {actedEvents.length > 0 && (
                  <span className="text-[9px] font-bold bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5">
                    {actedEvents.length} traité{actedEvents.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {sector.events.length === 0 ? (
              <p className="text-xs text-muted italic py-2">Aucun trigger event</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sector.events.map(ev => {
                  const status = eventStatuses[ev.id] ?? ev.status
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        status === "dismissed" && "opacity-40",
                        status === "acted"
                          ? "border-success/30 bg-success/5"
                          : status === "pending"
                            ? "border-warning/30 bg-warning/5"
                            : "border-border/40 bg-canvas/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[11px] font-bold text-heading leading-tight flex-1">{ev.title}</p>
                        <span className="text-[9px] font-semibold text-muted border border-border/60 rounded px-1.5 py-0.5 shrink-0">
                          {EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}
                        </span>
                      </div>
                      {ev.event_date && (
                        <p className="text-[10px] text-muted mb-1.5">{formatDate(ev.event_date)}</p>
                      )}
                      {ev.commercial_opportunity && (
                        <p className="text-[10px] text-primary italic mb-2 leading-relaxed">
                          {ev.commercial_opportunity}
                        </p>
                      )}
                      {status === "pending" && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => markEvent(ev.id, "acted")}
                            className="flex-1 h-7 text-[10px] font-bold bg-primary text-white rounded-lg hover:bg-primary-deep transition-colors"
                          >
                            Traiter
                          </button>
                          <button
                            type="button"
                            onClick={() => markEvent(ev.id, "dismissed")}
                            className="flex-1 h-7 text-[10px] font-semibold bg-surface text-muted border border-border rounded-lg hover:bg-surface-hover transition-colors"
                          >
                            Ignorer
                          </button>
                        </div>
                      )}
                      {status === "acted" && (
                        <span className="text-[9px] font-bold text-success">✓ Traité</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </SurfaceCard>

          {/* Calendrier réglementaire */}
          <SurfaceCard className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted border-b border-border/40 pb-2 mb-3">
              Calendrier réglementaire
            </h2>
            {sector.regulatory_items.length === 0 ? (
              <p className="text-xs text-muted italic py-2">Aucune réglementation renseignée</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sector.regulatory_items.map(reg => (
                  <div key={reg.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-heading leading-tight flex-1">{reg.name}</p>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0", URGENCY_STYLE[reg.urgency])}>
                        {URGENCY_LABEL[reg.urgency]}
                      </span>
                    </div>
                    {reg.authority && (
                      <p className="text-[10px] text-muted">{reg.authority}</p>
                    )}
                    {reg.deadline_date && (
                      <p className="text-[10px] font-semibold text-body">
                        Échéance : {formatDate(reg.deadline_date)}
                      </p>
                    )}
                    {reg.commercial_angle && (
                      <p className="text-[10px] text-primary italic leading-relaxed">{reg.commercial_angle}</p>
                    )}
                    {reg.is_commercial_window && (
                      <span className="text-[9px] font-bold text-secondary bg-secondary/10 border border-secondary/20 rounded px-1.5 py-0.5 w-fit">
                        Fenêtre commerciale
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Comptes liés */}
          <SurfaceCard className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted border-b border-border/40 pb-2 mb-3">
              Comptes secteur ({sector.companies.length})
            </h2>
            {sector.companies.length === 0 ? (
              <p className="text-xs text-muted italic py-2">Aucun compte lié à ce secteur</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/20">
                {sector.companies.map(company => (
                  <div key={company.id} className="flex items-center justify-between py-2.5 gap-2">
                    <Link
                      href={`/prospection/accounts/${company.id}`}
                      className="text-[11px] font-semibold text-heading hover:text-primary transition-colors truncate flex-1"
                    >
                      {company.name}
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", LIFECYCLE_STYLE[company.lifecycle_status] ?? "bg-border/40 text-muted border-border")}>
                        {LIFECYCLE_LABEL[company.lifecycle_status] ?? company.lifecycle_status}
                      </span>
                      {company.legacy_folio_score !== null && (
                        <span className="text-[10px] font-bold text-heading">
                          {company.legacy_folio_score}/5
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}

// Helper local pour éviter le cast répété
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null }
  return null
}
