"use client"

import { AccountAttackItem } from "../models/build-account-attack-model"
import { AccountPriorityItem } from "../models/build-account-prioritization-model"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

interface AccountAttackPanelProps {
  attackData: AccountAttackItem | null
  baseAccount: AccountPriorityItem | undefined
}

export function AccountAttackPanel({ attackData, baseAccount }: AccountAttackPanelProps) {
  if (!baseAccount) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm p-6 h-full flex flex-col items-center justify-center text-center">
        <p className="text-[var(--color-muted)] text-sm">Sélectionnez un compte pour afficher son plan d'attaque.</p>
      </div>
    )
  }

  let provenanceLabel = "Proxy"
  if (baseAccount.provenance === "REAL_NATIVE") provenanceLabel = "Natif"
  else if (baseAccount.provenance === "REAL_LEGACY") provenanceLabel = "Historique"

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-bold text-lg text-[var(--color-text-main)] truncate" title={baseAccount.name}>{baseAccount.name}</h2>
          <Badge variant="neutral" className="ml-2 whitespace-nowrap">{baseAccount.priority} / 100</Badge>
        </div>
        <div className="text-xs text-[var(--color-muted)] flex items-center space-x-2">
          <span className="truncate max-w-[150px]">{attackData?.sectorContext?.name ?? "Secteur non déterminé"}</span>
          <span>•</span>
          <span>Provenance : {provenanceLabel}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Scores & Confiance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--color-background)] p-3 rounded border border-[var(--color-border)]">
            <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Score Stratégique</span>
            <span className="block text-lg font-semibold text-[var(--color-text-main)]">
              {baseAccount.nativeScore ? baseAccount.nativeScore.value : "N/A"}
            </span>
          </div>
          <div className="bg-[var(--color-background)] p-3 rounded border border-[var(--color-border)]">
            <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Confiance</span>
            <span className="block text-lg font-semibold text-[var(--color-text-main)]">
              {attackData?.confidence !== null && attackData?.confidence !== undefined ? `${attackData.confidence}%` : "Non disponible"}
            </span>
          </div>
        </div>

        {/* Drivers & Vigilance */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-[var(--color-text-main)] mb-2 uppercase tracking-wide">Drivers Positifs</h4>
            {attackData?.positiveDrivers && attackData.positiveDrivers.length > 0 ? (
              <ul className="list-disc pl-4 text-sm text-[var(--color-text-main)] space-y-1">
                {attackData.positiveDrivers.map((driver, idx) => <li key={idx}>{driver}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-muted)] italic">Aucun driver détecté</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-[var(--color-text-main)] mb-2 uppercase tracking-wide">Points de Vigilance</h4>
            {attackData?.vigilancePoints && attackData.vigilancePoints.length > 0 ? (
              <ul className="list-disc pl-4 text-sm text-[var(--color-error)] space-y-1">
                {attackData.vigilancePoints.map((pt, idx) => <li key={idx}>{pt}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-muted)] italic">Aucun point de vigilance</p>
            )}
          </div>
        </div>

        {/* Stratégie d'approche */}
        <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
          <div>
            <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Practice recommandée</span>
            <span className="block text-sm font-medium text-[var(--color-text-main)]">
              {attackData?.recommendedPractice ?? <span className="text-[var(--color-muted)] italic">Practice non déterminée</span>}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Angle d'approche</span>
            <span className="block text-sm font-medium text-[var(--color-text-main)]">
              {attackData?.approachAngle ?? <span className="text-[var(--color-muted)] italic">Angle non déterminé</span>}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Prochaine action</span>
            <span className="block text-sm font-medium text-[var(--color-text-main)]">
              {attackData?.nextAction ?? <span className="text-[var(--color-muted)] italic">Action non déterminée</span>}
            </span>
          </div>
          {attackData?.topSignal && (
            <div>
              <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Signal principal</span>
              <span className="block text-sm font-medium text-[var(--color-text-main)]">
                {attackData.topSignal.title}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
        <Button className="w-full justify-center">Ouvrir le Cockpit</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="w-full text-xs">Rédiger un message</Button>
          <Button variant="secondary" className="w-full text-xs">Planifier une action</Button>
        </div>
      </div>
    </div>
  )
}
