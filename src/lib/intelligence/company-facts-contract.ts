import type { Json } from "@/types/database.generated"

export type CurrentCompanyFact = {
  id: string
  factType: string
  factSubtype: string | null
  cardinality: "single" | "multi"
  isCurrent: boolean
  valueText: string | null
  valueJson: Json | null
  normalizedValue: string
  confidence: number
  primarySourceId: string | null
  sourceProposalId: string | null
  effectiveAt: string | null
  expiresAt: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CurrentCompanyFactBucket = {
  single: CurrentCompanyFact | null
  multi: CurrentCompanyFact[]
}

export type CurrentCompanyFacts = {
  byType: Record<string, CurrentCompanyFactBucket>
}

export const EMPTY_CURRENT_COMPANY_FACTS: CurrentCompanyFacts = { byType: {} }

function emptyBucket(): CurrentCompanyFactBucket {
  return { single: null, multi: [] }
}

/**
 * Converts current rows into the read contract. The stored cardinality is the
 * SQL canonical contract (private.fact_attribute_definition), repaired in Lot 1.
 */
export function indexCurrentCompanyFacts(rows: readonly CurrentCompanyFact[]): CurrentCompanyFacts {
  const byType: Record<string, CurrentCompanyFactBucket> = {}

  for (const fact of rows) {
    if (!fact.isCurrent) continue
    const bucket = byType[fact.factType] ?? (byType[fact.factType] = emptyBucket())
    if (fact.cardinality === "multi") bucket.multi.push(fact)
    else if (!bucket.single) bucket.single = fact
  }

  return { byType }
}

export function getCurrentSingleFact(
  facts: CurrentCompanyFacts,
  factType: string,
): CurrentCompanyFact | null {
  return facts.byType[factType]?.single ?? null
}

export function getCurrentMultiFacts(
  facts: CurrentCompanyFacts,
  factType: string,
): CurrentCompanyFact[] {
  return facts.byType[factType]?.multi ?? []
}

export function getFactDisplayText(fact: CurrentCompanyFact | null): string | null {
  if (!fact) return null
  if (fact.valueText?.trim()) return fact.valueText.trim()
  if (typeof fact.valueJson === "string" && fact.valueJson.trim()) return fact.valueJson.trim()
  if (fact.normalizedValue.trim()) return fact.normalizedValue.trim()
  return null
}

export function getCurrentSingleFactText(facts: CurrentCompanyFacts, factType: string): string | null {
  return getFactDisplayText(getCurrentSingleFact(facts, factType))
}

export function getCurrentMultiFactTexts(facts: CurrentCompanyFacts, factType: string): string[] {
  return getCurrentMultiFacts(facts, factType)
    .map(getFactDisplayText)
    .filter((value): value is string => value !== null)
}
