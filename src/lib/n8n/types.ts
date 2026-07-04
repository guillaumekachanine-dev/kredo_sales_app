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
  | "profile_submission"
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

export type CommunicationLength = "ultra_short" | "concise" | "standard" | "detailed"

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

export type CommunicationTone =
  | "direct"
  | "formal"
  | "warm"
  | "assertive"
  | "pedagogical"
  | "diplomatic"

export interface CommunicationBrief {
  what: {
    channel: CommunicationChannel
    scenario: CommunicationScenario
    length: CommunicationLength
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
    // ADR-0009 — offre catalogue ancrant le pitch (offers.id). Requis pour les
    // scénarios cold_call_pitch/meeting_prep_discovery/meeting_prep_cross_sell —
    // le LLM ne peut jamais inventer une offre hors catalogue (no-go ADR-0009 §6).
    offerRef?: string
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
}

export type PitchOutput = SpokenPitchOutput | MeetingBriefingOutput
