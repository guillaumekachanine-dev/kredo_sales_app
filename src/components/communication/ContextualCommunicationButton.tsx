"use client"

import type { ComponentProps } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  openCommunicationComposer,
  type CommunicationComposerOrigin,
  type CommunicationComposerRequest,
} from "@/lib/communication/communication-composer"
import {
  getCommunicationEntryPoint,
  type CommunicationEntryPoint,
} from "@/components/accounts-contacts/intelligence/communication-brief-options"
import {
  buildCommunicationEntryPreset,
  COMMUNICATION_ENTRY_INTENTS,
  type CommunicationEntryIntent,
} from "@/lib/communication/communication-entry-intents"
import type {
  CommunicationBrief,
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
} from "@/lib/n8n/types"

type ContextualCommunicationButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  entryPoint?: CommunicationEntryPoint
  intent?: CommunicationEntryIntent
  label?: string
  origin?: CommunicationComposerOrigin
  scope?: CommunicationComposerRequest["scope"]
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  contactName?: string | null
  collaboratorId?: string | null
  primaryEntity?: CommunicationComposerRequest["primaryEntity"]
  opportunityId?: string | null
  opportunityTitle?: string | null
  missionId?: string | null
  missionTitle?: string | null
  candidateId?: string | null
  candidateName?: string | null
  collaboratorName?: string | null
  offerId?: string | null
  signalId?: string | null
  sectorId?: string | null
  sectorName?: string | null
  eventId?: string | null
  eventTitle?: string | null
  eventType?: string | null
  eventStartsAt?: string | null
  eventLocation?: string | null
  eventMeetingUrl?: string | null
  eventParticipants?: string[] | null
  eventDescription?: string | null
  invoiceId?: string | null
  invoiceReference?: string | null
  invoiceAmount?: string | null
  invoiceDueDate?: string | null
  invoiceStatus?: string | null
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
  internalRecipientName?: string | null
  refs?: Partial<CommunicationBrief["context"]>
  mustInclude?: string
  stopPropagation?: boolean
  onOpened?: () => void
}

const DEFAULT_ORIGIN_BY_ENTRY_POINT: Record<CommunicationEntryPoint, CommunicationComposerOrigin> = {
  contact_drawer: "contact",
  account_row: "account",
  signal_card: "account",
  meeting_interaction: "meeting_follow_up",
  missed_follow_up: "prospection_priority",
  proposal_sent: "opportunity",
  candidate_positioning: "opportunity",
  active_mission: "mission",
  former_client: "account",
  sector_offer: "account",
  account_pitch: "account",
}

const LEGACY_ENTRY_POINT_INTENTS: Partial<Record<CommunicationEntryPoint, CommunicationEntryIntent>> = {
  contact_drawer: "signal_outreach",
  account_row: "signal_outreach",
  signal_card: "signal_outreach",
  missed_follow_up: "prospection_follow_up",
  proposal_sent: "proposal_follow_up",
  candidate_positioning: "candidate_to_client",
  active_mission: "mission_renewal",
  former_client: "prospection_follow_up",
  sector_offer: "signal_outreach",
  account_pitch: "discovery_preparation",
}

export function ContextualCommunicationButton({
  entryPoint,
  intent,
  label,
  origin,
  scope,
  companyId,
  companyName,
  contactId,
  contactName,
  collaboratorId,
  primaryEntity,
  opportunityId,
  opportunityTitle,
  missionId,
  missionTitle,
  candidateId,
  candidateName,
  collaboratorName,
  offerId,
  signalId,
  sectorId,
  sectorName,
  eventId,
  eventTitle,
  eventType,
  eventStartsAt,
  eventLocation,
  eventMeetingUrl,
  eventParticipants,
  eventDescription,
  invoiceId,
  invoiceReference,
  invoiceAmount,
  invoiceDueDate,
  invoiceStatus,
  internalRole,
  internalRelationship,
  internalDomain,
  internalRecipientName,
  refs,
  mustInclude,
  stopPropagation = true,
  onOpened,
  variant = "secondary",
  size = "sm",
  className,
  ...props
}: ContextualCommunicationButtonProps) {
  const legacyPreset = entryPoint ? getCommunicationEntryPoint(entryPoint) : null
  const resolvedIntent = intent ?? (entryPoint ? LEGACY_ENTRY_POINT_INTENTS[entryPoint] : undefined)
  const buttonLabel = label ?? (resolvedIntent ? COMMUNICATION_ENTRY_INTENTS[resolvedIntent].label : legacyPreset?.label ?? "Rédiger / préparer")

  return (
    <Button
      {...props}
      type="button"
      variant={variant}
      size={size}
      className={cn("text-xs", className)}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation()
        }

        if (resolvedIntent) {
          const result = buildCommunicationEntryPreset(resolvedIntent, {
            companyId,
            companyName,
            contactId,
            contactName,
            opportunityId: opportunityId ?? refs?.opportunityRef,
            opportunityTitle,
            missionId: missionId ?? refs?.missionRef,
            missionTitle,
            candidateId: candidateId ?? refs?.profileRef,
            candidateName,
            collaboratorId: collaboratorId ?? refs?.collaboratorRef,
            collaboratorName,
            offerId: offerId ?? refs?.offerRef,
            signalId: signalId ?? refs?.signalRef,
            sectorId,
            sectorName,
            eventId,
            eventTitle,
            eventType,
            eventStartsAt,
            eventLocation,
            eventMeetingUrl,
            eventParticipants,
            eventDescription,
            invoiceId,
            invoiceReference,
            invoiceAmount,
            invoiceDueDate,
            invoiceStatus,
            internalRole,
            internalRelationship,
            internalDomain,
            internalRecipientName,
            mustInclude: [legacyPreset?.contextHint, refs?.angle, mustInclude].filter(Boolean).join("\n\n") || undefined,
            origin: origin ?? (entryPoint ? DEFAULT_ORIGIN_BY_ENTRY_POINT[entryPoint] : "global"),
          })

          if (result.ok) {
            openCommunicationComposer({
              ...result.request,
              scope: scope ?? result.request.scope,
              collaboratorId,
              primaryEntity: primaryEntity ?? result.request.primaryEntity,
              contextReferences: {
                ...result.request.contextReferences,
                ...refs,
              },
            })
            onOpened?.()
            return
          }
        }

        if (entryPoint && legacyPreset) {
          openCommunicationComposer({
            origin: origin ?? DEFAULT_ORIGIN_BY_ENTRY_POINT[entryPoint],
            scope,
            companyId,
            companyName,
            contactId,
            collaboratorId,
            primaryEntity,
            preset: {
              channel: legacyPreset.channel,
              scenario: legacyPreset.scenario,
              objective: legacyPreset.objective,
              tone: legacyPreset.tone,
              length: legacyPreset.length,
              contactId: contactId ?? undefined,
              refs,
              mustInclude: [legacyPreset.contextHint, mustInclude].filter(Boolean).join("\n\n") || undefined,
            },
          })
          onOpened?.()
        }
      }}
    >
      {buttonLabel}
    </Button>
  )
}
