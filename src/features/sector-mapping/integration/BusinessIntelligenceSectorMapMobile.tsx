"use client"

import type { SectorMapCatalog } from "../data/sector-map-catalog"
import { SectorMapMobile } from "../mobile/SectorMapMobile"
import { SectorMapContextSelector } from "./SectorMapContextSelector"
import { useSectorMapContext } from "./use-sector-map-context"
import styles from "./sector-map-integration.module.css"

export function BusinessIntelligenceSectorMapMobile({ catalog }: { catalog: SectorMapCatalog }) {
  const context = useSectorMapContext(catalog)

  if (catalog.state !== "ready" || !context.sectorMap) {
    return (
      <section className={styles.emptyState}>
        <h1>Chaîne de valeur</h1>
        <p>{catalog.state === "error" ? "La cartographie ne peut pas être chargée pour le moment." : "Aucune cartographie sectorielle n’est encore documentée."}</p>
      </section>
    )
  }

  return (
    <div className={styles.integrationRoot} data-sector-map-integration="mobile">
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
      <SectorMapMobile
        key={`${context.sectorMap.sector.id}:${context.account?.id ?? "sector"}`}
        sectorMap={context.sectorMap}
        initialActivityId={context.account?.initialActivityId}
        focusedCompanyId={context.account?.companyId}
        embedded
      />
    </div>
  )
}
