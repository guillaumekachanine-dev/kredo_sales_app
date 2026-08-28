import type { AccountClassificationProposal } from "@/features/account-lifecycle/domain/account-classification"
import type { CorpusBudget } from "@/features/intelligence-missions/domain/mission-contracts"
import type { BattleSituation } from "@/features/business-intelligence/playbooks/battle-situation-contract"

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
  | "intel-021-monthly-watch-analysis" // INTEL-021 : synthèse mensuelle de la veille globale
  // Veille IA & Marché
  | "veille-ia-marche-on-demand"     // VEILLE-001 : génération de digest à la demande (webhook)
                                     // Le pipeline cron (`KREDO — Veille Hebdomadaire IA & Marché`)
                                     // n'expose pas de webhook — il n'a jamais été un N8nWorkflowId.
  | "intel-022-campaign"            // INTEL-022 : création campagne
  | "intel-030-account-knowledge"   // ADR-0012 Lot 2 : connaissance compte (étape 1 chaîne de décision)
  | "intel-031-issues-map"          // ADR-0012 Lot 4 : cartographie des enjeux (étape 3 chaîne de décision)
  | "intel-032-strategy"            // ADR-0012 Lot 5 : stratégie commerciale (étape 4 chaîne de décision)
  | "intel-033-account-watch-refresh" // Veille spécifique compte : rafraîchissement manuel
  | "intel-034-account-signal-verification" // Veille compte : vérification indépendante d'un signal
  | "intel-040-workspace-diagnostic" // ADR-0014 Lot 5 : diagnostic macro du centre de profit
  // Missions d'intelligence (ADR-0020)
  | "mission-001-run"               // M-6 : exécuteur générique, importé UNE fois, sans métier
  // Rapports (REPORT-001)
  | "report-account-summary"        // REPORT-001 Lot 1 : fiche de synthèse compte
  | "report-activity-commercial"    // REPORT-001 Lot 2 : rapport d'activité commerciale
  | "report-activity-recruitment"   // REPORT-001 Lot 2 : rapport d'activité recrutement
  | "report-weekly-manager"         // ADR-0010 Lot 2 : brief hebdomadaire (déclenchement manuel)
  | "report-manager-summary"        // REPORT-001 : manager summary
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
  | "account_signal"

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
  // Alerte échec workflow, Lot 0 (2026-07-18) — identifiants n8n internes
  // ($execution.id / $workflow.id), fusionnés dans ai_intelligence_runs.config
  // pour construire le lien "Ouvrir dans n8n" du drill-down /automations.
  n8nExecutionId?: string
  n8nWorkflowId?: string
}

// ─── Réponse de /api/n8n/trigger vers le front ───────────────────────────────

export type TriggerResponse = {
  runId: string
  status: "queued"
}

export type TriggerErrorResponse = {
  error: string
}

// ─── Veille IA & Marché — génération de digest à la demande ─────────────────
// docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/
// Le navigateur n'envoie QUE ces deux champs : les paramètres métier (volume,
// profondeur, familles de sources) sont résolus côté serveur depuis
// `workspaces.settings` via `getGlobalWatchSettings()`. `workspaceId` est imposé
// par la gateway (session authentifiée), jamais choisi par le client.
export type OnDemandDigestInput = {
  schemaVersion: 1
  triggerMode: "manual"
}

export type MonthlyWatchAnalysisInput = {
  schemaVersion: 1
  periodStart: string
  periodEnd: string
  digestIds: string[]
  articleIds: string[]
  requestedAt: string
  triggerMode: "manual" | "scheduled"
}

export type MonthlyWatchAnalysisOutput = {
  schemaVersion: 1
  period: { start: string; end: string; label: string }
  executiveSummary: string
  majorTrends: Array<{ title: string; synthesis: string; articleIds: string[]; sectors: string[]; confidence: number }>
  weakSignals: Array<{ title: string; synthesis: string; articleIds: string[] }>
  regulatoryDevelopments: Array<{ title: string; impact: string; articleIds: string[] }>
  commercialOpportunities: Array<{
    title: string
    rationale: string
    recommendedAction: string
    practices: string[]
    articleIds: string[]
  }>
  risksAndWatchpoints: Array<{ title: string; explanation: string; articleIds: string[] }>
  priorityActions: Array<{ title: string; action: string; horizon: "immediate" | "30_days" | "quarter" }>
  coverage: { digestsCount: number; articlesCount: number; sourcesCount: number }
}

