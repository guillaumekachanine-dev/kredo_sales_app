import type {
  CanonicalCommunicationActivityCategory,
  CommunicationBrief,
  CommunicationChannel,
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
  CommunicationLength,
  CommunicationObjective,
  CommunicationOutputKind,
  CommunicationRecipientType,
  CommunicationScenario,
  CommunicationScope,
  CommunicationTone,
} from "@/lib/n8n/types"
import type { IntelligenceEntityType } from "@/lib/intelligence/intelligence-registry"

export const COMMUNICATION_COMPOSER_EVENT = "kredo:open-communication-composer"

export type CommunicationComposerOrigin =
  | "global"
  | "cockpit_header"
  | "account_panel"
  | "intelligence_common"
  | "prospection_priority"
  | "staffing_primary_action"
  | "staffing_context"
  | "meeting_follow_up"
  | "contact"
  | "account"
  | "opportunity"
  | "mission"
  | "project"
  | "calendar_event"
  | "veille_signal"

export type CommunicationComposerPrimaryEntity = {
  type: IntelligenceEntityType
  id: string
}

// ADR-0013 — débloque les scénarios sans compte pivot (business review, brief
// manager, arbitrage interne...). "account" = comportement historique (compte
// CRM requis) ; "collaborator" = contexte collaborateur (aucun compte requis) ;
// "internal" = aucune entité requise, le contexte vient du prompt utilisateur.
// Alias du type canonique CommunicationScope (n8n/types.ts, Lot 2) — conservé
// pour ne pas casser les imports existants de CommunicationComposerHost.tsx.
export type CommunicationComposerScope = CommunicationScope

export type CommunicationComposerPreset = {
  channel?: CommunicationChannel
  scenario?: CommunicationScenario
  outputKind?: CommunicationOutputKind
  activityCategory?: CanonicalCommunicationActivityCategory
  recipientType?: CommunicationRecipientType
  objective?: CommunicationObjective
  length?: CommunicationLength
  tone?: CommunicationTone
  contactId?: string
  collaboratorId?: string
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
  internalRecipientName?: string
  mustInclude?: string
  mustExclude?: string
  practice?: string
  refs?: Partial<CommunicationBrief["context"]>
}

export type CommunicationComposerRequest = {
  origin: CommunicationComposerOrigin
  // Défaut "account" si omis — rétro-compatible avec tous les call-sites existants.
  scope?: CommunicationComposerScope
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  collaboratorId?: string | null
  primaryEntity?: CommunicationComposerPrimaryEntity | null
  initialBrief?: CommunicationBrief
  selectedOutputKind?: CommunicationOutputKind
  contextReferences?: Partial<CommunicationBrief["context"]>
  preset?: CommunicationComposerPreset
}

export function openCommunicationComposer(
  request: CommunicationComposerRequest = { origin: "global" },
) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<CommunicationComposerRequest>(COMMUNICATION_COMPOSER_EVENT, {
      detail: request,
    }),
  )
}
