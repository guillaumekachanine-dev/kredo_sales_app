"use client"

import { IconChevron } from "@/components/cockpit/mobile/icons"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { formatDateFr } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { AddListToCorpusDialog } from "./AddListToCorpusDialog"
import { useKnowledgeSpaceState } from "./useKnowledgeSpaceState"
import type { CollectionKind, CollectionSummary, ResolvedCollectionItem } from "../../domain/content-collections-contracts"

function openCollectionAsKnowledgeScope(collection: CollectionSummary) {
  openCommunicationComposer({
    origin: "global",
    contextReferences: {
      knowledgeScope: {
        collectionId: collection.id,
        kind: collection.kind,
        name: collection.name,
        itemCount: collection.itemCount,
      },
    },
  })
}

const KIND_TABS: Array<{ id: CollectionKind; label: string }> = [
  { id: "list", label: "Listes" },
  { id: "corpus", label: "Corpus" },
]

function KnowledgeCollectionRow({
  collection,
  active,
  onSelect,
}: {
  collection: CollectionSummary
  active: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold",
          active ? "bg-primary/10 text-primary" : "text-heading hover:bg-surface-hover",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{collection.name}</span>
        <span className="shrink-0 text-[10px] font-normal text-muted">{collection.itemCount}</span>
      </button>
    </li>
  )
}

