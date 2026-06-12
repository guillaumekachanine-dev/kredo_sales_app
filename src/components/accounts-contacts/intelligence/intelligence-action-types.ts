export type PitchMessageType =
  | "email"
  | "phone_pitch"
  | "linkedin"

export type PitchObjective =
  | "first_contact"
  | "follow_up"
  | "meeting_request"
  | "proposal_intro"
  | "event_invitation"

export type PitchTone =
  | "direct"
  | "expert"
  | "pedagogical"
  | "executive"

export type PitchDraftFormState = {
  messageType: PitchMessageType
  objective: PitchObjective
  tone: PitchTone
  targetContactId: string | null
  additionalContext: string
}

export type ClientSummaryFormat =
  | "executive_brief"
  | "sales_sheet"
  | "account_memo"

export type ClientSummaryFormState = {
  format: ClientSummaryFormat
  includeSectorAnalysis: boolean
  includeSignals: boolean
  includeContacts: boolean
  includePitches: boolean
  additionalInstructions: string
}

export type CampaignFormState = {
  campaignName: string
  channels: {
    email: boolean
    linkedin: boolean
    phone: boolean
  }
  additionalInstructions: string
}
