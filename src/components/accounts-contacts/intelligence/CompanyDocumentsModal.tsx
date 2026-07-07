"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { ClientSummaryDocumentContent } from "@/components/reports/ClientSummaryDocumentContent"
import { DocumentAppliedParameters } from "@/components/reports/DocumentAppliedParameters"
import { DocumentCommunicationActions } from "@/components/reports/DocumentCommunicationActions"
import { DocumentEditor } from "@/components/reports/DocumentEditor"
import { DocumentVersionHistory } from "@/components/reports/DocumentVersionHistory"
import { FinancialReportContent } from "@/components/reports/financial/FinancialReportContent"
import { PitchDocumentContent } from "@/components/reports/PitchDocumentContent"
import { fetchDocumentDetail } from "@/app/(app)/reports/_data/reports-actions"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"
import {
  DOCUMENT_OBJECT_LABELS,
  getDocumentTypeLabel,
  getPitchBriefLabel,
} from "@/components/reports/document-display"
import { cn } from "@/lib/utils"

interface CompanyDocumentsModalProps {
  open: boolean
  onClose: () => void
  companyId: string
  companyName: string
  isMobile?: boolean
}

type DocumentItem = {
  id: string
  title: string
  document_type: DocumentDetail["documentType"]
  status: "draft" | "ready" | "used" | "archived"
  current_content_text: string | null
  current_content_json: unknown
  created_at: string
  updated_at: string
}

type CategoryKey = "mails" | "rapports" | "pitchs" | "devis" | "relances" | "fiches"
type DisclosureKey = "sources" | "parameters" | "versions"

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  {
    key: "mails",
    label: "Mails",
    icon: "/icons_set/cockpit_intelligence/redaction_message_ai.png",
  },
  {
    key: "rapports",
    label: "Rapports",
    icon: "/icons_set/cockpit_intelligence/generer_rapport.png",
  },
  {
    key: "pitchs",
    label: "Pitchs",
    icon: "/icons_set/cockpit_intelligence/dossier_pitchs.png",
  },
  {
    key: "devis",
    label: "Devis",
    icon: "/icons_set/cockpit_intelligence/rapport_financier_ai.png",
  },
  {
    key: "relances",
    label: "Relances",
    icon: "/icons_set/cockpit_intelligence/suggestion_taches_&_evenements.png",
  },
  {
    key: "fiches",
    label: "Fiches compte",
    icon: "/icons_set/cockpit_intelligence/recommandations_ai.png",
  },
]

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prêt",
  used: "Utilisé",
  archived: "Archivé",
}

const REUSE_ACTION_LABELS = [
  "Créer une variante",
  "Réutiliser pour ce compte",
  "Adapter à un autre contact",
  "Relancer à partir du message",
]

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

function isFinancialDocument(document: DocumentDetail) {
  return document.documentType === "financial"
    || (
      document.currentContentJson
      && typeof document.currentContentJson === "object"
      && !Array.isArray(document.currentContentJson)
      && (document.currentContentJson as Record<string, unknown>).reportType === "financial"
    )
}

function isCommunicationDocument(document: DocumentDetail) {
  return ["communication", "commercial_pitch", "campaign", "internal_note"].includes(document.documentType)
}

function DocumentContent({ document }: { document: DocumentDetail }) {
  if (document.documentType === "client_summary") {
    return (
      <ClientSummaryDocumentContent
        contentJson={document.currentContentJson}
        contentText={document.currentContentText}
      />
    )
  }

  if (isFinancialDocument(document)) {
    return (
      <FinancialReportContent
        contentJson={document.currentContentJson}
        contentText={document.currentContentText}
      />
    )
  }

  if (document.documentType === "commercial_pitch") {
    return (
      <PitchDocumentContent
        contentJson={document.currentContentJson}
        contentText={document.currentContentText}
        fallbackClassName="rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"
      />
    )
  }

  if (document.currentContentText) {
    return (
      <div className="rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body">
        {document.currentContentText}
      </div>
    )
  }

  return <p className="text-sm text-muted">Aucun contenu texte disponible.</p>
}

