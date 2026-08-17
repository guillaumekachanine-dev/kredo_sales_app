"use client"

import { useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import type { CollectionSummary } from "../../domain/content-collections-contracts"

export interface AddListToCorpusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Listes déjà filtrées : kind="list", hors ce Corpus, hors listes déjà incluses. */
  eligibleLists: CollectionSummary[]
  onConfirm: (listId: string) => Promise<void>
}

/** Sélecteur d'une Liste existante à inclure dans le Corpus courant (content_type="knowledge_list"). */
export function AddListToCorpusDialog({ open, onOpenChange, eligibleLists, onConfirm }: AddListToCorpusDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      try {
        await onConfirm(selectedId)
        setSelectedId(null)
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec de l'ajout de la liste.")
      }
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedId(null)
        onOpenChange(next)
      }}
      title="Ajouter une liste existante"
      description="Inclure une Liste déjà créée dans ce Corpus. Elle reste modifiable indépendamment."
      className="sm:max-w-sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selectedId || isPending} loading={isPending}>
            Ajouter
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? <p className="rounded bg-danger/10 p-2 text-xxs font-semibold text-danger">{error}</p> : null}

        {eligibleLists.length === 0 ? (
          <p className="py-2 text-xs text-muted">
            Aucune Liste disponible — toutes vos Listes sont déjà incluses dans ce Corpus, ou vous n&apos;en avez pas encore créé.
          </p>
        ) : (
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {eligibleLists.map((list) => (
              <li key={list.id}>
                <label className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-heading hover:bg-surface-hover">
                  <input
                    type="radio"
                    name="add-list-to-corpus"
                    checked={selectedId === list.id}
                    onChange={() => setSelectedId(list.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{list.name}</span>
                  <span className="shrink-0 text-[10px] text-muted">{list.itemCount}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppDialog>
  )
}
