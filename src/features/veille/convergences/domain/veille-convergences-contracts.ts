/**
 * CONTRAT DE DONNÉES « CONVERGENCES » (v1 + v2)
 *
 * Représente la synthèse d'IA structurée d'un article de veille rapprochée
 * avec les connaissances réelles KREDO (comptes, enjeux/issues, signaux, faits,
 * opportunités, playbooks sectoriels).
 *
 * v1 (historique, lignes déjà en base, jamais backfillées) : evidenceRefs limité à
 * article/account_issue/company/sector_playbook, pas de relatedOpportunities.
 * v2 (LOT « convergences transverses ») : evidenceRefs étendu à account_signal et
 * account_fact et opportunity, + champ relatedOpportunities. Le parseur lit les deux.
 */

export type VeilleConvergenceEvidenceType =
  | "article"
  | "account_issue"
  | "company"
  | "sector_playbook"
  | "account_signal"
  | "account_fact"
  | "opportunity"

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

export type VeilleConvergenceRelatedOpportunity = {
  opportunityId: string
  companyId: string
  companyName: string
  opportunityTitle: string
  stage: string
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
  schemaVersion: 1 | 2
  synthesis: string
  confidence: VeilleArticleConvergencesConfidence
  matchedIssues: VeilleConvergenceMatchedIssue[]
  relatedAccounts: VeilleConvergenceRelatedAccount[]
  relatedOpportunities: VeilleConvergenceRelatedOpportunity[]
  playbookSuggestion: VeilleConvergencePlaybookSuggestion | null
  recommendedActions: VeilleConvergenceRecommendedAction[]
  evidenceRefs: VeilleConvergenceEvidenceRef[]
}

/**
 * Bornes maximales applicables au contrat Convergences (v1 et v2)
 */
export const VEILLE_CONVERGENCES_BOUNDS = {
  MAX_MATCHED_ISSUES: 3,
  MAX_RELATED_ACCOUNTS: 5,
  MAX_RELATED_OPPORTUNITIES: 3,
  MAX_RECOMMENDED_ACTIONS: 3,
} as const
