"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type ModuleSnapshotState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

export type ModuleSnapshotController<T> = ModuleSnapshotState<T> & {
  state: ModuleSnapshotState<T>
  refresh: (options?: { silent?: boolean }) => Promise<void>
  updateData: (updater: (current: T) => T) => void
}

/**
 * Charge et contrôle la donnée d'un module autoportant.
 *
 * Ce hook gère le cycle de chargement initial, le rafraîchissement silencieux
 * sans démontage/remontage du composant, et la réconciliation synchrone immédiate
 * (updateData) après mutation réussie.
 *
 * Rétrocompatible : peut être déstructuré en `{ state, refresh, updateData }`
 * ou consommé directement comme un `ModuleSnapshotState<T>`.
 */
export function useModuleSnapshot<T>(load: () => Promise<T>): ModuleSnapshotController<T> {
  const [state, setState] = useState<ModuleSnapshotState<T>>({ status: "loading" })
  const loadRef = useRef(load)
  const requestIdRef = useRef(0)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    let active = true
    const currentRequestId = ++requestIdRef.current

    loadRef.current()
      .then((data) => {
        if (!active || currentRequestId !== requestIdRef.current) return
        setState({ status: "ready", data })
      })
      .catch((reason: unknown) => {
        if (!active || currentRequestId !== requestIdRef.current) return
        setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Chargement impossible.",
        })
      })

    return () => {
      active = false
    }
  }, [])

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const currentRequestId = ++requestIdRef.current
      const isExplicitNonSilent = options?.silent === false

      if (isExplicitNonSilent) {
        setState({ status: "loading" })
      }

      try {
        const data = await loadRef.current()
        if (currentRequestId !== requestIdRef.current) return
        setState({ status: "ready", data })
      } catch (reason: unknown) {
        if (currentRequestId !== requestIdRef.current) return
        setState((current) => {
          if (!isExplicitNonSilent && current.status === "ready") {
            return current
          }
          return {
            status: "error",
            message: reason instanceof Error ? reason.message : "Chargement impossible.",
          }
        })
      }
    },
    [],
  )

  const updateData = useCallback((updater: (current: T) => T) => {
    // Invalide toute requête serveur antérieure qui arriverait après ce patch local
    requestIdRef.current += 1
    setState((prev) => {
      if (prev.status !== "ready") return prev
      return { status: "ready", data: updater(prev.data) }
    })
  }, [])

  return useMemo(() => {
    return {
      ...state,
      state,
      refresh,
      updateData,
    } as ModuleSnapshotController<T>
  }, [state, refresh, updateData])
}
