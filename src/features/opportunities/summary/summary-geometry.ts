import type { PipeBucket, SkillDemandRow, SkillSupplyRow } from "../data/opportunities-synthese.types"

/** Only visual normalization; never repairs or recomputes the canonical pipe total. */
export function buildRevenueStrata(buckets: readonly PipeBucket[], total: number) {
  let cursor = 0
  return [...buckets].sort((a, b) => b.weightedValue - a.weightedValue || a.label.localeCompare(b.label, "fr"))
    .map((bucket, index) => {
      const width = total > 0 ? bucket.weightedValue / total * 100 : 0
      const x = cursor
      cursor += width
      return { bucket, rank: index + 1, x, width }
    })
}

export interface SkillMirrorRow {
  skillId: string
  name: string
  demand?: SkillDemandRow
  supply?: SkillSupplyRow
  demandRank?: number
  supplyRank?: number
}

/** Align supplied Top 5 identities; absence from a Top 5 is unknown, never zero. */
export function alignSkillTopFives(demand: readonly SkillDemandRow[], supply: readonly SkillSupplyRow[]): SkillMirrorRow[] {
  const rows = new Map<string, SkillMirrorRow>()
  demand.forEach((row, index) => rows.set(row.skillId, {
    skillId: row.skillId, name: row.name, demand: row, demandRank: index + 1,
  }))
  supply.forEach((row, index) => {
    const existing = rows.get(row.skillId) ?? { skillId: row.skillId, name: row.name }
    rows.set(row.skillId, { ...existing, supply: row, supplyRank: index + 1 })
  })
  return [...rows.values()]
}

export function scaleLength(value: number, max: number, length = 100): number {
  return max > 0 ? value / max * length : 0
}
