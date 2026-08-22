import {
  COMPETITIVE_MAP_CATEGORY_LABELS,
  type CompetitiveMapCategory,
  type CompetitiveMapJsonValue,
} from "./competitive-map-output"
import type {
  CompetitiveMapActor,
  CompetitiveMapCatalogItem,
  CompetitiveMapSnapshot,
} from "../data/competitive-map-workspace-types"

export type CompetitiveMapCatalogEntryRow = {
  segment_id: string | null
  study_snapshot_date: string
}

export type CompetitiveMapSectorRow = {
  id: string
  slug: string
  name: string
  level: string
  parent_id: string | null
}

export type CompetitiveMapWorkspaceEntryRow = {
  id: string
  company_id: string
  category: string
  positioning: string | null
  forces: string | null
  vulnerabilite: string | null
  angle_entree: string | null
  appetence_score: number | null
  accessibilite_score: number | null
  appetence_provisoire: boolean
  confiance: string
  empreinte_metier?: number | null
  maturite_numerique?: number | null
  is_benchmark_account: boolean
  profile_json: CompetitiveMapJsonValue
  companies: { id: string; name: string } | { id: string; name: string }[] | null
}

export type CompetitiveMapFactRow = {
  target_id: string
  fact_type: string
  value_json: CompetitiveMapJsonValue | null
  value_text: string | null
  normalized_value: string
}

const CATEGORY_ORDER: readonly CompetitiveMapCategory[] = [
  "leader",
  "challenger",
  "mid_market",
  "outsider_emergent",
  "outsider_niche",
]

function isCategory(value: string): value is CompetitiveMapCategory {
  return value in COMPETITIVE_MAP_CATEGORY_LABELS
}

export function buildCompetitiveMapCatalog(
  entryRows: CompetitiveMapCatalogEntryRow[],
  sectorRows: CompetitiveMapSectorRow[],
): CompetitiveMapCatalogItem[] {
  const sectorsById = new Map(sectorRows.map((sector) => [sector.id, sector]))
  const snapshotsBySegment = new Map<string, Map<string, number>>()

  for (const row of entryRows) {
    if (!row.segment_id) continue
    const dates = snapshotsBySegment.get(row.segment_id) ?? new Map<string, number>()
    dates.set(row.study_snapshot_date, (dates.get(row.study_snapshot_date) ?? 0) + 1)
    snapshotsBySegment.set(row.segment_id, dates)
  }

  const catalog: CompetitiveMapCatalogItem[] = []
  for (const [segmentId, dates] of snapshotsBySegment) {
    const segment = sectorsById.get(segmentId)
    if (!segment || segment.level !== "segment") continue

    let latestSnapshotDate = ""
    for (const date of dates.keys()) {
      if (date > latestSnapshotDate) latestSnapshotDate = date
    }

    const macroName = segment.parent_id ? sectorsById.get(segment.parent_id)?.name ?? "" : ""
    catalog.push({
      segmentId,
      segmentSlug: segment.slug,
      segmentName: segment.name,
      macroName,
      label: macroName ? `${macroName} › ${segment.name}` : segment.name,
      latestSnapshotDate,
      actorCount: dates.get(latestSnapshotDate) ?? 0,
    })
  }

  return catalog.toSorted((left, right) =>
    left.label.localeCompare(right.label, "fr", { sensitivity: "base" }),
  )
}

