"use client"

import { useState } from "react"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { CompanyDocumentsModal } from "@/components/accounts-contacts/intelligence/CompanyDocumentsModal"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { resolveInitialAccountSelection } from "@/features/intelligence-missions/components/mission-composer-model"
import { CockpitBrightHeader, CockpitBrightSection } from "../CockpitBrightSection"

/**
 * Module « Bibliothèque » : l'intégralité des contenus produits, générés et
 * échangés avec un compte (mails, rapports, pitchs, devis, relances, fiches,
 * articles).
 *
 * `CompanyDocumentsModal` est scopée à un compte. En mode Page — Business
 * Intelligence n'a aucun contexte d'entité — il manque donc l'objet de la
 * consultation : ce module ajoute cette seule étape, sur le patron déjà établi
 * par le composeur de matching (choisir le sujet, puis déléguer à la surface
 * existante). En mode Entité, le compte courant est présélectionné et l'étape
 * disparaît d'elle-même.
 */
export function CompanyLibraryModule({ onClose }: { onClose: () => void }) {
  const entityContext = useIntelligenceContext((state) => state.entityContext)
  const [account, setAccount] = useState<AccountValue | null>(() =>
    resolveInitialAccountSelection(entityContext),
  )

  if (account?.id) {
    return (
      <CompanyDocumentsModal
        open
        onClose={onClose}
        companyId={account.id}
        companyName={account.name}
        isMobile
      />
    )
  }

  return (
    <CockpitBrightSection>
      <CockpitBrightHeader title="Bibliothèque" kicker={["Contenus", "du compte"]} onBack={onClose} />
      <div className="space-y-3 px-5 py-5">
        <p className="text-[11px] leading-relaxed text-edito-muted">
          Choisir le compte dont consulter les contenus : mails, rapports, pitchs, devis, relances,
          fiches et articles produits ou échangés avec lui.
        </p>
        <AccountCombobox
          value={account}
          onChange={setAccount}
          allowCreate={false}
          openOnFocus
          minSearchLength={0}
          searchLimit={16}
          size="md"
          className="min-h-12"
        />
      </div>
    </CockpitBrightSection>
  )
}
