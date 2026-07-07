import type { Database } from "@/types/database"

// ─── ADR-0012 — Contrats de la chaîne de décision commerciale ───────────────
// Lot 1 : types des artefacts générés par les 5 étapes + enum de provenance
// partagé (D-3). Zéro génération LLM dans ce lot — ces contrats préparent les
// workflows n8n des Lots 2/3/4/5/6.
//
// `schema_version` figé à 1 pour tous les artefacts V1 (D-5) : le champ
// `phase` d'ai_intelligence_results est déprécié comme clé fonctionnelle,
// `result_type` + `content_json.schema_version` sont les vraies clés.

export type IntelligenceProvenance = Database["public"]["Enums"]["intelligence_provenance"]

// Pointeur de preuve générique — {table, id} vers la ligne source exacte
// (contact, interaction, opportunité, sector_news...). Distinct de
// `CommunicationSourceRef` (n8n/types.ts), qui cite une source dans un texte
// généré ; celui-ci pointe vers une ligne Supabase concrète.
export type IntelligenceSourceRef = {
  table: string
  id: string
}

// ─── Étape 1 — Connaissance compte ──────────────────────────────────────────
// result_type = "account_knowledge". Remplace à terme la lecture FOLIO
// `analysis_data` (voir intelligence-data.ts), mais avec un contrat plus riche
// et honnête sur sa provenance — pas une simple traduction 1:1 du schéma FOLIO.

export const ACCOUNT_KNOWLEDGE_RESULT_TYPE = "account_knowledge" as const

export type AccountKnowledgeFact = {
  text: string
  provenance: IntelligenceProvenance
  source_refs?: IntelligenceSourceRef[]
  // D-4 — curation humaine à chaque étape. Mutés en place par les Server
  // Actions de curation (curate-account-knowledge.ts) ; jamais écrits par le
  // LLM lui-même. `dismissed` est un flag (jamais de suppression réelle —
  // garde l'historique de ce que le modèle a proposé, cf. D-3).
  pinned?: boolean
  dismissed?: boolean
}

export type AccountKnowledgeKeyContact = {
  contact_id: string
  role_summary: string
  provenance: IntelligenceProvenance
}

export interface AccountKnowledgeContent {
  schema_version: 1
  identity_positioning: AccountKnowledgeFact[]
  commercial_relationship: AccountKnowledgeFact[]
  key_contacts: AccountKnowledgeKeyContact[]
  organisation_observed: AccountKnowledgeFact[]
  frictions_and_signals: AccountKnowledgeFact[]
  open_questions: AccountKnowledgeFact[]
  generated_at: string
}

// ─── Étape 2 — Intelligence sectorielle ─────────────────────────────────────
// result_type = "sector_snapshot". Déterministe (D-6, 0 token) : calculé en
// TypeScript depuis les tables sector_*, PAS par un LLM. Persisté seulement si
// utile en cache léger — la vérité reste dans sector_intelligence et alliées.

export const SECTOR_SNAPSHOT_RESULT_TYPE = "sector_snapshot" as const

export interface SectorSnapshotContent {
  schema_version: 1
  sector_id: string
  top_pain_points: Array<{ label: string; frequency_count: number }>
  next_regulatory_deadline: {
    label: string
    deadline_date: string
    is_commercial_window: boolean
  } | null
  open_commercial_windows: string[]
  generated_at: string
}

// ─── Étape 3 — Cartographie des enjeux ──────────────────────────────────────
// PAS de result_type "content_json seul" comme destination finale : les enjeux
// sont une entité opérationnelle normalisée (table `account_issues`, D-5).
// `account_issues_map` est la sortie BRUTE du workflow LLM (Lot 4) — trace
// d'audit persistée en ai_intelligence_results avant matérialisation ligne à
// ligne dans `account_issues` (même pattern que commercial_pitch → intelligence_documents).

export const ACCOUNT_ISSUES_MAP_RESULT_TYPE = "account_issues_map" as const

export type AccountIssueCategory = Database["public"]["Enums"]["account_issue_category"]
export type AccountIssueEvidenceLevel = Database["public"]["Enums"]["account_issue_evidence_level"]
export type AccountIssueStatus = Database["public"]["Enums"]["account_issue_status"]

// Forme produite par le LLM/n8n avant insertion — miroir des colonnes
// `account_issues` hors id/workspace_id/company_id/status/timestamps (attribués
// par l'app à l'insertion, pas par le modèle).
export interface AccountIssueDraft {
  title: string
  category: AccountIssueCategory
  problem_statement: string
  evidence_level: AccountIssueEvidenceLevel
  provenance: IntelligenceProvenance
  source_refs: IntelligenceSourceRef[]
  importance: 1 | 2 | 3 | 4 | 5
  urgency: 1 | 2 | 3 | 4 | 5
  criticality: 1 | 2 | 3 | 4 | 5
  business_impact: 1 | 2 | 3 | 4 | 5
  accessibility: 1 | 2 | 3 | 4 | 5
  kredo_fit: 1 | 2 | 3 | 4 | 5
  contact_ids: string[]
  recommended_next_probe?: string
}

export interface AccountIssuesMapContent {
  schema_version: 1
  issues: AccountIssueDraft[]
  generated_at: string
}

// ─── Étape 4 — Stratégie commerciale ────────────────────────────────────────
// result_type = "commercial_strategy". Mapping enjeu↔offre + angles/messages.
// Référence des `issue_id` (table account_issues) et des `offer_id` (catalogue
// offers, référentiel existant) — pas de duplication de leur contenu ici.

export const COMMERCIAL_STRATEGY_RESULT_TYPE = "commercial_strategy" as const

export type CommercialStrategyOfferMatch = {
  issue_id: string
  offer_id: string
  rationale: string
  provenance: IntelligenceProvenance
}

export interface CommercialStrategyContent {
  schema_version: 1
  offer_matches: CommercialStrategyOfferMatch[]
  approach_angles: string[]
  key_messages_by_persona: Record<string, string[]>
  objections: Array<{ objection: string; response: string }>
  generated_at: string
}

// ─── Étape 5 — Roadmap commerciale ──────────────────────────────────────────
// Même logique que les enjeux (D-5) : `commercial_roadmap` est la sortie brute
// du workflow (Lot 6), tracée en ai_intelligence_results, puis matérialisée
// ligne à ligne dans `account_roadmap_actions`. La matérialisation RÉELLE
// (tasks/calendar_events/opportunities) reste gated Lot 7 (D-2) — jamais
// automatique depuis ce contrat.

export const COMMERCIAL_ROADMAP_RESULT_TYPE = "commercial_roadmap" as const

export type AccountRoadmapActionType = Database["public"]["Enums"]["account_roadmap_action_type"]
export type AccountRoadmapActionStatus = Database["public"]["Enums"]["account_roadmap_action_status"]

export interface AccountRoadmapActionDraft {
  title: string
  description?: string
  action_type: AccountRoadmapActionType
  target_contact_id?: string
  due_date?: string
  sequence_order?: number
  issue_id?: string
  provenance: IntelligenceProvenance
  source_refs: IntelligenceSourceRef[]
}

export interface CommercialRoadmapContent {
  schema_version: 1
  actions: AccountRoadmapActionDraft[]
  generated_at: string
}
