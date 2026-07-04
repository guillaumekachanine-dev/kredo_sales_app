"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { saveResultAsDocument } from "@/components/accounts-contacts/intelligence/save-as-document"
import type {
  ActivityCommercialContent,
  ActivityRecruitmentContent,
  ReportBrief,
  ReportPeriodPreset,
  WeeklyManagerContent,
} from "@/app/(app)/reports/_data/reports-types"
import { createClient } from "@/lib/supabase/client"
import {
  getReportGenerationOption,
  type ReportGenerationKind,
} from "@/lib/reports/report-generation"
import { getWeekStartDateKey } from "@/lib/agenda/agenda-temporal"
import { ActivityCommercialReportView } from "./ActivityCommercialReportView"
import { ActivityRecruitmentReportView } from "./ActivityRecruitmentReportView"
import { WeeklyManagerReportView } from "./WeeklyManagerReportView"

type RunStatus = "idle" | "loading" | "done" | "error"
type ActivityContent = ActivityCommercialContent | ActivityRecruitmentContent
type ReportContent = ActivityContent | WeeklyManagerContent

const READY_ACTIVITY_WORKFLOW_IDS: Record<
  "activity_commercial" | "activity_recruitment",
  "report-activity-commercial" | "report-activity-recruitment"
> = {
  activity_commercial: "report-activity-commercial",
  activity_recruitment: "report-activity-recruitment",
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}

function computePeriodRange(
  preset: ReportPeriodPreset,
  customStart: string,
  customEnd: string,
) {
  const today = new Date()
  const todayISO = toISODate(today)

  if (preset === "custom") {
    return { startDate: customStart || todayISO, endDate: customEnd || todayISO }
  }

  if (preset === "week") {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
    return { startDate: toISODate(monday), endDate: todayISO }
  }

  if (preset === "month") {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    return { startDate: toISODate(firstOfMonth), endDate: todayISO }
  }

  if (preset === "quarter") {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
    const firstOfQuarter = new Date(today.getFullYear(), quarterStartMonth, 1)
    return { startDate: toISODate(firstOfQuarter), endDate: todayISO }
  }

  const firstOfYear = new Date(today.getFullYear(), 0, 1)
  return { startDate: toISODate(firstOfYear), endDate: todayISO }
}