// ─── Analyse à la demande — Veille (V2, manual_custom) ──────────────────────
// docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/01-ARCHITECTURE-ET-CONTRATS.md §4
// Coexiste avec le contrat V1 ci-dessus (schemaVersion: 1, mensuel, préservé
// intégralement) : INTEL-021 doit distinguer les deux versions au lancement.
// Le navigateur ne transmet que des références ; elles sont revalidées côté
// serveur (RLS) par `resolveWatchAnalysisSources` avant tout envoi à n8n —
// voir src/features/watch-analysis/data/resolve-watch-analysis-sources.ts.

export type WatchAnalysisSource =
  | {
      kind: "digest"
      digestId: string
      articleIds?: string[]
    }
  | {
      kind: "account_signals"
      signalIds: string[]
    }
  | {
      kind: "intelligence_documents"
      documentIds: string[]
    }
  | {
      kind: "knowledge_collection"
      collectionId: string
    }

export type WatchAnalysisInputV2 = {
  schemaVersion: 2
  triggerMode: "manual_custom"
  intention: string
  /** 1 à 3 groupes de sources — cf. `validateWatchAnalysisInput`. */
  sources: WatchAnalysisSource[]
  requestedAt: string
}

export type WatchAnalysisEvidenceRef = {
  kind: "veille_article" | "account_signal" | "intelligence_document"
  id: string
  title: string
  provenance: string
}

