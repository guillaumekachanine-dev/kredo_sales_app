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

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      params.delete("page")
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const isDraftsActive = filters.status === "draft"
  const isFavoritesActive = filters.favoritesOnly === true
  const isRecentsActive = !isDraftsActive && !isFavoritesActive

  return (
    <>
      <MobileActionPage
        header={(
          <MobilePageHeader
            eyebrow="Intelligence"
            title="Rapports & Rédaction"
            actions={(
              <Button size="sm" onClick={() => openReportGeneration({ origin: "reports_library" })}>
                Produire un rapport
              </Button>
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

        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
            <Button
              variant={isRecentsActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                updateParams((params) => {
                  params.delete("status")
                  params.delete("favoritesOnly")
                })
              }}
            >
              Récents
            </Button>
            <Button
              variant={isDraftsActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                updateParams((params) => {
                  params.set("status", "draft")
                  params.delete("favoritesOnly")
                })
              }}
            >
              Brouillons
            </Button>
            <Button
              variant={isFavoritesActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                updateParams((params) => {
                  params.delete("status")
                  params.set("favoritesOnly", "true")
                })
              }}
            >
              Favoris
            </Button>
          </div>
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
    </>
  )
}
