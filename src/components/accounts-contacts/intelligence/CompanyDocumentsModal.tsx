"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
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
  document_type: string
  status: "draft" | "ready" | "used" | "archived"
  current_content_text: string | null
  current_content_json: any
  created_at: string
  updated_at: string
}

type CategoryKey = "mails" | "rapports" | "pitchs" | "devis" | "relances" | "fiches"

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
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)

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
        setDocuments(docs as DocumentItem[])
      } catch (err) {
        console.error("Failed to load company documents:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [open, companyId])

  // Reset states when closed or opened
  useEffect(() => {
    if (!open) {
      setStep("categories")
      setActiveCategory(null)
      setSelectedDoc(null)
    }
  }, [open])

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
    if (isMobile) {
      setStep("viewer")
    }
  }

  const handleBack = () => {
    if (step === "viewer") {
      setStep("list")
      setSelectedDoc(null)
    } else if (step === "list") {
      setStep("categories")
      setActiveCategory(null)
      setSelectedDoc(null)
    }
  }

  const getCategoryLabel = (key: CategoryKey) => {
    return CATEGORIES.find((c) => c.key === key)?.label ?? ""
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
            onClick={onClose}
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
                      <img
                        src={cat.icon}
                        alt=""
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
                  isMobile
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {/* Document Meta Header inside viewer */}
                      <div className="border-b border-white/5 pb-4">
                        <span className="inline-flex rounded-[6px] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] bg-white/10 text-white">
                          {selectedDoc.document_type.replace(/_/g, " ")}
                        </span>
                        <h3 className="text-base font-bold mt-2 text-white">{selectedDoc.title}</h3>
                        <p className="text-[10px] text-muted mt-1">
                          Créé le {new Date(selectedDoc.created_at).toLocaleDateString("fr-FR")} · Mis à jour le {new Date(selectedDoc.updated_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>

                      {/* Content rendering */}
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                        {selectedDoc.current_content_text || (
                          <p className="text-xs text-muted italic">Ce document ne contient aucun texte.</p>
                        )}
                      </div>
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
