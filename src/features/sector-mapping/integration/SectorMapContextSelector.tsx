"use client"

import type { SectorMapCatalog, SectorMapCatalogAccount } from "../data/sector-map-catalog"
import type { SectorMapContextMode } from "./use-sector-map-context"
import styles from "./sector-map-integration.module.css"

interface SectorMapContextSelectorProps {
  catalog: SectorMapCatalog
  mode: SectorMapContextMode
  sectorId: string
  accountId: string
  activeAccount: SectorMapCatalogAccount | null
  onModeChange: (mode: SectorMapContextMode) => void
  onSectorChange: (sectorId: string) => void
  onAccountChange: (accountId: string) => void
}

export function SectorMapContextSelector({
  catalog,
  mode,
  sectorId,
  accountId,
  activeAccount,
  onModeChange,
  onSectorChange,
  onAccountChange,
}: SectorMapContextSelectorProps) {
  const currentSector = catalog.sectors.find((s) => s.id === sectorId) ?? catalog.sectors[0]

  return (
    <section className={styles.contextBar} aria-labelledby="sector-map-context-title">
      <div className={styles.contextHeading}>
        <span>Business Intelligence</span>
        <h1 id="sector-map-context-title">Chaîne de valeur</h1>
      </div>
      <div className={styles.modeSwitch} role="radiogroup" aria-label="Mode de sélection">
        <button type="button" role="radio" aria-checked={mode === "sector"} onClick={() => onModeChange("sector")}>Secteur</button>
        <button type="button" role="radio" aria-checked={mode === "account"} disabled={catalog.accounts.length === 0} onClick={() => onModeChange("account")}>Compte</button>
      </div>
      <label className={styles.contextSelect}>
        <span>{mode === "sector" ? "Secteur cartographié" : "Compte mis en évidence"}</span>
        {mode === "sector" ? (
          catalog.sectors.length <= 1 ? (
            <span className="flex min-h-9 items-center rounded-md border border-edito-border bg-edito-surface px-3 text-sm font-semibold text-edito-navy">
              {currentSector?.name ?? "Secteur actif"}
            </span>
          ) : (
            <select value={sectorId} onChange={(event) => onSectorChange(event.target.value)}>
              {catalog.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
            </select>
          )
        ) : (
          <select value={accountId} onChange={(event) => onAccountChange(event.target.value)}>
            {catalog.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        )}
      </label>
      <p className={styles.contextSummary} aria-live="polite">
        {mode === "account" && activeAccount
          ? <><strong>{activeAccount.name}</strong><span>{activeAccount.sectorName} · focus appliqué à la cartographie sectorielle</span></>
          : <><strong>Vue sectorielle complète</strong><span>{currentSector ? `Modèle de valeur pour ${currentSector.name}` : "Un modèle unique pour Valeur et Écosystème"}</span></>}
      </p>
    </section>
  )
}
