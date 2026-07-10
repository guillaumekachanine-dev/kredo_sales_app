// ─── Catalogue des IDs de workflows n8n ──────────────────────────────────────
// Correspond aux IDs stables de la cartographie KREDO_Cartographie_Workflows_n8n.html
// Ces IDs = noms des webhooks dans n8n (chemin après /webhook/)

export type N8nWorkflowId =
  // Fondations (CORE)
  | "core-003-run-lifecycle"        // CORE-003 : sous-workflow cycle de vie
  // Intelligence commerciale
  | "intel-010-refresh"             // INTEL-010 : client_intelligence_refresh
  | "intel-011-sector"              // INTEL-011 : étude sectorielle mutualisée
  | "intel-020-communication"       // INTEL-020 : rédaction assistée (email/LinkedIn/note)
  | "intel-022-campaign"            // INTEL-022 : création campagne
  | "intel-030-account-knowledge"   // ADR-0012 Lot 2 : connaissance compte (étape 1 chaîne de décision)
  | "intel-031-issues-map"          // ADR-0012 Lot 4 : cartographie des enjeux (étape 3 chaîne de décision)
  | "intel-032-strategy"            // ADR-0012 Lot 5 : stratégie commerciale (étape 4 chaîne de décision)
  | "intel-033-account-watch-refresh" // Veille spécifique compte : rafraîchissement manuel
  // Rapports (REPORT-001)
  | "report-account-summary"        // REPORT-001 Lot 1 : fiche de synthèse compte
  | "report-activity-commercial"    // REPORT-001 Lot 2 : rapport d'activité commerciale
  | "report-activity-recruitment"   // REPORT-001 Lot 2 : rapport d'activité recrutement
  | "report-weekly-manager"         // ADR-0010 Lot 2 : brief hebdomadaire (déclenchement manuel)
  | "report-weekly-manager-cron"    // ADR-0010 Lot 4 : brief hebdomadaire (cron lundi 07:00)
  // Sales
  | "sales-001-interaction-enrich"  // SALES-001 : enrichissement interaction (preuve E2E)
  // Recrutement
  | "rec-001-cv-parsing"            // REC-001 : ingestion & parsing CV
  | "rec-002-vectorize"             // REC-002 : vectorisation pgvector
  | "rec-003-matching"              // REC-003 : matching IA scoring

// ─── Payload envoyé par Next.js vers n8n (CORE-001) ─────────────────────────
// entityType élargi pour REPORT-001 (Lot 0) : les rapports transverses
// (activité commerciale, hebdo manager...) n'ont pas de compte pivot unique.
// entityType="workspace" + entityId=workspaceId signale un run sans compte —
// company_id reste NULL sur ai_intelligence_runs (nullable depuis INTEL-020).
// Les workflows n8n dérivent déjà company_id eux-mêmes via
// `entityType === 'company' ? entityId : null` (voir intel-020-communication.json).

export type N8nEntityType =
  | "workspace"
  | "company"
  | "contact"
  | "sector"
  | "opportunity"
  | "candidate"
  | "collaborator"
  | "interaction"
  | "mission"
  | "project"

export type N8nTriggerPayload = {
  // Traçabilité — permet à n8n de mettre à jour le bon run
  runId: string
  workflowId: N8nWorkflowId
  // Contexte de l'entité concernée
  entityType: N8nEntityType
  entityId: string
  workspaceId: string
  userId: string
  // Données métier spécifiques au workflow
  input: Record<string, unknown>
  // URL absolue du callback — n8n postera ici ses résultats
  callbackUrl: string
}

// ─── Payload envoyé par n8n vers /api/n8n/callback (CORE-002) ───────────────

export type N8nCallbackPayload = {
  runId: string
  phase: number                        // 1=analyse · 2=sectorielle · 3=diagnostic · 4=roadmap · 5=pitch
  resultType: string                   // ex: "pitch", "sector_analysis", "client_summary"
  status: "succeeded" | "failed"
  // Le contenu réel — toujours dans content_json (source unique, pas de html)
  contentJson: Record<string, unknown>
  contentText?: string                 // Version texte brut optionnelle (pour recherche)
  title?: string
  // Métriques LLM (pour contrôle des coûts via CORE-004)
  modelProvider?: string
  modelUsed?: string
  tokensInput?: number
  tokensOutput?: number
  costEstimate?: number
  durationMs?: number
  // En cas d'échec
  errorMessage?: string
  // INTEL-020 — traçabilité et contrôle qualité (ai_intelligence_results)
  contextSnapshot?: Record<string, unknown>
  sourceRefs?: CommunicationSourceRef[]
  qaFlags?: CommunicationQaFlag[]
}

