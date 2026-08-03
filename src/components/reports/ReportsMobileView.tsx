"use client"

import { startTransition, useRef, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DocumentCard } from "@/components/reports/DocumentCard"
import { DocumentMobileDetail } from "@/components/reports/DocumentMobileDetail"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Input } from "@/components/ui/Input"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { cn } from "@/lib/utils"
import type { ReportsFilterState, ReportsListData } from "@/app/(app)/reports/_data/reports-types"

type ReportsMobileViewProps = {
  reportsData: ReportsListData
  filters: ReportsFilterState
  listError?: string | null
}

type ReportsSection = "documents" | "history" | "generate"

const MOBILE_SECTIONS: Array<{ id: ReportsSection; label: string }> = [
  { id: "documents", label: "Documents" },
  { id: "history", label: "Historique" },
  { id: "generate", label: "Générer" },
]

const DOCUMENT_CATEGORIES = [
  { label: "Tous", value: "all" },
  { label: "Rapports", value: "financial" },
  { label: "Synthèses", value: "client_summary" },
  { label: "Pitchs", value: "commercial_pitch" },
  { label: "Mails", value: "communication" },
]

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function ReportsMobileView({ reportsData, filters, listError }: ReportsMobileViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<ReportsSection>("documents")
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "")
  const documentTriggerRef = useRef<HTMLButtonElement | null>(null)

  const openDocument = (documentId: string, trigger: HTMLButtonElement) => {
    documentTriggerRef.current = trigger
    setSelectedDocumentId(documentId)
  }

  const closeDocument = () => {
    setSelectedDocumentId(null)
    window.requestAnimationFrame(() => documentTriggerRef.current?.focus())
  }

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      params.delete("page")
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams((params) => {
      const value = searchDraft.trim()
      if (value) params.set("search", value)
      else params.delete("search")
    })
  }

  const handleFilterClick = (value: string) => {
    updateParams((params) => {
      if (value === "all") params.delete("documentType")
      else params.set("documentType", value)
    })
  }

  const activeDocType = filters.documentType || "all"

  return (
    <div className="flex h-[calc(100dvh-var(--layout-mobile-content-bottom-offset)-var(--space-3))] min-h-0 flex-col overflow-hidden bg-canvas text-body">
      <div className="shrink-0 bg-surface px-4 pb-3 pt-4">
        <MobilePageHeader
          title="Rapports & rédaction"
          className="gap-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:leading-7"
        />
      </div>

      <nav className="grid shrink-0 grid-cols-3 border-y border-border bg-surface" aria-label="Navigation Rapports & rédaction">
        {MOBILE_SECTIONS.map((section) => {
          const active = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative min-h-12 px-2 text-sm font-semibold text-heading outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                active ? "bg-primary/[0.04] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand-brass" : "hover:bg-surface-hover/60",
              )}
            >
              {section.label}
            </button>
          )
        })}
      </nav>

      <main className="min-h-0 flex-1 overflow-hidden pb-[calc(80px+env(safe-area-inset-bottom))]">
        {activeSection === "documents" ? (
          <div className="flex h-full min-h-0 flex-col bg-surface">
            <div className="shrink-0 space-y-3 border-b border-border px-4 py-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Rechercher un document…"
                  aria-label="Rechercher un document"
                  fullWidth
                />
                <Button type="submit" variant="secondary" size="sm" className="px-3">
                  Chercher
                </Button>
              </form>

              <div className="flex flex-wrap gap-2" aria-label="Catégories de documents">
                {DOCUMENT_CATEGORIES.map((category) => {
                  const active = activeDocType === category.value
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleFilterClick(category.value)}
                      aria-pressed={active}
                      className={cn(
                        "min-h-9 rounded border px-3 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
                        active ? "border-primary bg-primary text-white" : "border-border bg-surface text-heading hover:bg-surface-hover",
                      )}
                    >
                      {category.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="reports-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {listError ? (
                <div className="p-4"><ErrorState title="Impossible de charger les documents" message={listError} /></div>
              ) : reportsData.items.length === 0 ? (
                <div className="flex min-h-56 items-center justify-center px-8 text-center text-sm text-muted">
                  Aucun document ne correspond à cette recherche.
                </div>
              ) : (
                <div aria-label={`${reportsData.totalCount} documents`}>
                  {reportsData.items.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      selected={selectedDocumentId === document.id}
                      onClick={(trigger) => openDocument(document.id, trigger)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeSection === "history" ? (
          <section className="reports-scrollbar h-full overflow-y-auto bg-surface px-4 py-5" aria-labelledby="reports-mobile-history-title">
            <div className="mb-4 border-b border-border pb-3">
              <h2 id="reports-mobile-history-title" className="text-base font-bold text-heading">Historique des documents</h2>
              <p className="mt-1 text-xs text-muted">Modifications disponibles dans la bibliothèque actuelle.</p>
            </div>
            {reportsData.items.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">Aucun historique disponible.</p>
            ) : (
              <ol className="border-l border-border pl-4">
                {reportsData.items.map((document) => (
                  <li key={document.id} className="relative border-b border-border py-4 last:border-b-0">
                    <span className="absolute -left-[19px] top-[23px] size-2 rounded-full border-2 border-surface bg-brand-brass" aria-hidden="true" />
                    <button type="button" onClick={(event) => openDocument(document.id, event.currentTarget)} className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-heading">
                      <span className="block text-sm font-bold leading-5 text-heading">{document.title}</span>
                      <span className="mt-1 block text-xs text-muted">Version {document.versionNumber} · {formatHistoryDate(document.updatedAt)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}

        {activeSection === "generate" ? (
          <section className="reports-scrollbar h-full overflow-y-auto bg-surface px-4 py-5" aria-labelledby="reports-mobile-generate-title">
            <div className="border-b border-border pb-4">
              <h2 id="reports-mobile-generate-title" className="text-base font-bold text-heading">Créer un document</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Choisissez un flux déjà disponible dans KREDO.</p>
            </div>
            <div className="divide-y divide-border">
              <button type="button" onClick={() => openCommunicationComposer({ origin: "global", preset: { channel: "email" } })} className="flex min-h-20 w-full items-center gap-4 px-1 py-4 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset">
                <span className="inline-flex size-10 shrink-0 items-center justify-center border border-border bg-canvas text-primary"><IntelligenceIcon name="write_email" className="size-5" preferVector /></span>
                <span><span className="block text-sm font-bold text-heading">Rédiger un mail</span><span className="mt-0.5 block text-xs text-muted">Composer une communication assistée.</span></span>
              </button>
              <button type="button" onClick={() => openCommunicationComposer({ origin: "global", preset: { scenario: "signal_outreach" } })} className="flex min-h-20 w-full items-center gap-4 px-1 py-4 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset">
                <span className="inline-flex size-10 shrink-0 items-center justify-center border border-border bg-canvas text-primary"><IntelligenceIcon name="generate_pitch" className="size-5" preferVector /></span>
                <span><span className="block text-sm font-bold text-heading">Préparer un pitch</span><span className="mt-0.5 block text-xs text-muted">Réutiliser le flux de rédaction existant.</span></span>
              </button>
              <button type="button" onClick={() => openReportGeneration({ origin: "reports_library" })} className="flex min-h-20 w-full items-center gap-4 px-1 py-4 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset">
                <span className="inline-flex size-10 shrink-0 items-center justify-center border border-border bg-canvas text-primary"><IntelligenceIcon name="report" className="size-5" preferVector /></span>
                <span><span className="block text-sm font-bold text-heading">Générer un rapport</span><span className="mt-0.5 block text-xs text-muted">Ouvrir les paramètres de génération disponibles.</span></span>
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="fixed inset-x-0 bottom-[var(--layout-mobile-content-bottom-offset)] z-[calc(var(--z-fab)+1)] border-t border-border bg-surface px-3 pb-3 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => openCommunicationComposer({ origin: "global" })} className="h-12 min-w-0 px-2 text-[13px]" leftIcon={<IntelligenceIcon name="write_email" className="size-5" preferVector />}>
            Rédiger un mail
          </Button>
          <Button variant="brass" size="lg" onClick={() => openReportGeneration({ origin: "reports_library" })} className="h-12 min-w-0 px-2 text-[13px]" leftIcon={<IntelligenceIcon name="report" className="size-5" preferVector />}>
            Générer un rapport
          </Button>
        </div>
      </footer>

      {selectedDocumentId ? (
        <DocumentMobileDetail
          key={selectedDocumentId}
          documentId={selectedDocumentId}
          open
          onClose={closeDocument}
        />
      ) : null}
    </div>
  )
}
