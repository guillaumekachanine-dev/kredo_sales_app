"use client"

// Résolution des articles d'un digest pour la famille « Digest & articles » du
// picker : réutilise en priorité les articles déjà chargés dans la page
// (`allArticles` côté Desktop, `articles`/`feedArticles` côté Mobile) et ne
// déclenche une lecture réseau que si ce digest n'y figure pas (cadrage §12).
//
// `loading` est DÉRIVÉ (absence de `digestId` dans `lazyCache`), jamais posé
// par un `setState` synchrone au corps de l'effet (`react-hooks/set-state-in-effect`).

import { useEffect, useMemo, useState } from "react"
import type { VeilleArticle } from "@/app/(app)/veille/_data/veille-data"
import { fetchVeilleArticlesForDigestPicker, type PickerDigestArticle } from "../data/watch-analysis-client-queries"

export function useDigestArticles(digestId: string | null, knownArticles: VeilleArticle[]) {
  const [lazyCache, setLazyCache] = useState<Record<string, PickerDigestArticle[] | undefined>>({})

  const known = useMemo(
    () => (digestId ? knownArticles.filter((article) => article.digest_id === digestId) : []),
    [digestId, knownArticles],
  )

  useEffect(() => {
    if (!digestId || known.length > 0 || lazyCache[digestId] !== undefined) return
    let cancelled = false
    fetchVeilleArticlesForDigestPicker(digestId).then((rows) => {
      if (cancelled) return
      setLazyCache((current) => ({ ...current, [digestId]: rows }))
    })
    return () => {
      cancelled = true
    }
  }, [digestId, known.length, lazyCache])

  const loading = Boolean(digestId) && known.length === 0 && (digestId ? lazyCache[digestId] === undefined : false)
  const articles: PickerDigestArticle[] = digestId
    ? known.length > 0
      ? known
      : (lazyCache[digestId] ?? [])
    : []

  return { articles, loading }
}
