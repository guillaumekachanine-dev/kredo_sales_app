"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DocumentAppliedParameters } from "@/components/reports/DocumentAppliedParameters"
import { DocumentCommunicationActions } from "@/components/reports/DocumentCommunicationActions"
import { ClientSummaryDocumentContent } from "@/components/reports/ClientSummaryDocumentContent"
import { PitchDocumentContent } from "@/components/reports/PitchDocumentContent"
import { FinancialReportContent } from "@/components/reports/financial/FinancialReportContent"
import { TechnicalReportContent } from "@/components/reports/TechnicalReportContent"
import { DocumentEditor } from "@/components/reports/DocumentEditor"
import { DocumentVersionHistory } from "@/components/reports/DocumentVersionHistory"
import {
  duplicateDocument,
  setDocumentFavorite,
  setDocumentStatus,
} from "@/app/(app)/reports/_data/reports-actions"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"
import {
  DOCUMENT_OBJECT_LABELS,
  getDocumentCategory,
  getDocumentTypeLabel,
  getPitchBriefLabel,
} from "./document-display"

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

type PendingAction = "copy" | "duplicate" | "favorite" | "archive" | null

type QaFlagViewModel = {
  check: string
  detail: string | null
  passed: boolean
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR")
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

function getEntityHref(link: DocumentDetail["links"][number]) {
  if (link.entityType === "company") {
    return `/prospection/accounts/${link.entityId}`
  }

  return null
}

const IconCopy = () => (
  <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M7.5 5.5V4.75C7.5 3.78 8.28 3 9.25 3H15.25C16.22 3 17 3.78 17 4.75V12.75C17 13.72 16.22 14.5 15.25 14.5H14.5M7.5 5.5H5.75C4.78 5.5 4 6.28 4 7.25V15.25C4 16.22 4.78 17 5.75 17H11.75C12.72 17 13.5 16.22 13.5 15.25V7.25C13.5 6.28 12.72 5.5 11.75 5.5H7.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconDuplicate = () => (
  <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M6.75 6.75H5.75C4.78 6.75 4 7.53 4 8.5V14.25C4 15.22 4.78 16 5.75 16H11.5C12.47 16 13.25 15.22 13.25 14.25V13.25M8.5 4H14.25C15.22 4 16 4.78 16 5.75V11.5C16 12.47 15.22 13.25 14.25 13.25H8.5C7.53 13.25 6.75 12.47 6.75 11.5V5.75C6.75 4.78 7.53 4 8.5 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconStar = ({ filled }: { filled: boolean }) => (
  <svg className="size-4" viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} aria-hidden="true">
    <path
      d="M10 3.5L11.91 7.38L16.19 8L13.09 11.02L13.82 15.28L10 13.27L6.18 15.28L6.91 11.02L3.81 8L8.09 7.38L10 3.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
)

const IconArchive = () => (
  <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M4 5.75C4 5.34 4.34 5 4.75 5H15.25C15.66 5 16 5.34 16 5.75V7.25C16 7.66 15.66 8 15.25 8H4.75C4.34 8 4 7.66 4 7.25V5.75ZM5.5 8.75H14.5V14.25C14.5 15.22 13.72 16 12.75 16H7.25C6.28 16 5.5 15.22 5.5 14.25V8.75ZM8 10.5H12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function DocumentPreviewPanel({ document }: { document: DocumentDetail }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<PendingAction>(null)

  const latestVersion = document.versions[0] ?? null
  const appliedBrief = latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson ?? null
  const isPitch = document.documentType === "commercial_pitch" || document.documentType === "prise_de_parole"
  const pitchLabel = isPitch ? getPitchBriefLabel(appliedBrief) : null
  const qaFlags = useMemo(
    () => buildQaFlags(latestVersion?.qaFlags ?? []),
    [latestVersion?.qaFlags]
  )
  const failedFlags = qaFlags.filter((flag) => !flag.passed)
  const allPassed = qaFlags.length > 0 && failedFlags.length === 0
  const documentCategory = getDocumentCategory(document.documentType)
  const categoryColor =
    documentCategory === "report"
      ? "var(--color-document-report)"
      : "var(--color-document-communication)"
  const categoryTintClass =
    documentCategory === "report"
      ? "bg-[color-mix(in_srgb,var(--color-document-report)_10%,var(--color-surface))]"
      : "bg-[color-mix(in_srgb,var(--color-document-communication)_12%,var(--color-surface))]"

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
    if (!document.currentContentText) return
    setActionLoading("copy")
    void navigator.clipboard.writeText(document.currentContentText).then(() => {
      setCopied(true)
      setActionLoading(null)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setActionLoading(null)
      setActionError("Impossible de copier le contenu")
    })
  }

  function handleDuplicate() {
    runAction("duplicate", async () => {
      const result = await duplicateDocument({ documentId: document.id })
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
    runAction("favorite", async () => {
      const result = await setDocumentFavorite(document.id, !document.isFavorite)
      if (!result.success) {
        setActionError(result.error)
        return
      }

      router.refresh()
    })
  }

  function handleArchive() {
    runAction("archive", async () => {
      const result = await setDocumentStatus(document.id, "archived")
      if (!result.success) {
        setActionError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <SurfaceCard padding="default" className="sticky top-6">
      <div className="space-y-5">
        <header className={cn("space-y-3 rounded-[var(--radius-medium)] border border-border px-4 py-4", categoryTintClass)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryColor }}
                />
                <h2 className={cn("font-heading font-bold text-heading", pitchLabel ? "text-sm" : "text-lg")}>
                  {pitchLabel ?? document.title}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted">
                {getDocumentTypeLabel(document.documentType)} · {DOCUMENT_OBJECT_LABELS[document.documentType]}
              </p>
              <p className="mt-1 text-xs text-muted">
                Mis à jour le {formatDate(document.updatedAt)} par {document.ownerName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={DOCUMENT_OBJECT_LABELS[document.documentType]}
              dot={false}
              className="border-transparent text-[var(--color-heading)]"
              style={{
                backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, var(--color-surface))`,
                color: categoryColor,
              }}
            />
            <StatusPill
              label={getDocumentTypeLabel(document.documentType)}
              dot={false}
              className="border-transparent capitalize"
              style={{
                backgroundColor: `color-mix(in srgb, ${categoryColor} 12%, var(--color-surface))`,
                color: categoryColor,
              }}
            />
            <StatusPill
              label={STATUS_LABELS[document.status]}
              variant={STATUS_VARIANTS[document.status]}
            />
            <StatusPill
              label={`Version ${document.versionNumber}`}
              variant="neutral"
              dot={false}
            />
          </div>
        </header>

        {isEditing ? (
          <DocumentEditor
            key={`${document.id}-${document.versionNumber}`}
            document={document}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        ) : (
          <>
            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Contenu
              </h3>
              {document.documentType === "client_summary" ? (
                <ClientSummaryDocumentContent
                  contentJson={document.currentContentJson}
                  contentText={document.currentContentText}
                />
              ) : document.documentType === "financial" || (document.currentContentJson && typeof document.currentContentJson === "object" && (document.currentContentJson as Record<string, unknown>).reportType === "financial") ? (
                <FinancialReportContent
                  contentJson={document.currentContentJson}
                  contentText={document.currentContentText}
                />
              ) : (document.currentContentJson && typeof document.currentContentJson === "object" && (document.currentContentJson as Record<string, unknown>).reportType === "technical") ? (
                <TechnicalReportContent
                  contentJson={document.currentContentJson}
                />
              ) : isPitch ? (
                <PitchDocumentContent
                  contentJson={document.currentContentJson}
                  contentText={document.currentContentText}
                  briefJson={appliedBrief}
                />
              ) : document.currentContentText ? (
                <div className="rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body">
                  {document.currentContentText}
                </div>
              ) : (
                <p className="text-sm text-muted">Aucun contenu texte disponible.</p>
              )}
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Sources
              </h3>
              {latestVersion && latestVersion.sourceRefs.length > 0 ? (
                <ul className="space-y-1 text-xs text-body">
                  {latestVersion.sourceRefs.map((ref, index) => (
                    <li key={`${document.id}-source-${index}`}>• {formatSourceRef(ref)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Aucune source enregistrée.</p>
              )}
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Paramètres appliqués
              </h3>
              <DocumentAppliedParameters briefJson={appliedBrief} />
            </section>

            <DocumentCommunicationActions document={document} />

            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Contrôles qualité
              </h3>
              {qaFlags.length > 0 ? (
                <>
                  <div
                    className={cn(
                      "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                      allPassed
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-warning/25 bg-warning/10 text-warning"
                    )}
                  >
                    <span
                      className={`size-1.5 rounded-full ${allPassed ? "bg-success" : "bg-warning"}`}
                    />
                    <span>{allPassed ? "Qualité OK" : "À vérifier"}</span>
                  </div>

                  {failedFlags.length > 0 ? (
                    <ul className="space-y-1 text-[11px] text-warning">
                      {failedFlags.map((flag, index) => (
                        <li key={`${document.id}-qa-${index}`}>• {flag.detail || flag.check}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Tous les contrôles enregistrés sont passés.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">Aucun contrôle QA enregistré.</p>
              )}
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Entités liées
              </h3>
              {document.links.length > 0 ? (
                <ul className="space-y-1 text-sm text-body">
                  {document.links.map((link) => {
                    const href = getEntityHref(link)

                    return (
                      <li key={`${link.entityType}:${link.entityId}`}>
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium text-primary hover:text-primary-deep"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <span>{link.label}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">Aucune entité liée.</p>
              )}
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Historique des versions
              </h3>
              <DocumentVersionHistory
                key={`${document.id}-${document.versionNumber}`}
                versions={document.versions}
              />
            </section>
          </>
        )}

        {!isEditing ? (
          <footer className="space-y-3 border-t border-border pt-4">
            {actionError ? (
              <p className="text-sm text-danger">{actionError}</p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Modifier
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconCopy />}
                onClick={handleCopy}
                disabled={!document.currentContentText}
                loading={actionLoading === "copy"}
              >
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconDuplicate />}
                onClick={handleDuplicate}
                loading={actionLoading === "duplicate" || isPending}
              >
                Dupliquer
              </Button>
              <Button
                variant={document.isFavorite ? "brass" : "secondary"}
                size="sm"
                leftIcon={<IconStar filled={document.isFavorite} />}
                onClick={handleToggleFavorite}
                loading={actionLoading === "favorite" || isPending}
              >
                {document.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              </Button>
              {document.status !== "archived" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconArchive />}
                  onClick={handleArchive}
                  loading={actionLoading === "archive" || isPending}
                >
                  Archiver
                </Button>
              ) : null}
            </div>
          </footer>
        ) : null}
      </div>
    </SurfaceCard>
  )
}
