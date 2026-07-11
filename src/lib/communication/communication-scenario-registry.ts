import type {
  CanonicalCommunicationActivityCategory,
  CommunicationChannel,
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
  CommunicationLength,
  CommunicationObjective,
  CommunicationOutputKind,
  CommunicationPersona,
  CommunicationRecipientType,
  CommunicationRelation,
  CommunicationScenario,
  CommunicationScope,
  CommunicationTone,
} from "@/lib/n8n/types"

// ─── ADR-0013 — Catalogue de scénarios de communication ─────────────────────
// Source de vérité unique pour la sélection catégorisée "Rédiger un mail" /
// "Générer un pitch" (remplace la liste plate SCENARIO_OPTIONS, désormais
// dérivée de ce registre — voir communication-brief-options.ts).
//
// ADR-0013 Lot 2 — outputKind/activityCategory/scope pilotent désormais le
// comportement réel (brief.what.outputKind, offerRef gating par
// scenario.requiresOffer) au lieu d'être de la métadonnée dormante. Les types
// canoniques vivent dans n8n/types.ts (contrat de wire avec input_snapshot) ;
// alias locaux conservés pour ne pas casser les imports existants
// (ScenarioPickerModal.tsx, communication-brief-options.ts).

// Compatibilité transitoire Lot 1 : la registry conserve ses cinq catégories
// historiques jusqu'à son reclassement au Lot 2. Le contrat wire accepte déjà
// les six catégories canoniques et la valeur legacy.
export type ActivityCategory = CanonicalCommunicationActivityCategory
export type ScenarioOutputKind = CommunicationOutputKind
export type ScenarioUseCase = "mail" | "pitch" | "both"

export type CommunicationScenarioDefinition = {
  id: CommunicationScenario
  label: string
  description: string
  activityCategory: CanonicalCommunicationActivityCategory
  allowedOutputKinds: CommunicationOutputKind[]
  defaultOutputKind: CommunicationOutputKind
  requiredScopes: CommunicationScope[]
  eligibleRecipientTypes: CommunicationRecipientType[]
  allowedChannels: CommunicationChannel[]
  defaultChannel: CommunicationChannel
  allowedObjectives: CommunicationObjective[]
  defaultObjective: CommunicationObjective
  allowedLengths: CommunicationLength[]
  requiresOffer: boolean
  requiredFacts: string[]
  optionalFacts: string[]
  requiredReferences: string[]
  optionalReferences: string[]
  requiredContextSources: string[]
  optionalContextSources: string[]
  suggestedTones: CommunicationTone[]
  excludedTones: CommunicationTone[]
  eligiblePersonas?: CommunicationPersona[]
  eligibleRelations?: CommunicationRelation[]
  eligibleInternalRoles?: CommunicationInternalRecipientRole[]
  eligibleInternalRelationships?: CommunicationInternalRelationship[]
  eligibleInternalDomains?: CommunicationInternalDomain[]
}

export type ScenarioRegistryItem = CommunicationScenarioDefinition & {
  value: CommunicationScenario
  useCase: ScenarioUseCase
}

type ScenarioSeed = Pick<ScenarioRegistryItem,
  "value" | "label" | "description" | "activityCategory" | "useCase" |
  "defaultOutputKind" | "defaultChannel" | "defaultObjective" | "requiresOffer" | "requiredScopes"
> & {
  allowedOutputKinds?: CommunicationOutputKind[]
  allowedObjectives?: CommunicationObjective[]
  // Lot 7 — override du destinataire éligible au niveau du scénario plutôt que
  // de la catégorie (ex: recrutement mélange des scénarios adressés au candidat
  // et d'autres adressés au client — le défaut de catégorie ne peut pas les
  // distinguer). Absent = comportement historique (défaut de catégorie).
  eligibleRecipientTypes?: CommunicationRecipientType[]
  // Lot 8 — override des tons suggérés au niveau du scénario (handoff §15.2 :
  // reconnaissance, recadrage, annonce difficile, rétention... exigent des
  // registres différents que le défaut uniforme de catégorie ne peut pas
  // représenter). Absent = comportement historique (défaut de catégorie).
  suggestedTones?: CommunicationTone[]
}

