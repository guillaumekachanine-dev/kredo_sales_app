"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { formatDateFr } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { CollectionSummary, ResolvedCollectionItem } from "../domain/content-collections-contracts"

export interface KnowledgeListPaneProps {
  collection: CollectionSummary | null
  items: ResolvedCollectionItem[]
  isLoadingItems: boolean
  isEditMode: boolean
  onToggleEditMode: () => void
  editingData: { name: string; description: string } | null
  setEditingData: (data: { name: string; description: string } | null) => void
  onSaveEditing: () => void
  onCancelEditing: () => void
  onDeleteCollection: () => void
  selectedItemIds: Set<string>
  onToggleItemSelection: (membershipId: string) => void
  onToggleSelectAll: () => void
  onOpenPicker: (mode: "add" | "move") => void
  onRemoveSelected: () => void
  onOpenViewer: (item: ResolvedCollectionItem) => void
  activeViewerItemId?: string | null
  isPending: boolean
  error: string | null
}

function buildContentBreakdown(items: ResolvedCollectionItem[]): string {
  if (items.length === 0) return "0 document"
  const countByType = new Map<string, number>()
  for (const item of items) {
    const label = item.typeLabel || "document"
    countByType.set(label, (countByType.get(label) ?? 0) + 1)
  }
  const parts: string[] = []
  for (const [label, count] of countByType.entries()) {
    parts.push(`${count} ${label.toLowerCase()}${count > 1 ? "s" : ""}`)
  }
  const mainCount = `${items.length} document${items.length > 1 ? "s" : ""}`
  return `${mainCount} (${parts.join(" · ")})`
}

export function KnowledgeListPane({
  collection,
  items,
  isLoadingItems,
  isEditMode,
  onToggleEditMode,
  editingData,
  setEditingData,
  onSaveEditing,
  onCancelEditing,
  onDeleteCollection,
  selectedItemIds,
  onToggleItemSelection,
  onToggleSelectAll,
  onOpenPicker,
  onRemoveSelected,
  onOpenViewer,
  activeViewerItemId,
  isPending,
  error,
}: KnowledgeListPaneProps) {
  const [isInlineEditing, setIsInlineEditing] = useState(false)

  if (!collection) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-white/50">
        Sélectionnez ou créez une liste pour afficher son contenu.
      </div>
    )
  }

  const breakdown = buildContentBreakdown(items)

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950/20">
      {/* Header de la liste */}
      <div className="shrink-0 border-b border-white/5 p-4 sm:p-5">
        {error ? <p className="mb-3 rounded-lg bg-danger/10 p-2.5 text-xs font-semibold text-danger">{error}</p> : null}

        {isEditMode ? (
          <div className="space-y-3">
            {isInlineEditing && editingData ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <Input
                  size="sm"
                  value={editingData.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  fullWidth
                  placeholder="Nom de la liste"
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/35 focus:border-brand-brass/60"
                />
                <Textarea
                  size="sm"
                  value={editingData.description}
                  onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                  fullWidth
                  rows={2}
                  placeholder="Description (optionnelle)"
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/35 focus:border-brand-brass/60"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-white">{collection.name}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingData({ name: collection.name, description: collection.description ?? "" })
                    setIsInlineEditing(true)
                  }}
                  className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  title="Modifier le nom et la description"
                  aria-label="Modifier le nom et la description"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-white/50">{breakdown}</span>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsInlineEditing(false)
                    onCancelEditing()
                  }}
                  className="text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onSaveEditing()
                    setIsInlineEditing(false)
                  }}
                  loading={isPending}
                  className="bg-brand-brass text-slate-950 font-semibold hover:bg-brand-brass-hover"
                >
                  Valider
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDeleteCollection}
                  className="bg-status-danger/20 border border-status-danger/40 text-status-danger hover:bg-status-danger/30"
                >
                  Supprimer la liste
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-bold text-white truncate">{collection.name}</h3>
              {collection.description ? (
                <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{collection.description}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] font-medium text-white/50">{breakdown}</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={onToggleEditMode}
              className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-white hover:bg-white/[0.08]"
            >
              Éditer
            </Button>
          </div>
        )}
      </div>

      {/* Barre d'actions d'édition (dépliante en mode édition) */}
      {isEditMode ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-white/[0.03] px-4 py-2.5 transition-all duration-300 ease-out">
          <span className="text-xs font-semibold text-white/80">
            {selectedItemIds.size} élément{selectedItemIds.size > 1 ? "s" : ""} sélectionné{selectedItemIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedItemIds.size === 0}
              onClick={() => onOpenPicker("add")}
              className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 disabled:opacity-40"
            >
              Ajouter à une autre liste
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedItemIds.size === 0}
              onClick={() => onOpenPicker("move")}
              className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 disabled:opacity-40"
            >
              Déplacer vers…
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedItemIds.size === 0}
              onClick={onRemoveSelected}
              loading={isPending}
              className="bg-status-danger/20 border border-status-danger/40 text-xs text-status-danger hover:bg-status-danger/30 disabled:opacity-40"
            >
              Retirer de cette liste
            </Button>
          </div>
        </div>
      ) : null}

      {/* Liste des documents */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {isLoadingItems ? (
          <div className="p-8 text-center text-xs text-white/50">Chargement des documents…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/50 leading-relaxed italic">
            Cette liste est vide. Utilisez « Ajouter à la liste » depuis un article ou un document pour la remplir.
          </div>
        ) : (
          <div className="space-y-2">
            {isEditMode ? (
              <label className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                <input
                  type="checkbox"
                  checked={selectedItemIds.size === items.length && items.length > 0}
                  onChange={onToggleSelectAll}
                  className="size-3.5 accent-brand-brass rounded border-white/20 bg-white/5"
                />
                Tout sélectionner
              </label>
            ) : null}

            <ul className="divide-y divide-white/5">
              {items.map((item) => {
                const metaParts = [
                  item.typeLabel,
                  item.categoryLabel,
                  item.date ? formatDateFr(item.date) : null,
                ].filter(Boolean)

                const isItemActiveInViewer = activeViewerItemId === item.membershipId

                return (
                  <li
                    key={item.membershipId}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-colors",
                      isItemActiveInViewer
                        ? "bg-brand-brass/10 border border-brand-brass/30"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    {isEditMode ? (
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.membershipId)}
                        onChange={() => onToggleItemSelection(item.membershipId)}
                        className="mt-0.5 size-4 shrink-0 accent-brand-brass rounded border-white/20 bg-white/5"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/50">
                        {metaParts.join(" · ")}
                      </p>
                    </div>

                    {!isEditMode ? (
                      <button
                        type="button"
                        onClick={() => onOpenViewer(item)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer",
                          isItemActiveInViewer
                            ? "bg-brand-brass text-slate-950 shadow-sm"
                            : "bg-white/5 text-brand-brass border border-brand-brass/30 hover:bg-brand-brass/20"
                        )}
                      >
                        <span>Voir</span>
                        <span aria-hidden="true">▸</span>
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
