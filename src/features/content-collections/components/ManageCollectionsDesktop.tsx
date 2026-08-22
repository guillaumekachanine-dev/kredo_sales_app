"use client"

import { useEffect, useState, useTransition } from "react"
import { DOCUMENT_OBJECT_LABELS, getDocumentTypeLabel } from "@/components/reports/document-display"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { cn } from "@/lib/utils"
import {
  fetchAllIntelligenceDocuments,
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
import { KnowledgeLibraryPane, type KnowledgeLibraryMode, type KnowledgeView } from "./KnowledgeLibraryPane"
import { KnowledgeListPane } from "./KnowledgeListPane"
import { KnowledgeDocumentViewer } from "./KnowledgeDocumentViewer"
import { KnowledgeSynthesisView } from "./KnowledgeSynthesisView"
import type {
  CollectionSummary,
  IntelligenceDocumentSummary,
  ResolvedCollectionItem,
} from "../domain/content-collections-contracts"

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
  const [mode, setMode] = useState<KnowledgeLibraryMode>("lists")
  const [view, setView] = useState<KnowledgeView>({ type: "synthesis" })
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [documents, setDocuments] = useState<IntelligenceDocumentSummary[]>([])
  const [loadedCollectionsOpen, setLoadedCollectionsOpen] = useState(false)
  const [loadedDocuments, setLoadedDocuments] = useState(false)
  const [loadedItemsCollectionId, setLoadedItemsCollectionId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
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

  const activeCollectionId =
    view.type === "list" || view.type === "corpus" ? view.id : selectedId

  const isLoadingCollections = open && !loadedCollectionsOpen
  const isLoadingItems = Boolean(
    activeCollectionId &&
      (view.type === "list" || view.type === "corpus") &&
      loadedItemsCollectionId !== activeCollectionId
  )

  // Reset state and fetch collections + documents when modal opens
  useEffect(() => {
    if (!open) return

    let active = true

    Promise.all([
      fetchCollectionsSummary(),
      fetchAllIntelligenceDocuments(),
    ]).then(([colsData, docsData]) => {
      if (!active) return
      setError(null)
      setIsEditMode(false)
      setActiveViewerItem(null)
      setCollections(colsData)
      setDocuments(docsData)
      setLoadedCollectionsOpen(true)
      setLoadedDocuments(true)

      if (mode === "lists") {
        const listCollections = colsData.filter((c) => c.kind === "list")
        const defaultId = initialSelectedCollectionId ?? listCollections[0]?.id ?? null
        if (defaultId) setSelectedId(defaultId)
      } else if (mode === "corpus") {
        const corpusCollections = colsData.filter((c) => c.kind === "corpus")
        const defaultId = corpusCollections[0]?.id ?? null
        if (defaultId) setSelectedId(defaultId)
      }
    })

    return () => {
      active = false
      setLoadedCollectionsOpen(false)
      setLoadedDocuments(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Lazy load intelligence documents when entering documents mode if not loaded
  useEffect(() => {
    if (!open || mode !== "documents" || loadedDocuments) return

    fetchAllIntelligenceDocuments().then((data) => {
      setDocuments(data)
      setLoadedDocuments(true)
      if (!selectedDocId && data[0]?.id) {
        setSelectedDocId(data[0].id)
      }
    })
  }, [open, mode, loadedDocuments, selectedDocId])

  // Fetch items when selected collection changes
  useEffect(() => {
    if (!activeCollectionId || (view.type !== "list" && view.type !== "corpus")) {
      return
    }

    fetchResolvedCollectionItems(activeCollectionId).then((data) => {
      setItems(data)
      setSelectedItemIds(new Set())
      setIsEditMode(false)
      setLoadedItemsCollectionId(activeCollectionId)
    })
  }, [activeCollectionId, view.type])

  const selectedCollection = collections.find((c) => c.id === activeCollectionId) ?? null

  const selectedDoc =
    documents.find((d) => d.id === (view.type === "document" ? view.id : selectedDocId)) ??
    documents[0] ??
    null

  const selectedDocItem: ResolvedCollectionItem | null = selectedDoc
    ? {
        membershipId: selectedDoc.id,
        contentType: "intelligence_document",
        contentId: selectedDoc.id,
        addedAt: selectedDoc.createdAt,
        position: null,
        title: selectedDoc.title,
        typeLabel: "Document",
        date: selectedDoc.updatedAt || selectedDoc.createdAt,
        preview: null,
        categoryLabel: selectedDoc.documentType
          ? (DOCUMENT_OBJECT_LABELS[selectedDoc.documentType as keyof typeof DOCUMENT_OBJECT_LABELS] ??
              getDocumentTypeLabel(selectedDoc.documentType as keyof typeof DOCUMENT_OBJECT_LABELS))
          : null,
        documentType: selectedDoc.documentType,
        url: `/reports?doc=${selectedDoc.id}`,
      }
    : null

  const refreshCollections = async () => {
    const data = await fetchCollectionsSummary()
    setCollections(data)
    return data
  }

  const refreshItems = () => {
    if (activeCollectionId) fetchResolvedCollectionItems(activeCollectionId).then(setItems)
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
      setView({ type: "list", id: result.id })
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
      const nextId = remaining[0]?.id ?? null
      setSelectedId(nextId)
      if (nextId) setView({ type: "list", id: nextId })
      else setView({ type: "synthesis" })
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

  // Header Right Actions: Compact Mode Switcher [ Listes | Corpus | Documents ]
  const headerRightActions = (
    <div className="mr-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5" role="tablist" aria-label="Mode de vue">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "lists"}
        onClick={async () => {
          setMode("lists")
          const freshCollections = await refreshCollections()
          if (view.type !== "synthesis") {
            const listCols = freshCollections.filter((c) => c.kind === "list")
            const firstId = selectedId ?? listCols[0]?.id ?? null
            if (firstId) {
              setSelectedId(firstId)
              setView({ type: "list", id: firstId })
            }
          }
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
        onClick={async () => {
          setMode("corpus")
          const freshCollections = await refreshCollections()
          if (view.type !== "synthesis") {
            const corpusCols = freshCollections.filter((c) => c.kind === "corpus")
            const firstId = corpusCols[0]?.id ?? null
            if (firstId) {
              setSelectedId(firstId)
              setView({ type: "corpus", id: firstId })
            } else {
              setView({ type: "corpus", id: "" })
            }
          }
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
      <button
        type="button"
        role="tab"
        aria-selected={mode === "documents"}
        onClick={async () => {
          setMode("documents")
          const docs = await fetchAllIntelligenceDocuments()
          setDocuments(docs)
          setLoadedDocuments(true)
          if (view.type !== "synthesis") {
            const firstDocId = selectedDocId ?? docs[0]?.id ?? null
            if (firstDocId) {
              setSelectedDocId(firstDocId)
              setView({ type: "document", id: firstDocId })
            }
          }
        }}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
          mode === "documents"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-white/65 hover:text-white"
        )}
      >
        Documents
      </button>
    </div>
  )

  const isViewerOpen = activeViewerItem !== null && view.type === "list"

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
          <div className="flex flex-1 items-stretch overflow-hidden relative">
            {/* Panneau 1 : Navigation gauche (Bibliothèque) */}
            <div
              className={cn(
                "h-full shrink-0 transition-all duration-500 ease-out",
                isViewerOpen ? "w-[56px]" : "w-[260px]"
              )}
            >
              <KnowledgeLibraryPane
                mode={mode}
                collections={collections}
                documents={documents}
                activeView={view}
                onSelectView={(v) => {
                  setView(v)
                  if (v.type === "list" || v.type === "corpus") setSelectedId(v.id)
                  if (v.type === "document") setSelectedDocId(v.id)
                  setActiveViewerItem(null)
                }}
                isLoading={isLoadingCollections}
                isLoadingDocuments={!loadedDocuments}
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

            {/* Panneau 2 & 3 : Zone de contenu principal */}
            {view.type === "synthesis" ? (
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950/20">
                <KnowledgeSynthesisView />
              </main>
            ) : view.type === "document" ? (
              /* Mode Document : Visionneuse directe */
              <main className="h-full flex-1 min-w-0 flex flex-col overflow-hidden">
                {selectedDocItem ? (
                  <KnowledgeDocumentViewer
                    item={selectedDocItem}
                    onCloseViewer={() => setView({ type: "synthesis" })}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-white/50">
                    Sélectionnez un document dans la colonne de gauche.
                  </div>
                )}
              </main>
            ) : (
              /* Mode Liste ou Corpus : Layout dynamique 1 ou 2 panneaux (Liste/Corpus + Viewer) */
              <>
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

                {isViewerOpen ? (
                  <div className="h-full flex-1 min-w-0 transition-all duration-500 ease-out">
                    <KnowledgeDocumentViewer
                      item={activeViewerItem}
                      onCloseViewer={() => setActiveViewerItem(null)}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
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