export const ACTIVITY_CATEGORY_OPTIONS: {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
}[] = [
  { value: "commerce_prospection", label: "Commerce · Prospection", dataviz: 1 },
  { value: "commerce_actif", label: "Commerce · Périmètre actif", dataviz: 2 },
  { value: "delivery", label: "Delivery", dataviz: 3 },
  { value: "recrutement", label: "Recrutement", dataviz: 4 },
  { value: "management_consultants", label: "Management consultants", dataviz: 5 },
  { value: "internal_staff", label: "Interne · Staff", dataviz: 6 },
]

const SCENARIO_SEEDS: ScenarioSeed[] = [
  // ─── Commerce · Prospection ────────────────────────────────────────────
  {
    value: "signal_outreach",
    label: "Premier contact (signal/actualité)",
    description: "Prise de contact initiale en s'appuyant sur un signal ou une actualité récente.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "follow_up_no_reply",
    label: "Relance sans réponse",
    description: "Relance légère après un premier message resté sans réponse.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_reply",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "offer_introduction",
    label: "Présentation d'offre",
    description: "Présente une offre ou une practice Kredo en partant du besoin client.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "present_offer",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "appointment_confirmation",
    label: "Confirmation de rendez-vous",
    description: "Confirme un rendez-vous à venir avec les informations pratiques.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "confirm_next_steps",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "first_contact_after_nomination",
    label: "Prise de contact après nomination",
    description: "Aborde un décideur nouvellement nommé sur un poste pertinent.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "linkedin_to_email_bridge",
    label: "Bascule LinkedIn → email",
    description: "Poursuit par email une conversation entamée sur LinkedIn.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_reply",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "event_invitation",
    label: "Invitation événement / webinar",
    description: "Invite le destinataire à un événement ou un webinar Kredo.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "sector_rebound",
    label: "Rebond sur actualité sectorielle",
    description: "S'appuie sur une actualité du secteur du compte pour justifier la prise de contact.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "discovery_meeting_request",
    label: "Demande de RDV découverte",
    description: "Sollicite explicitement un premier rendez-vous de découverte.",
    activityCategory: "commerce_prospection",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "cold_call_pitch",
    label: "Cold call prospect",
    description: "Script de pitch oral pour un appel de prospection à froid ou tiède, 30 secondes environ.",
    activityCategory: "commerce_prospection",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "get_meeting",
    requiresOffer: true,
    requiredScopes: ["account"],
  },
  {
    value: "meeting_prep_discovery",
    label: "Préparation RDV découverte",
    description: "Fiche de préparation pour un premier rendez-vous de découverte, sans ancrage catalogue obligatoire.",
    activityCategory: "commerce_prospection",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "signal_based_pitch",
    label: "Pitch ancré sur un signal",
    description: "Pitch oral construit autour d'un signal de veille précis plutôt qu'une offre catalogue.",
    activityCategory: "commerce_prospection",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "sector_persona_pitch",
    label: "Pitch sectoriel / persona",
    description: "Brief de RDV orienté par les enjeux du secteur et le persona du décideur ciblé.",
    activityCategory: "commerce_prospection",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "why_us_now_pitch",
    label: "Pitch « pourquoi nous maintenant »",
    description: "Argumentaire oral sur l'urgence et la légitimité de Kredo à ce moment précis.",
    activityCategory: "commerce_prospection",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "first_objection_bad_timing",
    label: "Réponse « pas le bon moment »",
    description: "Réplique orale à l'objection de timing lors d'un premier contact.",
    activityCategory: "commerce_prospection",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "get_meeting",
    requiresOffer: false,
    requiredScopes: ["account"],
  },

  // ─── Commerce · Périmètre actif ────────────────────────────────────────
  {
    value: "post_meeting",
    label: "Suivi après rendez-vous",
    description: "Remercie, résume les points clés et confirme les prochaines étapes après un RDV.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "confirm_next_steps",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "profile_submission_to_client",
    label: "Envoi de profil",
    description: "Présente un profil consultant ou candidat en le contextualisant sur le besoin.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "submit_profile",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "cross_sell",
    label: "Cross-sell / mission existante",
    description: "Propose un service complémentaire chez un client dont une mission est déjà en cours.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "present_offer",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "reactivation",
    label: "Réactivation ancien client",
    description: "Reprend contact avec un ancien client ou un contact devenu inactif.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "reactivate",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "proposal_follow_up",
    label: "Relance de proposition",
    description: "Relance après l'envoi d'une proposition commerciale en facilitant la décision.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "accelerate_decision",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "invoice_follow_up",
    label: "Relance de facture",
    description: "Relance diplomatique d'une facture impayée ou en retard.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "secure_payment",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "mission_renewal",
    label: "Renouvellement / extension de mission",
    description: "Propose le renouvellement ou l'extension d'une mission en cours.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "accelerate_decision",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "consultant_replacement_notice",
    label: "Annonce de remplacement consultant",
    description: "Informe le client d'un changement de consultant sur la mission.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "announce_change",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "client_tension_apology",
    label: "Message d'apaisement tension client",
    description: "Désamorce par écrit une tension ou une insatisfaction exprimée par le client.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "repair_relationship",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "delivery_delay_notice",
    label: "Annonce de retard de livraison",
    description: "Informe le client d'un retard de livraison en gérant les attentes.",
    activityCategory: "commerce_actif",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "manage_expectations",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "meeting_prep_cross_sell",
    label: "Préparation RDV cross-sell",
    description: "Fiche de préparation pour un RDV chez un client actif visant une offre non encore consommée.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "present_offer",
    requiresOffer: true,
    requiredScopes: ["account"],
  },
  {
    value: "proposal_defense_pitch",
    label: "Soutenance de proposition",
    description: "Brief pour défendre une proposition commerciale à l'oral.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "accelerate_decision",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "renewal_pitch",
    label: "Pitch renouvellement / extension",
    description: "Brief oral pour défendre un renouvellement ou une extension de mission.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "accelerate_decision",
    requiresOffer: true,
    requiredScopes: ["account"],
  },
  {
    value: "price_objection_pitch",
    label: "Réponse objection prix",
    description: "Script oral pour répondre à une objection de prix en RDV.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "accelerate_decision",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "client_crisis_talk_track",
    label: "Pitch de crise client",
    description: "Trame orale pour gérer une crise ou un point de tension fort avec un client.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "de_escalate_tension",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "delay_talk_track",
    label: "Annonce retard / difficulté livraison",
    description: "Trame orale pour annoncer et gérer un retard ou une difficulté de livraison en RDV.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "manage_expectations",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "tense_copil_briefing",
    label: "Brief comité de pilotage tendu",
    description: "Prépare la posture et les messages clés pour un comité de pilotage sous tension.",
    activityCategory: "commerce_actif",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["account"],
  },

  // ─── Delivery ────────────────────────────────────────────────────────
  {
    value: "project_alert_escalation",
    label: "Alerte projet / escalade client",
    description: "Alerte le client sur un risque projet nécessitant une escalade.",
    activityCategory: "delivery",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "escalate_issue",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "steering_committee_minutes",
    label: "Compte-rendu de comité de pilotage",
    description: "Synthétise les décisions et actions d'un comité de pilotage.",
    activityCategory: "delivery",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "risk_communication",
    label: "Communication proactive de risque",
    description: "Alerte le client en amont sur un risque identifié avant qu'il ne se matérialise.",
    activityCategory: "delivery",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "escalate_issue",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "milestone_validation_request",
    label: "Demande de validation de jalon",
    description: "Sollicite la validation client d'un jalon projet.",
    activityCategory: "delivery",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "escalation_briefing",
    label: "Brief avant escalade interne",
    description: "Prépare la présentation d'un risque projet avant escalade interne.",
    activityCategory: "delivery",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "escalate_issue",
    requiresOffer: false,
    requiredScopes: ["account"],
  },
  {
    value: "risk_meeting_briefing",
    label: "Brief avant point risque projet",
    description: "Prépare la posture et les messages clés pour un point dédié à un risque projet.",
    activityCategory: "delivery",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "escalate_issue",
    requiresOffer: false,
    requiredScopes: ["account"],
  },

  // ─── Recrutement ────────────────────────────────────────────────────
  {
    value: "candidate_interview_invitation",
    label: "Invitation à un entretien candidat",
    description: "Invite un candidat à un entretien.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "invite_to_interview",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_follow_up",
    label: "Relance candidat",
    description: "Relance un candidat resté sans réponse.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_reply",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_offer",
    label: "Proposition d'embauche",
    description: "Transmet une proposition d'embauche formelle à un candidat.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "send_offer",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_rejection",
    label: "Refus candidat",
    description: "Notifie un refus de candidature avec tact.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "reject_candidate",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_availability_check",
    label: "Demande de disponibilité / préavis",
    description: "Interroge un candidat sur sa disponibilité ou son préavis.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_post_interview_feedback",
    label: "Feedback après entretien",
    description: "Transmet un retour au candidat après un entretien.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "get_feedback",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_cv_completion_request",
    label: "Demande de complément CV",
    description: "Demande à un candidat de compléter son CV ou son portfolio.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "dormant_talent_pool_reactivation",
    label: "Relance vivier dormant",
    description: "Réactive un candidat resté inactif dans le vivier.",
    activityCategory: "recrutement",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "reactivate",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_to_client_pitch",
    label: "Pitch candidat vers client",
    description: "Présente un candidat à un client de façon structurée et argumentée à l'oral.",
    activityCategory: "recrutement",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "present_offer",
    requiresOffer: false,
    requiredScopes: ["account", "internal"],
    eligibleRecipientTypes: ["active_client", "prospect"],
  },
  {
    value: "opportunity_to_candidate_pitch",
    label: "Pitch opportunité vers candidat",
    description: "Présente une opportunité à un candidat de façon structurée à l'oral.",
    activityCategory: "recrutement",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "submit_profile",
    requiresOffer: false,
    requiredScopes: ["account", "internal"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "candidate_closing_pitch",
    label: "Pitch closing candidat",
    description: "Script oral pour conclure un processus de recrutement avec un candidat.",
    activityCategory: "recrutement",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "close_candidate",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "atypical_candidate_defense",
    label: "Défense d'un candidat atypique",
    description: "Brief pour argumenter en faveur d'un candidat au profil atypique.",
    activityCategory: "recrutement",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "advocate_for_candidate",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["active_client", "prospect"],
  },
  {
    value: "recruiter_briefing_pre_interview",
    label: "Brief recruteur avant entretien",
    description: "Prépare le recruteur avant un entretien candidat.",
    activityCategory: "recrutement",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "align_internal",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },
  {
    value: "mobility_salary_pitch",
    label: "Pitch mobilité / TJM / salaire",
    description: "Script oral pour aborder la mobilité, le TJM ou le salaire avec un candidat.",
    activityCategory: "recrutement",
    useCase: "pitch",
    defaultOutputKind: "spoken_pitch",
    defaultChannel: "spoken_pitch_30s",
    defaultObjective: "negotiate_terms",
    requiresOffer: false,
    requiredScopes: ["account"],
    eligibleRecipientTypes: ["candidate"],
  },

  // ─── Interne · Management ──────────────────────────────────────────────
  {
    value: "manager_collaborator_internal",
    label: "Communication manager/collaborateur",
    description: "Message interne d'un manager à un collaborateur.",
    activityCategory: "management_consultants",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "align_internal",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
  },
  {
    value: "cra_absence_reminder",
    label: "Rappel CRA ou absence",
    description: "Rappelle à un collaborateur de compléter son CRA ou de déclarer une absence.",
    activityCategory: "management_consultants",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "email",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
    suggestedTones: ["direct", "diplomatic"],
  },
  {
    value: "one_on_one_alignment",
    label: "Préparation point 1:1",
    description: "Prépare les messages clés d'un point d'alignement 1:1 avec un collaborateur.",
    activityCategory: "management_consultants",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "align_internal",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
  },
  {
    value: "collaborator_recognition",
    label: "Félicitation / valorisation",
    description: "Valorise par écrit la contribution d'un collaborateur.",
    activityCategory: "management_consultants",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "acknowledge_contribution",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
    suggestedTones: ["warm", "enthusiastic_confident", "direct"],
  },
  {
    value: "assignment_change_notice",
    label: "Annonce changement de mission",
    description: "Informe un collaborateur d'un changement de mission ou de planning.",
    activityCategory: "management_consultants",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "announce_change",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
  },
  {
    value: "internal_arbitrage_request",
    label: "Demande d'arbitrage manager",
    description: "Sollicite un arbitrage de la hiérarchie sur un sujet donné.",
    activityCategory: "internal_staff",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "staffing_help_request",
    label: "Demande d'aide staffing",
    description: "Sollicite de l'aide en interne pour résoudre une problématique de staffing.",
    activityCategory: "internal_staff",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "handover_note",
    label: "Note de passation",
    description: "Rédige une note de passation d'un dossier ou d'un compte.",
    activityCategory: "internal_staff",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "internal_validation_before_send",
    label: "Demande de validation avant envoi client",
    description: "Sollicite une validation interne avant l'envoi d'un message au client.",
    activityCategory: "internal_staff",
    useCase: "mail",
    defaultOutputKind: "written_message",
    defaultChannel: "internal_note",
    defaultObjective: "request_action",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "performance_review_prep",
    label: "Préparation entretien annuel",
    description: "Prépare la structure et les messages clés d'un entretien annuel.",
    activityCategory: "management_consultants",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "align_internal",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
  },
  {
    value: "weekly_briefing_prep",
    label: "Préparation point hebdo",
    description: "Prépare les messages clés d'un point hebdomadaire.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "difficult_announcement_talk_track",
    label: "Talk track annonce difficile",
    description: "Trame orale pour une annonce difficile à un collaborateur (démission imprévue, PSE, réorganisation).",
    activityCategory: "management_consultants",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "deliver_difficult_news",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
    suggestedTones: ["diplomatic", "prudent", "formal"],
  },
  {
    value: "disciplinary_meeting_posture",
    label: "Posture entretien de recadrage",
    description: "Prépare la posture et les messages clés d'un entretien de recadrage.",
    activityCategory: "management_consultants",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "address_performance_issue",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
    suggestedTones: ["assertive", "direct", "diplomatic", "prudent"],
  },
  {
    value: "quarterly_business_review",
    label: "Business review trimestrielle",
    description: "Prépare le discours et la posture pour une business review trimestrielle devant son manager.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "resource_arbitrage_pitch",
    label: "Pitch demande de moyens / arbitrage",
    description: "Argumentaire oral pour obtenir des moyens ou un arbitrage.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "secure_resources",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "intercontract_exit_pitch",
    label: "Pitch sortie d'intercontrat",
    description: "Prépare la discussion de sortie d'intercontrat avec un collaborateur.",
    activityCategory: "management_consultants",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "align_internal",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
    suggestedTones: ["direct", "prudent", "pedagogical"],
  },
  {
    value: "sensitive_meeting_briefing",
    label: "Brief avant point sensible",
    description: "Prépare la posture avant un point sensible avec un collaborateur.",
    activityCategory: "management_consultants",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "align_internal",
    requiresOffer: false,
    requiredScopes: ["collaborator"],
    suggestedTones: ["diplomatic", "prudent", "formal"],
  },
  {
    value: "internal_committee_pitch",
    label: "Pitch en comité interne",
    description: "Prépare une prise de parole devant un comité interne.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "investment_arbitrage_argument",
    label: "Argumentaire arbitrage investissement",
    description: "Construit l'argumentaire oral pour un arbitrage d'investissement.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "secure_resources",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "project_status_pitch",
    label: "Point d'avancement projet",
    description: "Prépare un point d'avancement projet à l'oral.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
  {
    value: "direction_summary_pitch",
    label: "Synthèse orale pour direction",
    description: "Prépare une synthèse orale à destination de la direction.",
    activityCategory: "internal_staff",
    useCase: "pitch",
    defaultOutputKind: "structured_briefing",
    defaultChannel: "meeting_briefing",
    defaultObjective: "summarize_decisions",
    requiresOffer: false,
    requiredScopes: ["internal"],
  },
]

function createLot1Seed(
  value: CommunicationScenario,
  label: string,
  description: string,
  activityCategory: "management_consultants" | "internal_staff",
  defaultOutputKind: CommunicationOutputKind,
  defaultObjective: CommunicationObjective,
  // Lot 8 — override ponctuel des tons suggérés (handoff §15.2).
  suggestedTones?: CommunicationTone[],
): ScenarioSeed {
  return {
    value,
    label,
    description,
    activityCategory,
    useCase: defaultOutputKind === "written_message" ? "mail" : "pitch",
    defaultOutputKind,
    defaultChannel: defaultOutputKind === "written_message"
      ? "internal_note"
      : defaultOutputKind === "spoken_pitch" ? "spoken_pitch_30s" : "meeting_briefing",
    defaultObjective,
    requiresOffer: false,
    requiredScopes: [activityCategory === "management_consultants" ? "collaborator" : "internal"],
    ...(suggestedTones ? { suggestedTones } : {}),
  }
}

const LOT_1_SCENARIO_SEEDS: ScenarioSeed[] = [
  createLot1Seed("performance_feedback_follow_up", "Suivi de feedback de performance", "Formalise un suivi de feedback avec un collaborateur.", "management_consultants", "written_message", "address_performance_issue", ["direct", "pedagogical", "prudent"]),
  createLot1Seed("intercontract_action_plan_message", "Plan d'action intercontrat", "Communique les prochaines étapes d'un plan intercontrat.", "management_consultants", "written_message", "request_action", ["direct", "prudent", "pedagogical"]),
  createLot1Seed("annual_review_follow_up", "Suivi d'entretien annuel", "Récapitule les décisions après un entretien annuel.", "management_consultants", "written_message", "confirm_next_steps"),
  createLot1Seed("consultant_retention_follow_up", "Suivi de rétention consultant", "Formalise les engagements issus d'un échange de rétention.", "management_consultants", "written_message", "confirm_next_steps", ["warm", "diplomatic", "prudent"]),
  createLot1Seed("performance_feedback_talk_track", "Talk track feedback de performance", "Prépare un échange oral de feedback.", "management_consultants", "spoken_pitch", "address_performance_issue", ["direct", "pedagogical", "prudent"]),
  createLot1Seed("retention_conversation_talk_track", "Talk track de rétention", "Prépare une conversation orale de rétention.", "management_consultants", "spoken_pitch", "manage_expectations", ["warm", "diplomatic", "prudent"]),
  createLot1Seed("career_opportunity_talk_track", "Talk track opportunité de carrière", "Prépare la présentation orale d'une opportunité de carrière.", "management_consultants", "spoken_pitch", "manage_expectations", ["enthusiastic_confident", "warm", "pedagogical"]),
  createLot1Seed("career_development_briefing", "Briefing développement de carrière", "Prépare un entretien de développement de carrière.", "management_consultants", "structured_briefing", "align_internal", ["enthusiastic_confident", "warm", "pedagogical"]),
  createLot1Seed("retention_conversation_briefing", "Briefing entretien de rétention", "Prépare un entretien structuré de rétention.", "management_consultants", "structured_briefing", "manage_expectations", ["warm", "diplomatic", "prudent"]),
  createLot1Seed("manager_status_update", "Point de statut au manager", "Communique une mise à jour de statut au manager.", "internal_staff", "written_message", "summarize_decisions"),
  createLot1Seed("cross_functional_coordination_request", "Demande de coordination transverse", "Sollicite une coordination avec une équipe Staff.", "internal_staff", "written_message", "request_action"),
  createLot1Seed("internal_decision_summary", "Synthèse de décision interne", "Récapitule les décisions et prochaines étapes internes.", "internal_staff", "written_message", "summarize_decisions"),
  createLot1Seed("internal_alert_escalation", "Escalade d'alerte interne", "Alerte les parties prenantes Staff sur une situation à traiter.", "internal_staff", "written_message", "escalate_issue"),
  createLot1Seed("practice_support_pitch", "Pitch d'appui Practice", "Prépare une demande orale d'appui Practice.", "internal_staff", "spoken_pitch", "secure_resources"),
  createLot1Seed("presales_support_pitch", "Pitch d'appui avant-vente", "Prépare une demande orale d'appui avant-vente.", "internal_staff", "spoken_pitch", "secure_resources"),
  createLot1Seed("staffing_priority_pitch", "Pitch de priorité staffing", "Prépare une demande orale de priorisation staffing.", "internal_staff", "spoken_pitch", "secure_resources"),
  createLot1Seed("cross_functional_alignment_briefing", "Briefing alignement transverse", "Prépare un alignement entre fonctions Staff.", "internal_staff", "structured_briefing", "align_internal"),
  createLot1Seed("staffing_review_briefing", "Briefing revue staffing", "Prépare une revue de staffing interne.", "internal_staff", "structured_briefing", "summarize_decisions"),
  createLot1Seed("presales_kickoff_briefing", "Briefing lancement avant-vente", "Prépare le lancement d'une mobilisation avant-vente.", "internal_staff", "structured_briefing", "align_internal"),
]

const ALL_LENGTHS: CommunicationLength[] = ["ultra_short", "concise", "standard", "detailed"]

type CategoryConstraints = Pick<CommunicationScenarioDefinition,
  "eligibleRecipientTypes" | "allowedLengths" | "requiredFacts" | "optionalFacts" |
  "requiredReferences" | "optionalReferences" | "requiredContextSources" |
  "optionalContextSources" | "suggestedTones" | "excludedTones" |
  "eligibleInternalRoles" | "eligibleInternalRelationships" | "eligibleInternalDomains"
>

const CATEGORY_CONSTRAINTS: Record<CanonicalCommunicationActivityCategory, CategoryConstraints> = {
  commerce_prospection: { eligibleRecipientTypes: ["prospect", "partner"], allowedLengths: ALL_LENGTHS, requiredFacts: ["account_lifecycle"], optionalFacts: ["contact_role", "market_signal"], requiredReferences: [], optionalReferences: ["signalRef", "contactId"], requiredContextSources: ["account_profile"], optionalContextSources: ["crm_contacts", "signal_intelligence", "offer_catalog"], suggestedTones: ["direct", "warm", "business_roi"], excludedTones: ["disappointed_confused"] },
  commerce_actif: { eligibleRecipientTypes: ["active_client", "former_client"], allowedLengths: ALL_LENGTHS, requiredFacts: ["account_lifecycle"], optionalFacts: ["opportunity_status", "mission_status"], requiredReferences: [], optionalReferences: ["opportunityRef", "missionRef", "profileRef", "offerRef"], requiredContextSources: ["account_profile"], optionalContextSources: ["crm_contacts", "opportunity_context", "mission_context", "offer_catalog"], suggestedTones: ["direct", "diplomatic", "business_roi"], excludedTones: [] },
  delivery: { eligibleRecipientTypes: ["active_client"], allowedLengths: ALL_LENGTHS, requiredFacts: ["mission_status"], optionalFacts: ["delivery_risk", "milestone_status"], requiredReferences: [], optionalReferences: ["missionRef", "opportunityRef"], requiredContextSources: ["mission_context"], optionalContextSources: ["account_profile", "interaction_history"], suggestedTones: ["diplomatic", "prudent", "assertive"], excludedTones: ["enthusiastic_confident"] },
  recrutement: { eligibleRecipientTypes: ["candidate", "active_client"], allowedLengths: ALL_LENGTHS, requiredFacts: ["candidate_or_opportunity_context"], optionalFacts: ["availability", "salary_expectation"], requiredReferences: [], optionalReferences: ["profileRef", "opportunityRef"], requiredContextSources: ["candidate_profile"], optionalContextSources: ["account_profile", "opportunity_context"], suggestedTones: ["warm", "direct", "diplomatic"], excludedTones: ["disappointed_confused"] },
  management_consultants: { eligibleRecipientTypes: ["collaborator"], allowedLengths: ALL_LENGTHS, requiredFacts: ["collaborator_context"], optionalFacts: ["assignment", "performance_context", "availability"], requiredReferences: ["collaboratorId"], optionalReferences: ["collaboratorRef", "missionRef"], requiredContextSources: ["collaborator_context"], optionalContextSources: ["mission_context"], suggestedTones: ["diplomatic", "prudent", "warm"], excludedTones: ["business_roi"] },
  internal_staff: { eligibleRecipientTypes: ["internal"], allowedLengths: ALL_LENGTHS, requiredFacts: ["internal_request_context"], optionalFacts: ["linked_entity", "resource_need"], requiredReferences: [], optionalReferences: ["opportunityRef", "missionRef"], requiredContextSources: [], optionalContextSources: ["account_profile", "opportunity_context", "mission_context"], suggestedTones: ["business_roi", "assertive", "prudent"], excludedTones: ["disappointed_confused"], eligibleInternalRoles: ["manager_n1", "practice_lead", "presales", "finance_admin", "delivery_management", "executive_management", "peer_business_manager", "other"], eligibleInternalRelationships: ["hierarchical_up", "peer", "cross_functional", "executive_committee", "team"], eligibleInternalDomains: ["commercial", "staffing", "recruitment", "delivery", "practice", "presales", "finance", "operations", "strategy"] },
}

const OFFER_REQUIRED_SCENARIOS = new Set<CommunicationScenario>(["offer_introduction", "cross_sell", "cold_call_pitch", "meeting_prep_cross_sell", "proposal_defense_pitch", "renewal_pitch"])
const MULTI_OUTPUT_KINDS: Partial<Record<CommunicationScenario, CommunicationOutputKind[]>> = {
  collaborator_recognition: ["written_message", "spoken_pitch"], assignment_change_notice: ["written_message", "spoken_pitch"], difficult_announcement_talk_track: ["spoken_pitch", "structured_briefing"], intercontract_exit_pitch: ["spoken_pitch", "structured_briefing"], quarterly_business_review: ["spoken_pitch", "structured_briefing"], resource_arbitrage_pitch: ["spoken_pitch", "structured_briefing"], internal_committee_pitch: ["spoken_pitch", "structured_briefing"], investment_arbitrage_argument: ["spoken_pitch", "structured_briefing"], project_status_pitch: ["spoken_pitch", "structured_briefing"], direction_summary_pitch: ["spoken_pitch", "structured_briefing"],
}
const OUTPUT_CHANNELS: Record<CommunicationOutputKind, CommunicationChannel[]> = { written_message: ["email", "linkedin_invitation", "linkedin_message", "internal_note"], spoken_pitch: ["spoken_pitch_30s"], structured_briefing: ["meeting_briefing"] }

function toScenarioDefinition(seed: ScenarioSeed): ScenarioRegistryItem {
  const allowedOutputKinds = MULTI_OUTPUT_KINDS[seed.value] ?? [seed.defaultOutputKind]
  const allowedChannels = Array.from(new Set(allowedOutputKinds.flatMap((kind) => OUTPUT_CHANNELS[kind])))
  const categoryConstraints = CATEGORY_CONSTRAINTS[seed.activityCategory]
  return {
    id: seed.value,
    value: seed.value,
    label: seed.label,
    description: seed.description,
    activityCategory: seed.activityCategory,
    allowedOutputKinds,
    defaultOutputKind: seed.defaultOutputKind,
    requiredScopes: seed.requiredScopes,
    ...categoryConstraints,
    // Lot 7 — un scénario peut restreindre le destinataire éligible au-delà du
    // défaut de sa catégorie (ex: recrutement candidat vs recrutement client).
    eligibleRecipientTypes: seed.eligibleRecipientTypes ?? categoryConstraints.eligibleRecipientTypes,
    // Lot 8 — un scénario peut affiner les tons suggérés au-delà du défaut
    // uniforme de sa catégorie (ex: reconnaissance vs recadrage en management).
    suggestedTones: seed.suggestedTones ?? categoryConstraints.suggestedTones,
    allowedChannels,
    defaultChannel: seed.defaultChannel,
    allowedObjectives: seed.allowedObjectives ?? [seed.defaultObjective],
    defaultObjective: seed.defaultObjective,
    requiresOffer: OFFER_REQUIRED_SCENARIOS.has(seed.value),
    useCase: allowedOutputKinds.length > 1 ? "both" : seed.defaultOutputKind === "written_message" ? "mail" : "pitch",
  }
}

export const SCENARIO_REGISTRY: ScenarioRegistryItem[] = [...SCENARIO_SEEDS, ...LOT_1_SCENARIO_SEEDS].map(toScenarioDefinition)

export function getScenarioRegistryItem(value: CommunicationScenario): ScenarioRegistryItem | undefined {
  return SCENARIO_REGISTRY.find((item) => item.value === value)
}

export function getScenarioDefinition(id: CommunicationScenario): CommunicationScenarioDefinition | undefined {
  return getScenarioRegistryItem(id)
}

export function getScenariosByActivityCategory(category: ActivityCategory): ScenarioRegistryItem[] {
  return SCENARIO_REGISTRY.filter((item) => item.activityCategory === category)
}

export const getScenariosByCategory = getScenariosByActivityCategory

export function getScenariosByOutputKind(outputKind: CommunicationOutputKind): ScenarioRegistryItem[] {
  return SCENARIO_REGISTRY.filter((item) => item.allowedOutputKinds.includes(outputKind))
}

export function getScenariosByScope(scope: CommunicationScope): ScenarioRegistryItem[] {
  return SCENARIO_REGISTRY.filter((item) => item.requiredScopes.includes(scope))
}

export function isScenarioCompatibleWithOutputKind(id: CommunicationScenario, outputKind: CommunicationOutputKind): boolean {
  return getScenarioDefinition(id)?.allowedOutputKinds.includes(outputKind) ?? false
}

export function isScenarioCompatibleWithScope(id: CommunicationScenario, scope: CommunicationScope): boolean {
  return getScenarioDefinition(id)?.requiredScopes.includes(scope) ?? false
}

export function scenarioRequiresOffer(id: CommunicationScenario): boolean {
  return getScenarioDefinition(id)?.requiresOffer ?? false
}

// useCase "both" n'existe pas encore dans le registre (aucun scénario n'est
// aujourd'hui à la fois mail et pitch) mais le filtrage le prend déjà en
// compte pour rester correct le jour où un scénario partagé sera ajouté.
export function filterScenariosByUseCase(
  scenarios: ScenarioRegistryItem[],
  useCase: "mail" | "pitch",
): ScenarioRegistryItem[] {
  return scenarios.filter((item) => item.useCase === useCase || item.useCase === "both")
}
