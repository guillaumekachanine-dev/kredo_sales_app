"use client"

import type { SectorMapCatalog } from "../data/sector-map-catalog"
import { SectorValueDesktop } from "../value-desktop/SectorValueDesktop"
import { SectorMapContextSelector } from "./SectorMapContextSelector"
import { useSectorMapContext } from "./use-sector-map-context"
import styles from "./sector-map-integration.module.css"

export function BusinessIntelligenceSectorMapDesktop({ catalog }: { catalog: SectorMapCatalog }) {
  const context = useSectorMapContext(catalog)

  if (catalog.state !== "ready" || !context.sectorMap) {
    return <SectorMapCatalogState state={catalog.state} />
  }

  return (
    <div className={styles.integrationRoot} data-sector-map-integration="desktop">
      <SectorMapContextSelector
        catalog={catalog}
        mode={context.mode}
        sectorId={context.sectorId}
        accountId={context.accountId}
        activeAccount={context.account}
        onModeChange={context.setMode}
        onSectorChange={context.setSectorId}
        onAccountChange={context.setAccountId}
      />
      <SectorValueDesktop
        key={`${context.sectorMap.sector.id}:${context.account?.id ?? "sector"}`}
        sectorMap={context.sectorMap}
        initialActivityId={context.account?.initialActivityId}
        focusedCompanyId={context.account?.companyId}
        embedded
      />
    </div>
  )
}

function SectorMapCatalogState({ state }: { state: SectorMapCatalog["state"] }) {
  return (
    <section className={styles.emptyState}>
      <h1>Chaîne de valeur</h1>
      <p>{state === "error" ? "La cartographie ne peut pas être chargée pour le moment." : "Aucune cartographie sectorielle n’est encore documentée."}</p>
    </section>
  )
}
