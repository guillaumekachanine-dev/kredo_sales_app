"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { CompanyDocumentsMailAnalyticsPanel } from "@/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel"
import { OBJECTIVE_OPTIONS } from "@/components/accounts-contacts/intelligence/communication-brief-options"
import { ClientSummaryDocumentContent } from "@/components/reports/ClientSummaryDocumentContent"
import { DocumentAppliedParameters } from "@/components/reports/DocumentAppliedParameters"
import { DocumentCommunicationActions } from "@/components/reports/DocumentCommunicationActions"
import { DocumentEditor } from "@/components/reports/DocumentEditor"
import { DocumentVersionHistory } from "@/components/reports/DocumentVersionHistory"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { FinancialReportContent } from "@/components/reports/financial/FinancialReportContent"
import { PitchDocumentContent } from "@/components/reports/PitchDocumentContent"
import { deleteDocument, fetchDocumentDetail } from "@/app/(app)/reports/_data/reports-actions"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"
import type { CommunicationBrief } from "@/lib/n8n/types"
import {
  DOCUMENT_OBJECT_LABELS,
  getDocumentTypeLabel,
  getPitchBriefLabel,
} from "@/components/reports/document-display"
import { cn } from "@/lib/utils"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { FolioFormattedText } from "@/components/intelligence/FolioFormattedText"

interface CompanyDocumentsModalProps {
  open: boolean
  onClose: () => void
  companyId: string
  companyName: string
  isMobile?: boolean
  initialCategory?: CategoryKey
  onReturnToCockpit?: () => void
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
  list_summary?: {
    heading: string
    objectiveLabel: string | null
  } | null
}

type CategoryKey = "mails" | "rapports" | "pitchs" | "devis" | "relances" | "fiches" | "articles"
type DisclosureKey = "sources" | "parameters" | "versions"
type CompanyContactPreview = {
  id: string
  fullName: string | null
  jobTitle: string | null
}
type CompanyLogoRow = {
  metadata: Record<string, unknown> | null
}

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
  {
    key: "articles",
    label: "Articles",
    icon: "/icons_set/intel_actualite_client.png",
  },
]

const REUSE_ACTION_LABELS = [
  "Créer une variante",
  "Réutiliser pour ce compte",
  "Adapter à un autre contact",
  "Relancer à partir du message",
]

const OBJECTIVE_LABELS = new Map(OBJECTIVE_OPTIONS.map((option) => [option.value, option.label]))

function isCommunicationBrief(value: unknown): value is CommunicationBrief {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<CommunicationBrief>
  return Boolean(record.what?.scenario && record.who?.recipient && record.who?.objective)
}

function formatDocumentDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR")
}

function formatRecipientHeading(value: string): string {
  const parts = value.trim().split(/\s+/)
  if (parts.length <= 1) return value.trim()
  const lastName = parts.pop() ?? ""
  return `${parts.join(" ")} ${lastName.toUpperCase()}`
}

function getCompanyInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")
}

function getCommunicationHeaderData(
  document: DocumentItem,
  detail: DocumentDetail | null,
  contacts: CompanyContactPreview[]
) {
  if (document.document_type !== "communication" && document.document_type !== "internal_note") return null

  const latestVersion = detail?.versions[0]
  const rawBrief = latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson
  if (!isCommunicationBrief(rawBrief)) return null

  const objectiveLabel = OBJECTIVE_LABELS.get(rawBrief.who.objective) ?? getDocumentTypeLabel(document.document_type)
  const recipientName = rawBrief.who.recipient.displayName?.trim() || null
  const matchedContact = rawBrief.who.recipient.contactId
    ? contacts.find((contact) => contact.id === rawBrief.who.recipient.contactId) ?? null
    : null
  const recipientJobTitle = matchedContact?.jobTitle?.trim() || null
  const recipientLine = [recipientName, recipientJobTitle].filter(Boolean).join(" - ")

  return {
    objectiveLabel,
    recipientLine,
    createdDate: formatDocumentDate(document.created_at),
    updatedDate: formatDocumentDate(document.updated_at),
  }
}

