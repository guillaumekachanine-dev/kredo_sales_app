"use client"

import { startTransition, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DocumentCard } from "@/components/reports/DocumentCard"
import { DocumentMobileDetail } from "@/components/reports/DocumentMobileDetail"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Input } from "@/components/ui/Input"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import type { ReportsFilterState, ReportsListData } from "@/app/(app)/reports/_data/reports-types"

type ReportsMobileViewProps = {
  reportsData: ReportsListData
  filters: ReportsFilterState
  listError?: string | null
}

const SearchIcon = () => (
  <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M14 14L16.5 16.5M15.5 9C15.5 12.59 12.59 15.5 9 15.5C5.41 15.5 2.5 12.59 2.5 9C2.5 5.41 5.41 2.5 9 2.5C12.59 2.5 15.5 5.41 15.5 9Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function ReportsMobileView({ reportsData, filters, listError }: ReportsMobileViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      params.delete("page")
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const activeDocType = filters.documentType || "all"

  const handleFilterClick = (value: string) => {
    updateParams((params) => {
      if (value === "all") {
        params.delete("documentType")
      } else {
        params.set("documentType", value)
      }
    })
  }

  const isActive = (value: string) => {
    if (value === "all") return activeDocType === "all"
    return activeDocType === value
  }

  return (
    <>
      <MobileActionPage
        header={(
          <MobilePageHeader
            title="Rapports & Rédactions"
            className="[&_h1]:text-lg [&_h1]:font-bold [&_h1]:leading-snug [&>div]:items-center"
            actions={(
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="size-8 flex items-center justify-center p-0 text-xl font-bold rounded-lg border border-border bg-surface text-heading active:opacity-75 cursor-pointer shadow-sm"
                aria-label="Nouveau document"
              >
                +
              </button>
            )}
          />
        )}
      >
        <Input
          key={filters.search ?? ""}
          defaultValue={filters.search ?? ""}
          onChange={(event) => {
            const nextSearch = event.target.value.trim()
            updateParams((params) => {
              if (nextSearch) params.set("search", nextSearch)
              else params.delete("search")
            })
          }}
          placeholder="Rechercher un document"
          leftElement={<SearchIcon />}
          fullWidth
        />

        {/* Chips filtres horizontaux */}
        <div className="-mx-4 overflow-x-auto scrollbar-none flex gap-2 pb-3 px-4">
          {[
            { label: "Tous", value: "all" },
            { label: "Mails", value: "communication" },
            { label: "Pitch", value: "commercial_pitch" },
            { label: "Prise de parole", value: "prise_de_parole" },
            { label: "Rapports", value: "financial" }
          ].map((chip) => {
            const active = isActive(chip.value)
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => handleFilterClick(chip.value)}
                className={`rounded-full px-4 py-1.5 text-[10px] font-bold border shrink-0 min-h-[44px] transition-all cursor-pointer ${
                  active
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-surface/20 border-border/20 text-muted"
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {listError ? (
          <ErrorState title="Impossible de charger les documents" message={listError} />
        ) : reportsData.items.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border bg-surface px-6 text-center text-sm text-muted">
            Aucun document ne correspond à cette vue.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reportsData.items.map((document) => (
              <DocumentCard key={document.id} document={document} onClick={() => setSelectedDocumentId(document.id)} />
            ))}
          </div>
        )}
      </MobileActionPage>

      {selectedDocumentId ? (
        <DocumentMobileDetail
          key={selectedDocumentId}
          documentId={selectedDocumentId}
          open={selectedDocumentId !== null}
          onClose={() => setSelectedDocumentId(null)}
        />
      ) : null}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-20" onClick={() => setIsCreateModalOpen(false)}>
          <div 
            className="w-full max-w-sm rounded-2xl bg-[#070913] border border-white/5 p-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-heading text-sm font-bold text-[#E2931D]">
                Nouveau document
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#E2931D] hover:opacity-85 p-1 transition-opacity cursor-pointer"
                aria-label="Fermer"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              {[
                {
                  label: "Mail",
                  imageSrc: "/icons_set/cockpit_intelligence/redaction_message_ai.png",
                  action: () => {
                    openCommunicationComposer({ origin: "global", preset: { channel: "email" } })
                    setIsCreateModalOpen(false)
                  }
                },
                {
                  label: "Pitch",
                  imageSrc: "/icons_set/cockpit_intelligence/generation_pitch.png",
                  action: () => {
                    openCommunicationComposer({ origin: "global", preset: { scenario: "signal_outreach" } })
                    setIsCreateModalOpen(false)
                  }
                },
                {
                  label: "Rapport",
                  imageSrc: "/icons_set/cockpit_intelligence/brief_hebdo.png",
                  action: () => {
                    openReportGeneration({ origin: "reports_library" })
                    setIsCreateModalOpen(false)
                  }
                },
                {
                  label: "Fiche",
                  imageSrc: "/icons_set/cockpit_intelligence/recherche_actualités.png",
                  action: () => {
                    openReportGeneration({ origin: "reports_library", reportType: "activity_commercial" })
                    setIsCreateModalOpen(false)
                  }
                }
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={opt.action}
                  className="group flex flex-col justify-between aspect-[1.1] rounded-2xl border border-white/5 bg-[#0D1222] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 active:translate-y-0 cursor-pointer"
                >
                  <div className="flex items-start">
                    <img src={opt.imageSrc} className="size-11 object-contain" alt="" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-[13px] font-bold leading-snug text-[#E2931D] transition-colors group-hover:text-primary">
                      {opt.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
                      <span className="size-1.5 rounded-full bg-[#10B981]" />
                      DISPONIBLE
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
