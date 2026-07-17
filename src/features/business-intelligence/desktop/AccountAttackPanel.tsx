"use client"

import { AccountAttackItem } from "../models/build-account-attack-model"
import { AccountPriorityItem } from "../models/build-account-prioritization-model"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useRouter } from "next/navigation"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"

interface AccountAttackPanelProps {
  attackData: AccountAttackItem | null
  baseAccount: AccountPriorityItem | undefined
}

export function AccountAttackPanel({ attackData, baseAccount }: AccountAttackPanelProps) {
  const router = useRouter()
  if (!baseAccount) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border/30 bg-surface/30 p-6 text-center">
        <p className="text-sm text-muted">Sélectionnez un compte pour afficher son plan d&apos;attaque.</p>
      </div>
    )
  }

  let provenanceLabel = "Proxy"
  if (baseAccount.provenance === "REAL_NATIVE") provenanceLabel = "Natif"
  else if (baseAccount.provenance === "REAL_LEGACY") provenanceLabel = "Historique"

  return (
      <section className="rounded-xl border border-border/30 bg-surface/30">
      <div className="border-b border-border/30 bg-surface-hover/20 p-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="truncate font-heading text-sm font-bold text-heading" title={baseAccount.name}>{baseAccount.name}</h2>
          <Badge variant="neutral" className="ml-2 whitespace-nowrap">{baseAccount.priority} / 100</Badge>
        </div>
        <div className="flex items-center space-x-2 text-xs text-muted">
          <span className="truncate max-w-[150px]">{attackData?.sectorContext?.name ?? "Secteur non déterminé"}</span>
          <span>•</span>
          <span>Provenance : {provenanceLabel}</span>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {/* Scores & Confiance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-border/30 bg-surface/20 p-3">
            <span className="mb-1 block text-[10px] uppercase text-muted">Score Stratégique</span>
            <span className="block text-lg font-semibold text-heading">
              {baseAccount.nativeScore ? baseAccount.nativeScore.value : "N/A"}
            </span>
          </div>
          <div className="rounded border border-border/30 bg-surface/20 p-3">
            <span className="mb-1 block text-[10px] uppercase text-muted">Confiance</span>
            <span className="block text-lg font-semibold text-heading">
              {attackData?.confidence !== null && attackData?.confidence !== undefined ? `${attackData.confidence}%` : "Non disponible"}
            </span>
          </div>
        </div>

        {/* Drivers & Vigilance */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-heading mb-2 uppercase tracking-wide">Drivers Positifs</h4>
            {attackData?.positiveDrivers && attackData.positiveDrivers.length > 0 ? (
              <ul className="list-disc pl-4 text-sm text-heading space-y-1">
                {attackData.positiveDrivers.map((driver, idx) => <li key={idx}>{driver}</li>)}
              </ul>
            ) : (
              <p className="text-sm italic text-muted">Aucun driver détecté</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-heading mb-2 uppercase tracking-wide">Points de Vigilance</h4>
            {attackData?.vigilancePoints && attackData.vigilancePoints.length > 0 ? (
                <ul className="list-disc pl-4 text-sm text-danger space-y-1">
                {attackData.vigilancePoints.map((pt, idx) => <li key={idx}>{pt}</li>)}
              </ul>
            ) : (
              <p className="text-sm italic text-muted">Aucun point de vigilance</p>
            )}
          </div>
        </div>

        {/* Stratégie d'approche */}
        <div className="space-y-4 border-t border-border/30 pt-4">
          <div>
            <span className="mb-1 block text-[10px] uppercase text-muted">Practice recommandée</span>
            <span className="block text-sm font-medium text-heading">
              {attackData?.recommendedPractice ?? <span className="italic text-muted">Practice non déterminée</span>}
            </span>
          </div>
          <div>
            <span className="mb-1 block text-[10px] uppercase text-muted">Angle d&apos;approche</span>
            <span className="block text-sm font-medium text-heading">
              {attackData?.approachAngle ?? <span className="italic text-muted">Angle non déterminé</span>}
            </span>
          </div>
          <div>
            <span className="mb-1 block text-[10px] uppercase text-muted">Prochaine action</span>
            <span className="block text-sm font-medium text-heading">
              {attackData?.nextAction ?? <span className="italic text-muted">Action non déterminée</span>}
            </span>
          </div>
          {attackData?.topSignal && (
            <div>
              <span className="mb-1 block text-[10px] uppercase text-muted">Signal principal</span>
              <span className="block text-sm font-medium text-heading">
                {attackData.topSignal.title}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-border bg-surface p-4">
        <Button className="w-full justify-center" onClick={() => router.push(`/prospection/accounts/${baseAccount.accountId}`)}>Ouvrir le Cockpit</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="w-full text-xs" onClick={() => openCommunicationComposer({ origin: "account", companyId: baseAccount.accountId, companyName: baseAccount.name, preset: { outputKind: "written_message" } })}>Rédiger un message</Button>
          <Button variant="secondary" className="w-full text-xs" onClick={() => router.push("/agenda")}>Planifier une action</Button>
        </div>
      </div>
    </section>
  )
}
