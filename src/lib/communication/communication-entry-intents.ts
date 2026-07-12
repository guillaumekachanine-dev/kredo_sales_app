import type {
  CanonicalCommunicationActivityCategory,
  CommunicationBrief,
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
  CommunicationOutputKind,
  CommunicationRecipientType,
  CommunicationScenario,
  CommunicationScope,
} from "@/lib/n8n/types"
import type {
  CommunicationComposerPrimaryEntity,
  CommunicationComposerRequest,
} from "@/lib/communication/communication-composer"
import {
  getScenarioDefinition,
  SCENARIO_REGISTRY,
} from "@/lib/communication/communication-scenario-registry"
import {
  resolveCommunicationOptions,
  type CommunicationContextFacts,
} from "@/lib/communication/communication-options-resolver"

export type CommunicationEntryIntent =
  | "signal_outreach"
  | "prospection_follow_up"
  | "discovery_preparation"
  | "proposal_follow_up"
  | "proposal_defense"
  | "price_objection"
  | "mission_renewal"
  | "sector_rebound"
  | "sector_persona_preparation"
  | "delivery_risk_message"
  | "delivery_risk_briefing"
  | "milestone_validation"
  | "steering_committee"
  | "candidate_contact"
  | "candidate_interview"
  | "candidate_availability"
  | "candidate_feedback"
  | "candidate_closing"
  | "candidate_mobility_salary"
  | "candidate_to_client"
  | "atypical_candidate_defense"
  | "opportunity_to_candidate"
  | "recruiter_preparation"
  | "consultant_message"
  | "consultant_recognition"
  | "consultant_one_to_one"
  | "consultant_feedback_follow_up"
  | "consultant_feedback_talk_track"
  | "consultant_assignment_change"
  | "consultant_intercontract_message"
  | "consultant_intercontract_talk_track"
  | "consultant_retention_briefing"
  | "consultant_retention_follow_up"
  | "consultant_annual_review"
  | "consultant_annual_review_follow_up"
  | "consultant_sensitive_meeting"
  | "consultant_disciplinary_meeting"
  | "consultant_difficult_announcement"
  | "staffing_help"
  | "staffing_priority"
  | "staffing_review"
  | "manager_status_update"
  | "manager_arbitrage"
  | "manager_business_review"
  | "internal_committee"
  | "internal_decision_summary"
  | "practice_support"
  | "presales_support"
  | "presales_kickoff"
  | "finance_invoice_follow_up"
  | "finance_resource_arbitrage"
  | "finance_investment_arbitrage"
  | "direction_summary"
  | "agenda_event_preparation"

export type CommunicationEntryEntityKind =
  | "company"
  | "contact"
  | "opportunity"
  | "mission"
  | "candidate"
  | "collaborator"
  | "offer"
  | "signal"
  | "sector"
  | "event"
  | "invoice"

export type CommunicationEntryIntentDefinition = {
  label: string
  activityCategory: CanonicalCommunicationActivityCategory
  scope: CommunicationScope
  scenario: CommunicationScenario
  outputKind: CommunicationOutputKind
  requiredEntityKinds: CommunicationEntryEntityKind[]
  optionalReferenceKinds: CommunicationEntryEntityKind[]
}

export type CommunicationEntryContext = {
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  contactName?: string | null
  opportunityId?: string | null
  opportunityTitle?: string | null
  missionId?: string | null
  missionTitle?: string | null
  candidateId?: string | null
  candidateName?: string | null
  collaboratorId?: string | null
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
  recipientType?: CommunicationRecipientType
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
  internalRecipientName?: string | null
  mustInclude?: string | null
  origin?: CommunicationComposerRequest["origin"]
}

export type CommunicationEntryPresetResult =
  | {
    ok: true
    definition: CommunicationEntryIntentDefinition
    brief: CommunicationBrief
    request: CommunicationComposerRequest
  }
  | {
    ok: false
    definition: CommunicationEntryIntentDefinition
    error: string
    missingEntityKinds: CommunicationEntryEntityKind[]
  }

