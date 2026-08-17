"use client"

import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAddToListState } from "./use-add-to-list"
import type { AddableContentType } from "../domain/content-collections-contracts"

export interface AddToListDialogDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: AddableContentType
  contentId: string
  onManageLists: () => void
}

export function AddToListDialogDesktop({
  open,
  onOpenChange,
  contentType,
  contentId,
  onManageLists,
}: AddToListDialogDesktopProps) {
  const {
    isLoading,
    collections,
    memberIds,
    pendingIds,
    error,
    feedback,
    creatingOpen,
    setCreatingOpen,
    newName,
    setNewName,
    toggle,
    handleCreate,
    isPending,
    pluralLabel,
  } = useAddToListState(open, contentType, contentId)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter à…"
      className="sm:max-w-sm"
      footer={
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => {
            onOpenChange(false)
            onManageLists()
          }}
          className="justify-center"
        >
          Gérer les listes
        </Button>
      }
    >
      <div className="space-y-3">
        {error ? <p className="rounded bg-danger/10 p-2 text-xxs font-semibold text-danger">{error}</p> : null}
        {feedback ? (
          <p role="status" className="rounded bg-success/10 p-2 text-xxs font-semibold text-success">
            {feedback}
          </p>
        ) : null}

        {isLoading ? (
          <p className="py-4 text-center text-xs text-muted">Chargement des listes…</p>
        ) : collections.length === 0 && !creatingOpen ? (
          <p className="py-2 text-xs text-muted">Aucune liste de {pluralLabel} ni corpus pour l&apos;instant. Créez-en un pour commencer.</p>
        ) : (
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {collections.map((collection) => {
              const checked = memberIds.has(collection.id)
              const pending = pendingIds.has(collection.id)
              return (
                <li key={collection.id}>
                  <label className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-heading hover:bg-surface-hover">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={pending}
                      onChange={(e) => toggle(collection, e.target.checked)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{collection.name}</span>
                    <span className="shrink-0 text-[10px] text-muted">{collection.itemCount}</span>
                  </label>
                </li>
              )
            })}
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
