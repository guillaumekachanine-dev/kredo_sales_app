import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationLength,
  CommunicationObjective,
  CommunicationPersona,
  CommunicationRecipientType,
  CommunicationRelation,
  CommunicationScenario,
  CommunicationSenderRole,
  CommunicationTone,
} from "@/lib/n8n/types"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import type { CommunicationComposerPreset } from "@/lib/communication/communication-composer"

// ─── Taxonomies V1 — INTEL-020-REDACTION-ASSISTEE-V1.md § 4 ─────────────────

export const CHANNEL_OPTIONS: { value: CommunicationChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "linkedin_invitation", label: "Invitation LinkedIn" },
  { value: "linkedin_message", label: "Message LinkedIn" },
  { value: "internal_note", label: "Note interne" },
]

export const SCENARIO_OPTIONS: {
  value: CommunicationScenario
  label: string
  defaultChannel: CommunicationChannel
  defaultObjective: CommunicationObjective
}[] = [
  { value: "signal_outreach", label: "Premier contact (signal/actualité)", defaultChannel: "email", defaultObjective: "get_meeting" },
  { value: "follow_up_no_reply", label: "Relance sans réponse", defaultChannel: "email", defaultObjective: "get_reply" },
  { value: "post_meeting", label: "Suivi après rendez-vous", defaultChannel: "email", defaultObjective: "confirm_next_steps" },
  { value: "profile_submission", label: "Envoi de profil", defaultChannel: "email", defaultObjective: "submit_profile" },
  { value: "cross_sell", label: "Cross-sell / mission existante", defaultChannel: "email", defaultObjective: "present_offer" },
  { value: "reactivation", label: "Réactivation ancien client", defaultChannel: "email", defaultObjective: "reactivate" },
  { value: "proposal_follow_up", label: "Relance de proposition", defaultChannel: "email", defaultObjective: "accelerate_decision" },
  { value: "offer_introduction", label: "Présentation d'offre", defaultChannel: "email", defaultObjective: "present_offer" },
]

export const LENGTH_OPTIONS: { value: CommunicationLength; label: string; hint: string }[] = [
  { value: "ultra_short", label: "Ultra-court", hint: "40-80 mots" },
  { value: "concise", label: "Concis", hint: "80-140 mots" },
  { value: "standard", label: "Standard", hint: "140-220 mots" },
  { value: "detailed", label: "Détaillé", hint: "220-400 mots" },
]

export const SENDER_ROLE_OPTIONS: { value: CommunicationSenderRole; label: string }[] = [
  { value: "business_manager", label: "Business Manager" },
  { value: "agency_director", label: "Directeur d'Agence" },
  { value: "practice_lead", label: "Responsable Practice" },
  { value: "recruiter", label: "Recruteur" },
  { value: "delivery_manager", label: "Delivery Manager" },
  { value: "consultant", label: "Consultant" },
  { value: "general_management", label: "Direction Générale" },
]

export const RECIPIENT_TYPE_OPTIONS: { value: CommunicationRecipientType; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "active_client", label: "Client actif" },
  { value: "former_client", label: "Ancien client" },
  { value: "partner", label: "Partenaire" },
  { value: "candidate", label: "Candidat" },
  { value: "internal", label: "Interne" },
]

export const PERSONA_OPTIONS: { value: CommunicationPersona; label: string }[] = [
  { value: "ceo", label: "Direction Générale / CEO" },
  { value: "cto_cio", label: "DSI / CTO / CDO" },
  { value: "ciso", label: "RSSI / CISO" },
  { value: "business_director", label: "Directeur Métier" },
  { value: "purchasing", label: "Achats" },
  { value: "hr_talent", label: "RH / Talent Acquisition" },
  { value: "technical", label: "Technique / Architecte" },
  { value: "operational", label: "Opérationnel" },
  { value: "other", label: "Autre" },
]

export const RELATION_OPTIONS: { value: CommunicationRelation; label: string }[] = [
  { value: "unknown", label: "Inconnu" },
  { value: "cold", label: "Contact froid" },
  { value: "warm", label: "Contact tiède" },
  { value: "established", label: "Relation établie" },
  { value: "active_client", label: "Client actif" },
  { value: "former", label: "Ancien client / ancien contact" },
]

