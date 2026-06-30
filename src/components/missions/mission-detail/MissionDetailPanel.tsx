"use client"

import { useEffect, useState, useCallback } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { getMissionDetail } from "@/app/(app)/missions/_data/get-mission-detail"
import { MissionDetailDesktop } from "./MissionDetailDesktop"
import { MissionDetailMobile } from "./MissionDetailMobile"
import type { SectionTab } from "@/lib/tabs/tab-types"
import type { MissionDetailViewModel } from "./mission-detail-types"

interface MissionDetailPanelProps {
  tab: SectionTab
  isMobile?: boolean
}

export function MissionDetailPanel({ tab, isMobile = false }: MissionDetailPanelProps) {
  const [vm, setVm] = useState<MissionDetailViewModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Reset when entityId changes
  const [prevId, setPrevId] = useState(tab.entityId)
  if (tab.entityId !== prevId) {
    setPrevId(tab.entityId)
    setLoading(true)
    setError(null)
    setVm(null)
  }

  const load = useCallback(async (id: string) => {
    try {
      const result = await getMissionDetail(id)
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setVm(result.data)
      } else {
        setError("Données de mission invalides.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement de la mission.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    getMissionDetail(tab.entityId)
      .then((result) => {
        if (!active) return
        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setVm(result.data)
        } else {
          setError("Données de mission invalides.")
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Erreur lors du chargement de la mission.")
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tab.entityId])

  const handleRefresh = useCallback(() => {
    load(tab.entityId)
  }, [load, tab.entityId])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="h-8 w-48 bg-border/60 rounded" />
        <div className="h-32 bg-border/40 rounded" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-border/40 rounded" />
          ))}
        </div>
        <div className="h-48 bg-border/40 rounded" />
      </div>
    )
  }

  if (error || !vm) {
    return (
      <div className="p-6">
        <SurfaceCard>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <svg className="w-8 h-8 text-danger/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-heading">
              {error || "Mission introuvable"}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Réessayer
            </button>
          </div>
        </SurfaceCard>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <MissionDetailMobile vm={vm} onRefresh={handleRefresh} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MissionDetailDesktop vm={vm} onRefresh={handleRefresh} />
    </div>
  )
}
