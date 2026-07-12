"use client"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import type { SuiviData } from "@/lib/prospection/suivi-data"
import { openReportGeneration } from "@/lib/reports/report-generation"
import {
  ChannelIconCircle,
  AiSparkBars,
  StatusDot,
} from "./suivi-parts"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"

// ── Suivi des Actions — Vue Mobile ───────────────────────────────────────────
// Organisation fidèle à la maquette mobile :
//   1. Header "Prospection Intelligence — Actions"
//   2. Mon Dashboard Personnel (actions urgentes + objectif journalier)
//   3. Mon Flux d'Actions (liste canal + CTA + barre de progression)
//   4. Prospects à Relancer Urgence (bouton "Relancer via IA")

export function SuiviMobileView({ data }: { data: SuiviData }) {
  const { dashboardPersonnel, fluxActions, prospectsUrgents, actionsCritiques, relancesIA } = data

  const urgentsPct = dashboardPersonnel.actionsUrgentesTotal > 0
    ? Math.round((dashboardPersonnel.actionsUrgentesCount / dashboardPersonnel.actionsUrgentesTotal) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5 bg-canvas px-4 py-5 pb-24 select-none min-h-screen">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
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
            Tableau de bord activité
          </h1>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openReportGeneration({ origin: "commercial_activity" })}
          className="bg-primary hover:bg-primary-deep text-white cursor-pointer font-semibold py-1 h-8 min-h-8 text-[11px] px-2.5 rounded-md"
        >
          + rapport
        </Button>
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

          <ContextualCommunicationButton
            intent="prospection_follow_up"
            origin="prospection_priority"
            label="Relancer via IA"
            variant="primary"
            fullWidth
            className="h-11 min-h-11 text-sm"
            companyName={prospectsUrgents[0]?.company}
            sectorName={prospectsUrgents[0]?.sector}
            mustInclude={prospectsUrgents[0]
              ? `Prospect prioritaire : ${prospectsUrgents[0].company}\nRaison : ${prospectsUrgents[0].raison}\nSecteur : ${prospectsUrgents[0].sector}`
              : "Relance prioritaire depuis le suivi prospection mobile."}
          />
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
    </div>
  )
}
