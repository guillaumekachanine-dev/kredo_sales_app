"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { promoteAccountDepth } from "@/features/account-lifecycle/actions/promote-account-depth"
import {
  ACCOUNT_DEPTH_BADGE_TONE,
  ACCOUNT_DEPTH_LEVEL_LABELS,
  ACCOUNT_ORIGIN_LABELS,
} from "@/features/account-lifecycle/domain/depth-level"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import { cn } from "@/lib/utils"
import { Field, SectionBlock } from "./intelligence-parts"

// ADR-0019 Lot 3 — Étape 0 du cockpit. Réutilise le même bundle de scan que
// CompanyIdentityDrawer (chargement différé) : l'application des propositions
// EST la définition du palier "qualified" (D-1), portée par le même
// AccountScanDialog / promoteAccountDepth, jamais dupliquée.
const AccountScanDialog = dynamic(
  () => import("@/components/accounts-contacts/scan/AccountScanDialog").then((m) => m.AccountScanDialog),
  { ssr: false },
)

export function ClientIntelligenceSocleTab({ data, isMobile }: { data: ClientIntelligenceData; isMobile: boolean }) {
  const router = useRouter()
  const [scanOpen, setScanOpen] = useState(false)
  const { company } = data
  const isQualified = company.depthLevel === "qualified" || company.depthLevel === "active"
  // `hqLocation` est toujours une chaîne côté ClientIntelligenceData (clean()
  // renvoie "Non renseigné" plutôt que null) — sans ce filtre, le scan
  // pré-remplirait son indice de localisation avec ce libellé littéral.
  const hqLocationHint = company.hqLocation !== "Non renseigné" ? company.hqLocation : null

  async function handleScanApplied() {
    const { error } = await promoteAccountDepth(company.id, "qualified")
    if (error) {
      console.error("Promotion de profondeur (qualified) impossible :", error)
    }
    router.refresh()
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Étape 0 — Socle du compte</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-heading">Identité de {company.name}</h2>
          <p className="mt-1 max-w-xl text-xs text-body">
            SIREN, NAF, taille et rattachement à la taxonomie sectorielle — le socle vérifié dont dépendent les
            étapes suivantes du cockpit (ADR-0019).
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            ACCOUNT_DEPTH_BADGE_TONE[company.depthLevel],
          )}
        >
          {ACCOUNT_DEPTH_LEVEL_LABELS[company.depthLevel]}
        </span>
      </div>

      <SectionBlock title="Identité vérifiée">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="SIREN" value={company.siren ?? "Non renseigné"} />
          <Field label="Code NAF" value={company.nafCode ?? "Non renseigné"} />
          <Field label="Taille" value={data.companyProfile.employeeCount} />
          <Field
            label="Taxonomie sectorielle"
            value={data.sectorSnapshot?.name ?? (company.sectorId ? "Rattaché — secteur en cours de résolution" : "Non rattaché")}
          />
        </div>
      </SectionBlock>

      <SectionBlock title="Origine du compte">
        <p className="text-xs text-body">{ACCOUNT_ORIGIN_LABELS[company.origin] ?? company.origin}</p>
      </SectionBlock>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="max-w-xl text-xs text-body">
          {isQualified
            ? "Le socle est vérifié. Un nouveau scan peut rafraîchir SIREN, NAF et taille si l'entreprise a évolué."
            : "Le scan rapide résout l'identité officielle du compte (registre légal) et propose SIREN/NAF/taille à valider — son application qualifie automatiquement le socle."}
        </p>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-fg shadow-sm transition-all hover:bg-primary/95 active:scale-98"
        >
          {isQualified ? "Relancer le scan" : "Qualifier le compte (scan)"}
        </button>
      </div>

      <AccountScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        company={{
          id: company.id,
          name: company.name,
          legalName: company.legalName,
          website: company.website,
          hqLocation: hqLocationHint,
          siren: company.siren,
          nafCode: company.nafCode,
          sectorId: company.sectorId,
        }}
        isMobile={isMobile}
        onApplied={handleScanApplied}
      />
    </div>
  )
}