function PlannedReportState({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="inline-flex w-fit items-center rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">
        À développer
      </div>

      <AlertBlock
        variant="info"
        title={`${title} en préparation`}
        description="Le cas d’usage est maintenant visible dans le sélecteur, mais aucun workflow IA n’est encore raccordé pour lancer une génération réelle."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-medium)] border border-border/70 bg-canvas/35 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Objectif
          </p>
          <p className="mt-2 text-sm leading-6 text-body">
            Préparer le point d’entrée produit pour le futur rapport sans simuler un résultat incomplet.
          </p>
        </div>

        <div className="rounded-[var(--radius-medium)] border border-border/70 bg-canvas/35 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Statut
          </p>
          <p className="mt-2 text-sm leading-6 text-body">
            Le support d’accès est prêt. Le cadrage métier et le workflow n8n restent à brancher.
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReportGenerationDrawer({
  open,
  onOpenChange,
  onBack,
  reportType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBack: () => void
  reportType: ReportGenerationKind
}) {
  const option = getReportGenerationOption(reportType)
  const isReadyReport =
    reportType === "activity_commercial" ||
    reportType === "activity_recruitment" ||
    reportType === "weekly_manager"
  const isWeeklyManager = reportType === "weekly_manager"
  const supabase = useMemo(() => createClient(), [])

  const [periodPreset, setPeriodPreset] = useState<ReportPeriodPreset>("month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [weeklyPeriodChoice, setWeeklyPeriodChoice] = useState<"current" | "next">("current")
  const [weeklyIsWorkspaceWide, setWeeklyIsWorkspaceWide] = useState(false)

  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [content, setContent] = useState<ReportContent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  function resetExecutionState() {
    setRunStatus("idle")
    setRunId(null)
    setResultId(null)
    setContent(null)
    setErrorMsg(null)
    setSaveStatus("idle")
  }

  function resetAll() {
    setPeriodPreset("month")
    setCustomStart("")
    setCustomEnd("")
    setAdditionalInstructions("")
    setWeeklyPeriodChoice("current")
    setWeeklyIsWorkspaceWide(false)
    resetExecutionState()
  }

  useEffect(() => {
    if (!runId || !isReadyReport) return

    const channel = supabase
      .channel(`activity-report-result-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_intelligence_results",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            status: string
            content_json: ReportContent
          }

          if (row.status === "succeeded") {
            setResultId(row.id)
            setContent(row.content_json)
            setRunStatus("done")
            return
          }

          if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isReadyReport, runId, supabase])

  async function handleGenerate() {
    if (!isReadyReport || !option) {
      return
    }

    setRunStatus("loading")
    setContent(null)
    setResultId(null)
    setErrorMsg(null)

    try {
      // weekly_manager a son propre endpoint : la route précalcule
      // AgendaSnapshot + get_weekly_business_facts + scoring avant d'appeler
      // n8n (ADR-0010 Lot 2) — contrairement aux autres rapports, elle ne
      // passe pas par /api/n8n/trigger directement.
      const res = isWeeklyManager
        ? await fetch("/api/reports/weekly-manager/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              periodStart: weeklyPeriodChoice === "next" ? addDaysToDateKey(getWeekStartDateKey(toISODate(new Date())), 7) : undefined,
              isWorkspaceWide: weeklyIsWorkspaceWide,
              additionalInstructions: additionalInstructions.trim() || undefined,
            }),
          })
        : await fetch("/api/n8n/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workflowId: READY_ACTIVITY_WORKFLOW_IDS[reportType as "activity_commercial" | "activity_recruitment"],
              entityType: "workspace",
              input: {
                reportType,
                period: {
                  preset: periodPreset,
                  ...computePeriodRange(periodPreset, customStart, customEnd),
                  asOfDate: toISODate(new Date()),
                },
                scope: {},
                audience: "self",
                detailLevel: "standard",
                outputFormats: ["web"],
                options: {},
                additionalInstructions: additionalInstructions.trim() || undefined,
              } satisfies ReportBrief,
            }),
          })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = await res.json() as { runId: string }
      setRunId(newRunId)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  async function handleSaveAsDocument() {
    if (!resultId) {
      setSaveStatus("error")
      return
    }

    setSaveStatus("saving")
    const response = await saveResultAsDocument({ resultId })
    setSaveStatus(response.error ? "error" : "saved")
  }

  if (!option) {
    return null
  }

  const footer = !isReadyReport ? (
    <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
      Fermer
    </Button>
  ) : runStatus === "done" && content ? (
    <>
      <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
        Fermer
      </Button>
      <Button variant="secondary" size="sm" onClick={resetExecutionState}>
        Refaire
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSaveAsDocument}
        disabled={!resultId || saveStatus === "saving" || saveStatus === "saved"}
      >
        {saveStatus === "saving" && "Enregistrement…"}
        {saveStatus === "saved" && "Enregistré"}
        {saveStatus === "error" && "Échec — réessayer"}
        {saveStatus === "idle" && "Enregistrer dans la bibliothèque"}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
        Annuler
      </Button>
      <Button
        variant="primary"
        size="sm"
        loading={runStatus === "loading"}
        loadingLabel="Génération…"
        onClick={handleGenerate}
      >
        Générer le rapport
      </Button>
    </>
  )

  return (
    <AppDrawer
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetAll()
      }}
      title={(
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetAll()
              onBack()
            }}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-small)] border border-border bg-canvas/40 text-muted transition-colors hover:border-border/80 hover:bg-canvas/65 hover:text-heading"
            aria-label="Retour à la sélection du rapport"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="min-w-0 font-heading text-base font-bold leading-7 tracking-tight text-heading">
            {option.title}
          </h2>
        </div>
      )}
      description={
        isReadyReport && (runStatus === "idle" || runStatus === "error")
          ? option.description
          : undefined
      }
      width="default"
      showMobileCloseButton
      footer={footer}
    >
      {!isReadyReport ? (
        <PlannedReportState title={option.title} />
      ) : runStatus === "loading" ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <svg
            className="size-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="animate-pulse text-sm font-semibold text-heading">
            Analyse des données…
          </p>
          <p className="max-w-[280px] text-xs text-muted">
            n8n travaille. Le résultat apparaîtra automatiquement.
          </p>
        </div>
      ) : runStatus === "done" && content ? (
        isWeeklyManager ? (
          <WeeklyManagerReportView content={content as WeeklyManagerContent} />
        ) : reportType === "activity_commercial" ? (
          <ActivityCommercialReportView content={content as ActivityCommercialContent} />
        ) : (
          <ActivityRecruitmentReportView content={content as ActivityRecruitmentContent} />
        )
      ) : isWeeklyManager ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Période</span>
            <div className="inline-flex rounded-[var(--radius-medium)] border border-border bg-canvas p-0.5 w-fit">
              {(["current", "next"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setWeeklyPeriodChoice(choice)}
                  className={cn(
                    "rounded-[calc(var(--radius-medium)-4px)] px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 ease-in-out cursor-pointer",
                    weeklyPeriodChoice === choice
                      ? "bg-surface text-heading shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "text-muted hover:text-heading",
                  )}
                  aria-pressed={weeklyPeriodChoice === choice}
                >
                  {choice === "current" ? "Cette semaine" : "Semaine prochaine"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Périmètre</span>
            <div className="inline-flex rounded-[var(--radius-medium)] border border-border bg-canvas p-0.5 w-fit">
              {([false, true] as const).map((isWide) => (
                <button
                  key={String(isWide)}
                  type="button"
                  onClick={() => setWeeklyIsWorkspaceWide(isWide)}
                  className={cn(
                    "rounded-[calc(var(--radius-medium)-4px)] px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 ease-in-out cursor-pointer",
                    weeklyIsWorkspaceWide === isWide
                      ? "bg-surface text-heading shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "text-muted hover:text-heading",
                  )}
                  aria-pressed={weeklyIsWorkspaceWide === isWide}
                >
                  {isWide ? "Tout le workspace" : "Mon périmètre"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="weekly-report-instructions" className="text-xs font-semibold text-heading">
              Instructions complémentaires
            </label>
            <textarea
              id="weekly-report-instructions"
              value={additionalInstructions}
              onChange={(event) => setAdditionalInstructions(event.target.value)}
              placeholder="Ex : insiste sur les comptes stratégiques en cours de relance…"
              className="min-h-[70px] w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {runStatus === "error" && errorMsg ? (
            <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
              {errorMsg}
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-canvas/30 p-3 text-[11px] text-muted">
            Faits calculés depuis l&apos;agenda et les données métier. Le LLM ne fait que rédiger la
            synthèse et les recommandations à partir de ces faits déjà notés.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity-report-period" className="text-xs font-semibold text-heading">
              Période du rapport
            </label>
            <Select
              id="activity-report-period"
              value={periodPreset}
              onChange={(event) => setPeriodPreset(event.target.value as ReportPeriodPreset)}
              fullWidth
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois-ci</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
              <option value="custom">Période personnalisée</option>
            </Select>
          </div>

          {periodPreset === "custom" ? (
            <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/20 py-1 pl-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="activity-report-start" className="text-[10px] font-semibold text-muted">
                  Date de début
                </label>
                <input
                  id="activity-report-start"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="activity-report-end" className="text-[10px] font-semibold text-muted">
                  Date de fin
                </label>
                <input
                  id="activity-report-end"
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity-report-instructions" className="text-xs font-semibold text-heading">
              Instructions complémentaires
            </label>
            <textarea
              id="activity-report-instructions"
              value={additionalInstructions}
              onChange={(event) => setAdditionalInstructions(event.target.value)}
              placeholder="Ex : insiste sur les comptes stratégiques, le staffing en tension…"
              className="min-h-[70px] w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {runStatus === "error" && errorMsg ? (
            <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
              {errorMsg}
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-canvas/30 p-3 text-[11px] text-muted">
            Faits calculés automatiquement depuis Supabase. Le LLM ne fait que rédiger la
            synthèse et les priorités à partir de ces faits.
          </div>
        </div>
      )}
    </AppDrawer>
  )
}
