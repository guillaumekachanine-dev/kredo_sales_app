"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { formatDateFr } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  fetchCollectionsSummary,
  fetchResolvedCollectionItems,
} from "../data/content-collections-client-queries"
import {
  bulkAddItemsToCollectionAction,
  createCollectionAction,
  deleteCollectionAction,
  moveItemsToCollectionAction,
  removeItemsByIdAction,
  renameCollectionAction,
  updateCollectionDescriptionAction,
} from "../actions/content-collections-actions"
import { CollectionPickerDialog } from "./CollectionPickerDialog"
import type { CollectionSummary, ResolvedCollectionItem } from "../domain/content-collections-contracts"

export interface ManageCollectionsDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSelectedCollectionId?: string | null
}

export function ManageCollectionsDesktop({
  open,
  onOpenChange,
  initialSelectedCollectionId,
}: ManageCollectionsDesktopProps) {
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<ResolvedCollectionItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState("")
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [editing, setEditing] = useState<{ name: string; description: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CollectionSummary | null>(null)
  const [pickerMode, setPickerMode] = useState<"add" | "move" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setError(null)
    setIsLoadingCollections(true)
    fetchCollectionsSummary().then((data) => {
      setCollections(data)
      setIsLoadingCollections(false)
      setSelectedId(initialSelectedCollectionId ?? data[0]?.id ?? null)
    })
    // Ne dépend que de l'ouverture : `initialSelectedCollectionId` ne doit
    // amorcer la sélection qu'au moment où le dialogue s'ouvre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!selectedId) {
      setItems([])
      return
    }
    setIsLoadingItems(true)
    setSelectedItemIds(new Set())
    fetchResolvedCollectionItems(selectedId).then((data) => {
      setItems(data)
      setIsLoadingItems(false)
    })
  }, [selectedId])

  const selectedCollection = collections.find((c) => c.id === selectedId) ?? null

  const refreshCollections = () => fetchCollectionsSummary().then(setCollections)
  const refreshItems = () => {
    if (selectedId) fetchResolvedCollectionItems(selectedId).then(setItems)
  }

  const handleCreate = () => {
    setError(null)
    const name = newName
    startTransition(async () => {
      const result = await createCollectionAction(name)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNewName("")
      setCreatingOpen(false)
      await refreshCollections()
      setSelectedId(result.id)
    })
  }

  const startEditing = (collection: CollectionSummary) => {
    setEditing({ name: collection.name, description: collection.description ?? "" })
  }

  const saveEditing = () => {
    if (!selectedCollection || !editing) return
    setError(null)
    startTransition(async () => {
      if (editing.name.trim() !== selectedCollection.name) {
        const result = await renameCollectionAction(selectedCollection.id, editing.name)
        if (!result.success) {
          setError(result.error)
          return
        }
      }
      if (editing.description.trim() !== (selectedCollection.description ?? "")) {
        const result = await updateCollectionDescriptionAction(selectedCollection.id, editing.description)
        if (!result.success) {
          setError(result.error)
          return
        }
      }
      setEditing(null)
      await refreshCollections()
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = await deleteCollectionAction(deleteTarget.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    const remaining = collections.filter((c) => c.id !== deleteTarget.id)
    setCollections(remaining)
    if (selectedId === deleteTarget.id) setSelectedId(remaining[0]?.id ?? null)
    setDeleteTarget(null)
  }

  const toggleItemSelection = (membershipId: string) => {
    setSelectedItemIds((current) => {
      const next = new Set(current)
      if (next.has(membershipId)) next.delete(membershipId)
      else next.add(membershipId)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedItemIds((current) =>
      current.size === items.length ? new Set() : new Set(items.map((item) => item.membershipId)),
    )
  }

  const handleRemoveSelected = () => {
    startTransition(async () => {
      const result = await removeItemsByIdAction(Array.from(selectedItemIds))
      if (!result.success) {
        setError(result.error)
        return
      }
      setSelectedItemIds(new Set())
      await refreshItems()
      await refreshCollections()
    })
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={<span className="text-sm font-black text-heading">Gérer les listes</span>}
        description="Vos listes personnelles de contenus, réutilisables comme corpus dans les fonctionnalités IA."
        className="border border-border bg-canvas transition-all duration-300 sm:!h-[min(74vh,660px)] sm:!w-[88vw] sm:!max-w-[1020px] rounded-xl flex flex-col overflow-hidden shadow-xl"
        fillHeight
        headerClassName="-mx-4 -mt-4 shrink-0 border-b border-border bg-surface px-4 sm:-mx-6 sm:-mt-6 sm:px-6 rounded-t-xl py-2.5"
        bodyClassName="-mx-4 -mb-4 -mt-4 min-h-0 flex-1 overflow-hidden bg-canvas p-0 sm:-mx-6 sm:-mb-6 sm:-mt-4"
      >
        <div className="grid h-full grid-cols-[260px_minmax(0,1fr)] overflow-hidden">
          <aside className="flex h-full flex-col border-r border-border bg-surface">
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingCollections ? (
                <p className="p-3 text-xs text-muted">Chargement…</p>
              ) : collections.length === 0 ? (
                <p className="p-3 text-xs text-muted">Aucune liste pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-0.5">
                  {collections.map((collection) => (
                    <li key={collection.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(collection.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold",
                          collection.id === selectedId
                            ? "bg-primary/10 text-primary"
                            : "text-heading hover:bg-surface-hover",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                        <span className="shrink-0 text-[10px] font-normal text-muted">{collection.itemCount}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 border-t border-border p-2">
              {creatingOpen ? (
                <div className="space-y-2">
                  <Input
                    autoFocus
                    size="sm"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom de la liste"
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate()
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" fullWidth onClick={handleCreate} disabled={isPending || !newName.trim()} loading={isPending}>
                      Créer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCreatingOpen(false)
                        setNewName("")
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="secondary" fullWidth onClick={() => setCreatingOpen(true)}>
                  + Créer une liste
                </Button>
              )}
            </div>
          </aside>

          <div className="flex h-full min-w-0 flex-col overflow-hidden">
            {!selectedCollection ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted">
                {collections.length === 0 ? "Créez une première liste pour commencer." : "Sélectionnez une liste."}
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-border p-4">
                  {error ? <p className="mb-2 rounded bg-danger/10 p-2 text-xxs font-semibold text-danger">{error}</p> : null}
                  {editing ? (
                    <div className="space-y-2">
                      <Input
                        size="sm"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        fullWidth
                        placeholder="Nom"
                      />
                      <Textarea
                        size="sm"
                        value={editing.description}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        fullWidth
                        rows={2}
                        placeholder="Description (optionnelle)"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditing} loading={isPending}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading text-sm font-bold text-heading">{selectedCollection.name}</h3>
                        {selectedCollection.description ? (
                          <p className="mt-1 text-xs text-muted">{selectedCollection.description}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-muted">{items.length} élément(s)</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => startEditing(selectedCollection)}>
                          Modifier
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(selectedCollection)}>
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedItemIds.size > 0 ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
                    <span className="text-xs font-semibold text-heading">{selectedItemIds.size} sélectionné(s)</span>
                    <Button size="sm" variant="secondary" onClick={() => setPickerMode("add")}>
                      Ajouter à une autre liste
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPickerMode("move")}>
                      Déplacer vers…
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleRemoveSelected} loading={isPending}>
                      Retirer de cette liste
                    </Button>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {isLoadingItems ? (
                    <p className="p-4 text-center text-xs text-muted">Chargement…</p>
                  ) : items.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted">
                      Cette liste est vide. Utilisez « Ajouter à la liste » depuis un article pour la remplir.
                    </p>
                  ) : (
                    <div>
                      <label className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.size === items.length}
                          onChange={toggleSelectAll}
                          className="size-3.5 accent-primary"
                        />
                        Tout sélectionner
                      </label>
                      <ul className="divide-y divide-border">
                        {items.map((item) => (
                          <li key={item.membershipId} className="flex items-start gap-3 px-2 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.has(item.membershipId)}
                              onChange={() => toggleItemSelection(item.membershipId)}
                              className="mt-0.5 size-4 shrink-0 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-heading">{item.title}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted">
                                <span>{item.typeLabel}</span>
                                {item.date ? (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{formatDateFr(item.date)}</span>
                                  </>
                                ) : null}
                              </div>
                              {item.preview ? <p className="mt-1 line-clamp-2 text-xs text-body">{item.preview}</p> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null)
        }}
        title={`Supprimer « ${deleteTarget?.name ?? ""} » ?`}
        description="Les éléments de cette liste ne seront pas supprimés, seule la liste disparaît."
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
      />

      {selectedCollection ? (
        <CollectionPickerDialog
          open={pickerMode !== null}
          onOpenChange={(next) => {
            if (!next) setPickerMode(null)
          }}
          title={pickerMode === "move" ? "Déplacer vers…" : "Ajouter à une autre liste"}
          excludeCollectionId={selectedCollection.id}
          confirmLabel={pickerMode === "move" ? "Déplacer" : "Ajouter"}
          onConfirm={async (destinationId) => {
            const itemIds = Array.from(selectedItemIds)
            const result =
              pickerMode === "move"
                ? await moveItemsToCollectionAction(itemIds, destinationId)
                : await bulkAddItemsToCollectionAction(itemIds, destinationId)
            if (!result.success) throw new Error(result.error)
            setSelectedItemIds(new Set())
            await refreshItems()
            await refreshCollections()
          }}
        />
      ) : null}
    </>
  )
}
