"use client"

import type { FormEvent } from "react"
import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { EntityWorkspaceHeader } from "@/components/common/EntityWorkspaceHeader"
import { EntityWorkspacePage } from "@/components/common/EntityWorkspacePage"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Input } from "@/components/ui/Input"
import { KpiCard } from "@/components/ui/KpiCard"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table/DataTable"
import { DataTablePagination } from "@/components/ui/data-table/DataTablePagination"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"
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
} from "./document-display"
import { DocumentPreviewPanel } from "./DocumentPreviewPanel"

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

  const columns: DataTableColumn<DocumentListItem>[] = [
    {
      id: "type",
      header: "Type",
      accessor: (row) => getDocumentTypeLabel(row.documentType),
      width: "6.5rem",
      minWidth: "6.5rem",
      align: "right",
      headerClassName: "whitespace-nowrap",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <span
          className={`inline-flex rounded-[8px] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
            getDocumentCategory(row.documentType) === "report"
              ? "bg-[color-mix(in_srgb,var(--color-document-report)_14%,transparent)] text-[var(--color-document-report)]"
              : "bg-[color-mix(in_srgb,var(--color-document-communication)_16%,transparent)] text-[var(--color-document-communication)]"
          }`}
        >
          {getDocumentTypeLabel(row.documentType)}
        </span>
      ),
    },
    {
      id: "title",
      header: "Titre",
      accessor: (row) => row.title,
      width: "55.5%",
      minWidth: "0",
      className: "max-w-0",
      cell: (row) => (
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-heading">{row.title}</span>
            {row.isFavorite ? (
              <span className="inline-flex text-primary" aria-label="Favori">
                <FavoriteIcon active />
              </span>
            ) : null}
          </div>
          {row.tags.length > 0 ? (
            <div className="truncate text-[11px] text-muted">
              {row.tags.slice(0, 2).join(" · ")}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "object",
      header: "Objet",
      accessor: (row) => DOCUMENT_OBJECT_LABELS[row.documentType],
      width: "25%",
      minWidth: "0",
      className: "max-w-0",
      cell: (row) => <span className="block truncate">{DOCUMENT_OBJECT_LABELS[row.documentType]}</span>,
    },
    {
      id: "createdAt",
      header: "Créé le",
      accessor: (row) => row.createdAt,
      width: "13%",
      minWidth: "5rem",
      align: "right",
      headerClassName: "whitespace-nowrap",
      className: "whitespace-nowrap text-right",
      cell: (row) => formatShortDate(row.createdAt),
    },
  ]

  return (
    <EntityWorkspacePage>
      <EntityWorkspaceHeader
        title="Rapports & Rédaction"
        kpis={(
          <>
            <KpiCard label="Documents" value={kpis.total} size="compact" compactLayout className="min-w-[10rem]" />
            <KpiCard label="Brouillons" value={kpis.drafts} size="compact" compactLayout className="min-w-[10rem]" />
            <KpiCard label="Prêts" value={kpis.ready} size="compact" compactLayout className="min-w-[10rem]" />
            <KpiCard label="Utilisés ce mois" value={kpis.usedThisMonth} size="compact" compactLayout className="min-w-[10rem]" />
          </>
        )}
        actions={(
          <div className="flex flex-col items-stretch gap-2">
            <Button onClick={() => openCommunicationComposer({ origin: "global" })}>
              Rédiger un mail
            </Button>
            <Button variant="secondary" onClick={() => openReportGeneration({ origin: "reports_library" })}>
              Générer un rapport
            </Button>
          </div>
        )}
      />

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

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.95fr)]">
        <SurfaceCard className="min-w-0" padding="none">
          <DataTable
            rows={reportsData.items}
            columns={columns}
            getRowId={(row) => row.id}
            ariaLabel="Liste des documents"
            tableClassName="table-fixed"
            containerClassName="overflow-x-hidden"
            selectedRowId={selectedDocumentId}
            onRowClick={(row) => handleSelectDocument(row.id)}
            stickyHeader
            errorState={
              listError ? (
                <ErrorState
                  title="Impossible de charger les documents"
                  message={listError}
                />
              ) : undefined
            }
            emptyState={(
              <div className="flex min-h-40 flex-col items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border bg-canvas px-6 text-center">
                <h3 className="text-sm font-semibold text-heading">Aucun document</h3>
                <p className="mt-1 text-sm text-body">
                  Ajustez les filtres ou lancez une nouvelle rédaction.
                </p>
              </div>
            )}
            footer={(
              <DataTablePagination
                currentPage={reportsData.page}
                totalPages={totalPages}
                totalResults={reportsData.totalCount}
                pageSize={reportsData.pageSize}
                onPageChange={handlePageChange}
              />
            )}
          />
        </SurfaceCard>

        <div className="min-w-0">
          {selectedDocument ? (
            <DocumentPreviewPanel document={selectedDocument} />
          ) : selectedDocumentError ? (
            <SurfaceCard padding="default">
              <ErrorState
                title="Impossible de charger le document"
                message={selectedDocumentError}
              />
            </SurfaceCard>
          ) : (
            <SurfaceCard padding="default" className="sticky top-6">
              <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border bg-canvas/40 px-6 text-center">
                <h2 className="font-heading text-lg font-bold text-heading">
                  Sélectionnez un document
                </h2>
                <p className="mt-2 max-w-sm text-sm text-body">
                  La prévisualisation, les sources, les paramètres appliqués et l’historique
                  s’affichent ici dès qu’un document est ouvert.
                </p>
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>
    </EntityWorkspacePage>
  )
}
