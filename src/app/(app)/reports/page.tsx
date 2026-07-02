import { getDocumentDetail } from "@/app/(app)/reports/_data/get-document-detail"
import { getReportsList } from "@/app/(app)/reports/_data/get-reports-list"
import type { ReportsFilterState, ReportsListData } from "@/app/(app)/reports/_data/reports-types"
import { ReportsDesktopView } from "@/components/reports/ReportsDesktopView"
import { ReportsMobileView } from "@/components/reports/ReportsMobileView"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

function pickParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function pickBoolean(value: string | string[] | undefined) {
  const normalized = pickParam(value)
  return normalized === "true" || normalized === "1"
}

function pickPage(value: string | string[] | undefined) {
  const raw = pickParam(value)
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function buildFilters(searchParams: SearchParams): ReportsFilterState {
  const filters: ReportsFilterState = {}

  const search = pickParam(searchParams.search)?.trim()
  if (search) filters.search = search

  const documentType = pickParam(searchParams.documentType)
  if (documentType) filters.documentType = documentType

  const status = pickParam(searchParams.status)
  if (status) filters.status = status

  const entityType = pickParam(searchParams.entityType)
  if (entityType) filters.entityType = entityType

  const entityId = pickParam(searchParams.entityId)
  if (entityId) filters.entityId = entityId

  const ownerId = pickParam(searchParams.ownerId)
  if (ownerId) filters.ownerId = ownerId

  if (pickBoolean(searchParams.favoritesOnly)) {
    filters.favoritesOnly = true
  }

  const periodFrom = pickParam(searchParams.periodFrom)
  if (periodFrom) filters.periodFrom = periodFrom

  const periodTo = pickParam(searchParams.periodTo)
  if (periodTo) filters.periodTo = periodTo

  return filters
}

function createEmptyReportsData(): ReportsListData {
  return {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 24,
    kpis: {
      total: 0,
      drafts: 0,
      ready: 0,
      usedThisMonth: 0,
    },
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filters = buildFilters(resolvedSearchParams)
  const page = pickPage(resolvedSearchParams.page)
  const selectedDocumentId = pickParam(resolvedSearchParams.doc)?.trim() || null

  const [device, listResult, detailResult] = await Promise.all([
    getDashboardDevice(),
    getReportsList({ filters, page }),
    selectedDocumentId ? getDocumentDetail(selectedDocumentId) : Promise.resolve(null),
  ])

  const reportsData = listResult.data ?? createEmptyReportsData()
  const listError = listResult.error ?? null
  const selectedDocument = detailResult?.data ?? null
  const selectedDocumentError = detailResult?.error ?? null

  if (device === "mobile") {
    return (
      <ReportsMobileView
        reportsData={reportsData}
        filters={filters}
        listError={listError}
      />
    )
  }

  return (
    <ReportsDesktopView
      reportsData={reportsData}
      kpis={reportsData.kpis}
      filters={filters}
      selectedDocumentId={selectedDocumentId}
      selectedDocument={selectedDocument}
      selectedDocumentError={selectedDocumentError}
      listError={listError}
    />
  )
}
