"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { DocumentAppliedParameters } from "@/components/reports/DocumentAppliedParameters"
import { ClientSummaryDocumentContent } from "@/components/reports/ClientSummaryDocumentContent"
import { DocumentEditor } from "@/components/reports/DocumentEditor"
import { DocumentVersionHistory } from "@/components/reports/DocumentVersionHistory"
import {
  fetchDocumentDetail,
  setDocumentFavorite,
  setDocumentStatus,
} from "@/app/(app)/reports/_data/reports-actions"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"

type DocumentMobileDetailProps = {
  documentId: string
  open: boolean
  onClose: () => void
}

const DOCUMENT_TYPE_LABELS: Record<DocumentDetail["documentType"], string> = {
  communication: "Communication",
  client_summary: "Synthèse client",
  commercial_pitch: "Pitch commercial",
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
      title={document?.title ?? "Chargement du document"}
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
                {document.documentType === "client_summary" ? (
                  <ClientSummaryDocumentContent
                    contentJson={document.currentContentJson}
                    contentText={document.currentContentText}
                    isMobile
                    fallbackClassName="max-h-[40vh] overflow-y-auto rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"
                  />
                ) : document.currentContentText ? (
                  <div className="max-h-[40vh] overflow-y-auto rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body">
                    {document.currentContentText}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Aucun contenu texte disponible.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Qualité
                </h3>
                {qualityOk == null ? (
                  <p className="text-sm text-muted">Aucun contrôle QA enregistré.</p>
                ) : (
                  <StatusPill
                    label={qualityOk ? "Qualité OK" : "À vérifier"}
                    variant={qualityOk ? "success" : "warning"}
                  />
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Sources
                </h3>
                {document.versions[0]?.sourceRefs.length ? (
                  <ul className="space-y-1 text-xs text-body">
                    {document.versions[0].sourceRefs.map((ref, index) => (
                      <li key={`${document.id}-source-${index}`}>• {formatSourceRef(ref)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Aucune source enregistrée.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Paramètres appliqués
                </h3>
                <DocumentAppliedParameters briefJson={document.versions[0]?.briefJson ?? null} />
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Contrôles qualité
                </h3>
                {qaFlags.length === 0 ? (
                  <p className="text-sm text-muted">Aucun contrôle QA enregistré.</p>
                ) : failedFlags.length > 0 ? (
                  <ul className="space-y-1 text-xs text-warning">
                    {failedFlags.map((flag, index) => (
                      <li key={`${document.id}-qa-${index}`}>• {flag.detail || flag.check}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Tous les contrôles enregistrés sont passés.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Entités liées
                </h3>
                {document.links.length > 0 ? (
                  <ul className="space-y-1 text-sm text-body">
                    {document.links.map((link) => (
                      <li key={`${link.entityType}:${link.entityId}`}>{link.label}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Aucune entité liée.</p>
                )}
              </section>

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
