/**
 * CONTRAT DE DONNÉES « CONVERGENCES » (v1)
 *
 * Représente la synthèse d'IA structurée d'un article de veille rapprochée
 * avec les connaissances réelles KREDO (comptes, enjeux/issues, playbooks sectoriels).
 */

export type VeilleConvergenceEvidenceType =
  | "article"
  | "account_issue"
  | "company"
  | "sector_playbook"

export type VeilleConvergenceEvidenceRef = {
  type: VeilleConvergenceEvidenceType
  id: string
  label: string
}

export type VeilleConvergenceMatchedIssue = {
  issueId: string
  companyId: string
  companyName: string
  issueTitle: string
  rationale: string
}

export type VeilleConvergenceRelatedAccount = {
  companyId: string
  companyName: string
  rationale: string
}

export type VeilleConvergencePlaybookSuggestion = {
  sectorId: string
  sectorName: string
  targetSection: string
  proposedArgument: string
  rationale: string
}

export type VeilleConvergenceRecommendedAction = {
  label: string
  rationale: string
}

export type VeilleArticleConvergencesConfidence = "high" | "medium" | "low"

export type VeilleArticleConvergences = {
  schemaVersion: 1
  synthesis: string
  confidence: VeilleArticleConvergencesConfidence
  matchedIssues: VeilleConvergenceMatchedIssue[]
  relatedAccounts: VeilleConvergenceRelatedAccount[]
  playbookSuggestion: VeilleConvergencePlaybookSuggestion | null
  recommendedActions: VeilleConvergenceRecommendedAction[]
  evidenceRefs: VeilleConvergenceEvidenceRef[]
}

/**
 * Bornes maximales applicables au contrat Convergences v1
 */
export const VEILLE_CONVERGENCES_BOUNDS = {
  MAX_MATCHED_ISSUES: 3,
  MAX_RELATED_ACCOUNTS: 5,
  MAX_RECOMMENDED_ACTIONS: 3,
} as const
