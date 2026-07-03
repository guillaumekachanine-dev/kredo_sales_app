"use client"

import { useEffect, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { createClient } from "@/lib/supabase/client"
import { saveResultAsDocument } from "@/components/accounts-contacts/intelligence/save-as-document"
import type {
  ReportBrief,
  ReportPeriodPreset,
  ActivityCommercialContent,
  ActivityRecruitmentContent,
} from "@/app/(app)/reports/_data/reports-types"
import { ActivityCommercialReportView } from "./ActivityCommercialReportView"
import { ActivityRecruitmentReportView } from "./ActivityRecruitmentReportView"

type ReportKind = "activity_commercial" | "activity_recruitment"
type RunStatus = "idle" | "loading" | "done" | "error"
type ActivityContent = ActivityCommercialContent | ActivityRecruitmentContent

const REPORT_CONFIG: Record<ReportKind, { title: string; description: string; workflowId: "report-activity-commercial" | "report-activity-recruitment" }> = {
  activity_commercial: {
    title: "Rapport d'activité commerciale",
    description: "Synthèse des actions commerciales, mouvements du pipe et priorités sur la période sélectionnée.",
    workflowId: "report-activity-commercial",
  },
  activity_recruitment: {
    title: "Rapport d'activité recrutement",
    description: "Synthèse du funnel recrutement interne et du positionnement candidats sur la période sélectionnée.",
    workflowId: "report-activity-recruitment",
  },
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// "Depuis le début de la période jusqu'à aujourd'hui" — cohérent avec l'usage
// (rapport de suivi, pas rapport de clôture), contrairement à une fenêtre
// glissante purement passée.
function computePeriodRange(preset: ReportPeriodPreset, customStart: string, customEnd: string) {
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

  // year
  const firstOfYear = new Date(today.getFullYear(), 0, 1)
  return { startDate: toISODate(firstOfYear), endDate: todayISO }
}

export function ActivityReportModal({
  open,
  onOpenChange,
  reportType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportType: ReportKind
}) {
  const config = REPORT_CONFIG[reportType]
  const supabase = createClient()

  const [periodPreset, setPeriodPreset] = useState<ReportPeriodPreset>("month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [additionalInstructions, setAdditionalInstructions] = useState("")

  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [content, setContent] = useState<ActivityContent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Abonnement Realtime : dès qu'on a un runId, on écoute le résultat — même
  // pattern que SummaryDrawerContent (REPORT-001 Lot 1).
  useEffect(() => {
    if (!runId) return

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
          const row = payload.new as { id: string; status: string; content_json: ActivityContent }
          if (row.status === "succeeded") {
            setResultId(row.id)
            setContent(row.content_json)
            setRunStatus("done")
          } else if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetAll() {
    setRunStatus("idle")
    setRunId(null)
    setResultId(null)
    setContent(null)
    setErrorMsg(null)
    setSaveStatus("idle")
  }

  async function handleGenerate() {
    setRunStatus("loading")
    setContent(null)
    setResultId(null)
    setErrorMsg(null)

    const { startDate, endDate } = computePeriodRange(periodPreset, customStart, customEnd)
    const brief: ReportBrief = {
      reportType,
      period: { preset: periodPreset, startDate, endDate, asOfDate: toISODate(new Date()) },
      scope: {},
      audience: "self",
      detailLevel: "standard",
      outputFormats: ["web"],
      options: {},
      additionalInstructions: additionalInstructions.trim() || undefined,
    }

    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: config.workflowId,
          entityType: "workspace",
          input: brief,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = await res.json() as { runId: string }
      setRunId(newRunId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  async function handleSaveAsDocument() {
    if (!resultId) {
      setSaveStatus("error")
      return
    }
    setSaveStatus("saving")
    const res = await saveResultAsDocument({ resultId })
    setSaveStatus(res.error ? "error" : "saved")
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetAll()
      }}
      title={config.title}
      description={runStatus === "idle" || runStatus === "error" ? config.description : undefined}
      footer={
        runStatus === "done" && content ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button variant="secondary" size="sm" onClick={resetAll}>
              Refaire
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAsDocument}
              disabled={!resultId || saveStatus === "saving" || saveStatus === "saved"}
            >
              {saveStatus === "saving" && "Enregistrement…"}
              {saveStatus === "saved" && "✓ Enregistré"}
              {saveStatus === "error" && "Échec — réessayer"}
              {saveStatus === "idle" && "Enregistrer dans la bibliothèque"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" loading={runStatus === "loading"} onClick={handleGenerate}>
              Générer le rapport
            </Button>
          </div>
        )
      }
    >
      {runStatus === "loading" ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-semibold text-heading animate-pulse">Analyse des données…</p>
          <p className="text-xs text-muted max-w-[280px]">n8n travaille — le résultat apparaîtra automatiquement.</p>
        </div>
      ) : runStatus === "done" && content ? (
        reportType === "activity_commercial" ? (
          <ActivityCommercialReportView content={content as ActivityCommercialContent} />
        ) : (
          <ActivityRecruitmentReportView content={content as ActivityRecruitmentContent} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity-report-period" className="text-xs font-semibold text-heading">
              Période du rapport
            </label>
            <Select
              id="activity-report-period"
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as ReportPeriodPreset)}
              fullWidth
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois-ci</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
              <option value="custom">Période personnalisée</option>
            </Select>
          </div>

          {periodPreset === "custom" && (
            <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/20 pl-3 py-1">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="activity-report-start" className="text-[10px] font-semibold text-muted">
                  Date de début
                </label>
                <input
                  id="activity-report-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
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
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity-report-instructions" className="text-xs font-semibold text-heading">
              Instructions complémentaires
            </label>
            <textarea
              id="activity-report-instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Ex : insiste sur les comptes stratégiques, le staffing en tension…"
              className="w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[70px]"
            />
          </div>

          {runStatus === "error" && errorMsg && (
            <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
              {errorMsg}
            </div>
          )}

          <div className="rounded-lg border border-border bg-canvas/30 p-3 text-[11px] text-muted">
            Faits calculés automatiquement depuis Supabase — le LLM ne fait que rédiger la synthèse et les priorités
            à partir de ces faits.
          </div>
        </div>
      )}
    </AppDialog>
  )
}
