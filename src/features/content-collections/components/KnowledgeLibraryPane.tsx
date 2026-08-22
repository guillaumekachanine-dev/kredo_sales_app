"use client"

import { useMemo, useState } from "react"
import { DOCUMENT_OBJECT_LABELS, getDocumentIcon, getDocumentTypeLabel } from "@/components/reports/document-display"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils"
import type { CollectionSummary, IntelligenceDocumentSummary } from "../domain/content-collections-contracts"

export type KnowledgeLibraryMode = "lists" | "corpus" | "documents"

export type KnowledgeView =
  | { type: "synthesis" }
  | { type: "list"; id: string }
  | { type: "corpus"; id: string }
  | { type: "document"; id: string }

export interface KnowledgeLibraryPaneProps {
  mode: KnowledgeLibraryMode
  collections: CollectionSummary[]
  documents?: IntelligenceDocumentSummary[]
  activeView: KnowledgeView
  onSelectView: (view: KnowledgeView) => void
  isLoading: boolean
  isLoadingDocuments?: boolean
  creatingOpen: boolean
  setCreatingOpen: (open: boolean) => void
  newName: string
  setNewName: (name: string) => void
  onCreate: () => void
  isPending: boolean
  isCollapsed?: boolean
  onExpandLibrary?: () => void
}

