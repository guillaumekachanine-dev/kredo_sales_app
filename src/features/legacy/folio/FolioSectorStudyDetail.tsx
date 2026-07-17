"use client"

import React from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { FolioBanner } from "./FolioBanner"
import { FolioSectorAnalysisPanel } from "./FolioSectorAnalysisPanel"
import { FolioMobileAnalysisSections } from "./FolioMobileAnalysisSections"
import type { SectorAnalysisData } from "./types"

type Props = {
  study: {
    id: string
    name: string
    sector: string
    logoPath: string | null
    analysisAt: string | null
    sectorAnalysis: SectorAnalysisData
  }
  device: "desktop" | "mobile"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date d'analyse inconnue"
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return "Date d'analyse inconnue"
  }
}

export function FolioSectorStudyDetail({ study, device }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/legacy/folio/sector-studies"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-deep transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour aux archives
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center gap-4">
          <CompanyLogo
            name={study.name}
            logoPath={study.logoPath}
            size="xl"
          />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-heading truncate">
              {study.name}
            </h1>
            <p className="text-xs sm:text-sm text-body font-medium mt-0.5">
              Étude sectorielle : {study.sector}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
          <span className="inline-flex items-center self-start sm:self-auto rounded bg-slate-800 text-slate-100 border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            FOLIO original
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted font-bold">
            <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {formatDate(study.analysisAt)}
          </span>
        </div>
      </div>

      {/* Warning Archive Banner */}
      <FolioBanner />

      {/* Responsive View Switch */}
      {device === "mobile" ? (
        <FolioMobileAnalysisSections data={study.sectorAnalysis} />
      ) : (
        <FolioSectorAnalysisPanel
          data={study.sectorAnalysis}
          companyName={study.name}
          logoUrl={study.logoPath}
        />
      )}
    </div>
  )
}
