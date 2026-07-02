import type { Database } from "@/types/database"

export type DocumentListItem = {
  id: string
  title: string
  documentType: Database["public"]["Enums"]["intelligence_document_type"]
  status: Database["public"]["Enums"]["intelligence_document_status"]
  versionNumber: number
  isFavorite: boolean
  tags: string[]
  primaryEntity: { type: string; id: string; label: string } | null
  qualityOk: boolean | null
  ownerName: string
  updatedAt: string
}

export type DocumentVersion = {
  id: string
  versionNumber: number
  origin: Database["public"]["Enums"]["intelligence_document_version_origin"]
  contentText: string | null
  contentJson: unknown
  briefJson: unknown | null
  sourceRefs: unknown[]
  qaFlags: unknown[]
  changeNote: string | null
  createdByName: string | null
  createdAt: string
}

export type DocumentLink = { entityType: string; entityId: string; label: string }

export type DocumentDetail = DocumentListItem & {
  currentContentText: string | null
  currentContentJson: unknown
  links: DocumentLink[]
  versions: DocumentVersion[]
}

export type ReportsFilterState = {
  search?: string
  documentType?: string
  status?: string
  entityType?: string
  entityId?: string
  ownerId?: string
  favoritesOnly?: boolean
  periodFrom?: string
  periodTo?: string
}

export type ReportsKpis = { total: number; drafts: number; ready: number; usedThisMonth: number }

export type ReportsListData = {
  items: DocumentListItem[]
  totalCount: number
  page: number
  pageSize: number
  kpis: ReportsKpis
}

export type ReportsListResult =
  | { data: ReportsListData; error?: never }
  | { data?: never; error: string }

export type DocumentDetailResult =
  | { data: DocumentDetail; error?: never }
  | { data?: never; error: string }

export type ReportLinkInput = {
  entityType: Database["public"]["Enums"]["intelligence_entity_type"]
  entityId: string
}

export type ReportPrimaryEntityInput = ReportLinkInput

export type SaveAsDocumentInput = {
  title: string
  documentType: Database["public"]["Enums"]["intelligence_document_type"]
  origin: Database["public"]["Enums"]["intelligence_document_version_origin"]
  contentText: string | null
  contentJson: unknown
  briefJson?: unknown | null
  sourceRefs?: unknown[]
  qaFlags?: unknown[]
  changeNote?: string | null
  tags?: string[]
  isFavorite?: boolean
  sourceResultId?: string | null
  links?: ReportLinkInput[]
  primaryEntity?: ReportPrimaryEntityInput | null
}

export type UpdateDocumentInput = {
  documentId: string
  title: string
  contentText: string | null
  contentJson: unknown
  briefJson?: unknown | null
  sourceRefs?: unknown[]
  qaFlags?: unknown[]
  changeNote?: string | null
  tags?: string[]
  isFavorite?: boolean
  status?: Database["public"]["Enums"]["intelligence_document_status"]
  links?: ReportLinkInput[]
  primaryEntity?: ReportPrimaryEntityInput | null
}

export type DocumentMutationResult =
  | { success: true; documentId: string; error?: never }
  | { success?: never; documentId?: never; error: string }

export const REPORTS_DEFAULT_PAGE_SIZE = 24
