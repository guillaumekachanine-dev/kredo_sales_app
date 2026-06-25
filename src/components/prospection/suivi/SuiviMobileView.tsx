"use client"

import { useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
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

  // Modale nouveau rapport
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportTitle, setReportTitle] = useState("Rapport d'activité commerciale")
  const [reportPeriod, setReportPeriod] = useState("mois")
  const [reportCollab, setReportCollab] = useState("all")
  const [includeR1, setIncludeR1] = useState(true)
  const [includeNeeds, setIncludeNeeds] = useState(true)
  const [includeProposals, setIncludeProposals] = useState(true)
  const [includeInterviews, setIncludeInterviews] = useState(true)
  const [includePlacements, setIncludePlacements] = useState(true)
  const [includeIntercontracts, setIncludeIntercontracts] = useState(true)
  const [includeAiSummary, setIncludeAiSummary] = useState(true)
  const [reportFormat, setReportFormat] = useState("pdf")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationSuccess, setGenerationSuccess] = useState(false)

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      setGenerationSuccess(true)
    }, 1200)
  }

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
          onClick={() => setIsReportModalOpen(true)}
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
            </div>
          </div>
        </div>
      )}

      <AppDialog
        open={isReportModalOpen}
        onOpenChange={(open) => {
          setIsReportModalOpen(open)
          if (!open) {
            setGenerationSuccess(false)
            setIsGenerating(false)
          }
        }}
        title="Créer un nouveau rapport d'activité"
        description="Configurez les paramètres pour générer un rapport d'activité commerciale adapté aux ESN."
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsReportModalOpen(false)
                setGenerationSuccess(false)
                setIsGenerating(false)
              }}
            >
              Annuler
            </Button>
            {!generationSuccess && (
              <Button
                variant="primary"
                size="sm"
                loading={isGenerating}
                onClick={handleGenerateReport}
              >
                Générer
              </Button>
            )}
          </div>
        }
      >
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-semibold text-heading animate-pulse">Analyse des données d&apos;activité...</p>
            <p className="text-xs text-muted max-w-[280px]">Calcul des KPIs et compilation par l&apos;IA</p>
          </div>
        ) : generationSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center text-success">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-heading">Rapport généré avec succès !</h3>
            <p className="text-xs text-muted max-w-[320px]">
              Le rapport d&apos;activité de l&apos;ESN a été structuré et exporté au format {reportFormat.toUpperCase()}.
            </p>
            <div className="mt-4 flex gap-2 w-full max-w-[280px]">
              <Button
                variant="brass"
                size="sm"
                fullWidth
                onClick={() => {
                  setIsReportModalOpen(false)
                  setGenerationSuccess(false)
                }}
              >
                Télécharger le rapport
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Titre du rapport */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-title-mobile" className="text-xs font-semibold text-heading">
                Titre du rapport
              </label>
              <Input
                id="report-title-mobile"
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                fullWidth
                placeholder="Ex: Activité Commerciale - Q2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Période */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-period-mobile" className="text-xs font-semibold text-heading">
                  Période du rapport
                </label>
                <Select
                  id="report-period-mobile"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  fullWidth
                >
                  <option value="semaine">Cette semaine</option>
                  <option value="mois">Ce mois-ci</option>
                  <option value="trimestre">Ce trimestre (Q)</option>
                  <option value="annee">Cette année</option>
                  <option value="custom">Période personnalisée</option>
                </Select>
              </div>

              {/* Commercial */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-collab-mobile" className="text-xs font-semibold text-heading">
                  Périmètre / Commercial
                </label>
                <Select
                  id="report-collab-mobile"
                  value={reportCollab}
                  onChange={(e) => setReportCollab(e.target.value)}
                  fullWidth
                >
                  <option value="all">Tous les commerciaux</option>
                  <option value="guillaume">Guillaume Kachanine</option>
                  <option value="alexandre">Alexandre Martin</option>
                  <option value="marie">Marie Dubois</option>
                </Select>
              </div>
            </div>

            {/* Custom dates if selected */}
            {reportPeriod === "custom" && (
              <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/20 pl-3 py-1">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="report-start-mobile" className="text-[10px] font-semibold text-muted">
                    Date de début
                  </label>
                  <Input id="report-start-mobile" type="date" fullWidth />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="report-end-mobile" className="text-[10px] font-semibold text-muted">
                    Date de fin
                  </label>
                  <Input id="report-end-mobile" type="date" fullWidth />
                </div>
              </div>
            )}

            {/* Indicateurs clés ESN */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-heading">Indicateurs clés ESN à inclure</span>
              
              <div className="grid grid-cols-1 gap-2 bg-canvas/40 p-3 rounded-lg border border-border/60">
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeR1}
                    onChange={(e) => setIncludeR1(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Rendez-vous R1 Qualifiés</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeNeeds}
                    onChange={(e) => setIncludeNeeds(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Besoins reçus / Appels d&apos;offres</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeProposals}
                    onChange={(e) => setIncludeProposals(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>CVs envoyés / Propositions</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeInterviews}
                    onChange={(e) => setIncludeInterviews(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Entretiens clients planifiés</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includePlacements}
                    onChange={(e) => setIncludePlacements(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Démarrages & Placements</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeIntercontracts}
                    onChange={(e) => setIncludeIntercontracts(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Gestion intercontrats</span>
                </label>
              </div>
            </div>

            {/* Format d'export & options */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-format-mobile" className="text-xs font-semibold text-heading">
                  Format d&apos;export
                </label>
                <Select
                  id="report-format-mobile"
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  fullWidth
                >
                  <option value="pdf">📄 PDF interactif</option>
                  <option value="excel">📊 Fichier Excel (CSV)</option>
                  <option value="ppt">📉 Présentation PowerPoint</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none font-medium">
                  <input
                    type="checkbox"
                    checked={includeAiSummary}
                    onChange={(e) => setIncludeAiSummary(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Synthèse d&apos;analyse IA (n8n)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
