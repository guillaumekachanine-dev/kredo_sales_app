import {
  VEILLE_CONVERGENCES_BOUNDS,
  type VeilleArticleConvergences,
  type VeilleArticleConvergencesConfidence,
  type VeilleConvergenceEvidenceRef,
  type VeilleConvergenceEvidenceType,
  type VeilleConvergenceMatchedIssue,
  type VeilleConvergencePlaybookSuggestion,
  type VeilleConvergenceRecommendedAction,
  type VeilleConvergenceRelatedAccount,
} from "./veille-convergences-contracts"

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val)
}

function parseString(val: unknown): string {
  return typeof val === "string" ? val.trim() : ""
}

function parseConfidence(val: unknown): VeilleArticleConvergencesConfidence {
  if (val === "high" || val === "medium" || val === "low") {
    return val
  }
  return "medium"
}

function parseEvidenceType(val: unknown): VeilleConvergenceEvidenceType | null {
  if (
    val === "article" ||
    val === "account_issue" ||
    val === "company" ||
    val === "sector_playbook"
  ) {
    return val
  }
  return null
}

function parseEvidenceRefs(val: unknown): VeilleConvergenceEvidenceRef[] {
  if (!Array.isArray(val)) return []
  const refs: VeilleConvergenceEvidenceRef[] = []

  for (const item of val) {
    if (!isObject(item)) continue
    const type = parseEvidenceType(item.type)
    const id = parseString(item.id)
    const label = parseString(item.label)

    if (type && id && label) {
      refs.push({ type, id, label })
    }
  }

  return refs
}

function parseMatchedIssues(val: unknown): VeilleConvergenceMatchedIssue[] {
  if (!Array.isArray(val)) return []
  const issues: VeilleConvergenceMatchedIssue[] = []

  for (const item of val) {
    if (!isObject(item)) continue
    const issueId = parseString(item.issueId)
    const companyId = parseString(item.companyId)
    const companyName = parseString(item.companyName)
    const issueTitle = parseString(item.issueTitle)
    const rationale = parseString(item.rationale)

    if (issueId && companyId && companyName && issueTitle) {
      issues.push({
        issueId,
        companyId,
        companyName,
        issueTitle,
        rationale,
      })
    }
    if (issues.length >= VEILLE_CONVERGENCES_BOUNDS.MAX_MATCHED_ISSUES) break
  }

  return issues
}

function parseRelatedAccounts(val: unknown): VeilleConvergenceRelatedAccount[] {
  if (!Array.isArray(val)) return []
  const accounts: VeilleConvergenceRelatedAccount[] = []

  for (const item of val) {
    if (!isObject(item)) continue
    const companyId = parseString(item.companyId)
    const companyName = parseString(item.companyName)
    const rationale = parseString(item.rationale)

    if (companyId && companyName) {
      accounts.push({
        companyId,
        companyName,
        rationale,
      })
    }
    if (accounts.length >= VEILLE_CONVERGENCES_BOUNDS.MAX_RELATED_ACCOUNTS) break
  }

  return accounts
}

function parsePlaybookSuggestion(
  val: unknown,
): VeilleConvergencePlaybookSuggestion | null {
  if (!isObject(val)) return null
  const sectorId = parseString(val.sectorId)
  const sectorName = parseString(val.sectorName)
  const targetSection = parseString(val.targetSection)
  const proposedArgument = parseString(val.proposedArgument)
  const rationale = parseString(val.rationale)

  if (!sectorId || !sectorName || !proposedArgument) return null

  return {
    sectorId,
    sectorName,
    targetSection,
    proposedArgument,
    rationale,
  }
}

function parseRecommendedActions(
  val: unknown,
): VeilleConvergenceRecommendedAction[] {
  if (!Array.isArray(val)) return []
  const actions: VeilleConvergenceRecommendedAction[] = []

  for (const item of val) {
    if (!isObject(item)) continue
    const label = parseString(item.label)
    const rationale = parseString(item.rationale)

    if (label) {
      actions.push({ label, rationale })
    }
    if (actions.length >= VEILLE_CONVERGENCES_BOUNDS.MAX_RECOMMENDED_ACTIONS) break
  }

  return actions
}

/**
 * Valide et extrait un objet `VeilleArticleConvergences` à partir d'une entrée brute JSON.
 * Retourne un objet résultat formel avec succès ou cause d'erreur.
 */
export function validateVeilleArticleConvergences(
  input: unknown,
):
  | { success: true; data: VeilleArticleConvergences }
  | { success: false; error: string } {
  if (input === null || input === undefined) {
    return { success: false, error: "Données convergences absentes (null)" }
  }

  if (!isObject(input)) {
    return { success: false, error: "Format convergences invalide (doit être un objet)" }
  }

  if (input.schemaVersion !== 1) {
    return {
      success: false,
      error: `Version de schéma non supportée : ${String(input.schemaVersion)} (version 1 requise)`,
    }
  }

  const synthesis = parseString(input.synthesis)
  if (!synthesis) {
    return { success: false, error: "La synthèse de convergence (synthesis) est requise" }
  }

  const data: VeilleArticleConvergences = {
    schemaVersion: 1,
    synthesis,
    confidence: parseConfidence(input.confidence),
    matchedIssues: parseMatchedIssues(input.matchedIssues),
    relatedAccounts: parseRelatedAccounts(input.relatedAccounts),
    playbookSuggestion: parsePlaybookSuggestion(input.playbookSuggestion),
    recommendedActions: parseRecommendedActions(input.recommendedActions),
    evidenceRefs: parseEvidenceRefs(input.evidenceRefs),
  }

  return { success: true, data }
}

/**
 * Parseur tolérant pour la lecture d'une ligne d'article de veille.
 * Retourne `null` si la colonne est nulle, indéfinie ou invalide.
 */
export function parseVeilleArticleConvergences(
  input: unknown,
): VeilleArticleConvergences | null {
  const result = validateVeilleArticleConvergences(input)
  return result.success ? result.data : null
}
