"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import type { AccountIntelligencePanelData } from "@/lib/intelligence/account-panel-types"

interface RegisterIntelligenceContextProps {
  entityType: "company"
  entityId: string
  label: string
  panelData: AccountIntelligencePanelData
}

export function RegisterIntelligenceContext({
  entityType,
  entityId,
  label,
  panelData,
}: RegisterIntelligenceContextProps) {
  const pathname = usePathname()
  const { registerEntity, clearEntity, hydratePanelData, clearPanelData } =
    useIntelligenceContext()
  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${entityType}:${entityId}`
    registerEntity({ entityType, entityId, label, pathname })
    hydratePanelData(entityId, panelData)
    prevKeyRef.current = key

    return () => {
      clearEntity()
      clearPanelData()
      prevKeyRef.current = null
    }
  }, [entityType, entityId, label, pathname, panelData, registerEntity, clearEntity, hydratePanelData, clearPanelData])

  return null
}
