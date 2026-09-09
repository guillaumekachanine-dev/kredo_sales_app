"use client"

import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
import { MissionComposerDesktop } from "@/features/intelligence-missions/components/MissionComposerDesktop"
import { POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG } from "@/features/intelligence-missions/components/mission-composer-model"

// ─────────────────────────────────────────────────────────────────────────────
//  Module contextuel « Post-Mortem » (Lot 10 — CROSS-02 / OPP-30).
//
//  Nouveau point d'entrée contextuel vers la mission EXISTANTE
//  `post-mortem-commercial` : monte `MissionComposerDesktop` TEL QUEL avec sa
//  config (`POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG`, période pipeline
//  trimestrielle). Aucune nouvelle mission, aucun workflow n8n, aucun trigger
//  (OPP-14). Le composeur est habillé cockpit (`data-theme="cockpit"`) comme
//  dans le Cockpit Intelligence.
// ─────────────────────────────────────────────────────────────────────────────

interface PostMortemModuleProps {
  /** URL du chapitre courant sans `?module=` — fermeture du module. */
  closeHref: string
}

export function PostMortemModule({ closeHref }: PostMortemModuleProps) {
  const router = useRouter()

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false })
      }}
      dataTheme="cockpit"
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-brass">
            Mission d’intelligence
          </p>
          <h2 className="mt-1.5 font-heading text-xl font-bold leading-tight tracking-tight text-primary-fg">
            Post-mortem commercial
          </h2>
        </div>
      }
      className="w-[min(calc(100vw-1.5rem),34rem)] bg-brand-primary sm:max-w-lg"
      bodyClassName="text-primary-fg/80"
      closeButtonClassName="text-primary-fg/60 hover:text-primary-fg hover:bg-primary-fg/10"
    >
      <MissionComposerDesktop config={POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG} />
    </AppDialog>
  )
}
