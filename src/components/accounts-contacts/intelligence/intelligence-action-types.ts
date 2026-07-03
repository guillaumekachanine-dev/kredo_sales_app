// Le formulaire "Rédaction assistée" (ex-pitch/mail) utilise désormais le
// contrat CommunicationBrief (QUOI/QUI/COMMENT/CONTEXTE) — voir src/lib/n8n/types.ts
// et ./communication-brief-options.ts. Les types Pitch* historiques ont été retirés.

export type CampaignFormState = {
  campaignName: string
  channels: {
    email: boolean
    linkedin: boolean
    phone: boolean
  }
  additionalInstructions: string
}
