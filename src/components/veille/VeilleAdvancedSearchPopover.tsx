"use client"

import { useState, useEffect } from "react"
import { resolveCollectionArticleIdsAction } from "@/features/content-collections/actions/content-collections-actions"
import { fetchCollectionsSummary } from "@/features/content-collections/data/content-collections-client-queries"
import type { CollectionSummary } from "@/features/content-collections/domain/content-collections-contracts"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

export type AdvancedSearchState = {
  periodMode: "none" | "month" | "range"
  monthYear: string // YYYY-MM
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  category: string
  collectionId: string
}

export const DEFAULT_ADVANCED_SEARCH: AdvancedSearchState = {
  periodMode: "none",
  monthYear: "",
  startDate: "",
  endDate: "",
  category: "",
  collectionId: "",
}

interface VeilleAdvancedSearchPopoverProps {
  open: boolean
  onClose: () => void
  categories: string[]
  currentState: AdvancedSearchState
  onApply: (state: AdvancedSearchState, resolvedArticleIds: string[] | null) => void
  onReset: () => void
}

export function VeilleAdvancedSearchPopover({
  open,
  onClose,
  categories,
  currentState,
  onApply,
  onReset,
}: VeilleAdvancedSearchPopoverProps) {
  const [state, setState] = useState<AdvancedSearchState>(currentState)
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [resolvingScope, setResolvingScope] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setState(currentState)
      setLoadingCollections(true)
    }
  }

  useEffect(() => {
    if (!open) return
    let isMounted = true
    fetchCollectionsSummary()
      .then((data) => {
        if (isMounted) {
          setCollections(data)
          setLoadingCollections(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoadingCollections(false)
      })
    return () => {
      isMounted = false
    }
  }, [open])

  if (!open) return null

  const handleApply = async () => {
    setErrorMessage(null)
    let resolvedArticleIds: string[] | null = null

    if (state.collectionId) {
      setResolvingScope(true)
      const res = await resolveCollectionArticleIdsAction(state.collectionId)
      setResolvingScope(false)
      if (!res.success) {
        setErrorMessage(res.error)
        return
      }
      resolvedArticleIds = res.articleIds
    }

    onApply(state, resolvedArticleIds)
    onClose()
  }

  const handleReset = () => {
    setState(DEFAULT_ADVANCED_SEARCH)
    setErrorMessage(null)
    onReset()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-md border border-border bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-heading">
            Recherche avancée
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded border border-border bg-canvas text-muted hover:text-heading hover:bg-surface-hover text-xs font-bold transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

      <div className="mt-3 space-y-3.5 text-xs">
        {/* Filtre 1 : Période */}
        <div>
          <label className="block font-bold text-heading text-[11px] mb-1">
            Période de publication
          </label>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  periodMode: prev.periodMode === "month" ? "none" : "month",
                }))
              }
              className={cn(
                "border px-2 py-1 text-[10px] font-semibold transition-colors",
                state.periodMode === "month"
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-canvas text-body hover:bg-surface-hover",
              )}
            >
              Mois
            </button>
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  periodMode: prev.periodMode === "range" ? "none" : "range",
                }))
              }
              className={cn(
                "border px-2 py-1 text-[10px] font-semibold transition-colors",
                state.periodMode === "range"
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-canvas text-body hover:bg-surface-hover",
              )}
            >
              Période personnalisée
            </button>
          </div>

          {state.periodMode === "month" && (
            <input
              type="month"
              value={state.monthYear}
              onChange={(e) =>
                setState((prev) => ({ ...prev, monthYear: e.target.value }))
              }
              className="h-8 w-full border border-border bg-canvas px-2 text-xs text-heading outline-none focus-visible:ring-1 focus-visible:ring-heading"
            />
          )}

          {state.periodMode === "range" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-muted mb-0.5">Début</span>
                <input
                  type="date"
                  value={state.startDate}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="h-8 w-full border border-border bg-canvas px-2 text-[11px] text-heading outline-none focus-visible:ring-1 focus-visible:ring-heading"
                />
              </div>
              <div>
                <span className="block text-[10px] text-muted mb-0.5">Fin</span>
                <input
                  type="date"
                  value={state.endDate}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="h-8 w-full border border-border bg-canvas px-2 text-[11px] text-heading outline-none focus-visible:ring-1 focus-visible:ring-heading"
                />
              </div>
            </div>
          )}
        </div>

        {/* Filtre 2 : Catégorie */}
        <div>
          <label htmlFor="advanced-search-category" className="block font-bold text-heading text-[11px] mb-1">
            Catégorie
          </label>
          <select
            id="advanced-search-category"
            value={state.category}
            onChange={(e) =>
              setState((prev) => ({ ...prev, category: e.target.value }))
            }
            className="h-8 w-full border border-border bg-canvas px-2 text-xs text-heading outline-none focus-visible:ring-1 focus-visible:ring-heading"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre 3 : Liste / Corpus */}
        <div>
          <label htmlFor="advanced-search-collection" className="block font-bold text-heading text-[11px] mb-1">
            Liste / Corpus
          </label>
          <select
            id="advanced-search-collection"
            value={state.collectionId}
            disabled={loadingCollections}
            onChange={(e) =>
              setState((prev) => ({ ...prev, collectionId: e.target.value }))
            }
            className="h-8 w-full border border-border bg-canvas px-2 text-xs text-heading outline-none focus-visible:ring-1 focus-visible:ring-heading disabled:opacity-50"
          >
            <option value="">Tous les corpus / listes</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.kind === "corpus" ? "📦 Corpus : " : "📋 Liste : "}
                {col.name} ({col.itemCount})
              </option>
            ))}
          </select>
        </div>

        {errorMessage && (
          <p role="alert" className="text-[10px] text-danger font-semibold">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-semibold text-muted hover:text-heading underline underline-offset-2"
        >
          Réinitialiser
        </button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          loading={resolvingScope}
          loadingLabel="Résolution"
        >
          Appliquer
        </Button>
      </div>
    </div>
  </div>
)
}
