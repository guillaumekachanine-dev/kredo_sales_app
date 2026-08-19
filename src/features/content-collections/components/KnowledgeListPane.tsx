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

/** Affiche directement le breakdown par type : "3 articles de veille · 1 document" */
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
  return parts.join(" · ")
}

/** Icône SVG inline sans cadre, adaptée au contentType. */
function ContentTypeIcon({
  contentType,
  className,
}: {
  contentType: string
  className?: string
}) {
  const cls = cn("shrink-0", className)

  if (contentType === "veille_article") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 4v6h6M9 13h6M9 17h4" />
      </svg>
    )
  }

  if (contentType === "intelligence_document") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  // Fallback
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
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
  const allSelected = selectedItemIds.size === items.length && items.length > 0

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950/20">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/5 p-4 sm:p-5">
        {error ? <p className="mb-3 rounded-lg bg-danger/10 p-2.5 text-xs font-semibold text-danger">{error}</p> : null}

        {isEditMode ? (
          /* Mode édition : structure identique au mode normal — même hauteur garantie */
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <h3 className="font-heading text-base font-bold text-white shrink-0 truncate">{collection.name}</h3>
                  {collection.description ? (
                    <>
                      <span className="shrink-0 text-xs text-white/40">-</span>
                      <p className="min-w-0 truncate text-xs text-white leading-relaxed">{collection.description}</p>
                    </>
                  ) : null}
                  {/* Bouton crayon discret pour ouvrir l'inline edit */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingData({ name: collection.name, description: collection.description ?? "" })
                      setIsInlineEditing(true)
                    }}
                    className="flex size-5 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    title="Modifier le nom et la description"
                    aria-label="Modifier le nom et la description"
                  >
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Annuler + Valider à la place du bouton Éditer */}
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
                  className="bg-brand-brass text-white font-semibold hover:bg-brand-brass-hover"
                >
                  Valider
                </Button>
              </div>
            </div>
            <p className="mt-1 text-[11px] font-medium text-white/50">{breakdown}</p>
            {/* Champs inline d'édition (appear sous le header sans modifier la hauteur de la ligne principale) */}
            {isInlineEditing && editingData ? (
              <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
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
            ) : null}
          </div>
        ) : (
          /* Mode normal : titre — description sur la même ligne + breakdown en-dessous */
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <h3 className="font-heading text-base font-bold text-white shrink-0 truncate">{collection.name}</h3>
                {collection.description ? (
                  <>
                    <span className="shrink-0 text-xs text-white/40">-</span>
                    <p className="min-w-0 truncate text-xs text-white leading-relaxed">{collection.description}</p>
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] font-medium text-white/50">{breakdown}</p>
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

      {/* ── LISTE DES DOCUMENTS ────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {isLoadingItems ? (
          <div className="p-8 text-center text-xs text-white/50">Chargement des documents…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/50 leading-relaxed italic">
            Cette liste est vide. Utilisez « Ajouter à la liste » depuis un article ou un document pour la remplir.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Ligne "Tout sélectionner (N)" en mode édition */}
            {isEditMode ? (
              <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45 select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="size-3.5 accent-brand-brass rounded border-white/20 bg-white/5"
                />
                Tout sélectionner
                {selectedItemIds.size > 0 ? (
                  <span className="normal-case text-white/60">({selectedItemIds.size})</span>
                ) : null}
              </label>
            ) : null}

            <ul className="divide-y divide-white/5">
              {items.map((item) => {
                const metaParts = [
                  item.categoryLabel,
                  item.date ? formatDateFr(item.date) : null,
                ].filter(Boolean)

                const isItemActiveInViewer = activeViewerItemId === item.membershipId
                const isSelected = selectedItemIds.has(item.membershipId)

                return (
                  <li
                    key={item.membershipId}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                      isItemActiveInViewer
                        ? "bg-brand-brass/10 border border-brand-brass/30"
                        : isSelected
                        ? "bg-white/[0.04]"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Gauche : checkbox (édition) OU icône type (normal) */}
                    {isEditMode ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleItemSelection(item.membershipId)}
                        className="mt-0.5 size-4 shrink-0 accent-brand-brass rounded border-white/20 bg-white/5 cursor-pointer"
                      />
                    ) : (
                      <ContentTypeIcon
                        contentType={item.contentType}
                        className="size-4 text-white/35"
                      />
                    )}

                    {/* Contenu */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{item.title}</p>
                      {metaParts.length > 0 ? (
                        <p className="mt-0.5 text-[11px] text-white/50">
                          {metaParts.join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    {/* Droite : Voir (normal) OU actions inline si sélectionné (édition) */}
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
                    ) : isSelected ? (
                      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Actions sur l'élément">
                        {/* Ajouter à une autre liste */}
                        <button
                          type="button"
                          onClick={() => onOpenPicker("add")}
                          title="Ajouter à une autre liste"
                          aria-label="Ajouter à une autre liste"
                          className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                        {/* Déplacer vers */}
                        <button
                          type="button"
                          onClick={() => onOpenPicker("move")}
                          title="Déplacer vers…"
                          aria-label="Déplacer vers une autre liste"
                          className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                        </button>
                        {/* Retirer de cette liste */}
                        <button
                          type="button"
                          onClick={onRemoveSelected}
                          disabled={isPending}
                          title="Retirer de cette liste"
                          aria-label="Retirer de cette liste"
                          className="flex size-7 items-center justify-center rounded-lg border border-status-danger/30 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-colors disabled:opacity-40"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* ── FOOTER MODE ÉDITION : Supprimer la liste en bas à droite ─ */}
      {isEditMode ? (
        <div className="shrink-0 flex justify-end border-t border-white/5 px-4 py-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={onDeleteCollection}
            className="bg-status-danger/15 border border-status-danger/30 text-status-danger hover:bg-status-danger/25 text-xs"
          >
            Supprimer la liste
          </Button>
        </div>
      ) : null}
    </div>
  )
}
