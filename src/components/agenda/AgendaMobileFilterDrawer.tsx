"use client"

import React, { useEffect, useEffectEvent, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"

export interface ActiveFilters {
  showDeadlines: boolean
  showAbsences: boolean
  showActivity: boolean
  showInternal: boolean
}

interface AgendaMobileFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeFilters: ActiveFilters
  onApply: (filters: ActiveFilters) => void
}

export function AgendaMobileFilterDrawer({
  open,
  onOpenChange,
  activeFilters,
  onApply,
}: AgendaMobileFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<ActiveFilters>({
    showDeadlines: true,
    showAbsences: true,
    showActivity: true,
    showInternal: true,
  })

  // Sync state when drawer opens
  const syncLocalFilters = useEffectEvent(() => {
    setLocalFilters(activeFilters)
  })

  useEffect(() => {
    if (open) queueMicrotask(syncLocalFilters)
  }, [open, activeFilters])

  const setField = (key: keyof ActiveFilters, val: boolean) => {
    setLocalFilters((prev) => ({ ...prev, [key]: val }))
  }

  const allChecked = localFilters.showDeadlines && localFilters.showAbsences && localFilters.showActivity && localFilters.showInternal

  const handleToggleAll = () => {
    const targetValue = !allChecked
    setLocalFilters({
      showDeadlines: targetValue,
      showAbsences: targetValue,
      showActivity: targetValue,
      showInternal: targetValue,
    })
  }

  const handleSave = () => {
    onApply(localFilters)
    onOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Choix d'affichage"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggleAll}
            className="px-3 py-2 text-xs font-semibold text-muted hover:text-heading transition-colors cursor-pointer"
          >
            {allChecked ? "Tout décocher" : "Tout cocher"}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold rounded-md bg-primary text-primary-fg hover:bg-primary/95 transition-all cursor-pointer shadow-sm"
          >
            Appliquer
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer py-3 px-4 bg-canvas/30 hover:bg-canvas/50 border border-border/50 rounded-xl transition-colors select-none">
          <input
            type="checkbox"
            checked={localFilters.showDeadlines}
            onChange={(e) => setField("showDeadlines", e.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-heading">Échéances</span>
            <span className="text-[10px] text-muted font-medium">Tâches et dates limites</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer py-3 px-4 bg-canvas/30 hover:bg-canvas/50 border border-border/50 rounded-xl transition-colors select-none">
          <input
            type="checkbox"
            checked={localFilters.showAbsences}
            onChange={(e) => setField("showAbsences", e.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-heading">Absences</span>
            <span className="text-[10px] text-muted font-medium">Absences collaborateurs et congés</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer py-3 px-4 bg-canvas/30 hover:bg-canvas/50 border border-border/50 rounded-xl transition-colors select-none">
          <input
            type="checkbox"
            checked={localFilters.showActivity}
            onChange={(e) => setField("showActivity", e.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-heading">Activité</span>
            <span className="text-[10px] text-muted font-medium">Prospection, suivi client, recrutement, management</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer py-3 px-4 bg-canvas/30 hover:bg-canvas/50 border border-border/50 rounded-xl transition-colors select-none">
          <input
            type="checkbox"
            checked={localFilters.showInternal}
            onChange={(e) => setField("showInternal", e.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-heading">Interne</span>
            <span className="text-[10px] text-muted font-medium">Créneaux et réunions internes</span>
          </div>
        </label>
      </div>
    </AppDialog>
  )
}
