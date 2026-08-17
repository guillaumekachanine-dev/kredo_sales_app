"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { fetchCollectionsSummary } from "../data/content-collections-client-queries"
import { createCollectionAction } from "../actions/content-collections-actions"
import type { CollectionSummary } from "../domain/content-collections-contracts"

export interface CollectionPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Collection à exclure de la liste (ex: la collection source d'un déplacement). */
  excludeCollectionId?: string
  confirmLabel: string
  onConfirm: (collectionId: string) => Promise<void>
}

/**
 * Sélecteur mono-liste utilisé par les actions de masse du gestionnaire
 * (« Ajouter à une autre liste », « Déplacer vers… »). Petit utilitaire
 * partagé desktop/mobile — même précédent que les dialogues de `SignalDialogs.tsx`.
 */
export function CollectionPickerDialog({
  open,
  onOpenChange,
  title,
  excludeCollectionId,
  confirmLabel,
  onConfirm,
}: CollectionPickerDialogProps) {
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setError(null)
    setSelectedId(null)
    setCreatingOpen(false)
    setNewName("")
    setIsLoading(true)
    fetchCollectionsSummary().then((data) => {
      setCollections(data.filter((collection) => collection.id !== excludeCollectionId))
      setIsLoading(false)
    })
  }, [open, excludeCollectionId])

  const handleCreate = () => {
    setError(null)
    const name = newName
    startTransition(async () => {
      const result = await createCollectionAction(name)
      if (!result.success) {
        setError(result.error)
        return
      }
      const created: CollectionSummary = {
        id: result.id,
        kind: "list",
        itemType: "veille_article",
        name: name.trim(),
        description: null,
        itemCount: 0,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setCollections((current) => [created, ...current])
      setSelectedId(created.id)
      setNewName("")
      setCreatingOpen(false)
    })
  }

  const handleConfirm = () => {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      try {
        await onConfirm(selectedId)
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec de l'opération.")
      }
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="sm:max-w-sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selectedId || isPending} loading={isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? <p className="rounded bg-danger/10 p-2 text-xxs font-semibold text-danger">{error}</p> : null}

        {isLoading ? (
          <p className="py-4 text-center text-xs text-muted">Chargement…</p>
        ) : collections.length === 0 && !creatingOpen ? (
          <p className="py-2 text-xs text-muted">Aucune autre liste disponible. Créez-en une.</p>
        ) : (
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {collections.map((collection) => (
              <li key={collection.id}>
                <label className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-heading hover:bg-surface-hover">
                  <input
                    type="radio"
                    name="collection-picker"
                    checked={selectedId === collection.id}
                    onChange={() => setSelectedId(collection.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{collection.name}</span>
                  <span className="shrink-0 text-[10px] text-muted">{collection.itemCount}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {creatingOpen ? (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la liste"
              fullWidth
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
            />
            <Button size="sm" onClick={handleCreate} disabled={isPending || !newName.trim()} loading={isPending}>
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
        ) : (
          <button
            type="button"
            onClick={() => setCreatingOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
          >
            <span aria-hidden="true">+</span> Créer une liste
          </button>
        )}
      </div>
    </AppDialog>
  )
}