export type WatchAnalysisOutputV2 = {
  schemaVersion: 2
  analysisKind: "manual_custom"
  title: string
  executiveSummary: string
  majorTrends: Array<{
    title: string
    synthesis: string
    sectors: string[]
    confidence: number
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  weakSignals: Array<{
    title: string
    synthesis: string
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  regulatoryDevelopments: Array<{
    title: string
    impact: string
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  commercialOpportunities: Array<{
    title: string
    rationale: string
    recommendedAction: string
    practices: string[]
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  risksAndWatchpoints: Array<{
    title: string
    explanation: string
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  priorityActions: Array<{
    title: string
    action: string
    horizon: "immediate" | "30_days" | "quarter"
    evidenceRefs: WatchAnalysisEvidenceRef[]
  }>
  coverage: {
    sourceGroups: number
    resolvedRefs: number
    articlesCount: number
    signalsCount: number
    documentsCount: number
    totalItems: number
  }
}


// ─── Missions d'intelligence — enveloppe envoyée à mission-001-run (ADR-0020) ──
// M-1/M-6 : n8n ne porte AUCUN métier. Il reçoit deux prompts déjà assemblés et les
// paramètres d'appel du modèle, poste le texte brut au callback, et c'est tout.
// Le contenu du corpus ne vit QUE dans `userPrompt` — jamais recopié ailleurs, et
// surtout jamais dans `ai_intelligence_runs.input_snapshot` (P2).

export type MissionRunEnvelope = {
  schemaVersion: 1
  missionSlug: string
  missionVersion: number
  systemPrompt: string
  userPrompt: string
  model: { provider: "anthropic"; model: string; maxOutputTokens: number }
  corpus: { kept: number; requested: number; dropped: number; totalChars: number }
  budget: CorpusBudget
  requestedAt: string
}

// ─── Account watch refresh (veille spécifique compte) ───────────────────────

export type AccountWatchRefreshTriggerMode = "manual"

export type AccountWatchRefreshSettings = {
  isEnabled: boolean
  watchLevel: "standard" | "priority" | "hot"
  cadence: "weekly" | "twice_weekly" | "daily"
  includeOfficialSite: boolean
  includeNews: boolean
  includePublicRecords: boolean
  includeTenders: boolean
  includeSocialManual: boolean
  includeSectorCorpus: boolean
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

export type AccountSignalVerificationVerdict =
  | "confirmed"
  | "contradicted"
  | "insufficient_evidence"

export type AccountSignalVerificationResult = {
  schemaVersion: 1
  signalId: string
  companyId: string
  verdict: AccountSignalVerificationVerdict
  rationale: string
  checkedAt: string
  initialSource: {
    id: string | null
    name: string | null
    url: string | null
  }
  independentEvidence: Array<{
    id: string
    title: string
    sourceName: string
    sourceUrl: string | null
    articleUrl: string | null
    publishedAt: string | null
    vector: "company_signal" | "event_terms"
  }>
  supportingEvidenceIds: string[]
  contradictingEvidenceIds: string[]
}

// ─── INTEL-030 — Connaissance compte (account_knowledge) ────────────────────
// Contenu du champ `input` de POST /api/n8n/trigger pour
// `workflowId: "intel-030-account-knowledge"`.
//
// `triggerN8nRun` transporte ce bloc tel quel sous `body.input` — c'est
// exactement là que le nœud « Validate Entity » du workflow lit le
// discriminateur (Lot 4 : il ne lisait auparavant que la racine du body, ce qui
// rendait la branche V3 inatteignable depuis l'application).
//
// Littéral `2 | 3` plutôt que `number` : une version inventée est rejetée à la
// compilation, pas seulement par le workflow (même doctrine que
// `AccountScanTriggerInput.operation`).
//
// Omettre entièrement l'input reste valide et signifie V2 — c'est le
// comportement des boutons Desktop/Mobile actuels, volontairement inchangé
// tant que la restitution V3 n'existe pas (Lot 5).
export type AccountKnowledgeTriggerInput = {
  accountKnowledgeSchemaVersion: 2 | 3
}

// ─── Scan rapide d'un compte (V1) ───────────────────────────────────────────

export type AccountScanInformationMode = "find" | "verify"

export type AccountScanContactMode = "none" | "identify" | "confirm"

export type AccountScanCompanyField =
  | "legal_name"
  | "siren"
  | "naf_code"
  | "description"
  | "website"
  | "hq_location"
  | "sector"
  | "employee_count"
  | "revenue"

export type AccountScanFactAttribute =
  | "business_model"
  | "primary_activity"
  | "technology"
  | "competitor"
  | "partner"
  | "market"
  | "strategic_priority"
  | "transformation_program"
  | "establishment_count"
  | "growth_trend"
  | "geographic_reach"
  | "value_proposition"
  | "differentiators"
  | "market_position"
  | "marketing_position"
  | "target_customers"

export type AccountScanSourceType =
  | "official_site"
  | "press_release"
  | "job_board"
  | "professional_profile"
  | "regulatory_filing"
  | "news_media"
  | "public_tender"
  | "internal_crm"
  | "human_note"
  | "other"

export type AccountScanCollectionMethod =
  | "manual"
  | "api"
  | "import"
  | "llm_extraction"
  | "human_entry"
  | "system_sync"

export type AccountScanSectorValue = {
  sectorId: string
  name: string
  slug?: string
}

export type AccountScanFieldValue = string | number | AccountScanSectorValue | null

export type AccountScanTriggerInput = {
  schemaVersion: 1
  // Discriminant lu par le nœud "Validate & Route" du workflow n8n
  // intel-010-refresh (n8n/workflows/intel-010-refresh.json) — littéral, pas
  // `string`, pour qu'un oubli de ce champ soit détecté à la compilation plutôt
  // que de silencieusement envoyer `undefined` au workflow (cf. correctif
  // Lot 2 : ce champ manquait ici alors que le workflow l'exigeait déjà).
  operation: "account_scan"
  companyId: string
  informationMode: AccountScanInformationMode
  contactMode: AccountScanContactMode
  requestedFields: AccountScanCompanyField[]
  requestedFacts: AccountScanFactAttribute[]
  requestedRoles?: string[]
  maxContacts?: number
  recentHireOnly?: boolean
  searchVectors?: string[]
  knownCompany: {
    name: string
    legalName?: string | null
    website?: string | null
    siren?: string | null
    nafCode?: string | null
    sectorId?: string | null
  }
  // Lot 1 — résolution d'entité juridique (registre officiel).
  // selectedSiren permet un second appel après un résultat "ambiguous" : l'utilisateur
  // a choisi un candidat, on ne relance pas la recherche par nom.
  selectedSiren?: string | null
  websiteHint?: string | null
  locationHint?: string | null
  autoApplyOfficialMissing: boolean
  // ADR-0019 Lot 4 — demande le bloc `classification` en sortie (7 axes du
  // REFERENTIEL-CLASSIFICATION §5). Optionnel et par défaut absent : un workflow
  // déployé avant ce lot ignore simplement le champ, et un scan lancé sans lui
  // se comporte exactement comme avant.
  requestClassification?: boolean
  // Référentiel transmis au workflow — il ne doit JAMAIS inventer un segment
  // (§9 : créer un segment obéit à 3 conditions cumulatives, jamais à une IA).
  // Les slugs sont la seule clé stable (§12.4).
  classificationReferential?: {
    segments: { slug: string; name: string; macroSlug: string }[]
  }
}

// ─── Résolution d'entité juridique (Lot 1) ──────────────────────────────────
// Absent du contrat AccountScanOutput livré au Lot 0 — ajouté ici car le Lot 1
// ne doit jamais générer de propositions tant que l'entité n'est pas résolue
// sans ambiguïté (cf. INTEL-010-refresh account_scan §3). Extension additive,
// ne modifie aucun champ existant.

export type AccountScanResolutionStatus = "resolved" | "ambiguous" | "not_found"

export type AccountScanResolutionMatchMethod =
  | "selected_siren"
  | "known_siren"
  | "name_location_match"

export type AccountScanResolutionCandidate = {
  siren: string
  legalName: string
  nafCode?: string | null
  hqLocation?: string | null
  matchScore: number
}

export type AccountScanResolution = {
  status: AccountScanResolutionStatus
  siren?: string | null
  matchMethod?: AccountScanResolutionMatchMethod | null
  candidates: AccountScanResolutionCandidate[]
}

export type AccountScanSource = {
  schemaVersion: 1
  sourceKey: string
  sourceType: AccountScanSourceType
  sourceName: string
  sourceUrl?: string
  canonicalUrl?: string
  publishedAt?: string
  collectedAt: string
  evidenceExcerpt?: string
  reliabilityScore: number
  collectionMethod: AccountScanCollectionMethod
}

export type AccountScanFieldProposal = {
  schemaVersion: 1
  targetType: "company"
  targetId: string
  attributeName: AccountScanCompanyField
  oldValue: AccountScanFieldValue
  proposedValue: AccountScanFieldValue
  normalizedValue: AccountScanFieldValue
  confidenceScore: number
  sourceKeys: string[]
  justification: string
}

export type AccountScanFactProposal = {
  schemaVersion: 1
  targetType: "company" | "contact" | "person"
  targetId: string
  attributeName: AccountScanFactAttribute
  oldValue: string | null
  proposedValue: string
  normalizedValue: string
  confidenceScore: number
  sourceKeys: string[]
  justification: string
}

export type AccountScanContactCandidate = {
  candidateKey: string
  firstName: string | null
  lastName: string | null
  fullName: string
  jobTitle: string | null
  department: string | null
  relationshipRole: string | null
  email: string | null
  emailStatus: "public" | "confirmed" | "inferred" | "unknown"
  phone: string | null
  linkedinUrl: string | null
  confidenceScore: number
  sourceKeys: string[]
  evidence: string | null
  existingPersonId: string | null
  existingContactId: string | null
  suggestedAction: "create" | "link" | "update" | "ignore"
}

// ─── Classification (ADR-0019 Lot 4) ────────────────────────────────────────
// Les 7 axes du REFERENTIEL-CLASSIFICATION §5.2→5.8, produits en un bloc
// atomique et NON sous forme de fieldProposals : le §10 pose quatre contrôles
// bloquants inter-champs qu'une file de propositions unitaires ne peut pas
// garantir (cf. features/account-lifecycle/domain/account-classification.ts).
//
// Le domaine, les libellés et les contrôles §10 vérifiables hors base vivent
// dans ce module de domaine ; ce type n'est que le contrat de transport n8n.

export type AccountScanClassification = AccountClassificationProposal & {
  /** Clés des sources (`AccountScanSource.sourceKey`) étayant la classification. */
  sourceKeys: string[]
}

export type AccountScanOutput = {
  schemaVersion: 1
  runId: string
  workspaceId: string
  companyId: string
  status: "succeeded" | "failed"
  resolution: AccountScanResolution
  sources: AccountScanSource[]
  fieldProposals: AccountScanFieldProposal[]
  factProposals: AccountScanFactProposal[]
  contactCandidates: AccountScanContactCandidate[]
  // Absent tant que le workflow n'a pas été relancé avec `requestClassification`
  // — les résultats de scan déjà en base n'en portent pas. Toujours tester la
  // présence avant lecture, jamais supposer le bloc là.
  classification?: AccountScanClassification | null
  warnings: string[]
  errorMessage?: string
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
  // INTEL-020 dynamique Lot 1 — Management consultants
  | "performance_feedback_follow_up"
  | "intercontract_action_plan_message"
  | "annual_review_follow_up"
  | "consultant_retention_follow_up"
  | "performance_feedback_talk_track"
  | "retention_conversation_talk_track"
  | "career_opportunity_talk_track"
  | "career_development_briefing"
  | "retention_conversation_briefing"
  // INTEL-020 dynamique Lot 1 — Interne Staff
  | "manager_status_update"
  | "cross_functional_coordination_request"
  | "internal_decision_summary"
  | "internal_alert_escalation"
  | "practice_support_pitch"
  | "presales_support_pitch"
  | "staffing_priority_pitch"
  | "cross_functional_alignment_briefing"
  | "staffing_review_briefing"
  | "presales_kickoff_briefing"
  // Dynamic Playbooks Lot 4 — pitch oral construit depuis une Battle Card
  // (situation commerciale explicitement choisie : interlocuteur, enjeu,
  // angle, timing, objection, ROI, offre). Le bloc structuré correspondant
  // vit dans context.battleSituation.
  | "battle_situation_pitch"

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

// Catégories produites par le nouveau contrat INTEL-020. La valeur historique
// reste acceptée en lecture jusqu'au reclassement de la registry au Lot 2.
export type CanonicalCommunicationActivityCategory =
  | "commerce_prospection"
  | "commerce_actif"
  | "delivery"
  | "recrutement"
  | "management_consultants"
  | "internal_staff"

export type LegacyCommunicationActivityCategory = "interne_management"

export type CommunicationActivityCategory =
  | CanonicalCommunicationActivityCategory
  | LegacyCommunicationActivityCategory

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
  | "collaborator"
  | "internal"

export type CommunicationInternalRecipientRole =
  | "manager_n1"
  | "recruitment"
  | "practice_lead"
  | "presales"
  | "finance_admin"
  | "delivery_management"
  | "executive_management"
  | "peer_business_manager"
  | "other"

export type CommunicationInternalRelationship =
  | "hierarchical_up"
  | "peer"
  | "cross_functional"
  | "executive_committee"
  | "team"

export type CommunicationInternalDomain =
  | "commercial"
  | "staffing"
  | "recruitment"
  | "delivery"
  | "practice"
  | "presales"
  | "finance"
  | "operations"
  | "strategy"

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
      internalRole?: CommunicationInternalRecipientRole
      internalRelationship?: CommunicationInternalRelationship
      internalDomain?: CommunicationInternalDomain
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
    // Lot 9 — référence compte facultative pour les scénarios internal_staff
    // qui portent sur un client précis (escalade, coordination transverse...)
    // sans jamais transformer scope en "account" (command §4).
    companyRef?: string
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
    // Lot 4 (listes personnelles, content_collections) — additif et séparé de
    // CommunicationContextSourceId : ids de content_collections.id choisis
    // explicitement par l'utilisateur, jamais des identifiants de source fixe.
    // Résolu côté n8n (nœud "Hydrate Context") en contenus canoniques dédupliqués.
    preferredCollectionIds?: string[]
    // ADR-0012bis Lot 4 (Knowledge Scope) — Liste OU Corpus unique sélectionné
    // depuis l'onglet Connaissances via « Utiliser comme contexte ». Distinct de
    // preferredCollectionIds (multi-sélection libre, non affectée). Le front ne
    // pose ici que collectionId/kind/name/itemCount (métadonnées d'affichage +
    // traçabilité) ; `refs` est TOUJOURS recalculé côté serveur au déclenchement
    // (/api/n8n/trigger, resolveKnowledgeScope) à partir du seul collectionId —
    // un `refs` fourni par le client n'est jamais pris en compte.
    knowledgeScope?: {
      collectionId: string
      kind: "list" | "corpus"
      name: string
      itemCount: number
      refs?: Array<{ contentType: "veille_article" | "intelligence_document"; contentId: string }>
    }
    // Dynamic Playbooks Lot 4 — situation commerciale explicitement choisie par
    // l'utilisateur dans une Battle Card, pour le scénario
    // `battle_situation_pitch`. Le type est importé (jamais dupliqué) depuis
    // `battle-situation-contract.ts`, module de types purs sans export runtime :
    // aucune dépendance de `src/lib/**` vers `src/features/**` n'est créée.
    //
    // Ce bloc ne duplique aucun champ déjà canonique du brief (companyId,
    // contactId, offerRef, preferredCollectionIds, tone/length/language).
    // Facultatif : le scénario reste sélectionnable dans le Composer générique,
    // où il est absent — le workflow n8n dégrade alors sur la mission générique.
    battleSituation?: BattleSituation
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