// ─── Réponse de /api/n8n/trigger vers le front ───────────────────────────────

export type TriggerResponse = {
  runId: string
  status: "queued"
}

export type TriggerErrorResponse = {
  error: string
}

// ─── Account watch refresh (veille spécifique compte) ───────────────────────

export type AccountWatchRefreshTriggerMode = "manual"

export type AccountWatchRefreshSettings = {
  isEnabled: boolean
  watchLevel: "standard" | "priority" | "hot"
  cadence: "weekly" | "twice_weekly" | "daily"
  includeOfficialSite: boolean
  includeNews: boolean
  includeJobs: boolean
  includePublicRecords: boolean
  includeTenders: boolean
  includeSocialManual: boolean
  queryAliases: string[]
  metadata: Record<string, unknown>
}

export type AccountWatchRefreshWebhookPayload = {
  runId: string
  workspaceId: string
  companyId: string
  userId: string
  triggerMode: AccountWatchRefreshTriggerMode
  watchLevel: AccountWatchRefreshSettings["watchLevel"]
  settings: AccountWatchRefreshSettings
  callbackUrl: string
}

// ─── INTEL-020 — Rédaction assistée (V1) ─────────────────────────────────────
// Cadre QUOI/QUI/COMMENT/CONTEXTE — contrat canonique INTEL-020-REDACTION-ASSISTEE-V1.md § 5.5
// Le brief est stocké tel quel dans ai_intelligence_runs.input_snapshot (pas de colonne dédiée).

export type CommunicationChannel =
  | "email"
  | "linkedin_invitation"
  | "linkedin_message"
  | "internal_note"
  // ADR-0009 — génération de pitch : sortie structurée, pas un texte à lire tel quel
  | "spoken_pitch_30s"
  | "meeting_briefing"

export type CommunicationScenario =
  | "signal_outreach"
  | "follow_up_no_reply"
  | "post_meeting"
  // Renommé depuis "profile_submission" au Lot 3 (désambiguïsation ADR-0013
  // §8.2) — différé des Lots 1-2 car le workflow n8n intel-020-communication
  // avait l'ancien libellé en dur dans SCENARIO_MISSIONS ; le workflow a été
  // mis à jour dans le même lot pour éviter toute régression silencieuse.
  | "profile_submission_to_client"
  | "cross_sell"
  | "reactivation"
  | "proposal_follow_up"
  | "offer_introduction"
  | "candidate_interview_invitation"
  | "candidate_follow_up"
  | "candidate_offer"
  | "candidate_rejection"
  | "appointment_confirmation"
  | "manager_collaborator_internal"
  | "cra_absence_reminder"
  | "invoice_follow_up"
  | "project_alert_escalation"
  | "steering_committee_minutes"
  // ADR-0009 — génération de pitch
  | "cold_call_pitch"
  | "meeting_prep_discovery"
  | "meeting_prep_cross_sell"
  // ADR-0013 Lot 1 — Commerce · Prospection
  | "first_contact_after_nomination"
  | "linkedin_to_email_bridge"
  | "event_invitation"
  | "sector_rebound"
  | "discovery_meeting_request"
  | "signal_based_pitch"
  | "sector_persona_pitch"
  | "why_us_now_pitch"
  | "first_objection_bad_timing"
  // ADR-0013 Lot 1 — Commerce · Périmètre actif
  | "mission_renewal"
  | "consultant_replacement_notice"
  | "client_tension_apology"
  | "delivery_delay_notice"
  | "proposal_defense_pitch"
  | "renewal_pitch"
  | "price_objection_pitch"
  | "client_crisis_talk_track"
  | "delay_talk_track"
  | "tense_copil_briefing"
  // ADR-0013 Lot 1 — Delivery
  | "risk_communication"
  | "milestone_validation_request"
  | "escalation_briefing"
  | "risk_meeting_briefing"
  // ADR-0013 Lot 1 — Recrutement
  | "candidate_availability_check"
  | "candidate_post_interview_feedback"
  | "candidate_cv_completion_request"
  | "dormant_talent_pool_reactivation"
  | "candidate_to_client_pitch"
  | "opportunity_to_candidate_pitch"
  | "candidate_closing_pitch"
  | "atypical_candidate_defense"
  | "recruiter_briefing_pre_interview"
  | "mobility_salary_pitch"
  // ADR-0013 Lot 1 — Interne · Management
  | "one_on_one_alignment"
  | "collaborator_recognition"
  | "performance_review_prep"
  | "assignment_change_notice"
  | "internal_arbitrage_request"
  | "staffing_help_request"
  | "handover_note"
  | "weekly_briefing_prep"
  | "internal_validation_before_send"
  | "difficult_announcement_talk_track"
  | "disciplinary_meeting_posture"
  | "quarterly_business_review"
  | "resource_arbitrage_pitch"
  | "intercontract_exit_pitch"
  | "sensitive_meeting_briefing"
  | "internal_committee_pitch"
  | "investment_arbitrage_argument"
  | "project_status_pitch"
  | "direction_summary_pitch"

