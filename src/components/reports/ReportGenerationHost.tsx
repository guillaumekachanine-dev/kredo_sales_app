"use client"

import { useEffect, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { ActivityReportModal } from "@/components/reports/ActivityReportModal"
import {
  REPORT_GENERATION_EVENT,
  type ReportGenerationKind,
  type ReportGenerationRequest,
} from "@/lib/reports/report-generation"

const REPORT_OPTIONS: Array<{
  reportType: ReportGenerationKind
  title: string
  description: string
  badge: string
}> = [
  {
    reportType: "activity_commercial",
    title: "Rapport activité commerciale",
    description: "Synthèse des actions commerciales, mouvements du pipe et priorités sur la période.",
    badge: "Commercial",
  },
  {
    reportType: "activity_recruitment",
    title: "Rapport activité recrutement",
    description: "Synthèse du funnel recrutement et des positionnements candidats sur besoins.",
    badge: "Recrutement",
  },
]

export function ReportGenerationHost() {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<ReportGenerationKind>("activity_commercial")

  useEffect(() => {
    function handleOpen(event: Event) {
      const customEvent = event as CustomEvent<ReportGenerationRequest>
      const request = customEvent.detail ?? { origin: "global" }

      if (request.reportType) {
        setSelectedReportType(request.reportType)
        setSelectorOpen(false)
        setReportOpen(true)
        return
      }

      setReportOpen(false)
      setSelectorOpen(true)
    }

    window.addEventListener(REPORT_GENERATION_EVENT, handleOpen)
    return () => window.removeEventListener(REPORT_GENERATION_EVENT, handleOpen)
  }, [])

  function openReport(reportType: ReportGenerationKind) {
    setSelectedReportType(reportType)
    setSelectorOpen(false)
    setReportOpen(true)
  }

  return (
    <>
      <AppDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        title="Produire un rapport"
        description="Choisis le type de rapport à générer. Les prochains formats seront ajoutés ici sans refaire le câblage."
        footer={(
          <Button variant="secondary" size="sm" onClick={() => setSelectorOpen(false)}>
            Annuler
          </Button>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {REPORT_OPTIONS.map((option) => (
            <button
              key={option.reportType}
              type="button"
              onClick={() => openReport(option.reportType)}
              className="group flex min-h-[9rem] flex-col items-start justify-between rounded-[var(--radius-medium)] border border-border bg-canvas/50 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.98]"
            >
              <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                {option.badge}
              </span>
              <span className="mt-4 block text-sm font-bold text-heading">
                {option.title}
              </span>
              <span className="mt-2 block text-xs leading-5 text-body">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </AppDialog>

      <ActivityReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportType={selectedReportType}
      />
    </>
  )
}
