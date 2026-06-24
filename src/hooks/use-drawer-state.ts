"use client"

import { useState, useCallback } from "react"

export function useDrawerState<T = string>() {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<T | null>(null)

  const openDrawer = useCallback((id: T) => {
    setSelectedId(id)
    setOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setOpen(false)
  }, [])

  return { open, selectedId, openDrawer, closeDrawer, setOpen } as const
}
