import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { CampaignFormState } from "./intelligence-action-types"

// ─── Payload Builders ────────────────────────────────────────────────────────
// Le builder pour "Rédaction assistée" (INTEL-020) vit dans communication-brief-options.ts
// — il retourne directement un CommunicationBrief, pas ce format form/context legacy.
// Le builder pour la fiche de synthèse compte (REPORT-001) vit directement dans
// IntelligenceActionDrawers.tsx (buildAccountSummaryBrief) — pas de dépendance à
// ClientIntelligenceData, toute la donnée est résolue par get_account_summary_facts.

export function buildCampaignPayload({
  companyId,
  form,
  data,
}: {
  companyId: string
  form: CampaignFormState
  data: ClientIntelligenceData
}) {
  const { company, contacts } = data
  return {
    companyId,
    action: "campaign_generation",
    form,
    context: {
      companyName: company.name,
      sector: company.sector,
      contactsCount: contacts.length,
    },
  }
}
