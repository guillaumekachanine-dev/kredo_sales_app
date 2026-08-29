"use client"

import { useEffect, useRef, useState } from "react"
import { Button, type ButtonVariant } from "@/components/ui/Button"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import type { CommunicationEntryIntent } from "@/lib/communication/communication-entry-intents"
import type { CommunicationBrief } from "@/lib/n8n/types"
import type {
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
} from "@/lib/n8n/types"
import type { CommunicationComposerRequest } from "@/lib/communication/communication-composer"
import { cn } from "@/lib/utils"

type IntentItem = {
  intent: CommunicationEntryIntent
  label?: string
  disabled?: boolean
}

type CommunicationIntentMenuProps = {
  label: string
  items: IntentItem[]
  origin?: CommunicationComposerRequest["origin"]
  scope?: CommunicationComposerRequest["scope"]
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  contactName?: string | null
  collaboratorId?: string | null
  collaboratorName?: string | null
  primaryEntity?: CommunicationComposerRequest["primaryEntity"]
  opportunityId?: string | null
  opportunityTitle?: string | null
  missionId?: string | null
  missionTitle?: string | null
  candidateId?: string | null
  candidateName?: string | null
  offerId?: string | null
  eventId?: string | null
  eventTitle?: string | null
  eventType?: string | null
  eventStartsAt?: string | null
  eventLocation?: string | null
  eventMeetingUrl?: string | null
  eventParticipants?: string[] | null
  eventDescription?: string | null
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
  internalRecipientName?: string | null
  refs?: Partial<CommunicationBrief["context"]>
  mustInclude?: string
  className?: string
  menuClassName?: string
  variant?: ButtonVariant
  buttonClassName?: string
}

export function CommunicationIntentMenu({
  label,
  items,
  origin,
  scope,
  companyId,
  companyName,
  contactId,
  contactName,
  collaboratorId,
  collaboratorName,
  primaryEntity,
  opportunityId,
  opportunityTitle,
  missionId,
  missionTitle,
  candidateId,
  candidateName,
  offerId,
  eventId,
  eventTitle,
  eventType,
  eventStartsAt,
  eventLocation,
  eventMeetingUrl,
  eventParticipants,
  eventDescription,
  internalRole,
  internalRelationship,
  internalDomain,
  internalRecipientName,
  refs,
  mustInclude,
  className,
  menuClassName,
  variant = "secondary",
  buttonClassName,
}: CommunicationIntentMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const enabledItems = items.filter((item) => !item.disabled)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  if (enabledItems.length === 0) return null

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <Button
        type="button"
        variant={variant}
        size="sm"
        className={cn("min-h-11 text-xs font-semibold", buttonClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        {label}
      </Button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-40 mt-2 min-w-56 rounded-lg border border-border bg-surface p-1.5 shadow-xl",
            menuClassName,
          )}
        >
          {enabledItems.map((item) => (
            <ContextualCommunicationButton
              key={item.intent}
              intent={item.intent}
              label={item.label}
              origin={origin}
              scope={scope}
              companyId={companyId}
              companyName={companyName}
              contactId={contactId}
              contactName={contactName}
              collaboratorId={collaboratorId}
              collaboratorName={collaboratorName}
              primaryEntity={primaryEntity}
              opportunityId={opportunityId}
              opportunityTitle={opportunityTitle}
              missionId={missionId}
              missionTitle={missionTitle}
              candidateId={candidateId}
              candidateName={candidateName}
              offerId={offerId}
              eventId={eventId}
              eventTitle={eventTitle}
              eventType={eventType}
              eventStartsAt={eventStartsAt}
              eventLocation={eventLocation}
              eventMeetingUrl={eventMeetingUrl}
              eventParticipants={eventParticipants}
              eventDescription={eventDescription}
              internalRole={internalRole}
              internalRelationship={internalRelationship}
              internalDomain={internalDomain}
              internalRecipientName={internalRecipientName}
              refs={refs}
              mustInclude={mustInclude}
              variant="ghost"
              size="sm"
              className="min-h-10 w-full justify-start text-left text-xs"
              onOpened={() => setOpen(false)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
