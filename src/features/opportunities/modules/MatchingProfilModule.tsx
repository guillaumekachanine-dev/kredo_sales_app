"use client"

import { useRouter } from "next/navigation"
import { MatchingDialog } from "@/components/staffing/matching/MatchingDialog"

// ─────────────────────────────────────────────────────────────────────────────
//  Module contextuel « Matching profil » (Lot 10 — CROSS-01 / OPP-30).
//
//  Point d'entrée besoin-centrique : monte `MatchingDialog` TEL QUEL (moteur
//  unique `src/lib/staffing-matching/`, cache `match_scores`, aucun recalcul,
//  aucun composant copié). Le contexte vient du besoin sélectionné du chapitre
//  (`?opp=`), pas d'une reconstruction manuelle.
//
//  Desktop uniquement (le shell V2 n'est jamais monté sur Mobile — les entrées
//  Mobile `ProfileMatchingMobile` restent inchangées).
// ─────────────────────────────────────────────────────────────────────────────

interface MatchingProfilModuleProps {
  opportunityId: string
  opportunityTitle: string
  /** URL du chapitre courant sans `?module=` — fermeture du module. */
  closeHref: string
}

export function MatchingProfilModule({
  opportunityId,
  opportunityTitle,
  closeHref,
}: MatchingProfilModuleProps) {
  const router = useRouter()

  return (
    <MatchingDialog
      key={opportunityId}
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false })
      }}
      opportunityId={opportunityId}
      opportunityTitle={opportunityTitle}
      isMobile={false}
    />
  )
}