export const COMMUNICATION_ENTRY_INTENTS = {
  signal_outreach: {
    label: "Contacter sur ce signal",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "signal_outreach",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "contact", "signal", "sector"],
  },
  prospection_follow_up: {
    label: "Relancer",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "follow_up_no_reply",
    outputKind: "written_message",
    requiredEntityKinds: ["company"],
    optionalReferenceKinds: ["contact", "signal"],
  },
  discovery_preparation: {
    label: "Préparer la découverte",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "meeting_prep_discovery",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company"],
    optionalReferenceKinds: ["contact", "opportunity", "signal"],
  },
  proposal_follow_up: {
    label: "Relancer la proposition",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "proposal_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "opportunity"],
    optionalReferenceKinds: ["contact", "offer"],
  },
  proposal_defense: {
    label: "Préparer la soutenance",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "proposal_defense_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "opportunity"],
    optionalReferenceKinds: ["contact", "offer"],
  },
  price_objection: {
    label: "Répondre à l’objection prix",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "price_objection_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["company", "opportunity"],
    optionalReferenceKinds: ["contact", "offer"],
  },
  mission_renewal: {
    label: "Préparer le renouvellement",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "mission_renewal",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity", "offer"],
  },
  sector_rebound: {
    label: "Rebondir sur le secteur",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "sector_rebound",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "contact", "sector", "signal"],
  },
  sector_persona_preparation: {
    label: "Préparer le pitch persona",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "sector_persona_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "contact", "sector"],
  },
  delivery_risk_message: {
    label: "Communiquer sur le risque",
    activityCategory: "delivery",
    scope: "account",
    scenario: "risk_communication",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  delivery_risk_briefing: {
    label: "Préparer l’escalade",
    activityCategory: "delivery",
    scope: "account",
    scenario: "escalation_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  milestone_validation: {
    label: "Valider un jalon",
    activityCategory: "delivery",
    scope: "account",
    scenario: "milestone_validation_request",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  steering_committee: {
    label: "Préparer le COPIL",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "tense_copil_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  candidate_contact: {
    label: "Contacter le candidat",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_interview: {
    label: "Inviter à l’entretien",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_interview_invitation",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_availability: {
    label: "Vérifier la disponibilité",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_availability_check",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_feedback: {
    label: "Envoyer le feedback",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_post_interview_feedback",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_closing: {
    label: "Préparer le closing",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_closing_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_mobility_salary: {
    label: "Préparer mobilité et salaire",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "mobility_salary_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_to_client: {
    label: "Présenter au client",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_to_client_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "candidate", "opportunity"],
    optionalReferenceKinds: ["contact"],
  },
  atypical_candidate_defense: {
    label: "Défendre un profil atypique",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "atypical_candidate_defense",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "candidate", "opportunity"],
    optionalReferenceKinds: ["contact"],
  },
  opportunity_to_candidate: {
    label: "Présenter le besoin",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "opportunity_to_candidate_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["candidate", "opportunity"],
    optionalReferenceKinds: ["company"],
  },
  recruiter_preparation: {
    label: "Préparer l’entretien",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "recruiter_briefing_pre_interview",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  consultant_message: {
    label: "Message consultant",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "manager_collaborator_internal",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_recognition: {
    label: "Reconnaissance",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "collaborator_recognition",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_one_to_one: {
    label: "Point 1:1",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "one_on_one_alignment",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_feedback_follow_up: {
    label: "Feedback écrit",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "performance_feedback_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_feedback_talk_track: {
    label: "Feedback oral",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "performance_feedback_talk_track",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_assignment_change: {
    label: "Changement de mission",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "assignment_change_notice",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_intercontract_message: {
    label: "Plan intercontrat",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "intercontract_action_plan_message",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: [],
  },
  consultant_intercontract_talk_track: {
    label: "Sortie d’intercontrat",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "intercontract_exit_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: [],
  },
  consultant_retention_briefing: {
    label: "Rétention",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "retention_conversation_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: [],
  },
  consultant_retention_follow_up: {
    label: "Suivi rétention",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "consultant_retention_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: [],
  },
  consultant_annual_review: {
    label: "Entretien annuel",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "performance_review_prep",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_annual_review_follow_up: {
    label: "Suivi annuel",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "annual_review_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_sensitive_meeting: {
    label: "Échange sensible",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "sensitive_meeting_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_disciplinary_meeting: {
    label: "Recadrage",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "disciplinary_meeting_posture",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  consultant_difficult_announcement: {
    label: "Annonce difficile",
    activityCategory: "management_consultants",
    scope: "collaborator",
    scenario: "difficult_announcement_talk_track",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["collaborator"],
    optionalReferenceKinds: ["mission"],
  },
  staffing_help: {
    label: "Demander de l’aide",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "staffing_help_request",
    outputKind: "written_message",
    requiredEntityKinds: ["opportunity"],
    optionalReferenceKinds: ["company", "mission", "candidate", "collaborator", "offer"],
  },
  staffing_priority: {
    label: "Faire prioriser",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "staffing_priority_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["opportunity"],
    optionalReferenceKinds: ["company", "mission", "candidate", "collaborator", "offer"],
  },
  staffing_review: {
    label: "Préparer la revue",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "staffing_review_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission", "candidate", "collaborator", "offer"],
  },
  manager_status_update: {
    label: "Point de statut",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "manager_status_update",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission", "collaborator"],
  },
  manager_arbitrage: {
    label: "Demander un arbitrage",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "internal_arbitrage_request",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission", "collaborator"],
  },
  manager_business_review: {
    label: "Business review",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "quarterly_business_review",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission"],
  },
  internal_committee: {
    label: "Préparer le comité",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "internal_committee_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission"],
  },
  internal_decision_summary: {
    label: "Synthèse décisions",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "internal_decision_summary",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission"],
  },
  practice_support: {
    label: "Appui Practice",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "practice_support_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission", "offer"],
  },
  presales_support: {
    label: "Appui avant-vente",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "presales_support_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "offer"],
  },
  presales_kickoff: {
    label: "Kickoff avant-vente",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "presales_kickoff_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "offer"],
  },
  finance_invoice_follow_up: {
    label: "Relancer la facture",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "invoice_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "invoice"],
    optionalReferenceKinds: ["contact"],
  },
  finance_resource_arbitrage: {
    label: "Préparer un arbitrage",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "resource_arbitrage_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "mission", "opportunity", "collaborator"],
  },
  finance_investment_arbitrage: {
    label: "Demande d’investissement",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "investment_arbitrage_argument",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "mission", "opportunity"],
  },
  direction_summary: {
    label: "Synthèse direction",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "direction_summary_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "opportunity", "mission"],
  },
  agenda_event_preparation: {
    label: "Préparer avec l’IA",
    activityCategory: "internal_staff",
    scope: "internal",
    scenario: "weekly_briefing_prep",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["event"],
    optionalReferenceKinds: ["company", "contact", "opportunity", "mission", "candidate", "collaborator"],
  },
} satisfies Record<CommunicationEntryIntent, CommunicationEntryIntentDefinition>

function hasEntity(kind: CommunicationEntryEntityKind, context: CommunicationEntryContext) {
  switch (kind) {
    case "company":
      return Boolean(context.companyId || context.companyName)
    case "contact":
      return Boolean(context.contactId)
    case "opportunity":
      return Boolean(context.opportunityId)
    case "mission":
      return Boolean(context.missionId)
    case "candidate":
      return Boolean(context.candidateId)
    case "collaborator":
      return Boolean(context.collaboratorId)
    case "offer":
      return Boolean(context.offerId)
    case "signal":
      return Boolean(context.signalId)
    case "sector":
      return Boolean(context.sectorId || context.sectorName)
    case "event":
      return Boolean(context.eventId)
    case "invoice":
      return Boolean(context.invoiceId || context.invoiceReference)
  }
}

function entityLabel(kind: CommunicationEntryEntityKind) {
  switch (kind) {
    case "company":
      return "compte"
    case "contact":
      return "contact"
    case "opportunity":
      return "opportunité"
    case "mission":
      return "mission"
    case "candidate":
      return "candidat"
    case "collaborator":
      return "collaborateur"
    case "offer":
      return "offre"
    case "signal":
      return "signal"
    case "sector":
      return "secteur"
    case "event":
      return "événement"
    case "invoice":
      return "facture"
  }
}

function buildContextReferences(context: CommunicationEntryContext): Partial<CommunicationBrief["context"]> {
  return {
    ...(context.companyId ? { companyRef: context.companyId } : {}),
    ...(context.opportunityId ? { opportunityRef: context.opportunityId } : {}),
    ...(context.missionId ? { missionRef: context.missionId } : {}),
    ...(context.candidateId ? { profileRef: context.candidateId } : {}),
    ...(context.collaboratorId ? { collaboratorRef: context.collaboratorId } : {}),
    ...(context.offerId ? { offerRef: context.offerId } : {}),
    ...(context.signalId ? { signalRef: context.signalId } : {}),
  }
}

function buildPrimaryEntity(context: CommunicationEntryContext): CommunicationComposerPrimaryEntity | null {
  if (context.eventId) return { type: "calendar_event", id: context.eventId }
  if (context.collaboratorId) return { type: "collaborator", id: context.collaboratorId }
  if (context.missionId) return { type: "mission", id: context.missionId }
  if (context.opportunityId) return { type: "opportunity", id: context.opportunityId }
  if (context.candidateId) return { type: "candidate", id: context.candidateId }
  if (context.companyId) return { type: "company", id: context.companyId }
  if (context.sectorId) return { type: "sector", id: context.sectorId }
  return null
}

function buildMustInclude(definition: CommunicationEntryIntentDefinition, context: CommunicationEntryContext) {
  const lines = [
    context.companyName ? `Compte : ${context.companyName}` : null,
    context.contactName ? `Contact : ${context.contactName}` : null,
    context.opportunityTitle ? `Opportunité : ${context.opportunityTitle}` : null,
    context.missionTitle ? `Mission : ${context.missionTitle}` : null,
    context.candidateName ? `Candidat : ${context.candidateName}` : null,
    context.collaboratorName ? `Collaborateur : ${context.collaboratorName}` : null,
    context.sectorName ? `Secteur : ${context.sectorName}` : null,
    context.eventTitle ? `Événement : ${context.eventTitle}` : null,
    context.eventType ? `Type événement : ${context.eventType}` : null,
    context.eventStartsAt ? `Date événement : ${context.eventStartsAt}` : null,
    context.eventLocation ? `Lieu : ${context.eventLocation}` : null,
    context.eventMeetingUrl ? `Lien réunion : ${context.eventMeetingUrl}` : null,
    context.eventParticipants?.length ? `Participants connus : ${context.eventParticipants.join(", ")}` : null,
    context.eventDescription ? `Description événement : ${context.eventDescription}` : null,
    context.invoiceReference ? `Facture : ${context.invoiceReference}` : null,
    context.invoiceAmount ? `Montant facture : ${context.invoiceAmount}` : null,
    context.invoiceDueDate ? `Échéance facture : ${context.invoiceDueDate}` : null,
    context.invoiceStatus ? `Statut facture : ${context.invoiceStatus}` : null,
    context.internalRole ? `Rôle destinataire interne : ${context.internalRole}` : null,
    context.internalRelationship ? `Relation interne : ${context.internalRelationship}` : null,
    context.internalDomain ? `Domaine interne : ${context.internalDomain}` : null,
    context.internalRecipientName ? `Destinataire interne : ${context.internalRecipientName}` : null,
    context.mustInclude,
  ].filter(Boolean)

  if (lines.length === 0) return undefined
  return [
    `[POINT_ENTREE_CONTEXT]\nIntention : ${definition.label}`,
    ...lines,
  ].join("\n")
}

function buildBrief(definition: CommunicationEntryIntentDefinition, context: CommunicationEntryContext): CommunicationBrief {
  const scenario = getScenarioDefinition(definition.scenario)
  const recipientType = context.recipientType ??
    (definition.scope === "collaborator" ? "collaborator" : definition.scope === "internal" ? "internal" : definition.activityCategory === "recrutement" && (
      definition.scenario === "candidate_to_client_pitch" ||
      definition.scenario === "atypical_candidate_defense"
    ) ? "active_client" : definition.activityCategory === "recrutement" ? "candidate" : definition.activityCategory === "commerce_actif" || definition.activityCategory === "delivery" ? "active_client" : "prospect")
  const isAccountScope = definition.scope === "account"
  const isCollaboratorScope = definition.scope === "collaborator"
  const isInternalScope = definition.scope === "internal"
  const displayName = isCollaboratorScope
    ? context.collaboratorName ?? undefined
    : isInternalScope
      ? context.internalRecipientName ?? undefined
      : recipientType === "candidate"
        ? context.candidateName ?? undefined
        : context.contactName ?? undefined

  return {
    what: {
      scenario: definition.scenario,
      outputKind: definition.outputKind,
      activityCategory: definition.activityCategory,
      scope: definition.scope,
      channel: scenario?.defaultChannel ?? (definition.outputKind === "structured_briefing" ? "meeting_briefing" : "email"),
      length: "standard",
    },
    who: {
      sender: {
        role: "business_manager",
        name: "",
      },
      recipient: {
        type: recipientType,
        persona: "other",
        relation: definition.activityCategory === "commerce_actif" || definition.activityCategory === "delivery" ? "active_client" : "unknown",
        contactId: isAccountScope ? context.contactId ?? undefined : undefined,
        collaboratorId: isCollaboratorScope ? context.collaboratorId ?? undefined : undefined,
        displayName,
        companyName: isAccountScope ? context.companyName ?? undefined : undefined,
        internalRole: isInternalScope ? context.internalRole ?? undefined : undefined,
        internalRelationship: isInternalScope ? context.internalRelationship ?? undefined : undefined,
        internalDomain: isInternalScope ? context.internalDomain ?? undefined : undefined,
      },
      objective: scenario?.defaultObjective ?? "get_meeting",
    },
    how: {
      tone: scenario?.suggestedTones[0] ?? "direct",
      formality: definition.scope === "collaborator" || definition.scope === "internal" ? "tu" : "vous",
      language: "fr",
    },
    context: {
      ...buildContextReferences(context),
      mustInclude: buildMustInclude(definition, context),
    },
  }
}

function buildFacts(definition: CommunicationEntryIntentDefinition, context: CommunicationEntryContext): CommunicationContextFacts {
  return {
    scope: definition.scope,
    recipientType: context.recipientType,
    hasCompany: hasEntity("company", context),
    hasContact: hasEntity("contact", context),
    hasOpportunity: hasEntity("opportunity", context),
    hasMission: hasEntity("mission", context),
    hasCandidate: hasEntity("candidate", context),
    hasCollaborator: hasEntity("collaborator", context),
    hasOffer: hasEntity("offer", context),
    internalRole: context.internalRole,
    internalRelationship: context.internalRelationship,
    internalDomain: context.internalDomain,
  }
}

export function buildCommunicationEntryPreset(
  intent: CommunicationEntryIntent,
  context: CommunicationEntryContext = {},
): CommunicationEntryPresetResult {
  const definition = COMMUNICATION_ENTRY_INTENTS[intent]
  const missingEntityKinds = definition.requiredEntityKinds.filter((kind) => !hasEntity(kind, context))
  if (missingEntityKinds.length > 0) {
    return {
      ok: false,
      definition,
      missingEntityKinds,
      error: `Contexte insuffisant : ${missingEntityKinds.map(entityLabel).join(", ")} requis.`,
    }
  }

  const scenario = getScenarioDefinition(definition.scenario)
  if (!scenario) {
    return {
      ok: false,
      definition,
      missingEntityKinds: [],
      error: `Scénario ${definition.scenario} absent de la registry.`,
    }
  }

  const draft = buildBrief(definition, context)
  const resolution = resolveCommunicationOptions(buildFacts(definition, context), draft)
  const brief = resolution.normalizedBrief

  if (brief.what.scenario !== definition.scenario) {
    return {
      ok: false,
      definition,
      missingEntityKinds: [],
      error: `Le scénario ${definition.scenario} est incompatible avec le contexte fourni.`,
    }
  }

  const contextReferences = buildContextReferences(context)
  return {
    ok: true,
    definition,
    brief,
    request: {
      origin: context.origin ?? "global",
      scope: definition.scope,
      companyId: context.companyId ?? null,
      companyName: context.companyName ?? null,
      contactId: context.contactId ?? null,
      primaryEntity: buildPrimaryEntity(context),
      selectedOutputKind: brief.what.outputKind,
      initialBrief: brief,
      contextReferences,
      preset: {
        scenario: brief.what.scenario,
        outputKind: brief.what.outputKind,
        activityCategory: definition.activityCategory,
        channel: brief.what.channel,
        objective: brief.who.objective,
        length: brief.what.length,
        tone: brief.how.tone,
        contactId: context.contactId ?? undefined,
        refs: contextReferences,
        mustInclude: brief.context.mustInclude,
      },
    },
  }
}

export function assertCommunicationEntryRegistryIntegrity() {
  for (const [intent, definition] of Object.entries(COMMUNICATION_ENTRY_INTENTS)) {
    const scenario = SCENARIO_REGISTRY.find((item) => item.value === definition.scenario)
    if (!scenario) throw new Error(`${intent}: scenario ${definition.scenario} is not registered`)
    if (scenario.activityCategory !== definition.activityCategory) {
      throw new Error(`${intent}: activity category mismatch`)
    }
    if (!scenario.requiredScopes.includes(definition.scope)) {
      throw new Error(`${intent}: scope ${definition.scope} is not allowed`)
    }
    if (!scenario.allowedOutputKinds.includes(definition.outputKind)) {
      throw new Error(`${intent}: output kind ${definition.outputKind} is not allowed`)
    }
  }
}
