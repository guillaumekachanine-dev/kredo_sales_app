import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationLength,
  CommunicationObjective,
  CommunicationScenario,
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

export type CommunicationComposerPrimaryEntity = {
  type: IntelligenceEntityType
  id: string
}

export type CommunicationComposerPreset = {
  channel?: CommunicationChannel
  scenario?: CommunicationScenario
  objective?: CommunicationObjective
  length?: CommunicationLength
  tone?: CommunicationTone
  contactId?: string
  mustInclude?: string
  mustExclude?: string
  refs?: Partial<CommunicationBrief["context"]>
}

export type CommunicationComposerRequest = {
  origin: CommunicationComposerOrigin
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  primaryEntity?: CommunicationComposerPrimaryEntity | null
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
