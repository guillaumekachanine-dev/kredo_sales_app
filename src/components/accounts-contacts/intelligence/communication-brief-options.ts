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
  family: "sales" | "recruitment" | "delivery" | "internal"
  defaultChannel: CommunicationChannel
  defaultObjective: CommunicationObjective
}[] = [
  { value: "signal_outreach", label: "Premier contact (signal/actualité)", family: "sales", defaultChannel: "email", defaultObjective: "get_meeting" },
  { value: "follow_up_no_reply", label: "Relance sans réponse", family: "sales", defaultChannel: "email", defaultObjective: "get_reply" },
  { value: "post_meeting", label: "Suivi après rendez-vous", family: "sales", defaultChannel: "email", defaultObjective: "confirm_next_steps" },
  { value: "profile_submission", label: "Envoi de profil", family: "sales", defaultChannel: "email", defaultObjective: "submit_profile" },
  { value: "cross_sell", label: "Cross-sell / mission existante", family: "sales", defaultChannel: "email", defaultObjective: "present_offer" },
  { value: "reactivation", label: "Réactivation ancien client", family: "sales", defaultChannel: "email", defaultObjective: "reactivate" },
  { value: "proposal_follow_up", label: "Relance de proposition", family: "sales", defaultChannel: "email", defaultObjective: "accelerate_decision" },
  { value: "offer_introduction", label: "Présentation d'offre", family: "sales", defaultChannel: "email", defaultObjective: "present_offer" },
  { value: "candidate_interview_invitation", label: "Invitation à un entretien candidat", family: "recruitment", defaultChannel: "email", defaultObjective: "invite_to_interview" },
  { value: "candidate_follow_up", label: "Relance candidat", family: "recruitment", defaultChannel: "email", defaultObjective: "get_reply" },
  { value: "candidate_offer", label: "Proposition d'embauche", family: "recruitment", defaultChannel: "email", defaultObjective: "send_offer" },
  { value: "candidate_rejection", label: "Refus candidat", family: "recruitment", defaultChannel: "email", defaultObjective: "reject_candidate" },
  { value: "appointment_confirmation", label: "Confirmation de rendez-vous", family: "sales", defaultChannel: "email", defaultObjective: "confirm_next_steps" },
  { value: "manager_collaborator_internal", label: "Communication manager/collaborateur", family: "internal", defaultChannel: "internal_note", defaultObjective: "align_internal" },
  { value: "cra_absence_reminder", label: "Rappel CRA ou absence", family: "internal", defaultChannel: "email", defaultObjective: "request_action" },
  { value: "invoice_follow_up", label: "Relance de facture", family: "sales", defaultChannel: "email", defaultObjective: "secure_payment" },
  { value: "project_alert_escalation", label: "Alerte projet / escalade client", family: "delivery", defaultChannel: "email", defaultObjective: "escalate_issue" },
  { value: "steering_committee_minutes", label: "Compte-rendu de comité de pilotage", family: "delivery", defaultChannel: "email", defaultObjective: "summarize_decisions" },
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
  { value: "invite_to_interview", label: "Inviter à un entretien" },
  { value: "send_offer", label: "Transmettre une proposition" },
  { value: "reject_candidate", label: "Refuser une candidature" },
  { value: "align_internal", label: "Aligner en interne" },
  { value: "request_action", label: "Demander une action" },
  { value: "secure_payment", label: "Sécuriser le paiement" },
  { value: "escalate_issue", label: "Escalader un sujet" },
  { value: "summarize_decisions", label: "Synthétiser décisions et actions" },
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

export type CommunicationEntryPoint =
  | "contact_drawer"
  | "account_row"
  | "signal_card"
  | "meeting_interaction"
  | "missed_follow_up"
  | "proposal_sent"
  | "candidate_positioning"
  | "active_mission"
  | "former_client"
  | "sector_offer"

const ENTRY_POINT_SCENARIOS: Record<CommunicationEntryPoint, {
  label: string
  scenario: CommunicationScenario
  channel?: CommunicationChannel
  objective?: CommunicationObjective
  tone?: CommunicationTone
  relation?: CommunicationRelation
  recipientType?: CommunicationRecipientType
  length?: CommunicationLength
  contextHint?: string
}> = {
  contact_drawer: {
    label: "Rédiger un email",
    scenario: "signal_outreach",
    relation: "warm",
    contextHint: "Utilise le compte, le contact, sa persona et l'historique de relation pour personnaliser l'accroche.",
  },
  account_row: {
    label: "Rédiger un message",
    scenario: "signal_outreach",
    relation: "unknown",
    contextHint: "Rédige un message contextualisé au niveau du compte, sans supposer un destinataire précis.",
  },
  signal_card: {
    label: "Contacter sur ce signal",
    scenario: "signal_outreach",
    contextHint: "Ancre le message sur le signal référencé et transforme ce signal en raison de contact crédible.",
  },
  meeting_interaction: {
    label: "Rédiger le suivi",
    scenario: "post_meeting",
    objective: "confirm_next_steps",
    relation: "established",
    contextHint: "Reprends les décisions et prochaines étapes de l'interaction sans inventer d'engagement.",
  },
  missed_follow_up: {
    label: "Préparer la relance",
    scenario: "follow_up_no_reply",
    objective: "get_reply",
    contextHint: "Relance sans culpabiliser le destinataire et propose une prochaine étape simple.",
  },
  proposal_sent: {
    label: "Relancer la proposition",
    scenario: "proposal_follow_up",
    objective: "accelerate_decision",
    relation: "warm",
    contextHint: "Relance la proposition envoyée en rappelant la valeur et les points de décision attendus.",
  },
  candidate_positioning: {
    label: "Envoyer le profil",
    scenario: "profile_submission",
    objective: "submit_profile",
    contextHint: "Présente le profil candidat au regard de l'opportunité ciblée, avec preuves concrètes et disponibilité.",
  },
  active_mission: {
    label: "Proposer une extension",
    scenario: "cross_sell",
    objective: "present_offer",
    relation: "active_client",
    contextHint: "Part de la mission active et propose une extension utile sans forcer la vente.",
  },
  former_client: {
    label: "Réactiver la relation",
    scenario: "reactivation",
    objective: "reactivate",
    recipientType: "former_client",
    relation: "former",
    contextHint: "Réactive la relation en s'appuyant sur l'historique, avec une approche légère et concrète.",
  },
  sector_offer: {
    label: "Présenter cette offre",
    scenario: "offer_introduction",
    objective: "present_offer",
    contextHint: "Présente l'offre avec un angle sectoriel clair et une invitation à échanger.",
  },
}

export function getCommunicationEntryPoint(entryPoint: CommunicationEntryPoint) {
  return ENTRY_POINT_SCENARIOS[entryPoint]
}

export function applyCommunicationEntryPoint(
  brief: CommunicationBrief,
  entryPoint: CommunicationEntryPoint,
  refs?: Partial<CommunicationBrief["context"]>
): CommunicationBrief {
  const preset = ENTRY_POINT_SCENARIOS[entryPoint]
  const scenario = SCENARIO_OPTIONS.find((option) => option.value === preset.scenario)
  const contextHint = preset.contextHint
  const mustInclude = [
    contextHint,
    brief.context.mustInclude,
  ].filter(Boolean).join("\n\n")

  return {
    ...brief,
    what: {
      ...brief.what,
      scenario: preset.scenario,
      channel: preset.channel ?? scenario?.defaultChannel ?? brief.what.channel,
      length: preset.length ?? brief.what.length,
    },
    who: {
      ...brief.who,
      recipient: {
        ...brief.who.recipient,
        ...(preset.recipientType ? { type: preset.recipientType } : {}),
        ...(preset.relation ? { relation: preset.relation } : {}),
      },
      objective: preset.objective ?? scenario?.defaultObjective ?? brief.who.objective,
    },
    how: {
      ...brief.how,
      ...(preset.tone ? { tone: preset.tone } : {}),
    },
    context: {
      ...brief.context,
      ...refs,
      mustInclude,
    },
  }
}
