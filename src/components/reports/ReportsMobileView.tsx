"use client"

import { startTransition, useRef, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DocumentCard } from "@/components/reports/DocumentCard"
import { DocumentMobileDetail } from "@/components/reports/DocumentMobileDetail"
import { DOCUMENT_OBJECT_LABELS } from "@/components/reports/document-display"
import { REPORT_SUPPORTS, ReportSupportIcon } from "@/components/reports/report-supports-config"
import { KnowledgeSpaceMobile } from "@/features/content-collections/components/knowledge-space/KnowledgeSpaceMobile"
import { IconSearch } from "@/components/cockpit/mobile/icons"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Input } from "@/components/ui/Input"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { ReportsFilterState, ReportsListData } from "@/app/(app)/reports/_data/reports-types"

type ReportsMobileViewProps = {
  reportsData: ReportsListData
  filters: ReportsFilterState
  listError?: string | null
}

type ReportsSection = "documents" | "knowledge" | "generate"

const MOBILE_SECTIONS: Array<{ id: ReportsSection; label: string }> = [
  { id: "documents", label: "Documents" },
  { id: "knowledge", label: "Connaissances" },
  { id: "generate", label: "Générer" },
]

const DOCUMENT_CATEGORIES = [
  { label: "Tous", value: "all" },
  { label: "Rapports", value: "financial" },
  { label: "Synthèses", value: "client_summary" },
  { label: "Pitchs", value: "commercial_pitch" },
  { label: "Mails", value: "communication" },
]

export function ReportsMobileView({ reportsData, filters, listError }: ReportsMobileViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<ReportsSection>("documents")
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [modalSearchText, setModalSearchText] = useState(filters.search ?? "")
  const [modalDocType, setModalDocType] = useState(filters.documentType ?? "all")
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

  const openSearchModal = () => {
    setModalSearchText(filters.search ?? "")
    setModalDocType(filters.documentType ?? "all")
    setIsSearchModalOpen(true)
  }

  const handleModalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams((params) => {
      const value = modalSearchText.trim()
      if (value) params.set("search", value)
      else params.delete("search")

      if (modalDocType && modalDocType !== "all") params.set("documentType", modalDocType)
      else params.delete("documentType")
    })
    setIsSearchModalOpen(false)
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

      <main className="min-h-0 flex-1 overflow-hidden">
        {activeSection === "documents" ? (
          <div className="flex h-full min-h-0 flex-col bg-surface">
            <div className="shrink-0 border-b border-border px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" aria-label="Catégories de documents">
                  {DOCUMENT_CATEGORIES.map((category) => {
                    const active = activeDocType === category.value
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => handleFilterClick(category.value)}
                        aria-pressed={active}
                        className={cn(
                          "shrink-0 min-h-8 rounded border px-2.5 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
                          active ? "border-primary bg-primary text-white" : "border-border bg-surface text-heading hover:bg-surface-hover",
                        )}
                      >
                        {category.label}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={openSearchModal}
                  aria-label="Ouvrir la recherche"
                  aria-expanded={isSearchModalOpen}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
                    filters.search ? "border-primary bg-primary text-white font-bold" : "border-border bg-surface text-heading hover:bg-surface-hover",
                  )}
                >
                  <IconSearch className="size-4" />
                </button>
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

        {activeSection === "knowledge" ? <KnowledgeSpaceMobile /> : null}

        {activeSection === "generate" ? (
          <section className="reports-scrollbar h-full overflow-y-auto bg-surface px-4 py-5" aria-labelledby="reports-mobile-generate-title">
            <div className="border-b border-border pb-3 mb-4">
              <h2 id="reports-mobile-generate-title" className="text-base font-bold text-heading">Créer un document</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {REPORT_SUPPORTS.map((support) => (
                <button
                  key={support.id}
                  type="button"
                  onClick={support.onClick}
                  className="flex min-h-12 w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading"
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-canvas text-primary">
                    <ReportSupportIcon iconType={support.iconType} className="size-4" />
                  </span>
                  <span className="truncate text-xs font-bold text-heading">
                    {support.mobileLabel}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {selectedDocumentId ? (
        <DocumentMobileDetail
          key={selectedDocumentId}
          documentId={selectedDocumentId}
          open
          onClose={closeDocument}
          onManageLists={() => setActiveSection("knowledge")}
        />
      ) : null}

      {isSearchModalOpen ? (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-heading/40 px-4 backdrop-blur-sm"
          onClick={() => setIsSearchModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reports-search-modal-title"
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="reports-search-modal-title" className="text-base font-bold text-heading">
                Rechercher un document
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="rounded px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-heading"
                aria-label="Fermer la recherche"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="mobile-search-text-input" className="block text-xs font-semibold text-heading mb-1.5">
                  Recherche par mot-clé
                </label>
                <Input
                  id="mobile-search-text-input"
                  value={modalSearchText}
                  onChange={(event) => setModalSearchText(event.target.value)}
                  placeholder="Rechercher un document…"
                  aria-label="Rechercher par mot-clé"
                  autoFocus
                  fullWidth
                />
              </div>

              <div>
                <label htmlFor="mobile-search-doctype-select" className="block text-xs font-semibold text-heading mb-1.5">
                  Type de document
                </label>
                <Select
                  id="mobile-search-doctype-select"
                  value={modalDocType}
                  onChange={(event) => setModalDocType(event.target.value)}
                  fullWidth
                >
                  <option value="all">Tous les types</option>
                  {Object.entries(DOCUMENT_OBJECT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSearchModalOpen(false)}
                >
                  Revenir
                </Button>

                <Button
                  type="submit"
                  variant="brass"
                  size="sm"
                >
                  Lancer la recherche
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
