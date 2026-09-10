"use client"

import { AppDialog } from "@/components/ui/AppDialog"
import { MissionComposerDesktop } from "@/features/intelligence-missions/components/MissionComposerDesktop"
import { VEILLE_MISSION_COMPOSER_CONFIG } from "@/features/intelligence-missions/components/mission-composer-model"

// ─────────────────────────────────────────────────────────────────────────────
//  Module contextuel « Mission : analyse de la veille » (Lot 7.7).
//
//  Nouveau point d'entrée contextuel vers la mission EXISTANTE
//  `veille-analyse-mensuelle` : monte `MissionComposerDesktop` TEL QUEL avec sa
//  config (`VEILLE_MISSION_COMPOSER_CONFIG`). Aucune nouvelle mission, aucun
//  workflow n8n, aucun trigger. Le composeur est habillé cockpit
//  (`data-theme="cockpit"`) comme dans le Cockpit Intelligence.
// ─────────────────────────────────────────────────────────────────────────────

export interface WatchAnalysisMissionModuleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WatchAnalysisMissionModule({
  open,
  onOpenChange,
}: WatchAnalysisMissionModuleProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      dataTheme="cockpit"
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-brass">
            Mission d’intelligence
          </p>
          <h2 className="mt-1.5 font-heading text-xl font-bold leading-tight tracking-tight text-primary-fg">
            Analyse mensuelle de la veille
          </h2>
        </div>
      }
      className="w-[min(calc(100vw-1.5rem),34rem)] bg-brand-primary sm:max-w-lg"
      bodyClassName="text-primary-fg/80"
      closeButtonClassName="text-primary-fg/60 hover:text-primary-fg hover:bg-primary-fg/10"
    >
      <MissionComposerDesktop config={VEILLE_MISSION_COMPOSER_CONFIG} />
    </AppDialog>
  )
}
