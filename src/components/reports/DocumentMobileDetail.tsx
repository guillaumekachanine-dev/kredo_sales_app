"use client"

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { DocumentGenerationParameters } from "@/components/reports/DocumentGenerationParameters"
import { DocumentCommunicationActions } from "@/components/reports/DocumentCommunicationActions"
import { ClientSummaryDocumentContent } from "@/components/reports/ClientSummaryDocumentContent"
import { PitchDocumentContent } from "@/components/reports/PitchDocumentContent"
import { FinancialReportContent } from "@/components/reports/financial/FinancialReportContent"
import { DocumentEditor } from "@/components/reports/DocumentEditor"
import { DocumentVersionHistory } from "@/components/reports/DocumentVersionHistory"
import {
  fetchDocumentDetail,
  setDocumentFavorite,
  setDocumentStatus,
} from "@/app/(app)/reports/_data/reports-actions"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"
import { getPitchBriefLabel } from "@/components/reports/document-display"

type DocumentMobileDetailProps = {
  documentId: string
  open: boolean
  onClose: () => void
}

const DOCUMENT_TYPE_LABELS: Record<DocumentDetail["documentType"], string> = {
  communication: "Communication",
  client_summary: "Synthèse client",
  commercial_strategy: "Stratégie commerciale",
  commercial_pitch: "Pitch commercial",
  prise_de_parole: "Prise de parole",
  campaign: "Campagne",
  internal_note: "Note interne",
  activity_commercial: "Activité commerciale",
  activity_recruitment: "Activité recrutement",
  weekly_manager: "Rapport hebdo manager",
  planning_deadlines: "Planning & échéances",
  financial: "Rapport financier",
  quarterly_review: "Business review trimestrielle",
  staffing_capacity: "Staffing & capacité",
  delivery_profitability: "Delivery & rentabilité",
  account_portfolio: "Revue de portefeuille comptes",
  workspace_diagnostic: "Diagnostic du centre de profit",
  financial_reference: "Référence financière",
  commercial_quote: "Devis client",
}

const STATUS_LABELS: Record<DocumentDetail["status"], string> = {
  draft: "Brouillon",
  ready: "Prêt",
  used: "Utilisé",
  archived: "Archivé",
}

const STATUS_VARIANTS: Record<DocumentDetail["status"], StatusPillVariant> = {
  draft: "draft",
  ready: "inProgress",
  used: "success",
  archived: "neutral",
}

type LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "error"; data: null; error: string }
  | { status: "ready"; data: DocumentDetail; error: null }

type QaFlagViewModel = {
  check: string
  detail: string | null
  passed: boolean
}

function formatSourceRef(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const label = record.label
    if (typeof label === "string" && label.trim()) return label.trim()
    const name = record.name
    if (typeof name === "string" && name.trim()) return name.trim()
    const title = record.title
    if (typeof title === "string" && title.trim()) return title.trim()
  }

  return JSON.stringify(value) ?? "Source structurée"
}

function buildQaFlags(values: unknown[]): QaFlagViewModel[] {
  return values.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return []
    const record = value as Record<string, unknown>
    return [{
      check: typeof record.check === "string" ? record.check : "Contrôle",
      detail:
        typeof record.detail === "string"
          ? record.detail
          : typeof record.reason === "string"
            ? record.reason
            : null,
      passed: record.passed === true,
    }]
  })
}

function buildQualityState(document: DocumentDetail | null) {
  const flags = document?.versions[0]?.qaFlags
  if (!Array.isArray(flags) || flags.length === 0) return null

  const parsed = flags
    .map((flag) => {
      if (!flag || typeof flag !== "object" || Array.isArray(flag)) return null
      const passed = (flag as { passed?: unknown }).passed
      return typeof passed === "boolean" ? passed : null
    })
    .filter((value): value is boolean => value !== null)

  if (parsed.length === 0) return null
  return parsed.every(Boolean)
}

