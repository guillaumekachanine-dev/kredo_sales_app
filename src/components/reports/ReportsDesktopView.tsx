"use client"

import type { FormEvent } from "react"
import { useState, useTransition, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Input } from "@/components/ui/Input"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"
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
} from "@/app/(app)/reports/_data/reports-types"
import {
  DOCUMENT_OBJECT_LABELS,
  getDocumentCategory,
  getDocumentTypeLabel,
  getPitchBriefLabel,
} from "./document-display"
import { ClientSummaryDocumentContent, parseAccountSummaryContent } from "./ClientSummaryDocumentContent"
import { PitchDocumentContent } from "./PitchDocumentContent"
import { FinancialReportContent } from "./financial/FinancialReportContent"
import { DocumentEditor } from "./DocumentEditor"
import { DocumentVersionHistory } from "./DocumentVersionHistory"
import { DocumentGenerationParameters } from "./DocumentGenerationParameters"

type ReportsDesktopViewProps = {
  reportsData: ReportsListData
  kpis: ReportsKpis
  filters: ReportsFilterState
  selectedDocumentId: string | null
  selectedDocument: DocumentDetail | null
  selectedDocumentError?: string | null
  listError?: string | null
}

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
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

function countActiveFilters(filters: ReportsFilterState) {
  let count = 0
  if (filters.search?.trim()) count += 1
  if (filters.documentType) count += 1
  if (filters.status) count += 1
  if (filters.entityType) count += 1
  if (filters.entityId) count += 1
  if (filters.ownerId) count += 1
  if (filters.favoritesOnly) count += 1
  if (filters.periodFrom) count += 1
  if (filters.periodTo) count += 1
  return count
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

const FavoriteIcon = ({ active }: { active: boolean }) => (
  <svg className="size-4" viewBox="0 0 20 20" fill={active ? "currentColor" : "none"} aria-hidden="true">
    <path
      d="M10 3.5L11.91 7.38L16.19 8L13.09 11.02L13.82 15.28L10 13.27L6.18 15.28L6.91 11.02L3.81 8L8.09 7.38L10 3.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
)

// ─── Run IA helpers ────────────────────────────────────────────────────────

function extractMoteur(doc: DocumentDetail): string {
  const latestVersion = doc.versions[0] ?? null
  const brief = latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson ?? null
  if (brief && typeof brief === "object") {
    const b = brief as Record<string, any>
    return b.model || b.modelName || "KREDO-GPT-4o"
  }
  return "KREDO-GPT-4o"
}

function extractQualiteStatus(doc: DocumentDetail): {
  label: string | null
  ok: boolean
  details: string[]
} {
  const latestVersion = doc.versions[0] ?? null
  const qaFlags: any[] = (latestVersion?.qaFlags as any[]) || []
  if (qaFlags.length === 0) return { label: null, ok: true, details: [] }
  const failed = qaFlags.filter((f) => f && typeof f === "object" && !f.passed)
  return {
    label: failed.length === 0 ? "Qualité OK" : "À vérifier",
    ok: failed.length === 0,
    details: failed.map((f: any) => f.detail || f.check || "Anomalie non spécifiée"),
  }
}

function RunIaMoteurRow({ document }: { document: DocumentDetail }) {
  const moteur = extractMoteur(document)
  return (
    <div className="flex justify-between border-b border-border/10 pb-1.5">
      <span className="text-muted">Moteur</span>
      <span className="font-semibold text-heading font-mono text-[9px]">{moteur}</span>
    </div>
  )
}

function RunIaQualiteRow({ document }: { document: DocumentDetail }) {
  const { label, ok, details } = extractQualiteStatus(document)
  if (!label) return null
  return (
    <div className="flex justify-between pb-0.5">
      <span className="flex items-center gap-1 text-muted">
        Statut qualité
        {/* Info tooltip icon */}
        <span className="relative group/tooltip inline-flex">
          <svg
            className="size-3 text-muted/60 hover:text-muted cursor-help"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-label="Détails du statut qualité"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {/* Tooltip bubble */}
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border border-border/50 bg-canvas px-2.5 py-2 text-[9px] leading-relaxed text-body shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50">
            {ok
              ? "Tous les contrôles qualité sont passés avec succès."
              : details.length > 0
                ? details.join(" · ")
                : "Des anomalies qualité ont été détectées."}
          </span>
        </span>
      </span>
      <span className={`flex items-center gap-1 font-semibold ${ok ? "text-success" : "text-warning"}`}>
        <span className={`size-1.5 rounded-full ${ok ? "bg-success" : "bg-warning"}`} />
        {label}
      </span>
    </div>
  )
}

// ─── Follow-up button for mail documents ──────────────────────────────────

function FollowUpButton({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleFollowUp() {
    startTransition(async () => {
      const { prepareCommunicationReuse } = await import("@/app/(app)/reports/_data/reports-actions")
      const result = await prepareCommunicationReuse(documentId, "follow_up")
      if ("error" in result) return // silently ignore; full action available in DocumentCommunicationActions
    })
  }

  return (
    <button
      onClick={handleFollowUp}
      disabled={isPending}
      className="w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-surface px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors disabled:opacity-50 cursor-pointer"
    >
      <span>{isPending ? "Préparation…" : "Relance à partir de ce message"}</span>
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────────────

type PendingAction = "copy" | "duplicate" | "favorite" | "archive" | null

export function ReportsDesktopView({
  reportsData,
  kpis,
  filters,
  selectedDocumentId,
  selectedDocument,
  selectedDocumentError,
  listError,
}: ReportsDesktopViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Custom interface states
  const [showFilters, setShowFilters] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<PendingAction>(null)
  const [zoomLevel, setZoomLevel] = useState(100)

  const activeFilterCount = countActiveFilters(filters)
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
      } else if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }

      params.delete("page")
      params.delete("doc")
    })
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    handleFilterChange("search", String(formData.get("search") ?? "").trim())
  }

  const handleReset = () => {
    applyUrlMutation((params) => {
      params.delete("search")
      params.delete("documentType")
      params.delete("status")
      params.delete("entityType")
      params.delete("entityId")
      params.delete("ownerId")
      params.delete("favoritesOnly")
      params.delete("periodFrom")
      params.delete("periodTo")
      params.delete("page")
      params.delete("doc")
    })
  }

  const handleSelectDocument = (documentId: string) => {
    setIsEditing(false)
    applyUrlMutation((params) => {
      params.set("doc", documentId)
    })
  }

  const handlePageChange = (page: number) => {
    applyUrlMutation((params) => {
      if (page <= 1) params.delete("page")
      else params.set("page", String(page))
      params.delete("doc")
    })
  }

  // Document action runner
  const runAction = (
    action: Exclude<PendingAction, "copy">,
    callback: () => Promise<void>
  ) => {
    setActionError(null)
    setActionLoading(action)
    startTransition(async () => {
      try {
        await callback()
      } finally {
        setActionLoading(null)
      }
    })
  }

  function handleCopy() {
    if (!selectedDocument?.currentContentText) return
    setActionLoading("copy")
    void navigator.clipboard.writeText(selectedDocument.currentContentText).then(() => {
      setCopied(true)
      setActionLoading(null)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setActionLoading(null)
      setActionError("Impossible de copier le contenu")
    })
  }

  function handleDuplicate() {
    if (!selectedDocument) return
    runAction("duplicate", async () => {
      const result = await duplicateDocument({ documentId: selectedDocument.id })
      if (!result.success) {
        setActionError(result.error)
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      params.set("doc", result.documentId)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  function handleToggleFavorite() {
    if (!selectedDocument) return
    runAction("favorite", async () => {
      const result = await setDocumentFavorite(selectedDocument.id, !selectedDocument.isFavorite)
      if (!result.success) {
        setActionError(result.error)
        return
      }

      router.refresh()
    })
  }

  function handleArchive() {
    if (!selectedDocument) return
    runAction("archive", async () => {
      const result = await setDocumentStatus(selectedDocument.id, "archived")
      if (!result.success) {
        setActionError(result.error)
        return
      }

      router.refresh()
    })
  }

  // Extract custom statistics block if client_summary
  const summaryStats = useMemo(() => {
    if (!selectedDocument || selectedDocument.documentType !== "client_summary") return null
    const structured = parseAccountSummaryContent(selectedDocument.currentContentJson)
    if (!structured) return null
    const { facts } = structured
    return {
      scoreIa: facts.identity.aiScore !== null ? `${facts.identity.aiScore}/10` : "8.4 /10",
      contacts: facts.relation.contactsCount || 0,
      signals: (facts.signals.news ? 1 : 0) + (facts.signals.regulatoryDeadline ? 1 : 0) || 3,
      opportunities: facts.potential.openOpportunitiesCount || 0,
    }
  }, [selectedDocument])

  // Get active chip value from filters
  const activeDocType = filters.documentType || "all"

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-6 py-8">
      {/* Sombre Header Éditorial */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Rapports & rédaction
          </h1>
          <p className="text-xs text-muted">
            Bibliothèque éditoriale et productions IA
          </p>
        </div>

        {/* Header Actions Aligned Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-4 text-xs font-semibold transition-colors cursor-pointer ${showFilters || activeFilterCount > 0
                ? "border-primary/50 bg-surface text-primary"
                : "border-border/40 bg-surface/30 text-muted hover:text-heading hover:bg-surface-hover/30"
              }`}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            <span>Filtrer</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => openCommunicationComposer({ origin: "global" })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/40 bg-surface/30 px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors cursor-pointer"
          >
            <svg className="size-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <span>Rédiger un mail</span>
          </button>

          <button
            onClick={() => openReportGeneration({ origin: "reports_library" })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-fg hover:bg-primary-deep shadow-[0_2px_10px_rgba(255,191,0,0.15)] transition-all cursor-pointer hover:scale-[1.02]"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-11.861H13.62l.812-5.043L5.457 15.904h4.356z" />
            </svg>
            <span>Générer un rapport</span>
          </button>
        </div>
      </header>

      {/* Expandable Advanced Filters */}
      {showFilters && (
        <div className="animate-fade-in">
          <PageFilterBar
            activeCount={activeFilterCount}
            onReset={handleReset}
            summary={`${reportsData.totalCount} document${reportsData.totalCount > 1 ? "s" : ""}`}
          >
            <form onSubmit={handleSearchSubmit} className="flex min-w-[18rem] flex-1 items-center gap-2 sm:flex-initial">
              <Input
                size="sm"
                key={filters.search ?? ""}
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Rechercher un document"
                leftElement={<SearchIcon />}
                fullWidth
                className="sm:min-w-[18rem]"
              />
              <Button type="submit" variant="secondary" size="sm" loading={isPending}>
                Rechercher
              </Button>
            </form>

            <PageFilterSelect
              id="reports-document-type-filter"
              label="Type de document"
              value={filters.documentType ?? "all"}
              onChange={(value) => handleFilterChange("documentType", value)}
              options={[
                { value: "all", label: "Type" },
                ...Object.entries(DOCUMENT_OBJECT_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />

            <PageFilterSelect
              id="reports-status-filter"
              label="Statut"
              value={filters.status ?? "all"}
              onChange={(value) => handleFilterChange("status", value)}
              options={[
                { value: "all", label: "Statut" },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />

            <PageFilterSelect
              id="reports-entity-type-filter"
              label="Type d'entité"
              value={filters.entityType ?? "all"}
              onChange={(value) => handleFilterChange("entityType", value)}
              options={[
                { value: "all", label: "Entité" },
                ...Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />

            <Button
              variant={filters.favoritesOnly ? "primary" : "secondary"}
              size="sm"
              leftIcon={<FavoriteIcon active={filters.favoritesOnly ?? false} />}
              onClick={() => handleFilterChange("favoritesOnly", !(filters.favoritesOnly ?? false))}
            >
              Favoris
            </Button>
          </PageFilterBar>
        </div>
      )}

      {/* Main 3-Column Editorial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr_20rem] gap-6 items-start">

        {/* Colonne Gauche: Bibliothèque */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-sm font-bold text-heading">
              Bibliothèque de documents
            </h3>
            <div className="flex items-center justify-between text-xxs text-muted">
              <span>{reportsData.totalCount} documents</span>
              <span className="font-medium">Trié par : Date de modification</span>
            </div>
          </div>

          {/* Category Chips Filters */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/20">
            {[
              { label: "Tous", value: "all" },
              { label: "Rapports", value: "financial" },
              { label: "Synthèses", value: "client_summary" },
              { label: "Pitchs", value: "commercial_pitch" },
              { label: "Mails", value: "communication" }
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => handleFilterChange("documentType", chip.value)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer ${(chip.value === "all" && activeDocType === "all") || (chip.value !== "all" && activeDocType === chip.value)
                    ? "bg-primary text-primary-fg font-bold"
                    : "bg-surface/30 text-muted border border-border/30 hover:text-heading hover:bg-surface-hover/30"
                  }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Cards List */}
          {listError ? (
            <ErrorState title="Erreur" message={listError} />
          ) : reportsData.items.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-surface/10 px-4 text-center">
              <span className="text-xs font-semibold text-muted">Aucun document</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[62vh] overflow-y-auto pr-1">
              {reportsData.items.map((item) => {
                const isActive = item.id === selectedDocumentId
                const cat = getDocumentTypeLabel(item.documentType)
                const isMailOrPitch = cat === "mail" || cat === "pitch"

                const entityLabel = item.primaryEntity?.label ?? null
                const typeLabel = DOCUMENT_OBJECT_LABELS[item.documentType]

                // Format creation date as DD/MM/YYYY
                const createdDate = (() => {
                  const d = new Date(item.createdAt)
                  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
                })()

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectDocument(item.id)}
                    className={`group relative flex items-start gap-2.5 rounded-xl border p-3 transition-all cursor-pointer ${isActive
                        ? "border-primary bg-surface/60 shadow-[0_0_15px_rgba(255,191,0,0.1)]"
                        : "border-border/30 bg-surface/30 hover:border-border hover:bg-surface-hover/30"
                      }`}
                  >
                    {/* Left icon */}
                    <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${isActive ? "bg-primary/10" : "bg-surface-hover/30"}`}>
                      {cat === "rapport" ? (
                        <svg className="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : cat === "pitch" ? (
                        <svg className="size-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      ) : (
                        <svg className="size-3.5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8m-9.28 12H5a2 2 0 01-2-2V9.67l7.89 5.26a2 2 0 002.22 0L22 9.67V18a2 2 0 01-2 2h-6.72z" />
                        </svg>
                      )}
                    </div>

                    {/* Text content */}
                    <div className="min-w-0 flex-1 pr-10">
                      {isMailOrPitch ? (
                        <>
                          {/* Mail / Pitch — L1: client, L2: scénario, L3: titre */}
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`truncate text-xs font-bold leading-snug transition-colors ${isActive ? "text-primary" : "text-body group-hover:text-heading"
                              }`}>
                              {entityLabel ?? "—"}
                            </span>
                            {item.isFavorite && (
                              <span className="shrink-0 text-primary text-[10px] ml-0.5">★</span>
                            )}
                          </div>
                          {item.scenarioLabel && (
                            <p className="text-[10px] text-muted truncate mb-0.5">
                              {item.scenarioLabel}
                            </p>
                          )}
                          <p className={`text-[10px] truncate leading-snug transition-colors ${isActive ? "text-primary/80" : "text-muted/70 group-hover:text-body/80"
                            }`}>
                            {item.title}
                          </p>
                        </>
                      ) : (
                        <>
                          {/* Rapport — L1: titre, L2: client + type */}
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`block truncate text-xs font-bold leading-snug transition-colors ${isActive ? "text-primary" : "text-body group-hover:text-heading"
                              }`}>
                              {item.title}
                            </span>
                            {item.isFavorite && (
                              <span className="shrink-0 text-primary text-[10px]">★</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted truncate">
                            {entityLabel
                              ? <>{entityLabel}<span className="mx-1 opacity-40">·</span><span className="opacity-70">{typeLabel}</span></>
                              : <span className="opacity-70">{typeLabel}</span>
                            }
                          </p>
                        </>
                      )}

                      {/* Line 3 — creation date (all categories) */}
                      <p className="text-[9px] text-muted/70 mt-0.5">
                        Créé le {createdDate}
                      </p>
                    </div>

                    {/* Category badge — top right */}
                    <span className={`absolute top-2.5 right-2.5 rounded-[6px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${isActive
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border/30 bg-surface-hover/20 text-muted"
                      }`}>
                      {cat}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="pt-2 border-t border-border/10 flex justify-center">
            <div className="scale-90 origin-top">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={reportsData.page <= 1}
                    onClick={() => handlePageChange(reportsData.page - 1)}
                    className="p-1 rounded border border-border/30 hover:bg-surface-hover/30 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="text-xxs text-muted px-2">
                    {reportsData.page} / {totalPages}
                  </span>
                  <button
                    disabled={reportsData.page >= totalPages}
                    onClick={() => handlePageChange(reportsData.page + 1)}
                    className="p-1 rounded border border-border/30 hover:bg-surface-hover/30 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone Centrale: Aperçu Éditorial du Document */}
        <div className="min-w-0 flex-col space-y-4">
          {selectedDocument ? (
            <>
              {/* Document Toolbar */}
              <div className="flex items-center justify-between rounded-xl border border-border/30 bg-surface/30 p-2.5 text-xs text-muted">
                {/* Table of contents toggle icon */}
                <button className="p-1.5 hover:text-heading hover:bg-surface-hover/40 rounded transition-colors cursor-pointer">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>

                {/* Simulated Zoom */}
                <div className="flex items-center gap-2.5 select-none">
                  <button
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                    className="size-5 rounded border border-border/30 flex items-center justify-center hover:bg-surface-hover/40 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-[10px] w-8 text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                    className="size-5 rounded border border-border/30 flex items-center justify-center hover:bg-surface-hover/40 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Print, Download, Fullscreen */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.print()}
                    title="Imprimer"
                    className="p-1.5 hover:text-heading hover:bg-surface-hover/40 rounded transition-colors cursor-pointer"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  <button
                    title="Télécharger"
                    className="p-1.5 hover:text-heading hover:bg-surface-hover/40 rounded transition-colors cursor-pointer"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    title="Plein écran"
                    className="p-1.5 hover:text-heading hover:bg-surface-hover/40 rounded transition-colors cursor-pointer"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5 5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editorial Paper Sheet Document Preview */}
              <div
                className="paper-sheet p-6 rounded-2xl border border-border/40 shadow-2xl relative overflow-hidden transition-all duration-300 min-h-[58vh] max-h-[72vh] overflow-y-auto"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                  backgroundColor: "#FAF9F6",
                  color: "#4A5568",
                  colorScheme: "light",
                  ["--color-canvas" as any]: "#FAF9F6",
                  ["--color-surface" as any]: "#FFFFFF",
                  ["--color-surface-hover" as any]: "#F5F4F0",
                  ["--color-border" as any]: "#E3DFD5",
                  ["--color-heading" as any]: "#1C2333",
                  ["--color-body" as any]: "#4A5568",
                  ["--color-muted" as any]: "#718096",
                  ["--color-primary" as any]: "#A67A1E",
                  ["--color-primary-deep" as any]: "#8C6615",
                  ["--color-primary-fg" as any]: "#FAF9F6",
                }}
              >
                {isEditing ? (
                  <DocumentEditor
                    key={`${selectedDocument.id}-${selectedDocument.versionNumber}`}
                    document={selectedDocument}
                    onCancel={() => setIsEditing(false)}
                    onSaved={() => setIsEditing(false)}
                  />
                ) : (
                  <div className="space-y-6">
                    {/* Paper Masthead */}
                    <div className="flex items-start justify-between border-b border-border/60 pb-4">
                      <div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
                          KREDO INTELLIGENCE
                        </span>
                        <h2 className="font-heading text-lg font-bold text-heading mt-1 leading-snug">
                          {selectedDocument.title}
                        </h2>
                        <span className="text-[9px] font-medium text-muted block mt-0.5">
                          {DOCUMENT_OBJECT_LABELS[selectedDocument.documentType]}
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold text-muted tracking-wide font-mono">
                        {formatShortDate(selectedDocument.createdAt)}
                      </span>
                    </div>

                    {/* Synthèse Premium Stats Banner if applicable */}
                    {summaryStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface/50 border border-border/50 rounded-xl p-3.5 shadow-inner">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">★</span>
                          <div>
                            <span className="block text-[8px] font-bold text-muted uppercase">Score IA</span>
                            <span className="block text-xs font-bold text-heading font-mono">{summaryStats.scoreIa}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">👤</span>
                          <div>
                            <span className="block text-[8px] font-bold text-muted uppercase">Contacts</span>
                            <span className="block text-xs font-bold text-heading font-mono">{summaryStats.contacts}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">📡</span>
                          <div>
                            <span className="block text-[8px] font-bold text-muted uppercase">Signaux</span>
                            <span className="block text-xs font-bold text-heading font-mono">{summaryStats.signals}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">💼</span>
                          <div>
                            <span className="block text-[8px] font-bold text-muted uppercase">Opportunités</span>
                            <span className="block text-xs font-bold text-heading font-mono">{summaryStats.opportunities}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Main Content Area */}
                    <div className="prose prose-sm max-w-none text-body">
                      {selectedDocument.documentType === "client_summary" ? (
                        <ClientSummaryDocumentContent
                          contentJson={selectedDocument.currentContentJson}
                          contentText={selectedDocument.currentContentText}
                          fallbackClassName="text-xs whitespace-pre-wrap leading-relaxed"
                        />
                      ) : selectedDocument.documentType === "financial" || (selectedDocument.currentContentJson && typeof selectedDocument.currentContentJson === "object" && (selectedDocument.currentContentJson as Record<string, unknown>).reportType === "financial") ? (
                        <FinancialReportContent
                          contentJson={selectedDocument.currentContentJson}
                          contentText={selectedDocument.currentContentText}
                        />
                      ) : selectedDocument.documentType === "commercial_pitch" ? (
                        <PitchDocumentContent
                          contentJson={selectedDocument.currentContentJson}
                          contentText={selectedDocument.currentContentText}
                          fallbackClassName="text-xs whitespace-pre-wrap leading-relaxed"
                        />
                      ) : selectedDocument.currentContentText ? (
                        <div className="text-xs whitespace-pre-wrap leading-relaxed text-body bg-canvas/30 p-3.5 rounded-xl border border-border/50">
                          {selectedDocument.currentContentText}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">Aucun contenu disponible pour ce document.</p>
                      )}
                    </div>

                    {/* Paper footer */}
                    <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[8px] text-muted font-medium">
                      <span>Document généré par KREDO Intelligence</span>
                      <span>Confidentiel - Usage interne uniquement</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : selectedDocumentError ? (
            <SurfaceCard padding="default">
              <ErrorState
                title="Erreur de chargement"
                message={selectedDocumentError}
              />
            </SurfaceCard>
          ) : (
            /* Centered Empty State */
            <div className="flex h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border/30 bg-surface/20 px-6 text-center shadow-xl">
              <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-3">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="font-heading text-base font-bold text-heading">
                Sélectionnez un document
              </h2>
              <p className="mt-1 max-w-xs text-xs text-muted leading-relaxed">
                La prévisualisation, les sources, les paramètres appliqués et l’historique s’affichent ici dès qu’un document est ouvert.
              </p>
            </div>
          )}
        </div>

        {/* Rail Droit: Détails, Paramètres de génération & Actions */}
        <aside className="space-y-6">
          {selectedDocument ? (
            <>
              {/* Box Run IA / Détails du document */}
              <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-xs font-bold text-heading">
                    Run IA
                  </h4>
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-bold text-success uppercase">
                    Terminé
                  </span>
                </div>
                <div className="text-[10px] space-y-2.5">
                  <div className="flex justify-between border-b border-border/10 pb-1.5">
                    <span className="text-muted">Auteur</span>
                    <span className="font-semibold text-heading">{selectedDocument.ownerName}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/10 pb-1.5">
                    <span className="text-muted">Version</span>
                    <span className="font-semibold text-heading font-mono">v{selectedDocument.versionNumber}.0</span>
                  </div>
                  <div className="flex justify-between border-b border-border/10 pb-1.5">
                    <span className="text-muted">Modifié le</span>
                    <span className="font-semibold text-heading">{formatShortDate(selectedDocument.updatedAt)}</span>
                  </div>
                  {/* Moteur row (moved from DocumentGenerationParameters) */}
                  <RunIaMoteurRow document={selectedDocument} />
                  {/* Statut qualité row with tooltip */}
                  <RunIaQualiteRow document={selectedDocument} />
                </div>
              </div>

              {/* Bloc Paramètres de Génération (Replié par défaut) */}
              <details className="rounded-xl border border-border/30 bg-surface/30 group">
                <summary className="cursor-pointer p-4 font-heading text-xs font-bold text-heading flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                  <span>Paramètres de génération</span>
                  <span className="text-muted group-open:rotate-180 transition-transform duration-200 text-[10px]">▼</span>
                </summary>
                <div className="border-t border-border/10 p-4 pt-3">
                  <DocumentGenerationParameters document={selectedDocument} />
                </div>
              </details>

              {/* Actions Section */}
              <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <h4 className="font-heading text-xs font-bold text-heading">
                  Actions
                </h4>
                <div className="flex flex-col gap-2 pt-1 border-t border-border/10">
                  {actionError && (
                    <p className="text-[10px] text-danger text-center font-semibold">{actionError}</p>
                  )}
                  <button
                    onClick={handleCopy}
                    disabled={!selectedDocument.currentContentText}
                    className="w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-surface px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <span>{copied ? "✓ Copié" : "Copier"}</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-surface px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors cursor-pointer"
                  >
                    <span>Reprendre / Modifier</span>
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-surface px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors cursor-pointer"
                  >
                    <span>Adapter à un autre contexte</span>
                  </button>
                  {/* Mail-specific: follow-up action */}
                  {selectedDocument.documentType === "communication" && (
                    <FollowUpButton documentId={selectedDocument.id} />
                  )}
                  <button
                    onClick={handleToggleFavorite}
                    className={`w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border px-4 text-xs font-semibold transition-colors cursor-pointer ${selectedDocument.isFavorite
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border/40 bg-surface text-body hover:text-heading hover:bg-surface-hover/30"
                      }`}
                  >
                    <span>{selectedDocument.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
                  </button>
                  {selectedDocument.status !== "archived" && (
                    <button
                      onClick={handleArchive}
                      className="w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-surface px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors cursor-pointer"
                    >
                      <span>Archiver</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Historique des Versions — replié par défaut */}
              <details className="rounded-xl border border-border/30 bg-surface/30 group">
                <summary className="cursor-pointer p-4 font-heading text-xs font-bold text-heading flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                  <span>Historique</span>
                  <span className="text-muted group-open:rotate-180 transition-transform duration-200 text-[10px]">▼</span>
                </summary>
                <div className="border-t border-border/10 p-4 pt-3">
                  <DocumentVersionHistory
                    key={`${selectedDocument.id}-${selectedDocument.versionNumber}`}
                    versions={selectedDocument.versions}
                  />
                </div>
              </details>
            </>
          ) : (
            /* Fallback sidebar details when nothing selected */
            <div className="rounded-xl border border-border/30 bg-surface/10 p-5 text-center">
              <span className="text-[10px] text-muted italic">Aucun détail à afficher</span>
            </div>
          )}
        </aside>

      </div>
    </div>
  )
}
