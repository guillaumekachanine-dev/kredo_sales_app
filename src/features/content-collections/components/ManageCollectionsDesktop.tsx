"use client"

import { useEffect, useState, useTransition } from "react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
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
import { KnowledgeLibraryPane } from "./KnowledgeLibraryPane"
import { KnowledgeListPane } from "./KnowledgeListPane"
import { KnowledgeDocumentViewer } from "./KnowledgeDocumentViewer"
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
  const [mode, setMode] = useState<"lists" | "corpus">("lists")
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [loadedCollectionsOpen, setLoadedCollectionsOpen] = useState(false)
  const [loadedItemsCollectionId, setLoadedItemsCollectionId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<ResolvedCollectionItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState("")
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingData, setEditingData] = useState<{ name: string; description: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CollectionSummary | null>(null)
  const [pickerMode, setPickerMode] = useState<"add" | "move" | null>(null)
  const [activeViewerItem, setActiveViewerItem] = useState<ResolvedCollectionItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isLoadingCollections = open && !loadedCollectionsOpen
  const isLoadingItems = Boolean(selectedId && mode === "lists" && loadedItemsCollectionId !== selectedId)

  // Reset state and fetch list collections when modal opens
  useEffect(() => {
    if (!open) return

    fetchCollectionsSummary().then((data) => {
      // Filter lists only for the Library mode
      const listCollections = data.filter((c) => c.kind === "list")
      setError(null)
      setMode("lists")
      setIsEditMode(false)
      setActiveViewerItem(null)
      setCollections(listCollections)
      setSelectedId((prev) => initialSelectedCollectionId ?? prev ?? listCollections[0]?.id ?? null)
      setLoadedCollectionsOpen(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fetch items when selected collection changes
  useEffect(() => {
    if (!selectedId || mode !== "lists") {
      return
    }

    fetchResolvedCollectionItems(selectedId).then((data) => {
      setItems(data)
      setSelectedItemIds(new Set())
      setIsEditMode(false)
      setLoadedItemsCollectionId(selectedId)
    })
  }, [selectedId, mode])

  const selectedCollection = collections.find((c) => c.id === selectedId) ?? null

  const refreshCollections = () =>
    fetchCollectionsSummary().then((data) => {
      setCollections(data.filter((c) => c.kind === "list"))
    })

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

  const handleSaveEditing = () => {
    if (!selectedCollection || !editingData) return
    setError(null)
    startTransition(async () => {
      if (editingData.name.trim() !== selectedCollection.name) {
        const result = await renameCollectionAction(selectedCollection.id, editingData.name)
        if (!result.success) {
          setError(result.error)
          return
        }
      }
      if (editingData.description.trim() !== (selectedCollection.description ?? "")) {
        const result = await updateCollectionDescriptionAction(selectedCollection.id, editingData.description)
        if (!result.success) {
          setError(result.error)
          return
        }
      }
      setEditingData(null)
      setIsEditMode(false)
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
    if (selectedId === deleteTarget.id) {
      setSelectedId(remaining[0]?.id ?? null)
      setActiveViewerItem(null)
    }
    setDeleteTarget(null)
    setIsEditMode(false)
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
      current.size === items.length ? new Set() : new Set(items.map((item) => item.membershipId))
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

  // Header Right Actions: Compact Mode Switcher [ Listes | Corpus ]
  const headerRightActions = (
    <div className="mr-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5" role="tablist" aria-label="Mode de vue">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "lists"}
        onClick={() => {
          setMode("lists")
          setActiveViewerItem(null)
        }}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
          mode === "lists"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-white/65 hover:text-white"
        )}
      >
        Listes
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "corpus"}
        onClick={() => {
          setMode("corpus")
          setActiveViewerItem(null)
        }}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
          mode === "corpus"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-white/65 hover:text-white"
        )}
      >
        Corpus
      </button>
    </div>
  )

  const isViewerOpen = activeViewerItem !== null

  return (
    <>
      <IntelligenceSplitModalShell
        open={open}
        onClose={() => onOpenChange(false)}
        title="Gérer la connaissance"
        headerRightActions={headerRightActions}
        leftPane={null}
        rightPane={null}
        content={
          mode === "corpus" ? (
            /* Mode Corpus : Squelette structurel minimal avec empty-state */
            <div className="flex flex-1 items-stretch overflow-hidden">
              <aside className="w-[260px] shrink-0 border-r border-white/5 bg-[#0f122c] p-4 text-xs text-white/50">
                <p className="font-bold text-white/70">Bibliothèque des corpus</p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                  Vos corpus documentaires personnalisés apparaîtront ici.
                </p>
              </aside>
              <main className="flex flex-1 items-center justify-center bg-slate-950/20 p-6 text-center text-xs text-white/50">
                <div className="max-w-md space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/5 text-brand-brass">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-white text-sm">Gestion des corpus</h4>
                  <p className="text-white/60 leading-relaxed">
                    La gestion des corpus sera disponible dans un prochain lot.
                  </p>
                </div>
              </main>
            </div>
          ) : (
            /* Mode Listes : Layout dynamique 2 ou 3 panneaux avec animation */
            <div className="flex flex-1 items-stretch overflow-hidden relative">
              {/* Panneau 1 : Bibliothèque (retractée en rail si viewer ouvert) */}
              <div
                className={cn(
                  "h-full shrink-0 transition-all duration-500 ease-out",
                  isViewerOpen ? "w-[56px]" : "w-[260px]"
                )}
              >
                <KnowledgeLibraryPane
                  collections={collections}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id)
                    setActiveViewerItem(null)
                  }}
                  isLoading={isLoadingCollections}
                  creatingOpen={creatingOpen}
                  setCreatingOpen={setCreatingOpen}
                  newName={newName}
                  setNewName={setNewName}
                  onCreate={handleCreate}
                  isPending={isPending}
                  isCollapsed={isViewerOpen}
                  onExpandLibrary={() => setActiveViewerItem(null)}
                />
              </div>

              {/* Panneau 2 : Liste des documents (compressée si viewer ouvert) */}
              <div
                className={cn(
                  "h-full flex flex-col transition-all duration-500 ease-out min-w-0",
                  isViewerOpen ? "w-[340px] shrink-0" : "flex-1"
                )}
              >
                <KnowledgeListPane
                  collection={selectedCollection}
                  items={items}
                  isLoadingItems={isLoadingItems}
                  isEditMode={isEditMode}
                  onToggleEditMode={() => {
                    setIsEditMode(!isEditMode)
                    if (!isEditMode && selectedCollection) {
                      setEditingData({
                        name: selectedCollection.name,
                        description: selectedCollection.description ?? "",
                      })
                    }
                  }}
                  editingData={editingData}
                  setEditingData={setEditingData}
                  onSaveEditing={handleSaveEditing}
                  onCancelEditing={() => {
                    setIsEditMode(false)
                    setEditingData(null)
                  }}
                  onDeleteCollection={() => setDeleteTarget(selectedCollection)}
                  selectedItemIds={selectedItemIds}
                  onToggleItemSelection={toggleItemSelection}
                  onToggleSelectAll={toggleSelectAll}
                  onOpenPicker={(pMode) => setPickerMode(pMode)}
                  onRemoveSelected={handleRemoveSelected}
                  onOpenViewer={(item) => setActiveViewerItem(item)}
                  activeViewerItemId={activeViewerItem?.membershipId}
                  isPending={isPending}
                  error={error}
                />
              </div>

              {/* Panneau 3 : Visionneuse de document (Viewer) */}
              {isViewerOpen ? (
                <div className="h-full flex-1 min-w-0 transition-all duration-500 ease-out">
                  <KnowledgeDocumentViewer
                    item={activeViewerItem}
                    onCloseViewer={() => setActiveViewerItem(null)}
                  />
                </div>
              ) : null}
            </div>
          )
        }
      />

      {/* Confirmation de suppression d'une liste */}
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

      {/* Picker d'ajout ou déplacement d'éléments */}
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