export type CommunicationLength = "ultra_short" | "concise" | "standard" | "detailed"

// ─── ADR-0013 Lot 2 — modèle mail/pitch découplé du canal ────────────────────

// Nature technique du livrable renvoyé par le LLM — remplace la déduction par
// canal (isPitchChannel). "structured_briefing" couvre aussi bien un brief RDV
// commercial qu'une prise de parole non commerciale (crise, business review,
// recadrage) : même forme de sortie (MeetingBriefingOutput), seul le prompt change.
export type CommunicationOutputKind =
  | "written_message"
  | "spoken_pitch"
  | "structured_briefing"

// 5 catégories d'activité (remplace le family à 4 valeurs sales/recruitment/
// delivery/internal — Delivery et Interne·Management sont désormais distincts,
// ADR-0013 §3.2). Persistée dans input_snapshot pour permettre le monitoring
// futur de l'activité de prospection sans re-lire la registry TS depuis SQL.
export type CommunicationActivityCategory =
  | "commerce_prospection"
  | "commerce_actif"
  | "delivery"
  | "recrutement"
  | "interne_management"

// Portée de résolution d'entité côté composer (ADR-0013 D-2) — "account" =
// comportement historique (compte CRM requis), "collaborator" = contexte
// collaborateur (aucun compte requis), "internal" = aucune entité requise.
// Type canonique unique : CommunicationComposerScope (communication-composer.ts)
// et ScenarioRegistryItem.requiredScopes (communication-scenario-registry.ts)
// l'importent tous les deux d'ici plutôt que de le redéfinir.
export type CommunicationScope = "account" | "collaborator" | "internal"

export type CommunicationSenderRole =
  | "business_manager"
  | "agency_director"
  | "practice_lead"
  | "recruiter"
  | "delivery_manager"
  | "consultant"
  | "general_management"

export type CommunicationRecipientType =
  | "prospect"
  | "active_client"
  | "former_client"
  | "partner"
  | "candidate"
  | "internal"

export type CommunicationPersona =
  | "ceo"
  | "cto_cio"
  | "ciso"
  | "business_director"
  | "purchasing"
  | "hr_talent"
  | "technical"
  | "operational"
  | "other"

export type CommunicationRelation =
  | "unknown"
  | "cold"
  | "warm"
  | "established"
  | "active_client"
  | "former"

export type CommunicationObjective =
  | "get_meeting"
  | "get_reply"
  | "get_feedback"
  | "present_offer"
  | "submit_profile"
  | "accelerate_decision"
  | "reactivate"
  | "confirm_next_steps"
  | "invite_to_interview"
  | "send_offer"
  | "reject_candidate"
  | "align_internal"
  | "request_action"
  | "secure_payment"
  | "escalate_issue"
  | "summarize_decisions"
  // ADR-0013 Lot 1 — nouveaux objectifs sans équivalent parmi les 16 existants
  | "announce_change"
  | "repair_relationship"
  | "manage_expectations"
  | "de_escalate_tension"
  | "close_candidate"
  | "advocate_for_candidate"
  | "negotiate_terms"
  | "acknowledge_contribution"
  | "deliver_difficult_news"
  | "address_performance_issue"
  | "secure_resources"

export type CommunicationTone =
  | "direct"
  | "formal"
  | "warm"
  | "assertive"
  | "pedagogical"
  | "diplomatic"
  // Tons métier — enrichissement INTEL-020 (sans migration DB ni workflow n8n)
  | "technical_expertise"
  | "business_roi"
  | "enthusiastic_confident"
  | "disappointed_confused"
  | "prudent"

export type CommunicationContextSourceId =
  | "account_profile"
  | "crm_contacts"
  | "signal_intelligence"
  | "opportunity_context"
  | "interaction_history"
  | "mission_context"
  | "candidate_profile"
  | "collaborator_context"
  | "offer_catalog"
  | "source_document"
  | "previous_generation"

