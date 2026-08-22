"use client"

import Link from "next/link"
import { useState } from "react"
import { IconChevron, IconSearch } from "@/components/cockpit/mobile/icons"
import { getDocumentIcon, isMasterStudyDocument } from "@/components/reports/document-display"
import { AppDrawer } from "@/components/ui/AppDrawer"
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

type DrawerView = "create" | "detail" | "edit" | null

/** Icône SVG selon le content-type — miroir de la Bibliothèque de documents. */
function CollectionItemIcon({ item }: { item: ResolvedCollectionItem }) {
  const isMasterStudy = isMasterStudyDocument(item.documentType)
  const docType =
    item.contentType === "veille_article"
      ? "veille_article"
      : item.contentType === "knowledge_list"
        ? "knowledge_list"
        : item.documentType || "client_summary"

  const iconClass = isMasterStudy
    ? "size-[20px] shrink-0 text-master-study-accent"
    : "size-[20px] shrink-0 text-muted"

  return getDocumentIcon(docType, iconClass)
}

function KnowledgeCollectionCard({ collection, onOpen }: { collection: CollectionSummary; onOpen: () => void }) {
  const collectionIconType = collection.kind === "corpus" ? "knowledge_corpus" : "knowledge_list"
  const itemTypeTag =
    collection.kind === "corpus"
      ? null
      : collection.itemType === "intelligence_document"
        ? "Documents"
        : "Articles"

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="shrink-0">
          {getDocumentIcon(
            collectionIconType,
            "size-[18px] text-muted",
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-heading">{collection.name}</span>
          {collection.description ? (
            <span className="mt-0.5 block truncate text-xs text-muted">{collection.description}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {itemTypeTag ? (
          <span className="rounded bg-border/40 px-1.5 py-0.5 text-[10px] font-medium text-muted">
            {itemTypeTag}
          </span>
        ) : null}
        <span className="text-xs font-semibold text-muted">{collection.itemCount}</span>
      </div>
    </button>
  )
}

function KnowledgeItemCard({
  item,
  reorderMode,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemoveRequest,
}: {
  item: ResolvedCollectionItem
  reorderMode: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemoveRequest: () => void
}) {
  const itemIconOrLink = item.url ? (
    <Link href={item.url} title={`Voir : ${item.title}`} className="mt-0.5 block shrink-0 rounded hover:opacity-70 transition-opacity">
      <CollectionItemIcon item={item} />
    </Link>
  ) : (
    <span className="mt-0.5 shrink-0">
      <CollectionItemIcon item={item} />
    </span>
  )

  return (
    <li className="flex min-h-12 items-start gap-3 py-2.5">
      {itemIconOrLink}

      {/* Contenu : titre puis type/date en dessous */}
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

      {/* Actions — visibles uniquement en mode réorganisation */}
      {reorderMode ? (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Monter"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="inline-flex size-11 items-center justify-center text-muted hover:text-heading disabled:opacity-25"
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
            className="inline-flex size-11 items-center justify-center text-muted hover:text-heading disabled:opacity-25"
          >
            <span className="rotate-90 block">
              <IconChevron />
            </span>
          </button>
          <Button size="sm" variant="ghost" onClick={onRemoveRequest} className="min-h-11 shrink-0">
            Retirer
          </Button>
        </div>
      ) : null}
    </li>
  )
}

/**
 * Composant mobile distinct de `KnowledgeSpaceDesktop` (ADR-0006 adaptive plein) :
 * liste de cartes compactes en page, détail/édition/création en tiroir bas
 * (`AppDrawer`), mode « Réorganiser » explicite pour ne pas confondre un tap
 * de retrait accidentel avec une intention de réordonnancement.
 */
export function KnowledgeSpaceMobile() {
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
    setCreatingOpen,
    newName,
    setNewName,
    newItemType,
    setNewItemType,
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
    reorderMode,
    setReorderMode,
    addListDialogOpen,
    setAddListDialogOpen,
    eligibleListsForCorpus,
    handleAddListToCorpus,
    error,
    isPending,
  } = state

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [drawerView, setDrawerView] = useState<DrawerView>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const isCorpus = selectedCollection?.kind === "corpus"

  const openCreate = () => {
    setCreatingOpen(true)
    setDrawerView("create")
  }

  const openDetail = (collectionId: string) => {
    setSelectedId(collectionId)
    setReorderMode(false)
    setDrawerView("detail")
  }

  const closeDrawer = () => {
    setDrawerView(null)
    setCreatingOpen(false)
    cancelEditing()
    setReorderMode(false)
  }

  const confirmRemove = (membershipId: string) => setRemoveTarget(membershipId)
  const handleConfirmRemove = () => {
    if (!removeTarget) return
    setRemoveTarget(null)
    handleRemoveItem(removeTarget)
  }

  const drawerTitle =
    drawerView === "create"
      ? kindFilter === "corpus"
        ? "Créer un corpus"
        : "Créer une liste"
      : drawerView === "edit"
        ? "Modifier"
        : (selectedCollection?.name ?? "")

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div role="tablist" aria-label="Type de collection" className="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-md bg-canvas p-1">
            {KIND_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={kindFilter === tab.id}
                onClick={() => handleSwitchKind(tab.id)}
                className={cn(
                  "min-h-11 rounded px-2 text-sm font-bold transition-colors",
                  kindFilter === tab.id ? "bg-surface text-heading shadow-sm" : "text-muted",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchOpen((value) => !value)}
            aria-label="Rechercher"
            aria-expanded={isSearchOpen}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded border outline-none transition-colors",
              search ? "border-primary bg-primary text-white font-bold" : "border-border bg-surface text-heading",
            )}
          >
            <IconSearch className="size-4" />
          </button>
        </div>
        {isSearchOpen ? (
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={kindFilter === "corpus" ? "Rechercher un corpus" : "Rechercher une liste"}
            fullWidth
            className="mt-2"
          />
        ) : null}
      </div>

      <div className="reports-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoadingCollections ? (
          <p className="py-12 text-center text-sm text-muted">Chargement…</p>
        ) : collections.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {kindFilter === "corpus" ? "Aucun corpus pour l'instant." : "Aucune liste pour l'instant."}
          </p>
        ) : (
          collections.map((collection) => (
            <KnowledgeCollectionCard key={collection.id} collection={collection} onOpen={() => openDetail(collection.id)} />
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <Button size="md" fullWidth className="min-h-12" onClick={openCreate}>
          {kindFilter === "corpus" ? "+ Créer un corpus" : "+ Créer une liste"}
        </Button>
      </div>

      <AppDrawer
        open={drawerView !== null}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
        }}
        side="bottom"
        title={drawerTitle}
        showMobileCloseButton
        contentClassName={drawerView === "detail" ? "pt-1 pb-4 px-4" : undefined}
        onRequestClose={() => {
          if (drawerView === "edit" && selectedCollection) {
            setDrawerView("detail")
            return false
          }
          return true
        }}
        footer={
          drawerView === "detail" && selectedCollection ? (
            <div className="flex w-full flex-col gap-2">
              <Button size="md" fullWidth className="min-h-12" onClick={() => openCollectionAsKnowledgeScope(selectedCollection)}>
                Utiliser comme contexte
              </Button>
              <div className="flex w-full gap-2">
                <Button size="sm" variant="secondary" className="min-h-11 min-w-0 flex-1" onClick={() => setReorderMode((v) => !v)}>
                  {reorderMode ? "Terminer" : "Réorganiser"}
                </Button>
                {isCorpus ? (
                  <Button size="sm" variant="secondary" className="min-h-11 min-w-0 flex-1" onClick={() => setAddListDialogOpen(true)}>
                    + Liste
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" className="min-h-11 min-w-0 flex-1" onClick={() => { startEditing(selectedCollection); setDrawerView("edit") }}>
                  Modifier
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {error ? <p className="mb-3 rounded bg-danger/10 p-2 text-xs font-semibold text-danger">{error}</p> : null}

        {drawerView === "create" ? (
          <div className="space-y-3">
            {kindFilter === "list" ? (
              <div className="flex items-center gap-1 rounded bg-canvas p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setNewItemType("intelligence_document")}
                  className={cn(
                    "flex-1 min-h-10 rounded font-semibold transition-colors",
                    newItemType === "intelligence_document" ? "bg-surface text-heading shadow-sm" : "text-muted",
                  )}
                >
                  Documents
                </button>
                <button
                  type="button"
                  onClick={() => setNewItemType("veille_article")}
                  className={cn(
                    "flex-1 min-h-10 rounded font-semibold transition-colors",
                    newItemType === "veille_article" ? "bg-surface text-heading shadow-sm" : "text-muted",
                  )}
                >
                  Articles
                </button>
              </div>
            ) : null}
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={kindFilter === "corpus" ? "Nom du corpus" : "Nom de la liste"}
              fullWidth
            />
            <div className="flex gap-2">
              <Button
                className="min-h-11 min-w-0 flex-1"
                onClick={() => {
                  handleCreate()
                  setDrawerView("detail")
                }}
                disabled={isPending || !newName.trim()}
                loading={isPending}
              >
                Créer
              </Button>
              <Button variant="ghost" className="min-h-11 min-w-0 flex-1" onClick={closeDrawer}>
                Annuler
              </Button>
            </div>
          </div>
        ) : drawerView === "edit" && editing && selectedCollection ? (
          <div className="space-y-3">
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nom" fullWidth />
            <Textarea
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description (optionnelle)"
              fullWidth
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                className="min-h-11 min-w-0 flex-1"
                onClick={() => {
                  saveEditing()
                  setDrawerView("detail")
                }}
                loading={isPending}
              >
                Enregistrer
              </Button>
              <Button variant="ghost" className="min-h-11 min-w-0 flex-1" onClick={() => setDrawerView("detail")}>
                Annuler
              </Button>
            </div>
            <Button variant="destructive" fullWidth className="min-h-12" onClick={() => setDeleteTarget(selectedCollection)}>
              {isCorpus ? "Supprimer le corpus" : "Supprimer la liste"}
            </Button>
          </div>
        ) : drawerView === "detail" && selectedCollection ? (
          <div className="space-y-1">
            {/* Description avec espacement réduit par rapport au titre du drawer */}
            {selectedCollection.description ? (
              <p className="text-xs text-muted">{selectedCollection.description}</p>
            ) : null}
            {reorderMode ? <p className="text-xs font-semibold text-primary">Mode réorganisation : utilisez les flèches pour déplacer un élément.</p> : null}

            {isLoadingItems ? (
              <p className="py-4 text-center text-sm text-muted">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {isCorpus ? "Ce corpus est vide." : "Cette liste est vide."}
              </p>
            ) : isCorpus ? (
              <div className="space-y-3 pt-2">
                {groupedItems.map((group) => (
                  <div key={group.contentType}>
                    <p className="py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {group.typeLabel} ({group.items.length})
                    </p>
                    <ul className="divide-y divide-border">
                      {group.items.map((item) => {
                        const index = items.findIndex((i) => i.membershipId === item.membershipId)
                        return (
                          <KnowledgeItemCard
                            key={item.membershipId}
                            item={item}
                            reorderMode={reorderMode}
                            canMoveUp={index > 0}
                            canMoveDown={index < items.length - 1}
                            onMoveUp={() => moveItem(index, -1)}
                            onMoveDown={() => moveItem(index, 1)}
                            onRemoveRequest={() => confirmRemove(item.membershipId)}
                          />
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border pt-2">
                {items.map((item, index) => (
                  <KnowledgeItemCard
                    key={item.membershipId}
                    item={item}
                    reorderMode={reorderMode}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                    onMoveUp={() => moveItem(index, -1)}
                    onMoveDown={() => moveItem(index, 1)}
                    onRemoveRequest={() => confirmRemove(item.membershipId)}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </AppDrawer>

      {/* Modale de confirmation — suppression collection */}
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
        onConfirm={async () => {
          await handleDelete()
          closeDrawer()
        }}
      />

      {/* Modale de confirmation — retrait d'un élément */}
      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null)
        }}
        title="Retirer cet élément ?"
        description="L'élément sera retiré de la liste. Il ne sera pas supprimé de KREDO."
        variant="danger"
        confirmLabel="Retirer"
        onConfirm={handleConfirmRemove}
      />

      {selectedCollection && isCorpus ? (
        <AddListToCorpusDialog
          open={addListDialogOpen}
          onOpenChange={setAddListDialogOpen}
          eligibleLists={eligibleListsForCorpus}
          onConfirm={handleAddListToCorpus}
        />
      ) : null}
    </div>
  )
}
