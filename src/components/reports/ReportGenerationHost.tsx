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

const REPORT_SELECTOR_CHROME_CLASS = "bg-[#112F35] text-[#edf6f7] [--drawer-header-fade-start:rgba(17,47,53,0.96)] [--drawer-header-fade-end:rgba(17,47,53,0)]"
const REPORT_SELECTOR_HEADER_CLASS = "border-b border-white/10 bg-[#112F35] [&_h2]:text-[#edf6f7] [&_p]:text-[#c2d6d9] [&_button]:text-[#edf6f7] [&_button:hover]:bg-white/10"
const REPORT_SELECTOR_CONTENT_CLASS = "bg-[#112F35] px-4 pb-5 pt-4 sm:px-5"

function ReportTypeIcon({ reportType }: { reportType: ReportGenerationKind }) {
  if (reportType === "activity_commercial") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 16L9 11L13 15L20 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 8H20V13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (reportType === "activity_recruitment") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 19V17.5C15 15.567 13.433 14 11.5 14H8.5C6.567 14 5 15.567 5 17.5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M18 8V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M21 11H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (reportType === "financial") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 18H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 18V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 18V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 18V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 13H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 17H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
        title="générer un rapport"
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
                  "group flex min-h-[9.5rem] flex-col justify-between rounded-[var(--radius-medium)] border p-4 text-left transition-all",
                  "bg-[color-mix(in_srgb,#112F35_70%,white)]",
                  isReady
                    ? "cursor-pointer border-white/10 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[color-mix(in_srgb,#112F35_64%,white)] active:translate-y-0"
                    : "cursor-pointer border-white/8 hover:border-white/16 hover:bg-[color-mix(in_srgb,#112F35_66%,white)]",
                  isSuggested && "border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.14)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-small)] border",
                      isReady
                        ? "border-white/12 bg-white/[0.07] text-[#edf6f7]"
                        : "border-white/10 bg-white/[0.05] text-[#d4e3e5]",
                    )}
                  >
                    <ReportTypeIcon reportType={option.reportType} />
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="block text-sm font-bold leading-5 text-[#f4fbfb]">
                    {option.title}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] font-medium uppercase tracking-[0.12em]",
                      isReady ? "text-emerald-100/85" : "text-amber-100/80",
                    )}
                  >
                    {isReady ? "Disponible" : "À développer"}
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
