"use client"

import { useRouter } from "next/navigation"
import { FinancialModelingDesktopDialog } from "@/features/financial-modeling"
import type { FinancialModelingLaunchPreset } from "@/features/financial-modeling"

// ─────────────────────────────────────────────────────────────────────────────
//  Module contextuel « Simulation devis » (Lot 10 — CROSS-03 / OPP-30).
//
//  Réutilise `FinancialModelingDesktopDialog` TEL QUEL (OPP-13, aucune deuxième
//  modale). Toujours disponible : quand un besoin / une opportunité est en
//  contexte, le préset (`mode: "full"`, opportunité, client, TJM cible) est
//  appliqué ; sinon la modale s'ouvre en flash nu.
// ─────────────────────────────────────────────────────────────────────────────

interface SimulationDevisModuleProps {
  preset?: FinancialModelingLaunchPreset
  /** URL du chapitre courant sans `?module=` — fermeture du module. */
  closeHref: string
}

export function SimulationDevisModule({ preset, closeHref }: SimulationDevisModuleProps) {
  const router = useRouter()

  return (
    <FinancialModelingDesktopDialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false })
      }}
      initialPreset={preset}
    />
  )
}
