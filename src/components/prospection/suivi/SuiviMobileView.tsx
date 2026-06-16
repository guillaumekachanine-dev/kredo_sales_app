"use client"

import { useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SuiviData } from "@/lib/prospection/suivi-data"
import {
  ChannelIconCircle,
  CHANNEL_LABEL,
  AiSparkBars,
  StatusDot,
} from "./suivi-parts"

// ── Suivi des Actions — Vue Mobile ───────────────────────────────────────────
// Organisation fidèle à la maquette mobile :
//   1. Header "Prospection Intelligence — Actions"
//   2. Mon Dashboard Personnel (actions urgentes + objectif journalier)
//   3. Mon Flux d'Actions (liste canal + CTA + barre de progression)
//   4. Prospects à Relancer Urgence (bouton "Relancer via IA")

export function SuiviMobileView({ data }: { data: SuiviData }) {
  const { dashboardPersonnel, fluxActions, prospectsUrgents, actionsCritiques, relancesIA } = data

  const [relancerOpen, setRelancerOpen] = useState(false)
  const [sheetProspect, setSheetProspect] = useState<string | null>(null)

  const urgentsPct = dashboardPersonnel.actionsUrgentesTotal > 0
    ? Math.round((dashboardPersonnel.actionsUrgentesCount / dashboardPersonnel.actionsUrgentesTotal) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5 bg-canvas px-4 py-5 pb-24 select-none min-h-screen">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <button
          type="button"
          className="p-1.5 rounded-lg text-body"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-sm font-bold font-heading text-heading tracking-tight">
          Prospection Intelligence — Actions
        </h1>

        <div className="flex items-center gap-2">
          <button type="button" className="p-1.5 rounded-lg border border-border bg-surface text-body" aria-label="Calendrier">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button type="button" className="p-1.5 rounded-lg border border-border bg-surface text-body relative" aria-label="Notifications">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger border border-surface" />
          </button>
          <div className="w-7 h-7 rounded-full bg-primary border border-border flex items-center justify-center font-extrabold text-[10px] text-white">
            GK
          </div>
        </div>
      </header>

      {/* ── Mon Dashboard Personnel ───────────────────────────────────────── */}
      <section>
        <SurfaceCard className="p-4 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-heading">Mon Dashboard Personnel</h2>

          {/* Mes Actions Urgentes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-danger flex items-center gap-1.5">
                <StatusDot status="danger" />
                Mes Actions Urgentes
              </span>
              <span className="text-[10px] font-bold text-danger">
                {dashboardPersonnel.actionsUrgentesCount}/{dashboardPersonnel.actionsUrgentesTotal}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-danger transition-all"
                style={{ width: `${urgentsPct}%` }}
              />
            </div>
          </div>

          {/* Mon Objectif Journalier */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-success flex items-center gap-1.5">
                <StatusDot status="success" />
                Mon Objectif Journalier
              </span>
              <span className="text-[10px] font-bold text-success">
                {dashboardPersonnel.objectifJournalierPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${dashboardPersonnel.objectifJournalierPct}%` }}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      {/* ── Mon Flux d'Actions ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
          Mon Flux d&apos;Actions
        </h2>

        <SurfaceCard className="p-0 overflow-hidden">
          <ul className="flex flex-col divide-y divide-border/60">
            {fluxActions.map((action) => (
              <li key={action.id} className="flex items-center gap-3 px-4 py-3.5">
                {/* Icône canal */}
                <ChannelIconCircle channel={action.channel} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading leading-tight">
                    {action.channelLabel}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">{action.dateLabel}</p>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        action.status === "danger" ? "bg-danger" :
                        action.status === "warning" ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${action.progress}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  className="shrink-0 h-9 min-w-[60px] rounded-lg bg-primary/[0.07] border border-primary/20 px-3 text-[11px] font-bold text-primary transition-colors hover:bg-primary/[0.14]"
                >
                  &gt;44px
                </button>
              </li>
            ))}

            {fluxActions.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-muted">
                Aucune action dans votre flux.
              </li>
            )}
          </ul>
        </SurfaceCard>
      </section>

      {/* ── Aperçu Actions Critiques (compact) ───────────────────────────── */}
      {actionsCritiques.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
            Actions Critiques
          </h2>
          <div className="flex flex-col gap-2">
            {actionsCritiques.slice(0, 2).map((a) => (
              <SurfaceCard key={a.id} className="p-3.5 border-danger/20" accent="danger">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold text-white shrink-0">
                    {a.avatarInitials}
                  </span>
                  <span className="text-xs font-semibold text-heading truncate">{a.consultantName}</span>
                  <span className="ml-auto text-[10px] font-bold text-danger shrink-0">{a.overdueLabel}</span>
                </div>
                <p className="text-[11px] text-body leading-relaxed line-clamp-2 mb-2">{a.description}</p>
                {/* AI strip */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted">ai_success_prediction</span>
                    <AiSparkBars value={a.aiSuccessPrediction} color="bg-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted">ai_recommended_next_step</span>
                    <AiSparkBars value={a.aiSuccessPrediction * 0.85} color="bg-success" />
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </section>
      )}

      {/* ── Prospects à Relancer Urgence ──────────────────────────────────── */}
      <section>
        <SurfaceCard className="p-4 flex flex-col gap-3" accent="warning">
          <h2 className="text-sm font-bold text-heading flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-warning/[0.12]">
              <svg className="w-3 h-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            Prospects à Relancer Urgence
          </h2>

          {prospectsUrgents.slice(0, 2).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-heading truncate">{p.company}</span>
              <span className="text-[10px] text-muted truncate">{p.raison}</span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRelancerOpen(true)}
            className="w-full h-11 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-primary-deep"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Relancer via IA
          </button>
        </SurfaceCard>
      </section>

      {/* ── Relances IA (aperçu mobile) ───────────────────────────────────── */}
      {relancesIA.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
            Relances IA Recommandées
          </h2>
          <div className="flex flex-col gap-2">
            {relancesIA.slice(0, 2).map((r) => (
              <SurfaceCard key={r.id} className="p-3.5" accent="primary">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/[0.08] text-[9px] font-extrabold text-primary border border-primary/20 shrink-0">
                    {r.avatarInitials}
                  </span>
                  <span className="text-xs font-semibold text-heading truncate">{r.company}</span>
                  <span className="ml-auto text-[10px] text-muted shrink-0">{r.sector}</span>
                </div>
                <p className="text-[11px] text-body leading-relaxed line-clamp-2 mb-2">{r.description}</p>
                <button
                  type="button"
                  className="w-full h-10 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-primary-deep"
                >
                  Planifier l&apos;Action
                </button>
              </SurfaceCard>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom Sheet : Relancer via IA ──────────────────────────────── */}
      {relancerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setRelancerOpen(false)}
        >
          <div
            className="bg-surface border-t border-border rounded-t-2xl shadow-2xl w-full p-6 pb-8 max-w-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-5" />
            <h3 className="text-sm font-bold text-heading mb-2">Relancer via IA</h3>
            <p className="text-xs text-body leading-relaxed mb-5">
              Le moteur IA va analyser les prospects en attente et générer des séquences
              de relance personnalisées via n8n. Confirmer pour lancer l&apos;analyse.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setRelancerOpen(false)}
                className="w-full h-11 bg-primary hover:bg-primary-deep text-white font-bold text-sm rounded-lg transition-colors"
              >
                Lancer l&apos;analyse IA
              </button>
              <button
                type="button"
                onClick={() => setRelancerOpen(false)}
                className="w-full h-11 bg-canvas hover:bg-surface-hover border border-border text-body font-semibold text-sm rounded-lg transition-colors"
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
