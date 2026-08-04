import type { Database } from "@/types/database"
import type { Claim, DeterministicIndicator, QualitySummary } from "./intelligence-common-contracts"

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

// ─── account_knowledge V2 ───────────────────────────────────────────────────
// Même `result_type` ("account_knowledge"), `schema_version: 2`. Les deux
// versions coexistent en base : V1 a été réellement générée, on ne réécrit pas
// l'historique (cf. parseAccountKnowledgeArtifact, qui discrimine sur la version).
//
// Écart assumé avec V1 : V1 range des `AccountKnowledgeFact` porteurs d'une
// `provenance` (relational / folio_legacy / inferred) mais sans obligation de
// source. V2 passe au `Claim`, qui EXIGE des `source_refs` vers
// `intelligence_sources`. C'est le cœur du Lot 0 : une affirmation factuelle
// non sourcée n'est plus recevable. Les deux modèles ne sont donc pas
// convertibles l'un dans l'autre — d'où deux types distincts plutôt qu'une
// union laxiste, et aucune fonction de migration V1→V2 (elle fabriquerait des
// sources qui n'existent pas).

/**
 * Question ouverte : ce n'est PAS un Claim (on n'affirme rien, on demande).
 * Lui imposer des `source_refs` n'aurait pas de sens.
 */
export type AccountKnowledgeOpenQuestion = {
  question: string
  /** Pourquoi la réponse change quelque chose commercialement. */
  why_it_matters?: string
  /** D-4 — curation humaine, même logique que V1 : on masque, on ne supprime pas. */
  dismissed?: boolean
}

export type AccountKnowledgeKeyContactV2 = {
  /** UUID d'un `contacts.id` réel du compte — jamais un nom libre. */
  contact_id: string
  role_summary: Claim
}

export type AccountKnowledgeIdentityV2 = {
  primary_activity: Claim | null
  headquarters: Claim | null
  revenue: Claim | null
  employee_count: Claim | null
  /**
   * Dynamique du compte — DeterministicIndicator, et non un Claim : cette
   * valeur n'est jamais rédigée par le LLM. Elle est calculée par
   * `computeAccountDynamic` (méthode `account-dynamic-v1`) et injectée
   * côté callback applicatif. Le workflow doit émettre `null` ici ; toute
   * autre valeur en provenance du modèle est rejetée.
   *
   * Mesure une intensité d'activité DÉTECTÉE et sourcée sur une fenêtre datée
   * — ni une croissance économique, ni un sentiment (cf. account-dynamic.ts).
   */
  dynamic: DeterministicIndicator | null
}

export type AccountKnowledgeMarketPositioningV2 = {
  positioning: Claim | null
  direct_competitors: Claim[]
  customer_segments: Claim[]
  differentiators: Claim[]
  /** Périmètres de marché non couverts par le compte. */
  uncovered_scope: Claim[]
  /** Identité revendiquée par le compte lui-même (discours officiel). */
  claimed_identity: Claim | null
  threats: Claim[]
  opportunities: Claim[]
}

export type AccountKnowledgeValueChainV2 = {
  description: Claim | null
  value_proposition: Claim | null
  key_links: Claim[]
  dependencies: Claim[]
  vulnerabilities: Claim[]
  customer_base: Claim[]
}

export type AccountKnowledgeOrganisationV2 = {
  departments: Claim[]
  strategic_weight: Claim | null
  key_contacts: AccountKnowledgeKeyContactV2[]
  process_observations: Claim[]
}

export interface AccountKnowledgeContentV2 {
  schema_version: 2
  identity: AccountKnowledgeIdentityV2
  account_summary: Claim | null
  market_positioning: AccountKnowledgeMarketPositioningV2
  company_value_chain: AccountKnowledgeValueChainV2
  organisation: AccountKnowledgeOrganisationV2
  open_questions: AccountKnowledgeOpenQuestion[]
  source_coverage: QualitySummary
  generated_at: string
}

