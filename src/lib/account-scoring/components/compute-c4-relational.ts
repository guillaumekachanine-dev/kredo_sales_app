import type { AccountScoreContext, RawScoreComponent } from "../types"

// C4 — Accès relationnel. Décideurs identifiés > priorité déclarée > relation
// forte > simple présence de contacts (poids décroissants, plafonné à 100).
export function computeAccesRelationnel(ctx: AccountScoreContext): RawScoreComponent {
  const { totalCount, decisionMakerCount, priorityCount, strongRelationshipCount } = ctx.contacts

  const normalizedScore = Math.min(
    100,
    Math.round(decisionMakerCount * 25 + priorityCount * 15 + strongRelationshipCount * 15 + Math.min(totalCount, 5) * 5),
  )

  const confidence = totalCount > 0 ? 85 : 20

  return {
    componentKey: "C4_relational",
    componentLabel: "Accès relationnel",
    rawValueJson: { totalCount, decisionMakerCount, priorityCount, strongRelationshipCount },
    normalizedScore,
    confidence,
    freshnessStatus: totalCount > 0 ? "fresh" : "missing",
    explanation:
      totalCount > 0
        ? `${totalCount} contact(s) recensé(s), dont ${decisionMakerCount} décideur(s)/DSI/direction métier.`
        : "Aucun contact identifié sur ce compte.",
    evidenceRefs: [],
  }
}