function DocumentDisclosureChips({ document }: { document: DocumentDetail }) {
  const [openKey, setOpenKey] = useState<DisclosureKey | null>(null)
  const latestVersion = document.versions[0] ?? null
  const appliedBrief = latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson ?? null
  const sourceCount = latestVersion?.sourceRefs.length ?? 0

  const chips: Array<{ key: DisclosureKey; label: string; count?: number }> = [
    { key: "sources", label: "Sources", count: sourceCount },
    { key: "parameters", label: "Paramètres" },
    { key: "versions", label: "Versions", count: document.versions.length },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isOpen = openKey === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenKey(isOpen ? null : chip.key)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
                isOpen
                  ? "border-primary/30 bg-primary/[0.10] text-primary"
                  : "border-border bg-surface text-body hover:bg-surface-hover hover:text-heading"
              )}
            >
              <span>{chip.label}</span>
              {typeof chip.count === "number" ? (
                <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] text-muted">
                  {chip.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {openKey ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm">
          {openKey === "sources" ? (
            latestVersion && latestVersion.sourceRefs.length > 0 ? (
              <ul className="space-y-2 text-sm leading-relaxed text-body">
                {latestVersion.sourceRefs.map((ref, index) => (
                  <li key={`${document.id}-source-${index}`} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                    <span>{formatSourceRef(ref)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aucune source enregistrée.</p>
            )
          ) : null}

          {openKey === "parameters" ? (
            <DocumentAppliedParameters briefJson={appliedBrief} />
          ) : null}

          {openKey === "versions" ? (
            <DocumentVersionHistory
              key={`${document.id}-${document.versionNumber}`}
              versions={document.versions}
              compact
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export function CompanyDocumentsModal({
  open,
  onClose,
  companyId,
  companyName,
  isMobile = false,
}: CompanyDocumentsModalProps) {
  const [step, setStep] = useState<"categories" | "list" | "viewer">("categories")
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<DocumentDetail | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [detailReloadToken, setDetailReloadToken] = useState(0)

  // Fetch documents for the company
  useEffect(() => {
    if (!open) return

    async function loadDocuments() {
      setLoading(true)
      const supabase = createClient()

      try {
        const { data: links, error: linksError } = await supabase
          .from("intelligence_document_links")
          .select("document_id")
          .eq("entity_type", "company")
          .eq("entity_id", companyId)

        if (linksError) throw linksError
        if (!links || links.length === 0) {
          setDocuments([])
          return
        }

        const docIds = links.map((l) => l.document_id)

        const { data: docs, error: docsError } = await supabase
          .from("intelligence_documents")
          .select("id, title, document_type, status, current_content_text, current_content_json, created_at, updated_at")
          .in("id", docIds)
          .order("updated_at", { ascending: false })

        if (docsError) throw docsError
        setDocuments((docs ?? []) as DocumentItem[])
      } catch (err) {
        console.error("Failed to load company documents:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [open, companyId])

  useEffect(() => {
    if (!open || !selectedDoc) return

    let cancelled = false

    void fetchDocumentDetail(selectedDoc.id).then((result) => {
      if (cancelled) return

      if ("error" in result) {
        setSelectedDetail(null)
        setDetailError(result.error ?? "Impossible de charger le document")
        return
      }

      setSelectedDetail(result.data)
    }).catch(() => {
      if (!cancelled) {
        setSelectedDetail(null)
        setDetailError("Impossible de charger le document")
      }
    }).finally(() => {
      if (!cancelled) setDetailLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [detailReloadToken, open, selectedDoc])

  if (!open) return null

  // Filter documents by active category
  const filteredDocs = activeCategory ? filterByCategory(documents, activeCategory) : []

  function filterByCategory(docs: DocumentItem[], category: CategoryKey) {
    return docs.filter((doc) => {
      const title = (doc.title || "").toLowerCase()
      const type = doc.document_type

      switch (category) {
        case "mails":
          return type === "communication" || type === "internal_note" || title.includes("mail") || title.includes("email")
        case "rapports":
          return (
            type === "weekly_manager" ||
            type === "financial" ||
            type === "quarterly_review" ||
            type === "staffing_capacity" ||
            type === "delivery_profitability" ||
            type === "account_portfolio" ||
            (type === "client_summary" && !title.includes("fiche"))
          )
        case "pitchs":
          return type === "commercial_pitch" || title.includes("pitch")
        case "devis":
          return title.includes("devis") || title.includes("chiffrage") || title.includes("proposition")
        case "relances":
          return type === "campaign" || title.includes("relance") || title.includes("follow")
        case "fiches":
          return type === "client_summary" || title.includes("fiche") || title.includes("synthèse") || title.includes("synthese")
        default:
          return true
      }
    })
  }

  const handleCategorySelect = (category: CategoryKey) => {
    setActiveCategory(category)
    setStep("list")
  }

  const handleDocSelect = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setSelectedDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    setIsEditing(false)
    if (isMobile) {
      setStep("viewer")
    }
  }

  const handleBack = () => {
    if (step === "viewer") {
      setStep("list")
      setSelectedDoc(null)
      setSelectedDetail(null)
      setIsEditing(false)
    } else if (step === "list") {
      setStep("categories")
      setActiveCategory(null)
      setSelectedDoc(null)
      setSelectedDetail(null)
      setIsEditing(false)
    }
  }

  const getCategoryLabel = (key: CategoryKey) => {
    return CATEGORIES.find((c) => c.key === key)?.label ?? ""
  }

  const handleClose = () => {
    setStep("categories")
    setActiveCategory(null)
    setSelectedDoc(null)
    setSelectedDetail(null)
    setIsEditing(false)
    setDetailError(null)
    setDetailLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          "bg-[#0f122c] border border-white/10 text-white shadow-2xl flex flex-col overflow-hidden",
          isMobile
            ? "fixed inset-0 rounded-none w-full h-full"
            : "rounded-3xl w-full max-w-5xl h-[80vh] max-h-[750px]"
        )}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            {step !== "categories" && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center size-9 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors cursor-pointer"
                aria-label="Retour"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="font-heading text-lg font-bold leading-tight">
                {step === "categories"
                  ? "Consulter les documents"
                  : step === "list"
                  ? getCategoryLabel(activeCategory!)
                  : selectedDoc?.title}
              </h2>
              <p className="text-xs text-muted leading-tight mt-0.5">{companyName}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex items-center justify-center size-9 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer la modale"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs text-muted font-medium">Chargement des documents...</p>
            </div>
          ) : step === "categories" ? (
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
                {CATEGORIES.map((cat) => {
                  const count = filterByCategory(documents, cat.key).length
                  return (
                    <button
                      key={cat.key}
                      onClick={() => handleCategorySelect(cat.key)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-4 text-left text-white hover:bg-white/[0.10] active:scale-[0.97] transition-all cursor-pointer h-28"
                    >
                      <span className="pointer-events-none absolute -right-6 -top-7 size-24 rounded-full bg-white/5 blur-2xl" />
                      <Image
                        src={cat.icon}
                        alt=""
                        width={40}
                        height={40}
                        className="relative z-10 size-10 object-contain drop-shadow-[0_4px_12px_rgba(18,24,61,0.25)] transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="relative z-10 flex flex-col">
                        <span className="text-xs font-bold leading-tight">{cat.label}</span>
                        <span className="text-[10px] text-muted leading-tight mt-0.5">
                          {count} document{count > 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* List and Viewer View */
            <div className="h-full flex items-stretch">
              {/* Left Column (Documents List) */}
              <div
                className={cn(
                  "h-full flex flex-col border-r border-white/5 transition-all duration-500 ease-out",
                  isMobile && step === "viewer"
                    ? "hidden"
                    : isMobile
                    ? "w-full"
                    : selectedDoc
                    ? "w-[38%] shrink-0"
                    : "w-full"
                )}
              >
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredDocs.length === 0 ? (
                    <p className="text-center text-xs text-muted py-12 italic">
                      Aucun document disponible dans cette catégorie.
                    </p>
                  ) : (
                    filteredDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleDocSelect(doc)}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all cursor-pointer",
                          selectedDoc?.id === doc.id
                            ? "bg-primary border-primary text-white shadow-md"
                            : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                        )}
                      >
                        <h4 className="text-xs font-bold leading-snug line-clamp-2">{doc.title}</h4>
                        <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px]">
                          <span
                            className={cn(
                              "font-semibold uppercase tracking-wider",
                              selectedDoc?.id === doc.id ? "text-white/80" : "text-muted"
                            )}
                          >
                            {new Date(doc.updated_at).toLocaleDateString("fr-FR")}
                          </span>
                          <StatusPill
                            label={STATUS_LABELS[doc.status] || doc.status}
                            variant={
                              doc.status === "ready"
                                ? "inProgress"
                                : doc.status === "used"
                                ? "success"
                                : doc.status === "draft"
                                ? "draft"
                                : "neutral"
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column (Document Viewer - Desktop) or Viewer View (Mobile) */}
              {(!isMobile || step === "viewer") && (
                <div
                  className={cn(
                    "h-full flex flex-col bg-slate-950/20 transition-all duration-500 ease-out",
                    isMobile
                      ? "w-full"
                      : selectedDoc
                      ? "w-[62%] opacity-100 translate-x-0"
                      : "w-0 opacity-0 translate-x-12 pointer-events-none"
                  )}
                >
                  {selectedDoc ? (
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                      {/* Document Meta Header inside viewer */}
                      <div className="mb-4 border-b border-white/5 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                            {getDocumentTypeLabel(selectedDoc.document_type)}
                          </span>
                          <span className="inline-flex rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">
                            {DOCUMENT_OBJECT_LABELS[selectedDoc.document_type]}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold leading-snug text-white">
                          {selectedDetail?.documentType === "commercial_pitch"
                            ? getPitchBriefLabel(selectedDetail.versions[0]?.sourceRunInputSnapshot ?? selectedDetail.versions[0]?.briefJson) ?? selectedDoc.title
                            : selectedDoc.title}
                        </h3>
                        <p className="mt-1 text-[10px] text-muted">
                          Créé le {new Date(selectedDoc.created_at).toLocaleDateString("fr-FR")} · Mis à jour le {new Date(selectedDoc.updated_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>

                      {detailLoading ? (
                        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04]">
                          <span className="size-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <p className="text-xs text-muted font-medium">Chargement du document...</p>
                        </div>
                      ) : detailError ? (
                        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger">
                          {detailError}
                        </div>
                      ) : selectedDetail ? (
                        <div className="cockpit-reading pitch-modal-reading space-y-5 rounded-2xl border px-4 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.20)]">
                          {isEditing ? (
                            <DocumentEditor
                              key={`${selectedDetail.id}-${selectedDetail.versionNumber}`}
                              document={selectedDetail}
                              onCancel={() => setIsEditing(false)}
                              onSaved={() => {
                                setIsEditing(false)
                                setDetailLoading(true)
                                setDetailError(null)
                                setDetailReloadToken((current) => current + 1)
                              }}
                            />
                          ) : (
                            <>
                              <section className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                                  Contenu
                                </h4>
                                <DocumentContent document={selectedDetail} />
                              </section>

                              <section className="space-y-3 border-t border-border pt-4">
                                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                                  Actions
                                </h4>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="justify-center"
                                  >
                                    Modifier
                                  </Button>
                                  {isCommunicationDocument(selectedDetail) ? (
                                    <DocumentCommunicationActions
                                      document={selectedDetail}
                                      presentation="buttons"
                                      buttonClassName="justify-center"
                                    />
                                  ) : (
                                    REUSE_ACTION_LABELS.map((label) => (
                                      <Button
                                        key={label}
                                        variant="secondary"
                                        size="sm"
                                        disabled
                                        title="Disponible pour les mails, pitchs, campagnes et notes."
                                        className="justify-center"
                                      >
                                        {label}
                                      </Button>
                                    ))
                                  )}
                                </div>
                              </section>

                              <DocumentDisclosureChips document={selectedDetail} />
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted italic">
                      Sélectionnez un document pour le visionner
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