// ─── account_knowledge V3 (Lot 2 — refonte FOLIO) ───────────────────────────
// Même `result_type` ("account_knowledge"), `schema_version: 3`. Coexiste
// en base avec V1 et V2 — jamais de conversion rétroactive silencieuse.
//
// Écarts assumés vs V2 (n'ont d'effet qu'à partir de V3) :
//   - sept sections figées dans un ordre canonique (ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER),
//     alignées sur le contrat fonctionnel INTEL-030-V3 ;
//   - chaque claim porte une `attribution` explicite (independent | institutional).
//     Une prise de parole institutionnelle est déclarative même sur un support
//     officiel : le fait vérifié est « l'entreprise a effectivement publié ceci »,
//     jamais « ce qui est dit est vrai ». Une analyse ne peut donc être portée
//     par le compte lui-même — l'incompatibilité `nature: analysis` +
//     `attribution: institutional` est bloquée par le validateur ;
//   - chaque claim publié possède exactement UN résultat de vérification
//     indépendant (`verification_results`), confirmé, avec ses propres sources
//     de confirmation. Un verdict `contradicted` ou `insufficient_evidence`
//     bloque la publication et retire l'affirmation du contenu. Les deux
//     verdicts restent dans l'enum pour le futur workflow de vérification
//     (Lot 3), mais ils ne peuvent pas figurer dans un artefact publié.

export const ACCOUNT_KNOWLEDGE_V3_SCHEMA_VERSION = 3 as const

export const ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER = [
  "account_summary",
  "identity",
  "market_positioning",
  "offers_and_customers",
  "value_chain",
  "regulatory_environment",
  "trends_and_news",
] as const

export type AccountKnowledgeV3SectionKey =
  (typeof ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER)[number]

export type AccountKnowledgeClaimAttributionV3 = "independent" | "institutional"

/**
 * Claim V3 — un Claim V2 enrichi d'une attribution explicite. Volontairement
 * défini par extension (`Claim & { attribution }`) pour ne pas altérer la
 * forme V2 : les primitives (texte, nature, sources, confiance, verified_at)
 * restent strictement identiques.
 */
export type AccountKnowledgeClaimV3 = Claim & {
  attribution: AccountKnowledgeClaimAttributionV3
}

export type AccountKnowledgeVerificationVerdictV3 =
  | "confirmed"
  | "contradicted"
  | "insufficient_evidence"

/**
 * Résultat d'une vérification indépendante d'un claim publié.
 *
 * `claim_path` réutilise le format des chemins d'erreur de validation
 * (`$.identity.revenue`, `$.market_positioning.direct_competitors[0]` …).
 * `supporting_source_refs` doit être non vide pour un verdict `confirmed` ;
 * `contradicting_source_refs` doit être vide dans le même cas. Un
 * `confirmed` sur une déclaration institutionnelle confirme la publication,
 * pas la vérité factuelle du propos.
 */
export type AccountKnowledgeVerificationResultV3 = {
  claim_path: string
  verdict: AccountKnowledgeVerificationVerdictV3
  checked_at: string
  supporting_source_refs: string[]
  contradicting_source_refs: string[]
  rationale: string | null
}

export type AccountKnowledgeIdentityV3 = {
  company_name: AccountKnowledgeClaimV3 | null
  legal_name: AccountKnowledgeClaimV3 | null
  primary_activity: AccountKnowledgeClaimV3 | null
  headquarters: AccountKnowledgeClaimV3 | null
  sector: AccountKnowledgeClaimV3 | null
  business_segment: AccountKnowledgeClaimV3 | null
  revenue: AccountKnowledgeClaimV3 | null
  employee_count: AccountKnowledgeClaimV3 | null
  geographic_reach: AccountKnowledgeClaimV3[]
  /** Non-Claim : calculé hors LLM (account-dynamic-v1), injecté côté app. */
  dynamic: DeterministicIndicator | null
}

export type AccountKnowledgePolicyAndAmbitionsV3 = {
  purpose: AccountKnowledgeClaimV3 | null
  philosophy: AccountKnowledgeClaimV3 | null
  culture: AccountKnowledgeClaimV3[]
  public_statements: AccountKnowledgeClaimV3[]
  ambitions: AccountKnowledgeClaimV3[]
  strategic_axes: AccountKnowledgeClaimV3[]
  leadership_posture: AccountKnowledgeClaimV3[]
  claimed_identity: AccountKnowledgeClaimV3 | null
}

export type AccountKnowledgeMarketPositioningV3 = {
  account_positioning: AccountKnowledgeClaimV3 | null
  competitive_environment: AccountKnowledgeClaimV3 | null
  direct_competitors: AccountKnowledgeClaimV3[]
  competitive_advantages: AccountKnowledgeClaimV3[]
  opportunities: AccountKnowledgeClaimV3[]
  threats: AccountKnowledgeClaimV3[]
  policy_and_ambitions: AccountKnowledgePolicyAndAmbitionsV3
}

