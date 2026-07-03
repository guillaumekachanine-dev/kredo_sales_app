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
import type { CommunicationBrief } from "@/lib/n8n/types"

type ContextualCommunicationButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  entryPoint: CommunicationEntryPoint
  label?: string
  origin?: CommunicationComposerOrigin
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  primaryEntity?: CommunicationComposerRequest["primaryEntity"]
  refs?: Partial<CommunicationBrief["context"]>
  mustInclude?: string
  stopPropagation?: boolean
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

export function ContextualCommunicationButton({
  entryPoint,
  label,
  origin,
  companyId,
  companyName,
  contactId,
  primaryEntity,
  refs,
  mustInclude,
  stopPropagation = true,
  variant = "secondary",
  size = "sm",
  className,
  ...props
}: ContextualCommunicationButtonProps) {
  const preset = getCommunicationEntryPoint(entryPoint)
  const buttonLabel = label ?? preset.label

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

        openCommunicationComposer({
          origin: origin ?? DEFAULT_ORIGIN_BY_ENTRY_POINT[entryPoint],
          companyId,
          companyName,
          contactId,
          primaryEntity,
          preset: {
            channel: preset.channel,
            scenario: preset.scenario,
            objective: preset.objective,
            tone: preset.tone,
            length: preset.length,
            contactId: contactId ?? undefined,
            refs,
            mustInclude: [preset.contextHint, mustInclude].filter(Boolean).join("\n\n") || undefined,
          },
        })
      }}
    >
      {buttonLabel}
    </Button>
  )
}
