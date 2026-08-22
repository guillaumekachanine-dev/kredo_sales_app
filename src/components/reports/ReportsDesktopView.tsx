"use client"

import { useRef, useState, useTransition, useEffect, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"
import { Button } from "@/components/ui/Button"
import { AddToListDialogDesktop } from "@/features/content-collections/components/AddToListDialogDesktop"
import { KnowledgeSpaceDesktop } from "@/features/content-collections/components/knowledge-space/KnowledgeSpaceDesktop"
import { IconChevron } from "@/components/cockpit/mobile/icons"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { ErrorState } from "@/components/ui/ErrorState"
import { Input } from "@/components/ui/Input"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { WATCH_ANALYSIS_COMPOSER_EVENT } from "@/lib/reports/watch-analysis-launcher"
import { WatchAnalysisComposerDesktop } from "@/features/watch-analysis/components/WatchAnalysisComposerDesktop"
import { cn } from "@/lib/utils"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import {
  duplicateDocument,
  setDocumentFavorite,
  setDocumentStatus,
} from "@/app/(app)/reports/_data/reports-actions"
import type {
  DocumentDetail,
  DocumentListItem,
  ReportsFilterState,
  ReportsKpis,
  ReportsListData,
  ManagerSummaryContent,
} from "@/app/(app)/reports/_data/reports-types"
import {
  DOCUMENT_OBJECT_LABELS,
  getDocumentIcon,
  getDocumentTypeLabel,
  getFinancialReferenceDocumentSummary,
  isMasterStudyDocument,
  MASTER_STUDY_CATEGORY_LABEL,
} from "./document-display"
import { REPORT_SUPPORTS, ReportSupportIcon } from "./report-supports-config"
import { ClientSummaryDocumentContent } from "./ClientSummaryDocumentContent"
import { PitchDocumentContent } from "./PitchDocumentContent"
import { FinancialReportContent } from "./financial/FinancialReportContent"
import { TechnicalReportContent } from "./TechnicalReportContent"
import { ManagerSummaryReportView } from "./manager-summary/ManagerSummaryReportView"
import { CompetitiveMapImportReportContent } from "./CompetitiveMapImportReportContent"
import { DocumentCommunicationActions } from "./DocumentCommunicationActions"
import { DocumentEditor } from "./DocumentEditor"
import { DocumentGenerationParameters } from "./DocumentGenerationParameters"
import { DocumentVersionHistory } from "./DocumentVersionHistory"

type ReportsDesktopViewProps = {
  reportsData: ReportsListData
  kpis: ReportsKpis
  filters: ReportsFilterState
  selectedDocumentId: string | null
  selectedDocument: DocumentDetail | null
  selectedDocumentError?: string | null
  listError?: string | null
}

type ReportsSection = "documents" | "knowledge" | "generation"
type PendingAction = "copy" | "duplicate" | "favorite" | "archive" | null

const LOCAL_SECTIONS: Array<{ id: ReportsSection; label: string }> = [
  { id: "documents", label: "Bibliothèque" },
  { id: "knowledge", label: "Connaissances" },
  { id: "generation", label: "Génération" },
]

const STATUS_LABELS: Record<DocumentListItem["status"], string> = {
  draft: "Brouillon",
  ready: "Prêt",
  used: "Utilisé",
  archived: "Archivé",
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: "Compte",
  contact: "Contact",
  opportunity: "Opportunité",
  mission: "Mission",
  project: "Projet",
  collaborator: "Collaborateur",
  candidate: "Candidat",
  sector: "Secteur",
  calendar_event: "Événement",
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

function formatDocumentSize(document: DocumentDetail) {
  const content = document.currentContentText ?? JSON.stringify(document.currentContentJson ?? "")
  const bytes = new Blob([content]).size
  return bytes < 1024 ? `${bytes} o` : `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

function countActiveFilters(filters: ReportsFilterState) {
  return Object.values(filters).filter((value) => value !== undefined && value !== null && value !== "" && value !== false).length
}



function ReportsSidebarIcon({ name }: { name: ReportsSection }) {
  const commonProps = {
    className: "size-4 shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "documents") {
    return (
      <svg {...commonProps}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  }
  if (name === "generation") {
    return (
      <svg {...commonProps}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="11" height="4" rx="1" />
      <rect x="3" y="16" width="14" height="4" rx="1" />
    </svg>
  )
}

function ReportsLocalNavigation({ active, onChange }: { active: ReportsSection; onChange: (section: ReportsSection) => void }) {
  return (
    <nav
      aria-label="Navigation locale Rapports & rédaction"
      className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      {/* Title box positioned exactly like 'Retour aux comptes' button */}
      <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-edito-border bg-edito-surface px-3 text-left text-xs font-bold text-edito-navy select-none">
        <span>Rapports & rédaction</span>
      </div>

      <div className="mt-5 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Chapitres
        </p>
        <div className="mt-2 space-y-1">
          {LOCAL_SECTIONS.map((section) => {
            const activeSection = active === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                aria-current={activeSection ? "page" : undefined}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
                  activeSection
                    ? "border-l-edito-brass bg-edito-surface text-edito-navy"
                    : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body",
                )}
              >
                <span className={cn("text-edito-navy", !activeSection && "opacity-75")}>
                  <ReportsSidebarIcon name={section.id} />
                </span>
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
          <div className="my-2 border-t border-edito-border/50" />
          <button
            type="button"
            onClick={() => useCrmAccountLauncherStore.getState().open()}
            className={cn(
              "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 border-l-transparent px-3 text-left text-xs font-semibold text-edito-muted transition-colors hover:bg-edito-surface/70 hover:text-edito-body",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
            )}
          >
            <span className="text-edito-navy opacity-75">
              <svg
                className="size-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0 1 21 4.5V21H3V4.5A1.5 1.5 0 0 1 4.5 3zM8.25 7.5h.008v.008H8.25V7.5zm0 3.75h.008v.008H8.25v-.008zm0 3.75h.008v.008H8.25V15zm3.742-7.5H12v.008h-.008V7.5zm0 3.75H12v.008h-.008v-.008zm0 3.75H12v.008h-.008V15zm3.75-7.5h.008v.008h-.008V7.5zm0 3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008V15z" />
              </svg>
            </span>
            <span className="truncate">CRM Launcher</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

function DocumentContent({ document }: { document: DocumentDetail }) {
  if (document.documentType === "financial_reference") {
    const reference = getFinancialReferenceDocumentSummary(document.currentContentJson)
    return reference ? (
      <div className="border border-border bg-edito-canvas p-4 text-xs">
        <p className="font-bold text-heading">{reference.resource ?? "Ressource non renseignée"}</p>
        <p className="mt-1 text-body">{reference.profile ?? "Profil non renseigné"}</p>
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-3">
          <div><p className="text-[9px] font-bold uppercase text-muted">TJM</p><p className="mt-1 font-mono font-bold text-heading">{reference.saleDailyRate === null ? "—" : `${reference.saleDailyRate.toLocaleString("fr-FR")} €`}</p></div>
          <div><p className="text-[9px] font-bold uppercase text-muted">CA projeté</p><p className="mt-1 font-mono font-bold text-heading">{reference.revenue === null ? "—" : `${reference.revenue.toLocaleString("fr-FR")} €`}</p></div>
          <div><p className="text-[9px] font-bold uppercase text-muted">Marge</p><p className="mt-1 font-mono font-bold text-heading">{reference.margin === null ? "—" : `${reference.margin.toFixed(1)}%`}</p></div>
        </div>
      </div>
    ) : <p className="text-xs italic text-muted">Référence financière sans données structurées.</p>
  }

  if (document.documentType === "client_summary") {
    return <ClientSummaryDocumentContent contentJson={document.currentContentJson} contentText={document.currentContentText} fallbackClassName="whitespace-pre-wrap text-xs leading-relaxed" />
  }

  if (document.documentType === "financial" || (document.currentContentJson && typeof document.currentContentJson === "object" && (document.currentContentJson as Record<string, unknown>).reportType === "financial")) {
    return <FinancialReportContent contentJson={document.currentContentJson} contentText={document.currentContentText} />
  }

  if (document.currentContentJson && typeof document.currentContentJson === "object" && (document.currentContentJson as Record<string, unknown>).reportType === "technical") {
    return <TechnicalReportContent contentJson={document.currentContentJson} />
  }

  if (document.documentType === "manager_summary" && document.currentContentJson && typeof document.currentContentJson === "object" && "facts" in document.currentContentJson) {
    return <ManagerSummaryReportView content={document.currentContentJson as unknown as ManagerSummaryContent} />
  }

  if (document.documentType === "competitive_map_import") {
    return <CompetitiveMapImportReportContent contentJson={document.currentContentJson} />
  }

  if (document.documentType === "commercial_pitch" || document.documentType === "prise_de_parole") {
    return <PitchDocumentContent contentJson={document.currentContentJson} contentText={document.currentContentText} briefJson={document.versions[0]?.sourceRunInputSnapshot ?? document.versions[0]?.briefJson ?? null} fallbackClassName="whitespace-pre-wrap text-xs leading-relaxed" />
  }

  return document.currentContentText ? (
    <div className="whitespace-pre-wrap text-xs leading-5 text-body">{document.currentContentText}</div>
  ) : (
    <p className="text-xs italic text-muted">Aucun contenu disponible pour ce document.</p>
  )
}

export function ReportsDesktopView({
  reportsData,
  filters,
  selectedDocumentId,
  selectedDocument,
  selectedDocumentError,
  listError,
}: ReportsDesktopViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewerRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [activeSection, setActiveSection] = useState<ReportsSection>("documents")
  const [showFilters, setShowFilters] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addToListOpen, setAddToListOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<PendingAction>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [isAnalysisComposerOpen, setIsAnalysisComposerOpen] = useState(false)

  // Repli automatique de la sidebar principale
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  // Écoute de l'événement global pour ouvrir le compositeur d'analyse à la demande
  useEffect(() => {
    function handleOpen() {
      setIsAnalysisComposerOpen(true)
    }
    window.addEventListener(WATCH_ANALYSIS_COMPOSER_EVENT, handleOpen)
    return () => window.removeEventListener(WATCH_ANALYSIS_COMPOSER_EVENT, handleOpen)
  }, [])

  const activeFilterCount = countActiveFilters(filters)
  const activeDocType = filters.documentType || "all"
  const totalPages = Math.max(1, Math.ceil(reportsData.totalCount / reportsData.pageSize))

  const applyUrlMutation = (mutate: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const handleFilterChange = (key: keyof ReportsFilterState, value: string | boolean) => {
    applyUrlMutation((params) => {
      if (typeof value === "boolean") {
        if (value) params.set(key, "true")
        else params.delete(key)
      } else if (value && value !== "all") params.set(key, value)
      else params.delete(key)
      params.delete("page")
      params.delete("doc")
    })
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleFilterChange("search", String(new FormData(event.currentTarget).get("search") ?? "").trim())
  }

  const handleReset = () => {
    applyUrlMutation((params) => {
      for (const key of ["search", "documentType", "status", "entityType", "entityId", "ownerId", "favoritesOnly", "periodFrom", "periodTo", "page", "doc"]) params.delete(key)
    })
  }

  const handleSelectDocument = (documentId: string) => {
    setIsEditing(false)
    applyUrlMutation((params) => params.set("doc", documentId))
  }

  const handlePageChange = (page: number) => {
    applyUrlMutation((params) => {
      if (page <= 1) params.delete("page")
      else params.set("page", String(page))
      params.delete("doc")
    })
  }

  const runAction = (action: Exclude<PendingAction, "copy">, callback: () => Promise<void>) => {
    setActionError(null)
    setActionLoading(action)
    startTransition(async () => {
      try { await callback() } finally { setActionLoading(null) }
    })
  }

  const handleCopy = () => {
    if (!selectedDocument?.currentContentText) return
    setActionLoading("copy")
    void navigator.clipboard.writeText(selectedDocument.currentContentText).then(() => {
      setCopied(true)
      setActionLoading(null)
      window.setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setActionLoading(null)
      setActionError("Impossible de copier le contenu")
    })
  }

  const handleDuplicate = () => {
    if (!selectedDocument) return
    runAction("duplicate", async () => {
      const result = await duplicateDocument({ documentId: selectedDocument.id })
      if (!result.success) { setActionError(result.error); return }
      const params = new URLSearchParams(searchParams.toString())
      params.set("doc", result.documentId)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const handleToggleFavorite = () => {
    if (!selectedDocument) return
    runAction("favorite", async () => {
      const result = await setDocumentFavorite(selectedDocument.id, !selectedDocument.isFavorite)
      if (!result.success) { setActionError(result.error); return }
      router.refresh()
    })
  }

  const handleArchive = () => {
    if (!selectedDocument) return
    runAction("archive", async () => {
      const result = await setDocumentStatus(selectedDocument.id, "archived")
      if (!result.success) { setActionError(result.error); return }
      router.refresh()
    })
  }

  const handleDownload = () => {
    if (!selectedDocument) return
    const blob = new Blob([selectedDocument.currentContentText ?? JSON.stringify(selectedDocument.currentContentJson, null, 2)], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement("a")
    anchor.href = url
    anchor.download = `${selectedDocument.title.replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ -]/gi, "").trim() || "document"}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-canvas">
      <ReportsLocalNavigation active={activeSection} onChange={setActiveSection} />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-5 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">Rapports & rédaction</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="brass"
              size="sm"
              onClick={() => setIsAnalysisComposerOpen(true)}
              leftIcon={<IntelligenceIcon name="sparkle" className="size-4" preferVector />}
            >
              Générer une analyse
            </Button>
          </div>
        </header>

        {showFilters ? (
          <div className="shrink-0 border-b border-border bg-edito-canvas px-5 py-3">
            <PageFilterBar activeCount={activeFilterCount} onReset={handleReset} summary={`${reportsData.totalCount} document${reportsData.totalCount > 1 ? "s" : ""}`}>
              <form onSubmit={handleSearchSubmit} className="flex min-w-[18rem] items-center gap-2">
                <Input size="sm" key={filters.search ?? ""} name="search" defaultValue={filters.search ?? ""} placeholder="Rechercher un document" fullWidth />
                <Button type="submit" variant="secondary" size="sm" loading={isPending}>Rechercher</Button>
              </form>
              <PageFilterSelect id="reports-document-type-filter" label="Type de document" value={filters.documentType ?? "all"} onChange={(value) => handleFilterChange("documentType", value)} options={[{ value: "all", label: "Type" }, ...Object.entries(DOCUMENT_OBJECT_LABELS).map(([value, label]) => ({ value, label }))]} />
              <PageFilterSelect id="reports-status-filter" label="Statut" value={filters.status ?? "all"} onChange={(value) => handleFilterChange("status", value)} options={[{ value: "all", label: "Statut" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]} />
              <PageFilterSelect id="reports-entity-type-filter" label="Type d'entité" value={filters.entityType ?? "all"} onChange={(value) => handleFilterChange("entityType", value)} options={[{ value: "all", label: "Entité" }, ...Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
            </PageFilterBar>
          </div>
        ) : null}

        {activeSection === "documents" ? (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,280px)] overflow-hidden">
            <section className="flex min-h-0 flex-col border-r border-border bg-surface" aria-labelledby="reports-library-title">
              <div className="shrink-0 border-b border-border px-4 py-4">
                <h2 id="reports-library-title" className="text-xs font-bold text-heading">Bibliothèque de documents</h2>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <PageFilterSelect
                    id="reports-library-doctype-filter"
                    label="Type de document"
                    value={activeDocType}
                    onChange={(value) => handleFilterChange("documentType", value)}
                    options={[{ value: "all", label: "Tous" }, ...Object.entries(DOCUMENT_OBJECT_LABELS).map(([value, label]) => ({ value, label }))]}
                    className="min-w-0 w-auto sm:min-w-0 sm:w-auto"
                  />
                  <span className="text-[10px] text-muted font-medium shrink-0">
                    {reportsData.totalCount} document{reportsData.totalCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="reports-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {listError ? <div className="p-4"><ErrorState title="Erreur" message={listError} /></div> : reportsData.items.length === 0 ? (
                  <p className="px-5 py-12 text-center text-xs text-muted">Aucun document.</p>
                ) : reportsData.items.map((item) => {
                  const active = item.id === selectedDocumentId
                  const isMasterStudy = isMasterStudyDocument(item.documentType)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectDocument(item.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative w-full border-b border-border px-4 py-3 text-left outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                        active
                          ? isMasterStudy
                            ? "bg-master-study-selected-bg before:absolute before:inset-y-0 before:left-0 before:w-[3.5px] before:bg-master-study-selected-border"
                            : "bg-primary/[0.07] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-brass"
                          : isMasterStudy
                            ? "hover:bg-master-study-selected-bg/50"
                            : "hover:bg-surface-hover/60",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded transition-colors",
                          isMasterStudy ? "bg-master-study-selected-bg text-master-study-accent" : "bg-canvas text-muted",
                        )}>
                          {getDocumentIcon(
                            item.documentType,
                            isMasterStudy ? "size-4 shrink-0 text-master-study-accent" : "size-4 shrink-0 text-muted",
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-bold leading-4 text-heading">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[9px] leading-4 text-muted">
                            {isMasterStudy
                              ? `${MASTER_STUDY_CATEGORY_LABEL} - créé le ${formatShortDate(item.createdAt)}`
                              : `${getDocumentTypeLabel(item.documentType)} · Créé le ${formatShortDate(item.createdAt)}`}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {totalPages > 1 ? (
                <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border px-4 py-2">
                  <button type="button" aria-label="Page précédente" disabled={reportsData.page <= 1} onClick={() => handlePageChange(reportsData.page - 1)} className="inline-flex size-8 items-center justify-center border border-border text-heading disabled:opacity-35"><span className="rotate-180" aria-hidden="true"><IconChevron /></span></button>
                  <span className="text-[10px] text-muted">{reportsData.page} / {totalPages}</span>
                  <button type="button" aria-label="Page suivante" disabled={reportsData.page >= totalPages} onClick={() => handlePageChange(reportsData.page + 1)} className="inline-flex size-8 items-center justify-center border border-border text-heading disabled:opacity-35"><span aria-hidden="true"><IconChevron /></span></button>
                </div>
              ) : null}
            </section>

            <section className="flex min-h-0 min-w-0 flex-col bg-edito-canvas px-4 pb-4" aria-label="Visualiseur du document">
              {selectedDocument ? (
                <>
                  <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-border text-[10px] text-muted">
                    <button type="button" onClick={() => setIsEditing(true)} className="inline-flex min-h-9 items-center gap-1.5 px-2 font-semibold text-heading outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-heading">Éditer</button>
                    <div className="flex items-center gap-1">
                      <span className="mr-1 font-mono">{zoomLevel}%</span>
                      <button type="button" aria-label="Réduire le zoom" onClick={() => setZoomLevel((value) => Math.max(70, value - 10))} className="inline-flex size-7 items-center justify-center border border-border bg-surface text-heading">−</button>
                      <button type="button" aria-label="Augmenter le zoom" onClick={() => setZoomLevel((value) => Math.min(130, value + 10))} className="inline-flex size-7 items-center justify-center border border-border bg-surface text-heading">+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => window.print()} className="min-h-9 px-2 font-semibold text-heading hover:bg-surface">Imprimer</button>
                      <button type="button" onClick={handleDownload} className="min-h-9 px-2 font-semibold text-heading hover:bg-surface">Télécharger</button>
                      <button type="button" onClick={() => void viewerRef.current?.requestFullscreen?.()} className="min-h-9 px-2 font-semibold text-heading hover:bg-surface">Plein écran</button>
                    </div>
                  </div>

                  <div ref={viewerRef} className="reports-scrollbar min-h-0 flex-1 overflow-auto bg-edito-canvas py-4">
                    <article className="paper-sheet mx-auto min-h-full w-full max-w-[760px] border border-border bg-white px-7 py-6" style={{ fontSize: `${zoomLevel}%` }}>
                      {isEditing ? (
                        <DocumentEditor key={`${selectedDocument.id}-${selectedDocument.versionNumber}`} document={selectedDocument} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
                      ) : (
                        <div className="space-y-6">
                          <header className="border-b border-border pb-5">
                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">KREDO Intelligence</p>
                            <h2 className="mt-2 font-heading text-xl font-bold leading-7 text-heading">{selectedDocument.title}</h2>
                            <p className="mt-1 text-[10px] text-muted">
                              {isMasterStudyDocument(selectedDocument.documentType)
                                ? `${MASTER_STUDY_CATEGORY_LABEL} · ${formatLongDate(selectedDocument.createdAt)}`
                                : `${DOCUMENT_OBJECT_LABELS[selectedDocument.documentType]} · ${formatLongDate(selectedDocument.createdAt)}`}
                            </p>
                          </header>
                          <DocumentContent document={selectedDocument} />
                          <footer className="flex items-center justify-between border-t border-border pt-4 text-[9px] text-muted"><span>Document généré par KREDO Intelligence</span><span>Usage interne</span></footer>
                        </div>
                      )}
                    </article>
                  </div>
                </>
              ) : selectedDocumentError ? (
                <div className="p-6"><ErrorState title="Erreur de chargement" message={selectedDocumentError} /></div>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center"><div><IntelligenceIcon name="report" className="mx-auto size-5" preferVector /><h2 className="mt-3 text-sm font-bold text-heading">Sélectionnez un document</h2><p className="mt-1 max-w-sm text-xs leading-5 text-muted">La prévisualisation et sa fiche s’afficheront dans cet espace.</p></div></div>
              )}
            </section>

            <aside className="reports-scrollbar min-h-0 overflow-y-auto border-l border-border bg-surface" aria-label="Fiche du document">
              <div className="border-b border-border px-4 py-4"><h2 className="text-xs font-bold text-heading">Fiche du document</h2></div>
              {selectedDocument ? (
                <div className="divide-y divide-border px-4">
                  <section className="py-4">
                    <dl className="space-y-2.5 text-[10px]">
                      {[ ["Type", DOCUMENT_OBJECT_LABELS[selectedDocument.documentType]], ["Auteur", selectedDocument.ownerName], ["Créé le", formatShortDate(selectedDocument.createdAt)], ["Modifié le", formatShortDate(selectedDocument.updatedAt)], ["Taille", formatDocumentSize(selectedDocument)] ].map(([label, value]) => <div key={label} className="grid grid-cols-[72px_1fr] gap-2"><dt className="text-muted">{label}</dt><dd className="font-semibold text-heading">{value}</dd></div>)}
                    </dl>
                  </section>
                  <section className="py-4"><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-heading">Paramètres de génération</h3><DocumentGenerationParameters document={selectedDocument} /></section>
                  <section className="py-4"><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-heading">Historique des versions</h3><DocumentVersionHistory key={`${selectedDocument.id}-${selectedDocument.versionNumber}`} versions={selectedDocument.versions} /></section>
                  <section className="py-4">
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-heading">Actions</h3>
                    {actionError ? <p className="mb-2 text-[10px] text-danger">{actionError}</p> : null}
                    <div className="grid gap-2">
                      <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!selectedDocument.currentContentText} loading={actionLoading === "copy"}>{copied ? "Copié" : "Copier"}</Button>
                      <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Modifier</Button>
                      <Button variant="secondary" size="sm" onClick={handleDuplicate} loading={actionLoading === "duplicate"}>Adapter à un autre contexte</Button>
                      <Button variant="secondary" size="sm" onClick={() => setAddToListOpen(true)}>Ajouter à…</Button>
                      <Button variant={selectedDocument.isFavorite ? "brass" : "secondary"} size="sm" onClick={handleToggleFavorite} loading={actionLoading === "favorite"}>{selectedDocument.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}</Button>
                      {selectedDocument.status !== "archived" ? <Button variant="ghost" size="sm" onClick={handleArchive} loading={actionLoading === "archive"}>Archiver</Button> : null}
                      <DocumentCommunicationActions document={selectedDocument} layout="stack" presentation="buttons" buttonClassName="w-full" />
                    </div>
                  </section>
                </div>
              ) : <p className="px-4 py-10 text-center text-xs text-muted">Aucun détail à afficher.</p>}
            </aside>
          </div>
        ) : null}

        {activeSection === "knowledge" ? <KnowledgeSpaceDesktop /> : null}

        {activeSection === "generation" ? (
          <div className="reports-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface px-8 py-7">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-lg font-bold text-heading">Génération</h2>
              <p className="mt-1 text-xs text-muted">Accédez aux flux de rédaction et de génération disponibles.</p>
              <div className="mt-7 grid grid-cols-2 gap-4">
                {REPORT_SUPPORTS.map((support) => (
                  <button
                    key={support.id}
                    type="button"
                    onClick={support.onClick}
                    className="group flex min-h-24 w-full items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left outline-none transition-colors hover:border-primary/40 hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-edito-canvas text-primary">
                      <ReportSupportIcon iconType={support.iconType} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-heading transition-colors group-hover:text-primary">
                        {support.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">
                        {support.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>

    {selectedDocument ? (
      <AddToListDialogDesktop
        open={addToListOpen}
        onOpenChange={setAddToListOpen}
        contentType="intelligence_document"
        contentId={selectedDocument.id}
        onManageLists={() => {
          setAddToListOpen(false)
          setActiveSection("knowledge")
        }}
      />
    ) : null}

    <WatchAnalysisComposerDesktop
      open={isAnalysisComposerOpen}
      onClose={() => setIsAnalysisComposerOpen(false)}
      currentDigest={null}
      currentDigestNumber={null}
      pastDigests={[]}
      knownArticles={[]}
      onLaunched={() => {
        setIsAnalysisComposerOpen(false)
        router.refresh()
      }}
    />
    </>
  )
}