export type AccountKnowledgeOffersAndCustomersV3 = {
  core_business: AccountKnowledgeClaimV3 | null
  offers: AccountKnowledgeClaimV3[]
  covered_domains: AccountKnowledgeClaimV3[]
  services: AccountKnowledgeClaimV3[]
  service_models: AccountKnowledgeClaimV3[]
  complementary_activities: AccountKnowledgeClaimV3[]
  uncovered_activities: AccountKnowledgeClaimV3[]
  customer_profile: AccountKnowledgeClaimV3 | null
  customer_segments: AccountKnowledgeClaimV3[]
  segment_weights: AccountKnowledgeClaimV3[]
  behavioral_trends: AccountKnowledgeClaimV3[]
  unmet_needs: AccountKnowledgeClaimV3[]
}

export type AccountKnowledgeValueChainV3 = {
  description: AccountKnowledgeClaimV3 | null
  value_proposition: AccountKnowledgeClaimV3 | null
  key_links: AccountKnowledgeClaimV3[]
  critical_partners_or_suppliers: AccountKnowledgeClaimV3[]
  dependencies: AccountKnowledgeClaimV3[]
  vulnerabilities: AccountKnowledgeClaimV3[]
  end_customer_relationship: AccountKnowledgeClaimV3 | null
}

/**
 * Trois sous-sections seulement. La rubrique « réglementations à venir »
 * est explicitement exclue de l'onglet Entreprise par le contrat fonctionnel
 * — ne pas la réintroduire sous un autre nom.
 */
export type AccountKnowledgeRegulatoryEnvironmentV3 = {
  current_regulations: AccountKnowledgeClaimV3[]
  required_certifications: AccountKnowledgeClaimV3[]
  compliance_risks: AccountKnowledgeClaimV3[]
}

export type AccountKnowledgeTrendsAndNewsV3 = {
  analysis: AccountKnowledgeClaimV3 | null
  /**
   * UUID de `account_signals.id` — au maximum trois, uniques. Les signaux
   * ne sont pas recopiés dans l'artefact : la source de vérité reste la
   * table `account_signals` (l'onglet affiche les signaux résolus + un
   * accès à la modale exhaustive).
   */
  significant_signal_ids: string[]
}

export interface AccountKnowledgeContentV3 {
  schema_version: 3
  account_summary: AccountKnowledgeClaimV3 | null
  identity: AccountKnowledgeIdentityV3
  market_positioning: AccountKnowledgeMarketPositioningV3
  offers_and_customers: AccountKnowledgeOffersAndCustomersV3
  value_chain: AccountKnowledgeValueChainV3
  regulatory_environment: AccountKnowledgeRegulatoryEnvironmentV3
  trends_and_news: AccountKnowledgeTrendsAndNewsV3
  verification_results: AccountKnowledgeVerificationResultV3[]
  source_coverage: QualitySummary
  generated_at: string
}

/** Union de lecture — toujours discriminée par `schema_version`. */
export type AccountKnowledgeArtifact =
  | AccountKnowledgeContent
  | AccountKnowledgeContentV2
  | AccountKnowledgeContentV3

// ─── Chemins canoniques V3 ──────────────────────────────────────────────────
// Ordre de parcours = ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER puis ordre déclaratif
// des propriétés dans chaque type ci-dessus. Ne dépend pas de l'ordre physique
// des clés dans le JSON reçu — un JSON n'a pas d'ordre garanti.

type ClaimPath = { path: string; claim: AccountKnowledgeClaimV3 }

function pushNullable(
  target: ClaimPath[],
  claim: AccountKnowledgeClaimV3 | null,
  path: string,
): void {
  if (claim !== null) target.push({ path, claim })
}

function pushArray(
  target: ClaimPath[],
  claims: AccountKnowledgeClaimV3[],
  basePath: string,
): void {
  claims.forEach((claim, index) => target.push({ path: `${basePath}[${index}]`, claim }))
}

/**
 * Parcours déterministe des sept sections V3, dans l'ordre du contrat.
 * Utilisé par le validateur pour vérifier la correspondance exacte entre
 * claims publiés et `verification_results`, et par les lecteurs downstream
 * qui doivent référencer un claim par son chemin (curation, badges de
 * verdict, résumé de couverture).
 */