export function DocumentMobileDetail({
  documentId,
  open,
  onClose,
}: DocumentMobileDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!open || !documentId) return

    let cancelled = false

    void fetchDocumentDetail(documentId).then((result) => {
      if (cancelled) return

      if ("error" in result) {
        setLoadState({
          status: "error",
          data: null,
          error: result.error ?? "Impossible de charger le document",
        })
        return
      }

      setLoadState({ status: "ready", data: result.data, error: null })
    })

    return () => {
      cancelled = true
    }
  }, [documentId, open, reloadToken])

  const document = loadState.status === "ready" ? loadState.data : null
  const qualityOk = useMemo(() => buildQualityState(document), [document])
  const qaFlags = useMemo(
    () => buildQaFlags(document?.versions[0]?.qaFlags ?? []),
    [document?.versions]
  )
  const failedFlags = qaFlags.filter((flag) => !flag.passed)
  const appliedBrief = document?.versions[0]?.sourceRunInputSnapshot ?? document?.versions[0]?.briefJson ?? null
  const isPitch = document?.documentType === "commercial_pitch" || document?.documentType === "prise_de_parole"
  const pitchLabel = isPitch ? getPitchBriefLabel(appliedBrief) : null
  const drawerError = loadState.status === "error"
    ? {
        title: "Impossible de charger le document",
        description: loadState.error,
      }
    : null

  function handleCopy() {
    if (!document?.currentContentText) return
    setActionError(null)
    void navigator.clipboard.writeText(document.currentContentText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setActionError("Impossible de copier le contenu")
    })
  }

  function handleFavoriteToggle() {
    if (!document) return

    setActionError(null)
    startTransition(async () => {
      const nextFavorite = !document.isFavorite
      const result = await setDocumentFavorite(document.id, nextFavorite)
      if (!result.success) {
        setActionError(result.error)
        return
      }

      setLoadState((current) => {
        if (current.status !== "ready") return current
        return {
          status: "ready",
          data: { ...current.data, isFavorite: nextFavorite },
          error: null,
        }
      })
      router.refresh()
    })
  }

  function handleArchive() {
    if (!document || document.status === "archived") return

    setActionError(null)
    startTransition(async () => {
      const result = await setDocumentStatus(document.id, "archived")
      if (!result.success) {
        setActionError(result.error)
        return
      }

      setLoadState((current) => {
        if (current.status !== "ready") return current
        return {
          status: "ready",
          data: { ...current.data, status: "archived" },
          error: null,
        }
      })
      router.refresh()
    })
  }

  function handleEditSaved() {
    setIsEditing(false)
    setReloadToken((current) => current + 1)
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setIsEditing(false)
          onClose()
        }
      }}
      side="bottom"
      title={pitchLabel ?? document?.title ?? "Chargement du document"}
      loading={loadState.status === "loading"}
      error={drawerError}
      showMobileCloseButton
      footer={document && !isEditing ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex-1"
          >
            Modifier
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            disabled={!document.currentContentText}
            className="flex-1"
          >
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button
            variant={document.isFavorite ? "primary" : "secondary"}
            size="sm"
            onClick={handleFavoriteToggle}
            loading={isPending}
            className="flex-1"
          >
            {document.isFavorite ? "Retirer favori" : "Ajouter favori"}
          </Button>
          {document.status !== "archived" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              loading={isPending}
              className="w-full"
            >
              Archiver
            </Button>
          ) : null}
        </>
      ) : null}
    >
      {document ? (
        <div className="space-y-5">
          {isEditing ? (
            <DocumentEditor
              key={`${document.id}-${document.versionNumber}`}
              document={document}
              onCancel={() => setIsEditing(false)}
              onSaved={handleEditSaved}
            />
          ) : (
            <>
              <section className="flex flex-wrap items-center gap-2">
                <StatusPill
                  label={STATUS_LABELS[document.status]}
                  variant={STATUS_VARIANTS[document.status]}
                />
                <StatusPill
                  label={DOCUMENT_TYPE_LABELS[document.documentType]}
                  variant="info"
                />
                <StatusPill
                  label={`Version ${document.versionNumber}`}
                  variant="neutral"
                  dot={false}
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Contenu
                </h3>
                <div
                  className="paper-sheet p-4 rounded-[var(--radius-medium)] border border-border/40 max-h-[45vh] overflow-y-auto leading-relaxed"
                  style={{
                    backgroundColor: "#FAF9F6",
                    color: "#4A5568",
                    colorScheme: "light",
                    "--color-canvas": "#FAF9F6",
                    "--color-surface": "#FFFFFF",
                    "--color-surface-hover": "#F5F4F0",
                    "--color-border": "#E3DFD5",
                    "--color-heading": "#1C2333",
                    "--color-body": "#4A5568",
                    "--color-muted": "#718096",
                    "--color-primary": "#A67A1E",
                    "--color-primary-deep": "#8C6615",
                    "--color-primary-fg": "#FAF9F6",
                  } as CSSProperties}
                >
                  {document.documentType === "client_summary" ? (
                    <ClientSummaryDocumentContent
                      contentJson={document.currentContentJson}
                      contentText={document.currentContentText}
                      isMobile
                      fallbackClassName="text-sm whitespace-pre-wrap text-body"
                    />
                  ) : document.documentType === "financial" || (document.currentContentJson && typeof document.currentContentJson === "object" && (document.currentContentJson as Record<string, unknown>).reportType === "financial") ? (
                    <FinancialReportContent
                      contentJson={document.currentContentJson}
                      contentText={document.currentContentText}
                      isMobile
                    />
                  ) : isPitch ? (
                    <PitchDocumentContent
                      contentJson={document.currentContentJson}
                      contentText={document.currentContentText}
                      briefJson={appliedBrief}
                      fallbackClassName="text-sm whitespace-pre-wrap text-body"
                    />
                  ) : document.currentContentText ? (
                    <div className="text-sm whitespace-pre-wrap text-body">
                      {document.currentContentText}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Aucun contenu texte disponible.</p>
                  )}
                </div>
              </section>

              <section className="space-y-2 border-t border-border/20 pt-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Paramètres de génération
                </h3>
                <DocumentGenerationParameters document={document} />
              </section>

              <DocumentCommunicationActions document={document} layout="stack" />

              <section className="space-y-2">
                <details className="rounded-[var(--radius-medium)] border border-border bg-canvas/30">
                  <summary className="cursor-pointer px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Historique des versions
                  </summary>
                  <div className="border-t border-border px-3 py-3">
                    <DocumentVersionHistory
                      key={`${document.id}-${document.versionNumber}`}
                      versions={document.versions}
                      compact
                    />
                  </div>
                </details>
              </section>

              {actionError ? (
                <p className="text-sm text-danger">{actionError}</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </AppDrawer>
  )
}
