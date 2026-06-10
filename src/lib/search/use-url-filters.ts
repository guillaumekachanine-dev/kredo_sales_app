"use client"

import { useCallback } from "react"
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation"

function buildUrl(pathname: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/**
 * URL-as-source-of-truth filter state, domain-agnostic.
 *
 * Reads reactively via `useSearchParams`. Writes via `window.history.replaceState`
 * so the URL updates WITHOUT triggering an App Router navigation — no Server
 * Component re-render, no RSC payload refetch. Filtering stays 100% client-side.
 *
 * `router.replace`/`push` are deliberately NOT used here: on a dynamic route they
 * would regenerate the server payload on every keystroke.
 */
export function useUrlFilters(): {
  searchParams: ReadonlyURLSearchParams
  setParam: (key: string, value: string | null) => void
  toggleListValue: (key: string, value: string) => void
  clearAll: (preserve?: string[]) => void
} {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read the live URL synchronously (avoids stale React snapshots when multiple
  // mutations happen in the same tick), mutate, then push it back via history.
  const commit = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(window.location.search)
      mutate(params)
      for (const [key, value] of [...params.entries()]) {
        if (value.trim().length === 0) params.delete(key)
      }
      window.history.replaceState(null, "", buildUrl(pathname, params))
    },
    [pathname]
  )

  const setParam = useCallback(
    (key: string, value: string | null) => {
      commit((params) => {
        if (value === null || value.length === 0) params.delete(key)
        else params.set(key, value)
      })
    },
    [commit]
  )

  const toggleListValue = useCallback(
    (key: string, value: string) => {
      commit((params) => {
        const current = (params.get(key) ?? "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value]
        if (next.length === 0) params.delete(key)
        else params.set(key, next.join(","))
      })
    },
    [commit]
  )

  const clearAll = useCallback(
    (preserve: string[] = []) => {
      commit((params) => {
        for (const key of [...params.keys()]) {
          if (!preserve.includes(key)) params.delete(key)
        }
      })
    },
    [commit]
  )

  return { searchParams, setParam, toggleListValue, clearAll }
}