export function collectAccountKnowledgeV3Claims(
  content: AccountKnowledgeContentV3,
): Array<{ path: string; claim: AccountKnowledgeClaimV3 }> {
  const out: ClaimPath[] = []

  // 1 — account_summary
  pushNullable(out, content.account_summary, "$.account_summary")

  // 2 — identity
  const id = content.identity
  pushNullable(out, id.company_name, "$.identity.company_name")
  pushNullable(out, id.legal_name, "$.identity.legal_name")
  pushNullable(out, id.primary_activity, "$.identity.primary_activity")
  pushNullable(out, id.headquarters, "$.identity.headquarters")
  pushNullable(out, id.sector, "$.identity.sector")
  pushNullable(out, id.business_segment, "$.identity.business_segment")
  pushNullable(out, id.revenue, "$.identity.revenue")
  pushNullable(out, id.employee_count, "$.identity.employee_count")
  pushArray(out, id.geographic_reach, "$.identity.geographic_reach")
  // `dynamic` n'est pas un Claim — pas d'entrée dans le catalogue.

  // 3 — market_positioning
  const mp = content.market_positioning
  pushNullable(out, mp.account_positioning, "$.market_positioning.account_positioning")
  pushNullable(out, mp.competitive_environment, "$.market_positioning.competitive_environment")
  pushArray(out, mp.direct_competitors, "$.market_positioning.direct_competitors")
  pushArray(out, mp.competitive_advantages, "$.market_positioning.competitive_advantages")
  pushArray(out, mp.opportunities, "$.market_positioning.opportunities")
  pushArray(out, mp.threats, "$.market_positioning.threats")
  const pa = mp.policy_and_ambitions
  const paBase = "$.market_positioning.policy_and_ambitions"
  pushNullable(out, pa.purpose, `${paBase}.purpose`)
  pushNullable(out, pa.philosophy, `${paBase}.philosophy`)
  pushArray(out, pa.culture, `${paBase}.culture`)
  pushArray(out, pa.public_statements, `${paBase}.public_statements`)
  pushArray(out, pa.ambitions, `${paBase}.ambitions`)
  pushArray(out, pa.strategic_axes, `${paBase}.strategic_axes`)
  pushArray(out, pa.leadership_posture, `${paBase}.leadership_posture`)
  pushNullable(out, pa.claimed_identity, `${paBase}.claimed_identity`)

  // 4 — offers_and_customers
  const oc = content.offers_and_customers
  pushNullable(out, oc.core_business, "$.offers_and_customers.core_business")
  pushArray(out, oc.offers, "$.offers_and_customers.offers")
  pushArray(out, oc.covered_domains, "$.offers_and_customers.covered_domains")
  pushArray(out, oc.services, "$.offers_and_customers.services")
  pushArray(out, oc.service_models, "$.offers_and_customers.service_models")
  pushArray(out, oc.complementary_activities, "$.offers_and_customers.complementary_activities")
  pushArray(out, oc.uncovered_activities, "$.offers_and_customers.uncovered_activities")
  pushNullable(out, oc.customer_profile, "$.offers_and_customers.customer_profile")
  pushArray(out, oc.customer_segments, "$.offers_and_customers.customer_segments")
  pushArray(out, oc.segment_weights, "$.offers_and_customers.segment_weights")
  pushArray(out, oc.behavioral_trends, "$.offers_and_customers.behavioral_trends")
  pushArray(out, oc.unmet_needs, "$.offers_and_customers.unmet_needs")

  // 5 — value_chain
  const vc = content.value_chain
  pushNullable(out, vc.description, "$.value_chain.description")
  pushNullable(out, vc.value_proposition, "$.value_chain.value_proposition")
  pushArray(out, vc.key_links, "$.value_chain.key_links")
  pushArray(out, vc.critical_partners_or_suppliers, "$.value_chain.critical_partners_or_suppliers")
  pushArray(out, vc.dependencies, "$.value_chain.dependencies")
  pushArray(out, vc.vulnerabilities, "$.value_chain.vulnerabilities")
  pushNullable(out, vc.end_customer_relationship, "$.value_chain.end_customer_relationship")

  // 6 — regulatory_environment
  const re = content.regulatory_environment
  pushArray(out, re.current_regulations, "$.regulatory_environment.current_regulations")
  pushArray(out, re.required_certifications, "$.regulatory_environment.required_certifications")
  pushArray(out, re.compliance_risks, "$.regulatory_environment.compliance_risks")

  // 7 — trends_and_news
  pushNullable(out, content.trends_and_news.analysis, "$.trends_and_news.analysis")

  return out
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
