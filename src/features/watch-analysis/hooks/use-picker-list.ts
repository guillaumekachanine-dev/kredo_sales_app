"use client"

// Petit chargeur de liste partagé par les familles « Signaux comptes »,
// « Rapports & documents » et « Listes & Corpus » du picker : charge une fois
// à l'ouverture de la famille, expose une recherche texte simple côté client.
// Ce n'est PAS un framework de corpus générique — juste le chargement +
// filtre déjà dupliqués trois fois dans les patterns existants
// (`useAddToListState`, `CollectionPickerDialog`) mutualisés une fois de plus.
//
// `loading` est DÉRIVÉ (items === null), jamais posé par un `setState`
// synchrone au corps de l'effet — `react-hooks/set-state-in-effect` l'interdit ;
// seuls les callbacks async (`.then`/`.catch`) écrivent de l'état.

import { useEffect, useMemo, useState } from "react"

export function usePickerList<T>(
  active: boolean,
  fetcher: () => Promise<T[]>,
  matches: (item: T, query: string) => boolean,
) {
  const [items, setItems] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!active || items !== null) return
    let cancelled = false
    fetcher()
      .then((rows) => {
        if (cancelled) return
        setItems(rows)
      })
      .catch(() => {
        if (cancelled) return
        setError("Chargement impossible.")
        setItems([])
      })
    return () => {
      cancelled = true
    }
    // La famille se charge une seule fois par ouverture (items !== null) : le
    // fetcher/matcher du site d'appel n'a pas besoin d'être stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, items])

  const loading = active && items === null && error === null

  const filteredItems = useMemo(() => {
    const resolved = items ?? []
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return resolved
    return resolved.filter((item) => matches(item, trimmed))
  }, [items, query, matches])

  return { items: items ?? [], filteredItems, loading, error, query, setQuery }
}
