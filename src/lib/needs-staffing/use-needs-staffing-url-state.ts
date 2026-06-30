"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  buildNeedsStaffingUrl,
  parseNeedsStaffingUrlState,
  type NeedsStaffingDirection,
  type NeedsStaffingScope,
  type NeedsStaffingSortField,
  type NeedsStaffingUrlState,
  type NeedsStaffingView,
} from "./url-state"

function updateHistory(
  pathname: string,
  state: NeedsStaffingUrlState,
) {
  window.history.replaceState(null, "", buildNeedsStaffingUrl(pathname, state))
}

export function useNeedsStaffingUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const state = parseNeedsStaffingUrlState(new URLSearchParams(searchParams.toString()))

  const replaceFilters = useCallback((nextState: NeedsStaffingUrlState) => {
    updateHistory(pathname, nextState)
  }, [pathname])

  const setScope = useCallback((scope: NeedsStaffingScope) => {
    router.push(buildNeedsStaffingUrl(pathname, {
      ...state,
      scope,
      stage: null,
    }))
  }, [pathname, router, state])

  const setView = useCallback((view: NeedsStaffingView) => {
    router.push(buildNeedsStaffingUrl(pathname, {
      ...state,
      view,
    }))
  }, [pathname, router, state])

  const setStage = useCallback((stage: string | null) => {
    replaceFilters({
      ...state,
      stage,
    })
  }, [replaceFilters, state])

  const setPriority = useCallback((priority: string | null) => {
    replaceFilters({
      ...state,
      priority,
    })
  }, [replaceFilters, state])

  const setPractice = useCallback((practice: string | null) => {
    replaceFilters({
      ...state,
      practice,
    })
  }, [replaceFilters, state])

  const setSort = useCallback((sort: NeedsStaffingSortField, direction: NeedsStaffingDirection) => {
    replaceFilters({
      ...state,
      sort,
      direction,
    })
  }, [replaceFilters, state])

  const resetFilters = useCallback(() => {
    replaceFilters({
      ...state,
      stage: null,
      priority: null,
      practice: null,
      sort: null,
      direction: null,
    })
  }, [replaceFilters, state])

  return {
    state,
    setScope,
    setView,
    setStage,
    setPriority,
    setPractice,
    setSort,
    resetFilters,
  }
}
