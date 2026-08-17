"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { formatDateFr } from "@/lib/formatters"
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

type PanelView =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; collectionId: string }
  | { kind: "edit"; collectionId: string }

export interface ManageCollectionsMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSelectedCollectionId?: string | null
}

/**
 * Variante mobile « intention action » du gestionnaire : écran des collections
 * → détail → sélection → actions de masse. Pas de grille dense desktop montée
 * puis cachée — arbre de rendu distinct de `ManageCollectionsDesktop`.
 */
export function ManageCollectionsMobile({
  open,
  onOpenChange,
  initialSelectedCollectionId,
}: ManageCollectionsMobileProps) {
  const [view, setView] = useState<PanelView>({ kind: "list" })
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(true)
  const [items, setItems] = useState<ResolvedCollectionItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState("")
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
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
      setView(initialSelectedCollectionId ? { kind: "detail", collectionId: initialSelectedCollectionId } : { kind: "list" })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (view.kind !== "detail") return
    setIsLoadingItems(true)
    setSelectedItemIds(new Set())
    fetchResolvedCollectionItems(view.collectionId).then((data) => {
      setItems(data)
      setIsLoadingItems(false)
    })
  }, [view])

  const refreshCollections = () => fetchCollectionsSummary().then(setCollections)
  const refreshItems = () => {
    if (view.kind === "detail") fetchResolvedCollectionItems(view.collectionId).then(setItems)
  }

  const selectedCollection =
    view.kind === "detail" || view.kind === "edit" ? collections.find((c) => c.id === view.collectionId) ?? null : null

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
      await refreshCollections()
      setView({ kind: "detail", collectionId: result.id })
    })
  }

  const startEditing = (collection: CollectionSummary) => {
    setEditName(collection.name)
    setEditDescription(collection.description ?? "")
    setView({ kind: "edit", collectionId: collection.id })
  }

  const saveEditing = () => {
    if (!selectedCollection) return
    setError(null)
    startTransition(async () => {
      if (editName.trim() !== selectedCollection.name) {
        const result = await renameCollectionAction(selectedCollection.id, editName)
        if (!result.success) {
          setError(result.error)
          return
        }
      }
      if (editDescription.trim() !== (selectedCollection.description ?? "")) {
        const result = await updateCollectionDescriptionAction(selectedCollection.id, editDescription)
        if (!result.success) {
          setError(result.error)
          return
        }
      }
      await refreshCollections()
      setView({ kind: "detail", collectionId: selectedCollection.id })
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = await deleteCollectionAction(deleteTarget.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    setDeleteTarget(null)
    await refreshCollections()
    setView({ kind: "list" })
  }

  const toggleItemSelection = (membershipId: string) => {
    setSelectedItemIds((current) => {
      const next = new Set(current)
      if (next.has(membershipId)) next.delete(membershipId)
      else next.add(membershipId)
      return next
    })
  }

  const handleRemoveSelected = () => {
    startTransition(async () => {
      const result = await removeItemsByIdAction(Array.from(selectedItemIds))
      if (!result.success) {
        setError(result.error)
        return
      }
      setSelectedItemIds(new Set())
      refreshItems()
      refreshCollections()
    })
  }

  const title =
    view.kind === "create"
      ? "Créer une liste"
      : view.kind === "edit"
        ? "Modifier la liste"
        : view.kind === "detail"
          ? selectedCollection?.name ?? "Liste"
          : "Gérer les listes"

  return (
    <>
      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        side="bottom"
        title={title}
        showMobileCloseButton
        onRequestClose={() => {
          if (view.kind !== "list") {
            setView({ kind: "list" })
            return false
          }
          return true
        }}
        footer={
          view.kind === "detail" && selectedItemIds.size > 0 ? (
            <div className="flex w-full flex-col gap-2">
              <p className="text-center text-xs font-semibold text-heading">{selectedItemIds.size} sélectionné(s)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="min-w-0 flex-1" onClick={() => setPickerMode("add")}>
                  Ajouter à
                </Button>
                <Button size="sm" variant="secondary" className="min-w-0 flex-1" onClick={() => setPickerMode("move")}>
                  Déplacer
                </Button>
                <Button size="sm" variant="destructive" className="min-w-0 flex-1" onClick={handleRemoveSelected} loading={isPending}>
                  Retirer
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {error ? <p className="mb-3 rounded bg-danger/10 p-2 text-xs font-semibold text-danger">{error}</p> : null}

        {view.kind === "list" ? (
          <div className="space-y-3">
            {isLoadingCollections ? (
              <p className="py-4 text-center text-sm text-muted">Chargement…</p>
            ) : collections.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Aucune liste pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-border">
                {collections.map((collection) => (
                  <li key={collection.id}>
                    <button
                      type="button"
                      onClick={() => setView({ kind: "detail", collectionId: collection.id })}
                      className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">{collection.name}</span>
                      <span className="shrink-0 text-xs text-muted">{collection.itemCount} élément(s)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button size="md" fullWidth onClick={() => setView({ kind: "create" })}>
              + Créer une liste
            </Button>
          </div>
        ) : view.kind === "create" ? (
          <div className="space-y-3">
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom de la liste" fullWidth />
            <div className="flex gap-2">
              <Button className="min-w-0 flex-1" onClick={handleCreate} disabled={isPending || !newName.trim()} loading={isPending}>
                Créer
              </Button>
              <Button variant="ghost" className="min-w-0 flex-1" onClick={() => setView({ kind: "list" })}>
                Annuler
              </Button>
            </div>
          </div>
        ) : view.kind === "edit" && selectedCollection ? (
          <div className="space-y-3">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom" fullWidth />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optionnelle)"
              fullWidth
              rows={3}
            />
            <div className="flex gap-2">
              <Button className="min-w-0 flex-1" onClick={saveEditing} loading={isPending}>
                Enregistrer
              </Button>
              <Button variant="ghost" className="min-w-0 flex-1" onClick={() => setView({ kind: "detail", collectionId: selectedCollection.id })}>
                Annuler
              </Button>
            </div>
            <Button variant="destructive" fullWidth onClick={() => setDeleteTarget(selectedCollection)}>
              Supprimer la liste
            </Button>
          </div>
        ) : view.kind === "detail" && selectedCollection ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {selectedCollection.description ? <p className="text-xs text-muted">{selectedCollection.description}</p> : null}
              </div>
              <Button size="sm" variant="secondary" onClick={() => startEditing(selectedCollection)}>
                Modifier
              </Button>
            </div>
            {isLoadingItems ? (
              <p className="py-4 text-center text-sm text-muted">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Cette liste est vide.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.membershipId}>
                    <label className="flex min-h-11 items-start gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.membershipId)}
                        onChange={() => toggleItemSelection(item.membershipId)}
                        className="mt-1 size-5 shrink-0 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-heading">{item.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted">
                          <span>{item.typeLabel}</span>
                          {item.date ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{formatDateFr(item.date)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </AppDrawer>

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
            refreshItems()
            refreshCollections()
          }}
        />
      ) : null}
    </>
  )
}
