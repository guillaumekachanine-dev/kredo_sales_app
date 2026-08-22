"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  fetchCollectionsSummary,
  fetchResolvedCollectionItems,
} from "../../data/content-collections-client-queries"
import {
  addItemToCollectionAction,
  createCollectionAction,
  createCorpusAction,
  deleteCollectionAction,
  removeItemsByIdAction,
  renameCollectionAction,
  reorderCollectionItemsAction,
  updateCollectionDescriptionAction,
} from "../../actions/content-collections-actions"
import {
  groupResolvedItemsByType,
  type AddableContentType,
  type CollectionKind,
  type CollectionSummary,
  type ResolvedCollectionItem,
  type ResolvedItemGroup,
} from "../../domain/content-collections-contracts"

export type KnowledgeSpaceEditingState = { name: string; description: string }

/**
 * État et logique partagés entre `KnowledgeSpaceDesktop` et
 * `KnowledgeSpaceMobile` — les deux composants restent des arbres de rendu
 * distincts (adaptive plein, ADR-0006), seule la logique métier est
 * mutualisée pour éviter de dupliquer les appels Supabase/Server Actions.
 *
 * La sélection courante est dérivée pendant le rendu (pas via un effet de
 * synchronisation) : quand le switch Listes/Corpus change, `selectedId` ne
 * matche plus rien dans `filteredCollections` et retombe naturellement sur
 * le premier élément du sous-ensemble affiché.
 */
export function useKnowledgeSpaceState() {
  const [kindFilter, setKindFilter] = useState<CollectionKind>("list")
  const [search, setSearch] = useState("")
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<ResolvedCollectionItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newItemType, setNewItemType] = useState<AddableContentType>("intelligence_document")
  const [editing, setEditing] = useState<KnowledgeSpaceEditingState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CollectionSummary | null>(null)
  const [addListDialogOpen, setAddListDialogOpen] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetchCollectionsSummary().then((data) => {
      setCollections(data)
      setIsLoadingCollections(false)
    })
  }, [])

  const filteredCollections = useMemo(() => {
    const query = search.trim().toLowerCase()
    return collections
      .filter((collection) => collection.kind === kindFilter)
      .filter(
        (collection) =>
          !query ||
          collection.name.toLowerCase().includes(query) ||
          (collection.description ?? "").toLowerCase().includes(query),
      )
  }, [collections, kindFilter, search])

  const selectedCollection = useMemo(() => {
    const bySelectedId = selectedId ? filteredCollections.find((c) => c.id === selectedId) : undefined
    return bySelectedId ?? filteredCollections[0] ?? null
  }, [selectedId, filteredCollections])

  useEffect(() => {
    if (!selectedCollection) return
    setIsLoadingItems(true)
    fetchResolvedCollectionItems(selectedCollection.id).then((data) => {
      setItems(data)
      setIsLoadingItems(false)
    })
  }, [selectedCollection])

  // `items` ne se remet à [] que via ce dérivé de rendu (pas d'effet dédié) :
  // tant qu'aucune collection n'est sélectionnée, il n'y a rien à afficher,
  // même si un fetch précédent laisse un état résiduel.
  const displayedItems = selectedCollection ? items : []

  const refreshCollections = () => fetchCollectionsSummary().then(setCollections)
  const refreshItems = () => {
    if (selectedCollection) fetchResolvedCollectionItems(selectedCollection.id).then(setItems)
  }

  // `selectedCollection` non-null est garanti par la condition kind==="corpus" —
  // pas besoin de dépendre de `displayedItems` ici (évite un useMemo instable).
  const groupedItems: ResolvedItemGroup[] = useMemo(
    () => (selectedCollection?.kind === "corpus" ? groupResolvedItemsByType(items) : []),
    [items, selectedCollection],
  )

  const handleSwitchKind = (kind: CollectionKind) => {
    setKindFilter(kind)
    setError(null)
    setEditing(null)
    setReorderMode(false)
  }

  const handleCreate = () => {
    setError(null)
    const name = newName
    const itemType = newItemType
    startTransition(async () => {
      const result =
        kindFilter === "corpus"
          ? await createCorpusAction(name)
          : await createCollectionAction(name, undefined, itemType)
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

  const cancelEditing = () => setEditing(null)

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
    setDeleteTarget(null)
    if (selectedId === deleteTarget.id) setSelectedId(null)
    await refreshCollections()
  }

  const handleRemoveItem = (membershipId: string) => {
    startTransition(async () => {
      const result = await removeItemsByIdAction([membershipId])
      if (!result.success) {
        setError(result.error)
        return
      }
      await refreshItems()
      await refreshCollections()
    })
  }

  const handleAddListToCorpus = async (listId: string) => {
    if (!selectedCollection) return
    const result = await addItemToCollectionAction(selectedCollection.id, "knowledge_list", listId)
    if (!result.success) throw new Error(result.error)
    await refreshItems()
    await refreshCollections()
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!selectedCollection) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    const reordered = [...items]
    const tmp = reordered[index]
    reordered[index] = reordered[nextIndex]
    reordered[nextIndex] = tmp
    setItems(reordered)
    const orderedIds = reordered.map((item) => item.membershipId)
    const collectionId = selectedCollection.id
    startTransition(async () => {
      const result = await reorderCollectionItemsAction(collectionId, orderedIds)
      if (!result.success) {
        setError(result.error)
        await refreshItems()
      }
    })
  }

  const eligibleListsForCorpus = useMemo(() => {
    if (!selectedCollection || selectedCollection.kind !== "corpus") return []
    const alreadyIncluded = new Set(
      items.filter((item) => item.contentType === "knowledge_list").map((item) => item.contentId),
    )
    return collections.filter(
      (collection) =>
        collection.kind === "list" && collection.id !== selectedCollection.id && !alreadyIncluded.has(collection.id),
    )
  }, [collections, items, selectedCollection])

  return {
    kindFilter,
    handleSwitchKind,
    search,
    setSearch,
    collections: filteredCollections,
    isLoadingCollections,
    selectedCollection,
    setSelectedId,
    items: displayedItems,
    isLoadingItems,
    groupedItems,
    creatingOpen,
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
    setError,
    isPending,
  }
}

export type KnowledgeSpaceState = ReturnType<typeof useKnowledgeSpaceState>
