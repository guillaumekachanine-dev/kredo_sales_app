"use client"

import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAddToListState } from "./use-add-to-list"
import type { AddableContentType } from "../domain/content-collections-contracts"

export interface AddToListSheetMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: AddableContentType
  contentId: string
  onManageLists: () => void
}

export function AddToListSheetMobile({
  open,
  onOpenChange,
  contentType,
  contentId,
  onManageLists,
}: AddToListSheetMobileProps) {
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
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title="Ajouter à…"
      showMobileCloseButton
      footer={
        <div className="flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onManageLists()
            }}
            className="min-h-11 text-center text-xs font-bold text-primary"
          >
            Gérer les listes
          </button>
          <Button fullWidth onClick={() => onOpenChange(false)}>
            Terminé
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? <p className="rounded bg-danger/10 p-2 text-xs font-semibold text-danger">{error}</p> : null}
        {feedback ? (
          <p role="status" className="rounded bg-success/10 p-2 text-xs font-semibold text-success">
            {feedback}
          </p>
        ) : null}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Chargement des listes…</p>
        ) : collections.length === 0 && !creatingOpen ? (
          <p className="py-4 text-sm text-muted">Aucune liste de {pluralLabel} ni corpus pour l&apos;instant. Créez-en un pour commencer.</p>
        ) : (
          <ul className="divide-y divide-border">
            {collections.map((collection) => {
              const checked = memberIds.has(collection.id)
              const pending = pendingIds.has(collection.id)
              return (
                <li key={collection.id}>
                  <label className="flex min-h-11 items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={pending}
                      onChange={(e) => toggle(collection, e.target.checked)}
                      className="size-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
                      {collection.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{collection.itemCount}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        {creatingOpen ? (
          <div className="space-y-2 border-t border-border pt-3">
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
            <div className="flex gap-2">
              <Button fullWidth onClick={handleCreate} disabled={isPending || !newName.trim()} loading={isPending}>
                Créer
              </Button>
              <Button
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
          <button
            type="button"
            onClick={() => setCreatingOpen(true)}
            className="flex min-h-11 w-full items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm font-semibold text-primary"
          >
            <span aria-hidden="true">+</span> Créer une liste
          </button>
        )}
      </div>
    </AppDrawer>
  )
}