export function KnowledgeLibraryPane({
  mode,
  collections,
  documents = [],
  activeView,
  onSelectView,
  isLoading,
  isLoadingDocuments = false,
  creatingOpen,
  setCreatingOpen,
  newName,
  setNewName,
  onCreate,
  isPending,
  isCollapsed = false,
  onExpandLibrary,
}: KnowledgeLibraryPaneProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(Object.keys(DOCUMENT_OBJECT_LABELS)))
  const [typeFilterOpen, setTypeFilterOpen] = useState(false)

  const toggleType = (typeKey: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(typeKey)) {
        next.delete(typeKey)
      } else {
        next.add(typeKey)
      }
      return next
    })
  }

  const enableAllTypes = () => {
    setActiveTypes(new Set(Object.keys(DOCUMENT_OBJECT_LABELS)))
  }

  const disableAllTypes = () => {
    setActiveTypes(new Set())
  }

  const filteredDocuments = useMemo(() => {
    if (!documents) return []
    return documents.filter((doc) => {
      if (activeTypes.size > 0 && !activeTypes.has(doc.documentType)) {
        return false
      }
      if (activeTypes.size === 0) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        return doc.title.toLowerCase().includes(q)
      }
      return true
    })
  }, [documents, activeTypes, searchQuery])

  const totalTypesCount = Object.keys(DOCUMENT_OBJECT_LABELS).length
  const isTypeFilterActive = activeTypes.size < totalTypesCount

  const displayCollections = useMemo(() => {
    if (mode === "lists") {
      return collections.filter((c) => c.kind === "list")
    }
    if (mode === "corpus") {
      return collections.filter((c) => c.kind === "corpus")
    }
    return []
  }, [collections, mode])

  // Mode rail étroit quand le viewer est ouvert
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center justify-between border-r border-white/5 bg-[#0f122c] py-4 px-1.5 transition-all duration-300 ease-out">
        <button
          type="button"
          onClick={onExpandLibrary}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          title="Agrandir la bibliothèque"
          aria-label="Agrandir la bibliothèque"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="my-auto flex flex-col items-center gap-2 overflow-y-auto py-2">
          {/* Icône Synthèse en mode rail */}
          <button
            type="button"
            onClick={() => {
              onSelectView({ type: "synthesis" })
              onExpandLibrary?.()
            }}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-xs font-bold transition-colors",
              activeView.type === "synthesis"
                ? "border border-brand-brass/40 bg-brand-brass/20 text-brand-brass"
                : "border border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
            )}
            title="Synthèse (Patrimoine de connaissance)"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </button>

          <div className="my-1 h-px w-6 bg-white/10" />

          {mode === "documents"
            ? filteredDocuments.map((doc) => {
                const isSelected = activeView.type === "document" && activeView.id === doc.id
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectView({ type: "document", id: doc.id })
                      onExpandLibrary?.()
                    }}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                      isSelected
                        ? "border border-brand-brass/40 bg-brand-brass/20 text-brand-brass"
                        : "border border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
                    )}
                    title={doc.title}
                  >
                    {getDocumentIcon(doc.documentType || "intelligence_document", "size-4")}
                  </button>
                )
              })
            : displayCollections.map((col) => {
                const isSelected = activeView.type === (mode === "lists" ? "list" : "corpus") && activeView.id === col.id
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      onSelectView(mode === "lists" ? { type: "list", id: col.id } : { type: "corpus", id: col.id })
                      onExpandLibrary?.()
                    }}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                      isSelected
                        ? "border border-brand-brass/40 bg-brand-brass/20 text-brand-brass"
                        : "border border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
                    )}
                    title={`${col.name} (${col.itemCount})`}
                  >
                    {col.name.charAt(0).toUpperCase()}
                  </button>
                )
              })}
        </div>

        {mode === "lists" ? (
          <button
            type="button"
            onClick={() => {
              setCreatingOpen(true)
              onExpandLibrary?.()
            }}
            className="flex size-10 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Créer une liste"
            aria-label="Créer une liste"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col border-r border-white/5 bg-[#0f122c] transition-all duration-300 ease-out">
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* 1. Entrée permanente Synthèse */}
          <button
            type="button"
            onClick={() => onSelectView({ type: "synthesis" })}
            className={cn(
              "group flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer",
              activeView.type === "synthesis"
                ? "border-brand-brass/40 bg-brand-brass/10 text-white"
                : "border-transparent bg-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">Patrimoine</p>
            </div>
            <svg
              className={cn(
                "size-4 shrink-0 transition-transform",
                activeView.type === "synthesis"
                  ? "text-brand-brass translate-x-0"
                  : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 2. Recherche instantanée + Filtre par type en mode documents */}
          {mode === "documents" ? (
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Recherche…"
                    className="h-8 w-full rounded-lg bg-white/[0.04] border border-white/10 pl-7 pr-2 text-xs text-white placeholder:text-white/35 focus:border-brand-brass/60 focus:outline-none transition-colors"
                  />
                  <svg
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-white/40 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setTypeFilterOpen(true)}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                    isTypeFilterActive
                      ? "border-brand-brass/60 bg-brand-brass/20 text-brand-brass"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  title="Filtrer par type de document"
                  aria-label="Filtrer par type de document"
                >
                  {getDocumentIcon("intelligence_document", "size-4")}
                </button>
              </div>
            </div>
          ) : null}

          {/* Séparateur */}
          <div className="my-2 border-t border-white/5" />

          {/* 3. Liste des Documents / Listes / Corpus */}
          {isLoading || (mode === "documents" && isLoadingDocuments) ? (
            <div className="p-4 text-center text-xs text-white/50">Chargement…</div>
          ) : mode === "documents" ? (
            filteredDocuments.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/40 italic leading-relaxed">
                {documents.length === 0
                  ? "Aucun document dans la bibliothèque."
                  : "Aucun document ne correspond à vos critères."}
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredDocuments.map((doc) => {
                  const isSelected = activeView.type === "document" && activeView.id === doc.id
                  const typeLabel = doc.documentType
                    ? (DOCUMENT_OBJECT_LABELS[doc.documentType as keyof typeof DOCUMENT_OBJECT_LABELS] ??
                        getDocumentTypeLabel(doc.documentType as keyof typeof DOCUMENT_OBJECT_LABELS))
                    : "Document"

                  return (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => onSelectView({ type: "document", id: doc.id })}
                        className={cn(
                          "group flex w-full items-center gap-1.5 rounded-xl border px-2 py-2.5 text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-brand-brass/40 bg-brand-brass/10 text-white shadow-sm"
                            : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        {/* Icône document */}
                        <div
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
                            isSelected
                              ? "bg-brand-brass/20 text-brand-brass"
                              : "bg-white/[0.05] text-white/50 group-hover:bg-white/10 group-hover:text-white/80",
                          )}
                        >
                          {getDocumentIcon(doc.documentType || "intelligence_document", "size-3.5")}
                        </div>

                        {/* Titre + Type */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold leading-tight text-white">
                            {doc.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-white/45 group-hover:text-white/60">
                            {typeLabel}
                          </p>
                        </div>

                        {/* Chevron droite */}
                        <svg
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            isSelected
                              ? "text-brand-brass translate-x-0"
                              : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          ) : displayCollections.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/40 italic">
              {mode === "corpus"
                ? "Aucun corpus disponible pour le moment."
                : "Aucune liste pour l'instant."}
            </div>
          ) : (
            <ul className="space-y-1">
              {displayCollections.map((col) => {
                const isSelected =
                  (mode === "lists" && activeView.type === "list" && activeView.id === col.id) ||
                  (mode === "corpus" && activeView.type === "corpus" && activeView.id === col.id)

                return (
                  <li key={col.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectView(
                          mode === "lists"
                            ? { type: "list", id: col.id }
                            : { type: "corpus", id: col.id }
                        )
                      }
                      className={cn(
                        "group flex w-full items-center gap-1.5 rounded-xl border px-2 py-2.5 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-brand-brass/40 bg-brand-brass/10 text-white shadow-sm"
                          : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                      )}
                    >
                      {/* Icône liste */}
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
                          isSelected
                            ? "bg-brand-brass/20 text-brand-brass"
                            : "bg-white/[0.05] text-white/50 group-hover:bg-white/10 group-hover:text-white/80",
                        )}
                      >
                        {getDocumentIcon(
                          col.kind === "corpus" ? "knowledge_corpus" : "knowledge_list",
                          "size-3.5",
                        )}
                      </div>

                      {/* Nom + compteur */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="truncate text-xs font-bold leading-tight">
                            {col.name}
                          </span>
                          <span className="shrink-0 text-[10px] font-normal text-white/50">({col.itemCount})</span>
                        </div>
                        {col.description ? (
                          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-white/45 group-hover:text-white/60">
                            {col.description}
                          </p>
                        ) : null}
                      </div>

                      {/* Chevron droite */}
                      <svg
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          isSelected
                            ? "text-brand-brass translate-x-0"
                            : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {mode === "lists" ? (
          <div className="shrink-0 border-t border-white/5 p-3">
            {creatingOpen ? (
              <div className="space-y-2">
                <Input
                  autoFocus
                  size="sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom de la liste"
                  fullWidth
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/35 focus:border-brand-brass/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreate()
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    fullWidth
                    onClick={onCreate}
                    disabled={isPending || !newName.trim()}
                    loading={isPending}
                    className="bg-brand-brass text-slate-950 font-semibold hover:bg-brand-brass-hover"
                  >
                    Créer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCreatingOpen(false)
                      setNewName("")
                    }}
                    className="text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                onClick={() => setCreatingOpen(true)}
                className="w-full justify-center rounded-lg border border-white/10 bg-transparent text-xs font-semibold text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors"
              >
                + Créer une liste
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Popover / Modale de filtrage des types de documents */}
      {typeFilterOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setTypeFilterOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[82vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f122c] text-white shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-brand-brass/15 text-brand-brass">
                  {getDocumentIcon("intelligence_document", "size-4")}
                </div>
                <h3 className="text-sm font-bold text-white">Filtrer par type de document</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={enableAllTypes}
                  className="text-[11px] font-semibold text-brand-brass hover:underline cursor-pointer"
                >
                  Tout activer
                </button>
                <span className="text-white/20 text-xs">·</span>
                <button
                  type="button"
                  onClick={disableAllTypes}
                  className="text-[11px] font-semibold text-white/50 hover:text-white hover:underline cursor-pointer"
                >
                  Tout désactiver
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilterOpen(false)}
                  className="ml-2 flex size-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Fermer le filtre"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2 Colonnes de types avec interrupteurs */}
            <div className="grid grid-cols-2 gap-2 py-4 overflow-y-auto min-h-0 flex-1 pr-1">
              {Object.entries(DOCUMENT_OBJECT_LABELS).map(([typeKey, label]) => {
                const isChecked = activeTypes.has(typeKey)
                return (
                  <div
                    key={typeKey}
                    onClick={() => toggleType(typeKey)}
                    className={cn(
                      "flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                      isChecked
                        ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                        : "bg-white/[0.01] border-white/5 opacity-40 hover:opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn("size-2 rounded-full shrink-0", isChecked ? "bg-brand-brass" : "bg-white/20")} />
                      <span className="truncate text-xs font-medium text-white/90" title={label}>
                        {label}
                      </span>
                    </div>
                    {/* Interrupteur switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isChecked}
                      aria-label={label}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleType(typeKey)
                      }}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/40",
                        isChecked ? "border-brand-brass bg-brand-brass" : "border-white/20 bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "block size-3.5 rounded-full bg-white transition-transform duration-200 shadow-sm",
                          isChecked ? "translate-x-[18px]" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-xs text-white/50">
                {activeTypes.size} / {totalTypesCount} types sélectionnés
              </span>
              <Button
                size="sm"
                onClick={() => setTypeFilterOpen(false)}
                className="bg-brand-brass text-slate-950 font-semibold hover:bg-brand-brass-hover px-4"
              >
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