export interface CommunicationBrief {
  what: {
    channel: CommunicationChannel
    scenario: CommunicationScenario
    // ADR-0013 Lot 2 — nature du livrable, remplace la déduction par canal
    // (isPitchChannel). Toujours renseigné par buildDefaultBrief ; les runs
    // antérieurs au Lot 2 stockés en base n'ont pas ce champ — c'est un
    // artefact historique figé, pas un état que le front doit re-hydrater.
    outputKind: CommunicationOutputKind
    length: CommunicationLength
    // ADR-0013 Lot 2 — persisté dans input_snapshot pour permettre le futur
    // monitoring de l'activité de prospection sans re-lire la registry TS.
    activityCategory: CommunicationActivityCategory
    // ADR-0013 Lot 2 — reflète le scope résolu par le composer (Lot 0).
    scope: CommunicationScope
  }
  who: {
    sender: {
      role: CommunicationSenderRole
      name: string        // Dérivé de profiles.full_name
      practice?: string    // Saisi manuellement en V1 — profiles n'a pas de colonne practice
    }
    recipient: {
      type: CommunicationRecipientType
      persona: CommunicationPersona
      relation: CommunicationRelation
      contactId?: string
      // ADR-0013 Lot 2 — renseigné quand scope === "collaborator" (aucun contact
      // CRM, le destinataire est un collaborateur interne).
      collaboratorId?: string
      displayName?: string
      companyName?: string
    }
    objective: CommunicationObjective
  }
  how: {
    tone: CommunicationTone
    formality: "vous" | "tu"
    language: "fr" | "en"
  }
  context: {
    mustInclude?: string
    mustExclude?: string
    signalRef?: string
    opportunityRef?: string
    interactionRef?: string
    missionRef?: string
    profileRef?: string
    sourceDocumentId?: string
    sourceRunId?: string
    previousMessage?: string
    reuseMode?: "variant" | "adapt_contact" | "reuse_account" | "follow_up"
    angle?: string
    // ADR-0009 — offre catalogue ancrant le pitch (offers.id). Obligatoire
    // uniquement quand scenario.requiresOffer === true (ADR-0013 D-5, supersede
    // ADR-0009 §6 — l'obligation n'est plus universelle à tout canal pitch).
    offerRef?: string
    // ADR-0013 Lot 2 — renseigné quand scope === "collaborator".
    collaboratorRef?: string
    // Sources explicitement désactivées par l'utilisateur dans les paramètres
    // avancés du drawer. Absence ou tableau vide = toutes les sources actives.
    disabledContextSources?: CommunicationContextSourceId[]
  }
}

// ─── Contrat de sortie (n8n → callback → UI) ─────────────────────────────────

export type CommunicationSourceRef = {
  entityType: string
  entityId?: string
  label: string
  usedFor?: string
}

export type CommunicationQaFlag = {
  check: string
  passed: boolean
  detail?: string
}

export interface CommunicationOutput {
  subjects: string[]
  body: string
  key_points: string[]
  source_refs: string[]
  warnings: string[]
}

// ─── ADR-0009 — Génération de pitch ───────────────────────────────────────────
// Sortie structurée, distincte de CommunicationOutput (pas de subjects/body à
// envoyer tel quel). Persistée avec result_type="commercial_pitch" (déjà éligible
// à l'auto-sauvegarde bibliothèque, voir api/n8n/callback/route.ts). `kind`
// discrimine le rendu UI (script minuté vs sections de briefing).

export interface SpokenPitchOutput {
  kind: "spoken_pitch"
  hook: string
  problem_recognition: string
  offer_link: string
  ask: string
  alt_close: string
  word_count: number
  tone_notes: string[]
  source_refs: string[]
  warnings: string[]
}

export interface MeetingBriefingOutput {
  kind: "meeting_briefing"
  objective: string
  key_message: string
  arguments: Array<{
    title: string
    evidence: string
    source_ref?: string
  }>
  expected_objections: Array<{
    objection: string
    response: string
    fallback?: string
  }>
  cross_sell_hypotheses: string[]
  data_points_to_mention: string[]
  close_options: string[]
  do_not_say: string[]
  source_refs: string[]
  warnings: string[]
  // ADR-0013 Lot 3 — optionnels, remplis par les prompts non commerciaux
  // (delivery/interne_management/recrutement). Absents pour les briefings
  // commerciaux existants (meeting_prep_discovery/cross_sell) — non-régression
  // : ces 3 champs n'apparaissaient dans aucun contrat de sortie avant ce lot.
  postures?: Array<{ situation: string; posture: string }>
  emotional_context?: string
  power_dynamic?: "peer" | "subordinate" | "superior" | "client_external"
}

export type PitchOutput = SpokenPitchOutput | MeetingBriefingOutput