function getDocumentListSummary(
  document: DocumentItem,
  brief: unknown,
  contacts: CompanyContactPreview[]
) {
  if (document.document_type !== "communication" && document.document_type !== "internal_note") return null

  if (!isCommunicationBrief(brief)) return {
    heading: "Destinataire non renseigné",
    objectiveLabel: null,
  }

  const objectiveLabel = OBJECTIVE_LABELS.get(brief.who.objective) ?? null
  const recipientName = brief.who.recipient.displayName?.trim() || null
  const matchedContact = brief.who.recipient.contactId
    ? contacts.find((contact) => contact.id === brief.who.recipient.contactId) ?? null
    : null
  const recipientJobTitle = matchedContact?.jobTitle?.trim() || null
  const headingParts = [
    recipientName ? formatRecipientHeading(recipientName) : null,
    recipientJobTitle,
  ].filter(Boolean)

  return {
    heading: headingParts.join(" - "),
    objectiveLabel,
  }
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
  return ["communication", "commercial_pitch", "prise_de_parole", "campaign", "internal_note"].includes(document.documentType)
}

function DocumentContent({ document }: { document: DocumentDetail }) {
  if (
    document.documentType === ("article" as any) ||
    (document.currentContentJson && typeof document.currentContentJson === "object" && (document.currentContentJson as Record<string, unknown>).type === "article")
  ) {
    const data = document.currentContentJson as {
      source_name?: string
      url?: string
      resume?: string
      analyse_kredo?: string
      action_commerciale?: string
      published_at?: string | null
      secteur_principal?: string
    }
    return (
      <div className="space-y-4 text-body">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            {data.source_name ? (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {data.source_name}
              </span>
            ) : null}
            {data.published_at ? (
              <span className="ml-2 text-xs text-muted">
                Publié le {new Date(data.published_at).toLocaleDateString("fr-FR")}
              </span>
            ) : null}
          </div>
          {data.url ? (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Consulter l&apos;article original ↗
            </a>
          ) : null}
        </div>

        {data.resume ? (
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Résumé</h4>
            <p className="text-sm leading-relaxed text-body">{data.resume}</p>
          </div>
        ) : null}

        {data.analyse_kredo ? (
          <div className="space-y-1 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Pourquoi c&apos;est important (Analyse Kredo)</h4>
            <p className="text-sm leading-relaxed text-heading">{data.analyse_kredo}</p>
          </div>
        ) : null}

        {data.action_commerciale ? (
          <div className="space-y-1 rounded-xl border border-border bg-surface p-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Action commerciale préconisée</h4>
            <p className="text-sm leading-relaxed text-body">{data.action_commerciale}</p>
          </div>
        ) : null}
      </div>
    )
  }

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

  if (document.documentType === "commercial_pitch" || document.documentType === "prise_de_parole") {
    const latestVersion = document.versions[0] ?? null
    return (
      <PitchDocumentContent
        contentJson={document.currentContentJson}
        contentText={document.currentContentText}
        briefJson={latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson ?? null}
        fallbackClassName="rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"
      />
    )
  }

  if (document.currentContentText) {
    return <FolioFormattedText text={document.currentContentText} />
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
  initialCategory,
  onReturnToCockpit: _onReturnToCockpit,
}: CompanyDocumentsModalProps) {
  const [step, setStep] = useState<"categories" | "list" | "viewer">(initialCategory ? "list" : "categories")
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(initialCategory ?? null)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<DocumentDetail | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [detailReloadToken, setDetailReloadToken] = useState(0)
  const [companyContacts, setCompanyContacts] = useState<CompanyContactPreview[]>([])
  const [companyLogoPath, setCompanyLogoPath] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const isMailCategory = activeCategory === "mails"

  // Fetch documents for the company
  useEffect(() => {
    if (!open) return

    async function loadDocuments() {
      setLoading(true)
      const supabase = createClient()

      try {
        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .select("metadata")
          .eq("id", companyId)
          .maybeSingle<CompanyLogoRow>()

        if (companyError) throw companyError
        const companyMetadata =
          companyRow?.metadata && typeof companyRow.metadata === "object" && !Array.isArray(companyRow.metadata)
            ? companyRow.metadata
            : null
        setCompanyLogoPath(typeof companyMetadata?.logo_path === "string" ? companyMetadata.logo_path : null)

        const { data: contacts, error: contactsError } = await supabase
          .from("contacts")
          .select("id, job_title, person:persons(full_name)")
          .eq("company_id", companyId)

        if (contactsError) throw contactsError
        const companyContactsData = (contacts ?? []).map((contact) => {
          const person = Array.isArray(contact.person) ? contact.person[0] : contact.person
          return {
            id: contact.id,
            fullName:
              person && typeof person === "object" && "full_name" in person && typeof person.full_name === "string"
                ? person.full_name
                : null,
            jobTitle: contact.job_title,
          }
        })
        setCompanyContacts(companyContactsData)

        // Also fetch articles linked to this company from veille_articles
        const { data: veilleArticles } = await supabase
          .from("veille_articles")
          .select("id, titre_fr, source_name, resume, analyse_kredo, action_commerciale, published_at, created_at, updated_at, url, secteur_principal")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })

        const articleDocItems: DocumentItem[] = ((veilleArticles ?? []) as Array<Record<string, unknown>>).map((article) => ({
          id: `article-${article.id}`,
          title: String(article.titre_fr ?? "Article de veille"),
          document_type: "article" as any,
          status: "ready",
          current_content_text: [
            article.source_name ? `Source : ${article.source_name}` : null,
            article.resume ? `\nRésumé :\n${article.resume}` : null,
            article.analyse_kredo ? `\nPourquoi c'est important :\n${article.analyse_kredo}` : null,
            article.action_commerciale ? `\nAction préconisée :\n${article.action_commerciale}` : null,
            article.url ? `\nLien article : ${article.url}` : null,
          ].filter(Boolean).join("\n\n"),
          current_content_json: {
            type: "article",
            source_name: article.source_name,
            url: article.url,
            resume: article.resume,
            analyse_kredo: article.analyse_kredo,
            action_commerciale: article.action_commerciale,
            published_at: article.published_at,
            secteur_principal: article.secteur_principal,
          },
          created_at: String(article.created_at ?? new Date().toISOString()),
          updated_at: String(article.updated_at ?? new Date().toISOString()),
          list_summary: {
            heading: String(article.titre_fr ?? "Article de veille"),
            objectiveLabel: article.source_name ? `Source : ${article.source_name}` : "Article de veille",
          },
        }))

        const { data: links, error: linksError } = await supabase
          .from("intelligence_document_links")
          .select("document_id")
          .eq("entity_type", "company")
          .eq("entity_id", companyId)

        if (linksError) throw linksError
        if (!links || links.length === 0) {
          setDocuments(articleDocItems)
          return
        }

        const docIds = links.map((l) => l.document_id)

        const { data: docs, error: docsError } = await supabase
          .from("intelligence_documents")
          .select("id, title, document_type, status, current_content_text, current_content_json, created_at, updated_at")
          .in("id", docIds)
          .order("updated_at", { ascending: false })

        if (docsError) throw docsError
        const { data: versions, error: versionsError } = await supabase
          .from("intelligence_document_versions")
          .select("document_id, version_number, source_result_id, brief_json")
          .in("document_id", docIds)
          .order("version_number", { ascending: false })

        if (versionsError) throw versionsError

        const latestVersionByDocumentId = new Map<string, {
          source_result_id: string | null
          brief_json: unknown | null
        }>()
        for (const version of versions ?? []) {
          if (!latestVersionByDocumentId.has(version.document_id)) {
            latestVersionByDocumentId.set(version.document_id, {
              source_result_id: version.source_result_id,
              brief_json: version.brief_json,
            })
          }
        }

        const resultIds = Array.from(new Set(
          Array.from(latestVersionByDocumentId.values())
            .map((version) => version.source_result_id)
            .filter((value): value is string => Boolean(value))
        ))

        const { data: results, error: resultsError } = resultIds.length
          ? await supabase
              .from("ai_intelligence_results")
              .select("id, run_id")
              .in("id", resultIds)
          : { data: [], error: null }

        if (resultsError) throw resultsError

        const runIds = Array.from(new Set(
          (results ?? [])
            .map((result) => result.run_id)
            .filter((value): value is string => Boolean(value))
        ))

        const { data: runs, error: runsError } = runIds.length
          ? await supabase
              .from("ai_intelligence_runs")
              .select("id, input_snapshot")
              .in("id", runIds)
          : { data: [], error: null }

        if (runsError) throw runsError

        const inputSnapshotByRunId = new Map((runs ?? []).map((run) => [run.id, run.input_snapshot] as const))
        const runIdByResultId = new Map((results ?? []).map((result) => [result.id, result.run_id] as const))

        const mappedDocs = ((docs ?? []) as DocumentItem[]).map((document) => ({
          ...document,
          list_summary: getDocumentListSummary(
            document,
            (() => {
              const latestVersion = latestVersionByDocumentId.get(document.id)
              const runId = latestVersion?.source_result_id
                ? runIdByResultId.get(latestVersion.source_result_id)
                : null
              return (runId ? inputSnapshotByRunId.get(runId) : null) ?? latestVersion?.brief_json ?? null
            })(),
            companyContactsData
          ),
        }))

        setDocuments([...mappedDocs, ...articleDocItems])
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

    if (selectedDoc.id.startsWith("article-")) {
      setSelectedDetail({
        id: selectedDoc.id,
        title: selectedDoc.title,
        documentType: "article" as any,
        status: selectedDoc.status,
        versionNumber: 1,
        isFavorite: false,
        tags: ["veille", "article"],
        primaryEntity: { type: "company", id: companyId, label: companyName },
        qualityOk: true,
        scenarioLabel: null,
        currentContentText: selectedDoc.current_content_text,
        currentContentJson: selectedDoc.current_content_json,
        createdAt: selectedDoc.created_at,
        updatedAt: selectedDoc.updated_at,
        versions: [],
        links: [],
        ownerName: "Veille & Actualité",
      })
      setDetailLoading(false)
      return
    }

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
  const communicationHeaderData = selectedDoc
    ? getCommunicationHeaderData(selectedDoc, selectedDetail, companyContacts)
    : null

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
          return type === "commercial_pitch" || type === "prise_de_parole" || title.includes("pitch")
        case "devis":
          return title.includes("devis") || title.includes("chiffrage") || title.includes("proposition")
        case "relances":
          return type === "campaign" || title.includes("relance") || title.includes("follow")
        case "fiches":
          return type === "client_summary" || title.includes("fiche") || title.includes("synthèse") || title.includes("synthese")
        case "articles":
          return type === ("article" as any) || title.includes("article") || doc.id.startsWith("article-")
        default:
          return true
      }
    })
  }

  const handleCategorySelect = (category: CategoryKey) => {
    setActiveCategory(category)
    setSelectedDoc(null)
    setSelectedDetail(null)
    setDetailError(null)
    setDetailLoading(false)
    setIsEditing(false)
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
      setDetailError(null)
      setDetailLoading(false)
    } else if (step === "list" && selectedDoc && !isMobile) {
      setSelectedDoc(null)
      setSelectedDetail(null)
      setIsEditing(false)
      setDetailError(null)
      setDetailLoading(false)
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
    setStep(initialCategory ? "list" : "categories")
    setActiveCategory(initialCategory ?? null)
    setSelectedDoc(null)
    setSelectedDetail(null)
    setIsEditing(false)
    setDetailError(null)
    setDetailLoading(false)
    onClose()
  }

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return

    setDeletePending(true)
    const result = await deleteDocument(selectedDoc.id)
    setDeletePending(false)

    if (result.error) {
      setDetailError(result.error)
      return
    }

    setDocuments((current) => current.filter((document) => document.id !== selectedDoc.id))
    setSelectedDoc(null)
    setSelectedDetail(null)
    setIsEditing(false)
    setDetailError(null)
    setDetailLoading(false)
    if (isMobile) setStep("list")
  }

  return (
    <>
      <IntelligenceSplitModalShell
        open={open}
        onClose={handleClose}
        isMobile={isMobile}
        title={step === "categories" ? "Consulter les documents" : step === "list" ? getCategoryLabel(activeCategory!) : selectedDoc?.title ?? "Consulter les documents"}
        leftPane={null}
        rightPane={null}
        headerActions={(
          <div className="flex items-center gap-2 shrink-0">
            <CompanyLogo
              name={companyName}
              logoPath={companyLogoPath}
              size="sm"
              className="rounded-full border-0 bg-white p-0.5"
            />
            {step !== "categories" ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Retour"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            ) : null}
          </div>
        )}
        content={(
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
                    : selectedDoc || isMailCategory
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
                          "relative rounded-xl border px-3.5 py-3 transition-all cursor-pointer",
                          selectedDoc?.id === doc.id
                            ? "bg-primary border-primary text-white shadow-md"
                            : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                        )}
                      >
                        <div className="flex min-h-[64px] items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                        <h4 className="pr-2 text-[11px] font-bold leading-[1.2] line-clamp-2">
                          {doc.list_summary?.heading ?? doc.title}
                        </h4>
                        {doc.list_summary?.objectiveLabel ? (
                          <p
                            className={cn(
                              "mt-0.5 pr-2 text-[10px] leading-[1.2] line-clamp-2",
                              selectedDoc?.id === doc.id ? "text-white/84" : "text-white/72"
                            )}
                          >
                            {doc.list_summary.objectiveLabel}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                          <span
                            className={cn(
                              "font-semibold uppercase tracking-wider",
                              selectedDoc?.id === doc.id ? "text-white/80" : "text-muted"
                            )}
                          >
                            {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                          </div>
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center",
                              selectedDoc?.id === doc.id ? "text-white/88" : "text-white/52"
                            )}
                            aria-hidden="true"
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="block">
                              <path
                                d="M6 3.5L12.5 10L6 16.5"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
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
                      : selectedDoc || isMailCategory
                      ? "w-[62%] opacity-100 translate-x-0"
                      : "w-0 opacity-0 translate-x-12 pointer-events-none"
                  )}
                >
                  {selectedDoc ? (
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                      {/* Document Meta Header inside viewer */}
                      <div className="mb-4 border-b border-white/5 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                                {getDocumentTypeLabel(selectedDoc.document_type)}
                              </span>
                              <span className="inline-flex rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">
                                {DOCUMENT_OBJECT_LABELS[selectedDoc.document_type]}
                              </span>
                            </div>
                            {communicationHeaderData ? (
                              <div className="mt-2 flex items-center gap-2.5">
                                <Image
                                  src="/icons_set/rapports_&_redactions/visionneuse_objectif.png"
                                  alt=""
                                  width={18}
                                  height={18}
                                  className="size-[18px] shrink-0 object-contain"
                                  aria-hidden="true"
                                />
                                <h3 className="text-base font-bold leading-snug text-white">
                                  {communicationHeaderData.objectiveLabel}
                                </h3>
                              </div>
                            ) : (
                              <h3 className="mt-2 text-base font-bold leading-snug text-white">
                                {selectedDetail?.documentType === "commercial_pitch" || selectedDetail?.documentType === "prise_de_parole"
                                  ? getPitchBriefLabel(selectedDetail.versions[0]?.sourceRunInputSnapshot ?? selectedDetail.versions[0]?.briefJson) ?? selectedDoc.title
                                  : selectedDoc.title}
                              </h3>
                            )}
                            {communicationHeaderData?.recipientLine ? (
                              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/80">
                                <Image
                                  src="/icons_set/rapports_&_redactions/visionneuse_destinataire_2.png"
                                  alt=""
                                  width={18}
                                  height={18}
                                  className="size-[18px] shrink-0 object-contain"
                                  aria-hidden="true"
                                />
                                <p className="min-w-0 truncate">{communicationHeaderData.recipientLine}</p>
                              </div>
                            ) : null}
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
                              <Image
                                src="/icons_set/rapports_&_redactions/visionneuse_date.png"
                                alt=""
                                width={18}
                                height={18}
                                className="size-[18px] shrink-0 object-contain opacity-75"
                                aria-hidden="true"
                              />
                              {communicationHeaderData ? (
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <p>{communicationHeaderData.createdDate}</p>
                                  <span>-</span>
                                  <Image
                                    src="/icons_set/rapports_&_redactions/visionneuse_maj.png"
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="size-4 shrink-0 object-contain opacity-80"
                                    aria-hidden="true"
                                  />
                                  <p>{communicationHeaderData.updatedDate}</p>
                                </div>
                              ) : (
                                <p>{formatDocumentDate(selectedDoc.created_at)} - MAJ {formatDocumentDate(selectedDoc.updated_at)}</p>
                              )}
                            </div>
                          </div>
                          <div className="mr-1 self-center flex size-[68px] shrink-0 items-center justify-center rounded-full bg-white p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.22)]">
                            {companyLogoPath ? (
                              <Image
                                src={companyLogoPath}
                                alt={`Logo ${companyName}`}
                                width={48}
                                height={48}
                                className="size-12 object-contain"
                              />
                            ) : (
                              <span className="text-[13px] font-bold tracking-[0.08em] text-slate-700">
                                {getCompanyInitials(companyName)}
                              </span>
                            )}
                          </div>
                        </div>
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
                                  <div className="sm:col-start-2 pt-1">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setShowDeleteConfirm(true)}
                                      className="w-full justify-center !border-[#A52A2A] !text-[#A52A2A] hover:!border-[#A52A2A] hover:!bg-[#A52A2A]/10 hover:!text-[#A52A2A]"
                                    >
                                      Supprimer
                                    </Button>
                                  </div>
                                </div>
                              </section>

                              <DocumentDisclosureChips document={selectedDetail} />
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : isMailCategory ? (
                    <CompanyDocumentsMailAnalyticsPanel companyName={companyName} />
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
        )}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Supprimer ce document ?"
        description="Le document sera retiré définitivement de la bibliothèque de ce compte."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleDeleteDocument}
        isLoading={deletePending}
      />
    </>
  )
}
