"use client"

import { useMemo, useState } from "react"
import type { SectorMapCatalog } from "../data/sector-map-catalog"

export type SectorMapContextMode = "sector" | "account"

export function useSectorMapContext(catalog: SectorMapCatalog) {
  const [mode, setMode] = useState<SectorMapContextMode>("sector")
  const [sectorId, setSectorId] = useState(catalog.sectors[0]?.id ?? "")
  const [accountId, setAccountId] = useState(catalog.accounts[0]?.id ?? "")
  const account = useMemo(
    () => catalog.accounts.find((item) => item.id === accountId) ?? catalog.accounts[0] ?? null,
    [accountId, catalog.accounts],
  )
  const activeSectorId = mode === "account" ? account?.sectorId ?? sectorId : sectorId
  const sectorMap = useMemo(
    () => catalog.maps.find((map) => map.sector.id === activeSectorId) ?? catalog.maps[0] ?? null,
    [activeSectorId, catalog.maps],
  )

  function changeMode(nextMode: SectorMapContextMode) {
    if (nextMode === "account" && !account) return
    setMode(nextMode)
  }

  return {
    mode,
    sectorId: sectorMap?.sector.id ?? sectorId,
    accountId: account?.id ?? accountId,
    account: mode === "account" ? account : null,
    sectorMap,
    setMode: changeMode,
    setSectorId,
    setAccountId,
  }
}
