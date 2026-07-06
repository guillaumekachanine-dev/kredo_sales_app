import type { AccountScoreContext, RawScoreComponent } from "../types"

function sizeScoreFromHeadcount(employeeCount: number): number {
  if (employeeCount < 20) return 20
  if (employeeCount < 100) return 40
  if (employeeCount < 500) return 60
  if (employeeCount < 2000) return 80
  return 100
}

// C2 — Potentiel économique. Combine taille (proxy structurel, 40%) et pipe
// ouvert pondéré déjà matérialisé (60%, plus décisif : un pipe réel prime sur
// une taille théorique). Seuil 50k€ de pipe pondéré = score plein, documenté
// ici (pas de config externalisée — un seul seuil, pas besoin de le déplacer).
export function computePotentielEconomique(ctx: AccountScoreContext): RawScoreComponent {
  const { employeeCount } = ctx.company
  const { openWeightedGain } = ctx.opportunities

  const hasSize = employeeCount !== null
  const hasPipe = openWeightedGain > 0

  const sizeScore = hasSize ? sizeScoreFromHeadcount(employeeCount) : null
  const pipeScore = Math.min(100, Math.round((openWeightedGain / 50_000) * 100))

  const normalizedScore = hasSize
    ? Math.round(sizeScore! * 0.4 + pipeScore * 0.6)
    : pipeScore

  const confidence = Math.min(100, (hasSize ? 50 : 10) + (hasPipe ? 50 : 20))

  const parts: string[] = []
  parts.push(hasSize ? `effectif ${employeeCount} salariés` : "effectif inconnu")
  parts.push(
    hasPipe
      ? `pipe ouvert pondéré ${Math.round(openWeightedGain).toLocaleString("fr-FR")} €`
      : "aucun pipe ouvert matérialisé",
  )

  return {
    componentKey: "C2_potential",
    componentLabel: "Potentiel économique",
    rawValueJson: { employeeCount, openWeightedGain, sizeScore, pipeScore },
    normalizedScore,
    confidence,
    freshnessStatus: hasPipe ? "fresh" : "missing",
    explanation: `${parts.join(", ")}.`,
    evidenceRefs: [],
  }
}
