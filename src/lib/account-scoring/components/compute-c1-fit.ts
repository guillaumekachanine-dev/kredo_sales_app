import type { AccountScoreContext, RawScoreComponent } from "../types"

// C1 — Fit stratégique KREDO. Le compte correspond-il aux practices/secteurs
// prioritaires ? Seuls 14/95 comptes ont un sector_id renseigné (2026-07) —
// l'absence de secteur structuré doit dégrader la confiance, pas le score
// (un compte non rattaché n'est pas "mauvais fit", il est "fit inconnu").
export function computeFitStrategique(ctx: AccountScoreContext): RawScoreComponent {
  const { sector } = ctx

  if (sector?.practicesFit && Object.keys(sector.practicesFit).length > 0) {
    const values = Object.values(sector.practicesFit)
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    const normalizedScore = Math.round((avg / 5) * 100)

    return {
      componentKey: "C1_fit",
      componentLabel: "Fit stratégique",
      rawValueJson: { sectorSlug: sector.slug, practicesFit: sector.practicesFit, avgFit: avg },
      normalizedScore,
      confidence: 80,
      freshnessStatus: "fresh",
      explanation: `Secteur "${sector.slug}" rattaché — fit moyen des practices Kredo : ${avg.toFixed(1)}/5.`,
      evidenceRefs: [{ table: "sector_intelligence", id: sector.slug }],
    }
  }

  return {
    componentKey: "C1_fit",
    componentLabel: "Fit stratégique",
    rawValueJson: { sectorSlug: null },
    normalizedScore: 50,
    confidence: 20,
    freshnessStatus: "missing",
    explanation: "Aucun secteur structuré rattaché au compte — impossible d'évaluer le fit avec les practices Kredo, score neutre par défaut.",
    evidenceRefs: [],
  }
}
