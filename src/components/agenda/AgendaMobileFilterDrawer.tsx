"use client"

import React, { useEffect, useEffectEvent, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Select } from "@/components/ui/Select"
import { AGENDA_EVENT_TYPE_OPTIONS } from "@/lib/agenda/agenda-config"

interface ActiveFilters {
  type: string
  companyId: string
  task: string
}

interface AgendaMobileFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeFilters: ActiveFilters
  uniqueCompanies: { id: string; name: string }[]
  onApply: (filters: ActiveFilters) => void
}

export function AgendaMobileFilterDrawer({
  open,
  onOpenChange,
  activeFilters,
  uniqueCompanies,
  onApply,
}: AgendaMobileFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<ActiveFilters>({
    type: "all",
    companyId: "all",
    task: "all",
  })

  // Sync state when drawer opens
  const syncLocalFilters = useEffectEvent(() => {
    setLocalFilters(activeFilters)
  })

  useEffect(() => {
    if (open) queueMicrotask(syncLocalFilters)
  }, [open, activeFilters])

  const setField = (key: keyof ActiveFilters, val: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: val }))
  }

  const handleReset = () => {
    setLocalFilters({
      type: "all",
      companyId: "all",
      task: "all",
    })
  }

  const handleSave = () => {
    onApply(localFilters)
    onOpenChange(false)
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title="Filtrer les événements"
      subtitle="Affinez les actions affichées"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 text-xs font-semibold text-muted hover:text-heading transition-colors cursor-pointer"
          >
            Réinitialiser
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold rounded-md bg-primary text-primary-fg hover:bg-primary/95 transition-all cursor-pointer shadow-sm"
          >
            Afficher les événements
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Filter 1: Nature */}
        <div>
          <label className="block text-xs font-bold text-heading mb-1.5">
            Nature de l&apos;événement
          </label>
          <Select
            value={localFilters.type}
            onChange={(e) => setField("type", e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 cursor-pointer"
          >
            <option value="all">Toutes les natures</option>
            {AGENDA_EVENT_TYPE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Filter 2: Company */}
        <div>
          <label className="block text-xs font-bold text-heading mb-1.5">
            Compte client
          </label>
          <Select
            value={localFilters.companyId}
            onChange={(e) => setField("companyId", e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 cursor-pointer"
          >
            <option value="all">Tous les comptes</option>
            {uniqueCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Filter 3: Preparatory Task */}
        <div>
          <label className="block text-xs font-bold text-heading mb-1.5">
            Tâche préparatoire
          </label>
          <Select
            value={localFilters.task}
            onChange={(e) => setField("task", e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 cursor-pointer"
          >
            <option value="all">Tous les états</option>
            <option value="has_task">Avec tâche à faire</option>
            <option value="no_task">Sans tâche ou terminée</option>
          </Select>
        </div>
      </div>
    </AppDrawer>
  )
}