function asObject(value: CompetitiveMapJsonValue | null | undefined): Record<string, CompetitiveMapJsonValue | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function humanizeKey(value: string): string {
  const label = value.replaceAll("_", " ")
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

function formatProfileValue(value: CompetitiveMapJsonValue | undefined): string[] {
  if (value === null || value === undefined) return []
  if (typeof value === "string") return value.trim() ? [value.trim()] : []
  if (typeof value === "number" || typeof value === "boolean") return [String(value)]
  if (Array.isArray(value)) return value.flatMap(formatProfileValue)

  const record = asObject(value)
  const eventParts = [record.date, record.fait, record.source]
    .flatMap(formatProfileValue)
    .filter(Boolean)
  if (eventParts.length > 0 && ("date" in record || "fait" in record || "source" in record)) {
    return [eventParts.join(" · ")]
  }

  return Object.entries(record).flatMap(([key, nested]) =>
    formatProfileValue(nested).map((text) => `${humanizeKey(key)} : ${text}`),
  )
}

function firstText(value: CompetitiveMapJsonValue | undefined): string | null {
  return formatProfileValue(value)[0] ?? null
}

function getCompany(row: CompetitiveMapWorkspaceEntryRow): { id: string; name: string } | null {
  if (Array.isArray(row.companies)) return row.companies[0] ?? null
  return row.companies
}

function getRevenue(fact: CompetitiveMapFactRow | undefined) {
  const value = asObject(fact?.value_json ?? null)
  const amount = typeof value.amountMeur === "number" ? value.amountMeur : Number(fact?.normalized_value)
  return {
    amount: Number.isFinite(amount) ? amount : null,
    exercice: typeof value.exercice === "number" ? value.exercice : null,
    perimetre: typeof value.perimetre === "string" && value.perimetre.trim() ? value.perimetre : null,
  }
}

export function presentCompetitiveMapSnapshot(input: {
  catalogItem: CompetitiveMapCatalogItem
  entryRows: CompetitiveMapWorkspaceEntryRow[]
  factRows: CompetitiveMapFactRow[]
}): CompetitiveMapSnapshot {
  const factsByCompany = new Map<string, Map<string, CompetitiveMapFactRow>>()
  for (const fact of input.factRows) {
    const facts = factsByCompany.get(fact.target_id) ?? new Map<string, CompetitiveMapFactRow>()
    facts.set(fact.fact_type, fact)
    factsByCompany.set(fact.target_id, facts)
  }

  const actors = input.entryRows.flatMap((row): CompetitiveMapActor[] => {
    const company = getCompany(row)
    if (!company || !isCategory(row.category)) return []

    const facts = factsByCompany.get(company.id)
    const revenue = getRevenue(facts?.get("revenue_estimate"))
    const headcount = facts?.get("headcount_france")
    const profile = asObject(row.profile_json)

    return [{
      id: row.id,
      companyId: company.id,
      name: company.name,
      category: row.category,
      categoryLabel: COMPETITIVE_MAP_CATEGORY_LABELS[row.category],
      confidence: row.confiance,
      businessFootprintScore: row.empreinte_metier ?? null,
      digitalMaturityScore: row.maturite_numerique ?? null,
      appetenceScore: row.appetence_score,
      accessibilityScore: row.accessibilite_score,
      appetenceProvisoire: row.appetence_provisoire,
      isPositioned: row.appetence_score !== null && row.accessibilite_score !== null,
      isBenchmarkAccount: row.is_benchmark_account,
      revenueEstimateMeur: revenue.amount,
      revenueExercice: revenue.exercice,
      revenuePerimetre: revenue.perimetre,
      headcountFrance: headcount?.value_text ?? headcount?.normalized_value ?? null,
      positioning: row.positioning,
      forces: row.forces,
      vulnerability: row.vulnerabilite,
      angleEntree: row.angle_entree,
      details: {
        propositionValeur: firstText(profile.proposition_valeur),
        differenciateurs: formatProfileValue(profile.differenciateurs),
        dependances: formatProfileValue(profile.dependances_cles),
        chaineValeur: formatProfileValue(profile.chaine_valeur),
        chantiersTechnologiques: formatProfileValue(profile.chantiers_technologiques),
        triggers: formatProfileValue(profile.trigger_events),
        lignesRouges: formatProfileValue(profile.a_ne_pas_dire),
        trous: formatProfileValue(profile.trous),
        metierChaineValeur: firstText(profile.metier_chaine_valeur),
        maillon: firstText(profile.maillon),
        contratsMajeurs: formatProfileValue(profile.contrats_majeurs),
        grilles: formatProfileValue(profile.grilles),
        coucheEsn: formatProfileValue(profile.couche_esn),
        traductionCommerciale: formatProfileValue(profile.traduction_commerciale),
        iaAnnonceVsDeploye: firstText(asObject(profile.grilles).ia_annonce_vs_deploye),
      },
    }]
  })

  actors.sort((left, right) => {
    const categoryDelta = CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category)
    if (categoryDelta !== 0) return categoryDelta
    return (right.appetenceScore ?? -1) - (left.appetenceScore ?? -1) || left.name.localeCompare(right.name, "fr")
  })

  return {
    segmentId: input.catalogItem.segmentId,
    segmentLabel: input.catalogItem.label,
    snapshotDate: input.catalogItem.latestSnapshotDate,
    actors,
  }
}
