"use client"

import { useEffect, useState, useTransition } from "react"
import {
  fetchCollectionsSummary,
  fetchMembershipForContent,
} from "../data/content-collections-client-queries"
import {
  addItemToCollectionAction,
  createCollectionAction,
  removeItemFromCollectionAction,
} from "../actions/content-collections-actions"
import { getContentTypeRegistryEntry } from "../domain/content-type-registry"
import type { AddableContentType, CollectionSummary } from "../domain/content-collections-contracts"

const FEEDBACK_DURATION_MS = 2500

/**
 * État et logique partagés entre `AddToListDialogDesktop` et `AddToListSheetMobile`
 * — l'action transversale « Ajouter à… » (Lot 3). Les deux composants restent
 * des arbres de rendu distincts (ADR-0006) : seule la logique — fetch, toggle
 * optimiste, création inline — est mutualisée ici.
 *
 * Filtre affiché : Listes dont `item_type === contentType` (une Liste est
 * homogène) + tous les Corpus (hétérogènes par nature). Appliqué côté client
 * pour l'UX ; `addItemToCollectionAction` réapplique la même règle côté
 * serveur (défense en profondeur).
 */
export function useAddToListState(open: boolean, contentType: AddableContentType, contentId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setFeedback(null)
    setCreatingOpen(false)
    setNewName("")
    setIsLoading(true)

    Promise.all([fetchCollectionsSummary(), fetchMembershipForContent(contentType, contentId)]).then(
      ([collectionsData, memberSet]) => {
        if (cancelled) return
        setCollections(
          collectionsData.filter(
            (collection) => collection.kind === "corpus" || collection.itemType === contentType,
          ),
        )
        setMemberIds(memberSet)
        setIsLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [open, contentType, contentId])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const toggle = (collection: CollectionSummary, nextChecked: boolean) => {
    setError(null)
    setPendingIds((current) => new Set(current).add(collection.id))
    setMemberIds((current) => {
      const next = new Set(current)
      if (nextChecked) next.add(collection.id)
      else next.delete(collection.id)
      return next
    })

    startTransition(async () => {
      const result = nextChecked
        ? await addItemToCollectionAction(collection.id, contentType, contentId)
        : await removeItemFromCollectionAction(collection.id, contentType, contentId)

      setPendingIds((current) => {
        const next = new Set(current)
        next.delete(collection.id)
        return next
      })

      if (!result.success) {
        setError(result.error)
        // Rollback de l'état optimiste.
        setMemberIds((current) => {
          const next = new Set(current)
          if (nextChecked) next.delete(collection.id)
          else next.add(collection.id)
          return next
        })
        return
      }

      setCollections((current) =>
        current.map((c) =>
          c.id === collection.id
            ? { ...c, itemCount: Math.max(0, c.itemCount + (nextChecked ? 1 : -1)) }
            : c,
        ),
      )
      setFeedback(nextChecked ? `Ajouté à « ${collection.name} ».` : `Retiré de « ${collection.name} ».`)
    })
  }

  const handleCreate = () => {
    setError(null)
    const name = newName
    startTransition(async () => {
      const createRes = await createCollectionAction(name, undefined, contentType)
      if (!createRes.success) {
        setError(createRes.error)
        return
      }

      const addRes = await addItemToCollectionAction(createRes.id, contentType, contentId)
      if (!addRes.success) {
        setError(addRes.error)
        return
      }

      const created: CollectionSummary = {
        id: createRes.id,
        kind: "list",
        itemType: contentType,
        name: name.trim(),
        description: null,
        itemCount: 1,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setCollections((current) => [created, ...current])
      setMemberIds((current) => new Set(current).add(created.id))
      setFeedback(`Ajouté à « ${created.name} ».`)
      setNewName("")
      setCreatingOpen(false)
    })
  }

  return {
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
    pluralLabel: getContentTypeRegistryEntry(contentType).pluralLabel,
  }
}