export const OBJECTIVE_OPTIONS: { value: CommunicationObjective; label: string }[] = [
  { value: "get_meeting", label: "Obtenir un rendez-vous" },
  { value: "get_reply", label: "Obtenir une réponse" },
  { value: "get_feedback", label: "Obtenir un feedback" },
  { value: "present_offer", label: "Présenter une offre" },
  { value: "submit_profile", label: "Positionner un profil" },
  { value: "accelerate_decision", label: "Accélérer une décision" },
  { value: "reactivate", label: "Réactiver la relation" },
  { value: "confirm_next_steps", label: "Confirmer les prochaines étapes" },
]

export const TONE_OPTIONS: { value: CommunicationTone; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "formal", label: "Formel" },
  { value: "warm", label: "Chaleureux" },
  { value: "assertive", label: "Assertif" },
  { value: "pedagogical", label: "Pédagogue" },
  { value: "diplomatic", label: "Diplomatique" },
]

// ─── Présélection automatique — § 6.5 ────────────────────────────────────────
// lifecycle_status réel (CLAUDE.md) : cible · prospect · client_actif · client_dormant
// · ancien_client · partenaire · non_prioritaire · exclu

function recipientTypeFromLifecycle(lifecycleStatus: string): CommunicationRecipientType {
  switch (lifecycleStatus) {
    case "client_actif":
      return "active_client"
    case "client_dormant":
    case "ancien_client":
      return "former_client"
    case "partenaire":
      return "partner"
    default:
      return "prospect"
  }
}

function relationFromLifecycle(lifecycleStatus: string): CommunicationRelation {
  switch (lifecycleStatus) {
    case "client_actif":
      return "active_client"
    case "client_dormant":
    case "ancien_client":
      return "former"
    case "partenaire":
      return "established"
    case "prospect":
      return "warm"
    default:
      return "unknown"
  }
}

// contacts.relationship_role réel (CLAUDE.md) : decideur · prescripteur · acheteur ·
// operationnel · sponsor · utilisateur_final · rh · manager_technique · dsi · direction_metier
export function personaFromRelationshipRole(relationshipRole: string | null): CommunicationPersona {
  switch (relationshipRole) {
    case "dsi":
      return "cto_cio"
    case "direction_metier":
      return "business_director"
    case "rh":
      return "hr_talent"
    case "acheteur":
      return "purchasing"
    case "manager_technique":
      return "technical"
    case "operationnel":
    case "utilisateur_final":
      return "operational"
    default:
      return "other"
  }
}

type DefaultBriefData = {
  company: { lifecycleStatus: string; name: string }
  contacts?: ClientIntelligenceContact[]
  communicationPreset?: CommunicationComposerPreset
}

export function buildDefaultBrief(
  data: DefaultBriefData,
  senderName: string
): CommunicationBrief {
  const { company } = data
  const preset = data.communicationPreset
  const scenario =
    SCENARIO_OPTIONS.find((option) => option.value === preset?.scenario) ??
    SCENARIO_OPTIONS[0]
  const selectedContact = preset?.contactId
    ? data.contacts?.find((contact) => contact.id === preset.contactId)
    : undefined

  return {
    what: {
      channel: preset?.channel ?? scenario.defaultChannel,
      scenario: scenario.value,
      length: preset?.length ?? "standard",
    },
    who: {
      sender: {
        role: "business_manager",
        name: senderName,
      },
      recipient: {
        type: recipientTypeFromLifecycle(company.lifecycleStatus),
        persona: selectedContact
          ? personaFromRelationshipRole(selectedContact.relationshipRole)
          : "other",
        relation: relationFromLifecycle(company.lifecycleStatus),
        contactId: selectedContact?.id,
        displayName: selectedContact?.fullName,
        companyName: company.name,
      },
      objective: preset?.objective ?? scenario.defaultObjective,
    },
    how: {
      tone: preset?.tone ?? "direct",
      formality: "vous",
      language: "fr",
    },
    context: {
      ...(preset?.refs ?? {}),
      ...(preset?.mustInclude ? { mustInclude: preset.mustInclude } : {}),
      ...(preset?.mustExclude ? { mustExclude: preset.mustExclude } : {}),
    },
  }
}
