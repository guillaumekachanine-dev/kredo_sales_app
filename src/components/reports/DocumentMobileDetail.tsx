"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
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
import { getFinancialReferenceDocumentSummary, getPitchBriefLabel } from "@/components/reports/document-display"

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
  commercial_quote: "Devis commercial",
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
  const appliedBrief = document?.versions[0]?.sourceRunInputSnapshot ?? document?.versions[0]?.briefJson ?? null
  const isPitch = document?.documentType === "commercial_pitch" || document?.documentType === "prise_de_parole"
  const pitchLabel = isPitch ? getPitchBriefLabel(appliedBrief) : null
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
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setIsEditing(false)
          onClose()
        }
      }}
      title={pitchLabel ?? document?.title ?? "Chargement du document"}
      dataTheme="edito-bright-reports"
      fillHeight
      className="!h-[calc(100dvh-1.5rem)] !w-[calc(100vw-1.5rem)] !max-w-none rounded-lg border-edito-border shadow-[0_18px_48px_rgba(30,49,80,0.18)]"
      maxHeightClassName="max-h-[calc(100dvh-1.5rem)]"
      headerClassName="border-b border-border pb-3"
      titleClassName="pr-2 text-base leading-5 text-heading"
      bodyClassName="reports-scrollbar -mr-1 min-h-0 flex-1 overflow-y-auto pr-2"
      footerClassName="border-t border-border pt-3"
      footer={document && !isEditing ? (
        <div className="grid w-full grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="min-w-0"
          >
            Modifier
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            disabled={!document.currentContentText}
            className="min-w-0"
          >
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button
            variant={document.isFavorite ? "primary" : "secondary"}
            size="sm"
            onClick={handleFavoriteToggle}
            loading={isPending}
            className="min-w-0"
          >
            {document.isFavorite ? "Retirer favori" : "Ajouter favori"}
          </Button>
          {document.status !== "archived" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              loading={isPending}
              className="col-span-3 w-full"
            >
              Archiver
            </Button>
          ) : null}
        </div>
      ) : null}
    >
      {loadState.status === "loading" ? (
        <div className="space-y-4 py-2" aria-label="Chargement du document">
          <div className="h-5 w-2/3 animate-pulse rounded bg-edito-chip" />
          <div className="h-64 animate-pulse rounded border border-edito-border bg-edito-canvas" />
          <div className="h-24 animate-pulse rounded bg-edito-chip" />
        </div>
      ) : loadState.status === "error" ? (
        <div className="border border-danger/30 bg-danger/5 p-4">
          <h3 className="font-bold text-danger">Impossible de charger le document</h3>
          <p className="mt-1 text-sm text-body">{loadState.error}</p>
        </div>
      ) : document ? (
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
                <div className="paper-sheet rounded border border-border p-4 leading-relaxed">
                  {document.documentType === "financial_reference" ? (() => {
                    const reference = getFinancialReferenceDocumentSummary(document.currentContentJson)
                    return reference ? (
                      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 text-xs">
                        <span className="inline-flex rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">Référence financière</span>
                        <p className="mt-2 font-bold text-heading">{reference.resource ?? "Ressource non renseignée"}</p>
                        <p className="text-body">{reference.profile ?? "Profil non renseigné"}</p>
                        <p className="mt-2 text-[11px] text-muted">{reference.startDate ?? "—"} — {reference.endDate ?? "Sans fin"}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3"><div><p className="text-[8px] font-bold uppercase text-muted">TJM</p><p className="mt-1 font-mono text-[11px] font-bold text-heading">{reference.saleDailyRate === null ? "—" : `${reference.saleDailyRate.toLocaleString("fr-FR")} €`}</p></div><div><p className="text-[8px] font-bold uppercase text-muted">CA projeté</p><p className="mt-1 font-mono text-[11px] font-bold text-heading">{reference.revenue === null ? "—" : `${reference.revenue.toLocaleString("fr-FR")} €`}</p></div><div><p className="text-[8px] font-bold uppercase text-muted">Marge</p><p className="mt-1 font-mono text-[11px] font-bold text-heading">{reference.margin === null ? "—" : `${reference.margin.toFixed(1)}%`}</p></div></div>
                      </div>
                    ) : <p className="text-sm text-muted">Référence financière sans données structurées.</p>
                  })() : document.documentType === "client_summary" ? (
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
    </AppDialog>
  )
}
