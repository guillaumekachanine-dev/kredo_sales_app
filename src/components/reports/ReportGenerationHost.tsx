"use client"

import { useEffect, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { ReportGenerationDrawer } from "@/components/reports/ReportGenerationDrawer"
import { cn } from "@/lib/utils"
import {
  REPORT_GENERATION_EVENT,
  REPORT_GENERATION_OPTIONS,
  type ReportGenerationRequest,
  type ReportGenerationKind,
} from "@/lib/reports/report-generation"

const REPORT_SELECTOR_CHROME_CLASS = "intelligence-drawer text-body border-l border-border/40"
const REPORT_SELECTOR_HEADER_CLASS = "intelligence-drawer border-b border-border/40 [&_h2]:text-primary [&_p]:text-muted [&_button]:text-heading [&_button:hover]:bg-surface-hover/30"
const REPORT_SELECTOR_CONTENT_CLASS = "intelligence-drawer px-4 pb-5 pt-4 sm:px-5 [--drawer-header-fade-start:rgba(10,13,26,0.95)] [--drawer-header-fade-end:rgba(10,13,26,0)]"

function ReportTypeIcon({ reportType }: { reportType: ReportGenerationKind }) {
  if (reportType === "activity_commercial") {
    return (
      <img className="size-10 object-contain" src="/icons_set/cockpit_intelligence/prevision_ca.png" alt="" />
    )
  }

  if (reportType === "activity_recruitment") {
    return (
      <img className="size-10 object-contain" src="/icons_set/cockpit_intelligence/rapport_recrutement_ai.png" alt="" />
    )
  }

  if (reportType === "financial") {
    return (
      <img className="size-10 object-contain" src="/icons_set/cockpit_intelligence/rapport_financier_ai.png" alt="" />
    )
  }

  return (
    <img className="size-10 object-contain" src="/icons_set/cockpit_intelligence/brief_hebdo.png" alt="" />
  )
}

export function ReportGenerationHost() {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<ReportGenerationKind>("activity_commercial")
  const [suggestedReportType, setSuggestedReportType] = useState<ReportGenerationKind | null>(null)

  useEffect(() => {
    function handleOpen(event: Event) {
      const customEvent = event as CustomEvent<ReportGenerationRequest>
      const request = customEvent.detail ?? { origin: "global" }

      setSuggestedReportType(request.reportType ?? null)
      setReportOpen(false)
      setSelectorOpen(true)
    }

    window.addEventListener(REPORT_GENERATION_EVENT, handleOpen)
    return () => window.removeEventListener(REPORT_GENERATION_EVENT, handleOpen)
  }, [])

  function openReport(reportType: ReportGenerationKind) {
    setSelectedReportType(reportType)
    setSuggestedReportType(null)
    setSelectorOpen(false)
    setReportOpen(true)
  }

  function returnToSelector() {
    setSuggestedReportType(selectedReportType)
    setReportOpen(false)
    setSelectorOpen(true)
  }

  return (
    <>
      <AppDrawer
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        title="Générer un rapport"
        width="default"
        showMobileCloseButton
        className={REPORT_SELECTOR_CHROME_CLASS}
        headerClassName={REPORT_SELECTOR_HEADER_CLASS}
        contentClassName={REPORT_SELECTOR_CONTENT_CLASS}
      >
        <div className="grid grid-cols-2 gap-3">
          {REPORT_GENERATION_OPTIONS.map((option) => {
            const isSuggested = suggestedReportType === option.reportType
            const isReady = option.availability === "ready"

            return (
              <button
                key={option.reportType}
                type="button"
                onClick={() => openReport(option.reportType)}
                data-autofocus={option.reportType === "activity_commercial" ? "true" : undefined}
                className={cn(
                  "group flex min-h-[9.5rem] flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200",
                  "bg-surface/30 border-border/30",
                  isReady
                    ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-hover/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:translate-y-0"
                    : "cursor-pointer hover:border-border hover:bg-surface-hover/20",
                  isSuggested && "border-primary/80 bg-surface/50 shadow-[0_0_15px_rgba(226,147,29,0.1)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <ReportTypeIcon reportType={option.reportType} />
                </div>

                <div className="space-y-2">
                  <span className="block text-sm font-bold leading-5 text-heading transition-colors group-hover:text-primary">
                    {option.title}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                      isReady ? "text-success" : "text-muted",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", isReady ? "bg-success" : "bg-muted")} />
                    <span>{isReady ? "Disponible" : "À développer"}</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </AppDrawer>

      <ReportGenerationDrawer
        key={selectedReportType}
        open={reportOpen}
        onOpenChange={setReportOpen}
        onBack={returnToSelector}
        reportType={selectedReportType}
      />
    </>
  )
}