function KnowledgeItemRow({
  item,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  item: ResolvedCollectionItem
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  return (
    <li className="flex items-start gap-3 px-2 py-2.5">
      <div className="mt-0.5 flex shrink-0 flex-col">
        <button
          type="button"
          aria-label="Monter"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className="inline-flex size-5 items-center justify-center text-muted hover:text-heading disabled:opacity-25"
        >
          <span className="-rotate-90 block">
            <IconChevron />
          </span>
        </button>
        <button
          type="button"
          aria-label="Descendre"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className="inline-flex size-5 items-center justify-center text-muted hover:text-heading disabled:opacity-25"
        >
          <span className="rotate-90 block">
            <IconChevron />
          </span>
        </button>
      </div>
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
      <Button size="sm" variant="ghost" onClick={onRemove}>
        Retirer
      </Button>
    </li>
  )
}

export function KnowledgeSpaceDesktop() {
  const state = useKnowledgeSpaceState()
  const {
    kindFilter,
    handleSwitchKind,
    search,
    setSearch,
    collections,
    isLoadingCollections,
    selectedCollection,
    setSelectedId,
    items,
    isLoadingItems,
    groupedItems,
    creatingOpen,
    setCreatingOpen,
    newName,
    setNewName,
    handleCreate,
    editing,
    startEditing,
    cancelEditing,
    setEditing,
    saveEditing,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    handleRemoveItem,
    moveItem,
    addListDialogOpen,
    setAddListDialogOpen,
    eligibleListsForCorpus,
    handleAddListToCorpus,
    error,
    isPending,
  } = state

  const isCorpus = selectedCollection?.kind === "corpus"

  return (
    <>
    <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] overflow-hidden">
      <aside className="flex min-h-0 flex-col border-r border-border bg-surface">
        <div className="shrink-0 border-b border-border p-3">
          <div role="tablist" aria-label="Type de collection" className="grid grid-cols-2 gap-1 rounded-md bg-canvas p-1">
            {KIND_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={kindFilter === tab.id}
                onClick={() => handleSwitchKind(tab.id)}
                className={cn(
                  "min-h-8 rounded px-2 text-xs font-bold transition-colors",
                  kindFilter === tab.id ? "bg-surface text-heading shadow-sm" : "text-muted hover:text-heading",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Input
            size="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={kindFilter === "corpus" ? "Rechercher un corpus" : "Rechercher une liste"}
            fullWidth
            className="mt-2"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoadingCollections ? (
            <p className="p-3 text-xs text-muted">Chargement…</p>
          ) : collections.length === 0 ? (
            <p className="p-3 text-xs text-muted">
              {kindFilter === "corpus" ? "Aucun corpus pour l'instant." : "Aucune liste pour l'instant."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {collections.map((collection) => (
                <KnowledgeCollectionRow
                  key={collection.id}
                  collection={collection}
                  active={collection.id === selectedCollection?.id}
                  onSelect={() => setSelectedId(collection.id)}
                />
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
                placeholder={kindFilter === "corpus" ? "Nom du corpus" : "Nom de la liste"}
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
              {kindFilter === "corpus" ? "+ Créer un corpus" : "+ Créer une liste"}
            </Button>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-canvas">
        {!selectedCollection ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted">
            {collections.length === 0
              ? kindFilter === "corpus"
                ? "Créez un premier corpus pour commencer."
                : "Créez une première liste pour commencer."
              : "Sélectionnez un élément."}
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-border bg-surface p-4">
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
                    <Button size="sm" variant="ghost" onClick={cancelEditing}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                      {isCorpus ? "Corpus" : "Liste"}
                    </p>
                    <h3 className="font-heading text-sm font-bold text-heading">{selectedCollection.name}</h3>
                    {selectedCollection.description ? (
                      <p className="mt-1 text-xs text-muted">{selectedCollection.description}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted">{items.length} élément(s)</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {isCorpus ? (
                      <Button size="sm" variant="secondary" onClick={() => setAddListDialogOpen(true)}>
                        + Ajouter une liste
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => openCollectionAsKnowledgeScope(selectedCollection)}>
                      Utiliser comme contexte
                    </Button>
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

            <div className="reports-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
              {isLoadingItems ? (
                <p className="p-4 text-center text-xs text-muted">Chargement…</p>
              ) : items.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted">
                  {isCorpus
                    ? "Ce corpus est vide. Ajoutez une liste existante pour commencer."
                    : "Cette liste est vide. Utilisez « Ajouter à la liste » depuis un article de veille pour la remplir."}
                </p>
              ) : isCorpus ? (
                <div className="space-y-4">
                  {groupedItems.map((group) => (
                    <div key={group.contentType}>
                      <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                        {group.typeLabel} ({group.items.length})
                      </p>
                      <ul className="divide-y divide-border">
                        {group.items.map((item) => {
                          const index = items.findIndex((i) => i.membershipId === item.membershipId)
                          return (
                            <KnowledgeItemRow
                              key={item.membershipId}
                              item={item}
                              canMoveUp={index > 0}
                              canMoveDown={index < items.length - 1}
                              onMoveUp={() => moveItem(index, -1)}
                              onMoveDown={() => moveItem(index, 1)}
                              onRemove={() => handleRemoveItem(item.membershipId)}
                            />
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item, index) => (
                    <KnowledgeItemRow
                      key={item.membershipId}
                      item={item}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                      onMoveUp={() => moveItem(index, -1)}
                      onMoveDown={() => moveItem(index, 1)}
                      onRemove={() => handleRemoveItem(item.membershipId)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>

    <ConfirmDialog
      open={deleteTarget !== null}
      onOpenChange={(next) => {
        if (!next) setDeleteTarget(null)
      }}
      title={`Supprimer « ${deleteTarget?.name ?? ""} » ?`}
      description={
        deleteTarget?.kind === "corpus"
          ? "Les listes et éléments référencés par ce corpus ne seront pas supprimés, seul le corpus disparaît."
          : "Les éléments de cette liste ne seront pas supprimés, seule la liste disparaît."
      }
      variant="danger"
      confirmLabel="Supprimer"
      onConfirm={handleDelete}
    />

    {selectedCollection && isCorpus ? (
      <AddListToCorpusDialog
        open={addListDialogOpen}
        onOpenChange={setAddListDialogOpen}
        eligibleLists={eligibleListsForCorpus}
        onConfirm={handleAddListToCorpus}
      />
    ) : null}
    </>
  )
}
