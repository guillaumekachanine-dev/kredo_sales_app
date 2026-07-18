export type SectorMarketView = {
  globalVolume: string | null
  franceVolume: string | null
  europeVolume: string | null
  growth: string | null
  trends: string[]
  growthDrivers: string[]
  threats: string[]
}

export type SectorActorStatus = "leader" | "challenger" | "specialist" | "outsider" | "unclassified"

export type SectorActorView = {
  id: string
  name: string
  status: SectorActorStatus
  description: string | null
  role: string | null
  coverage: string | null
  segment: string | null
  source: "folio" | "kredo" | "combined"
  isKredoAccount: boolean
  isCurrentAccount: boolean
  companyIds: string[]
  x: number
  y: number
}

export type SectorPainPointView = {
  id: string
  title: string
  description: string | null
  frequency: number
  criticality: number | null
  affectedSegments: string[]
  commercialAngle: string | null
  kredoPractice: string | null
}

export type SectorRegulatoryState = "future" | "imminent" | "expired" | "undated"

export type SectorRegulatoryView = {
  id: string
  title: string
  authority: string | null
  description: string | null
  deadlineDate: string | null
  urgency: string
  state: SectorRegulatoryState
  kredoPractice: string | null
  commercialAngle: string | null
  isCommercialWindow: boolean
  sourceUrl: string | null
}

export type SectorCommercialEventView = {
  id: string
  title: string
  eventType: string
  eventDate: string | null
  location: string | null
  description: string | null
  importance: string | null
  sourceUrl: string | null
  commercialOpportunity: string | null
  timing: "upcoming" | "recent" | "undated"
}

export type SectorCommercialWindowView = {
  id: string
  title: string
  reason: string | null
  deadlineDate: string | null
  urgency: string
  commercialAngle: string | null
  kredoPractice: string | null
  sourceUrl: string | null
  sourceType: "regulatory"
}

export type ClientIntelligenceSectorView = {
  sectorId: string
  name: string
  slug: string
  description: string | null
  folioSummary: string | null
  status: string
  attractivenessScore: number | null
  marketSizeEurBn: number | null
  marketGrowthPct: number | null
  market: SectorMarketView
  actors: SectorActorView[]
  painPoints: SectorPainPointView[]
  regulatoryItems: SectorRegulatoryView[]
  events: SectorCommercialEventView[]
  openCommercialWindows: SectorCommercialWindowView[]
  exposedAccountsCount: number
  displayedKredoAccountsCount: number
  unclassifiedKredoAccountsCount: number
}

export type SectorCompanySource = {
  id: string
  name: string
  legalName: string | null
  segment: string | null
  metadata: unknown
}

export type SectorPainPointSource = {
  id: string
  title: string
  description: string | null
  frequencyCount: number
  sourceCompanyIds: string[]
  kredoPractice: string | null
}

export type SectorRegulatorySource = {
  id: string
  name: string
  authority: string | null
  description: string | null
  deadlineDate: string | null
  urgency: string
  kredoPractice: string | null
  commercialAngle: string | null
  isCommercialWindow: boolean
  sourceUrl: string | null
}

export type SectorEventSource = {
  id: string
  title: string
  eventType: string
  description: string | null
  eventDate: string | null
  sourceUrl: string | null
  commercialOpportunity: string | null
}

export type SectorIntelligenceSource = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  attractivenessScore: number | null
  marketSizeEurBn: number | null
  marketGrowthPct: number | null
  keyPlayersPaca: unknown
  keyPlayersNational: unknown
}

export type ClientIntelligenceSectorSource = {
  sector: SectorIntelligenceSource
  currentCompanyId: string
  currentSectorAnalysis: unknown
  companies: SectorCompanySource[]
  painPoints: SectorPainPointSource[]
  regulatoryItems: SectorRegulatorySource[]
  events: SectorEventSource[]
  now?: Date
}

type MutableActor = Omit<SectorActorView, "x" | "y">

const EMPTY_MARKET: SectorMarketView = {
  globalVolume: null,
  franceVolume: null,
  europeVolume: null,
  growth: null,
  trends: [],
  growthDrivers: [],
  threats: [],
}

const STATUS_PRIORITY: Record<SectorActorStatus, number> = {
  leader: 4,
  challenger: 3,
  specialist: 2,
  outsider: 1,
  unclassified: 0,
}

const BAND_Y: Record<SectorActorStatus, number> = {
  leader: 13,
  challenger: 31,
  specialist: 49,
  outsider: 67,
  unclassified: 86,
}

const LEGAL_SUFFIXES = /\b(sa|sas|sasu|sarl|se|spa|ag|ltd|limited|inc|corp|corporation|group|groupe|holding)\b/g
const WIDE_COVERAGE = /\b(global|mondial|international|generaliste|généraliste|diversifie|diversifié|multi[- ]?segment|tous les segments|couverture large)\b/i
const NICHE_COVERAGE = /\b(niche|specialiste|spécialiste|specialise|spécialisé|focalise|focalisé|segment specifique|segment spécifique)\b/i

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const text = String(value).trim()
  if (!text || /^(non trouv[ée]|n\/?a|indisponible|null|undefined)$/i.test(text)) return null
  return text
}

function firstText(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanText(record[key])
    if (value) return value
  }
  return null
}

function uniqueText(items: unknown[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const text = cleanText(item)
    if (!text) continue
    const key = normalizeEntityName(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(text)
  }
  return result
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueText(value)
  const text = cleanText(value)
  return text ? [text] : []
}

export function normalizeEntityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/\([^)]*\)/g, " ")
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function normalizeSectorMarket(sectorAnalysis: unknown): SectorMarketView {
  const root = asRecord(sectorAnalysis)
  const market = asRecord(root.volume_marche ?? root.volumeMarche)
  const competition = asRecord(root.analyse_concurrentielle ?? root.analyseConcurrentielle)
  if (Object.keys(market).length === 0 && Object.keys(competition).length === 0) return EMPTY_MARKET

  return {
    globalVolume: firstText(market, ["taille_marche_mondial", "taille_marche_mondiale", "taille_marche_globale", "volume_global", "global_volume"]),
    franceVolume: firstText(market, ["taille_marche_france", "volume_france", "france_volume"]),
    europeVolume: firstText(market, ["taille_marche_europe", "volume_europe", "europe_volume"]),
    growth: firstText(market, ["taux_croissance_annuel", "croissance", "growth", "dynamique_croissance"]),
    trends: textList(market.tendances_macro ?? market.tendances),
    growthDrivers: textList(market.facteurs_croissance ?? market.moteurs_croissance),
    threats: uniqueText([
      ...textList(market.freins_identifies ?? market.menaces),
      ...textList(competition.menaces),
    ]),
  }
}

export function classifyActorStatus(value: unknown): SectorActorStatus {
  const normalized = normalizeEntityName(cleanText(value) ?? "")
  if (/\bleaders?\b|\bdominant\b/.test(normalized)) return "leader"
  if (/\bchallengers?\b/.test(normalized)) return "challenger"
  if (/\bspecialist\b|\bspecialiste\b|\bniche\b/.test(normalized)) return "specialist"
  if (/\boutsider\b|\bemergent\b|\bstartup\b/.test(normalized)) return "outsider"
  return "unclassified"
}

function actorId(name: string): string {
  return `actor-${normalizeEntityName(name).replace(/\s+/g, "-") || "unknown"}`
}

function actorFromUnknown(value: unknown, fallbackStatus: SectorActorStatus, source: "folio" | "kredo"): MutableActor | null {
  const record = asRecord(value)
  const name = cleanText(value) ?? firstText(record, ["nom", "name", "raison_sociale", "legal_name"])
  if (!name) return null
  const explicitStatus = firstText(record, ["statut", "status", "categorie", "category"])
  const status = explicitStatus ? classifyActorStatus(explicitStatus) : fallbackStatus
  return {
    id: actorId(name),
    name,
    status,
    description: firstText(record, ["description", "note", "forces"]),
    role: firstText(record, ["role", "rôle", "positionnement"]),
    coverage: firstText(record, ["couverture", "couverture_marche", "coverage", "part_marche_estimee", "size", "taille"]),
    segment: firstText(record, ["segment", "specialisation", "spécialisation"]),
    source,
    isKredoAccount: false,
    isCurrentAccount: false,
    companyIds: [],
  }
}

function actorsFromGroup(value: unknown, status: SectorActorStatus, source: "folio" | "kredo"): MutableActor[] {
  return asArray(value).flatMap((item) => {
    const actor = actorFromUnknown(item, status, source)
    return actor ? [actor] : []
  })
}

function extractFolioActors(sectorAnalysis: unknown): MutableActor[] {
  const root = asRecord(sectorAnalysis)
  const actors = root.acteurs_cles ?? root.acteursCles
  if (Array.isArray(actors)) return actorsFromGroup(actors, "unclassified", "folio")

  const actorGroups = asRecord(actors)
  const competition = asRecord(root.analyse_concurrentielle ?? root.analyseConcurrentielle)
  return [
    ...actorsFromGroup(actorGroups.leaders, "leader", "folio"),
    ...actorsFromGroup(actorGroups.challengers, "challenger", "folio"),
    ...actorsFromGroup(actorGroups.specialistes ?? actorGroups.specialists, "specialist", "folio"),
    ...actorsFromGroup(actorGroups.emergents ?? actorGroups.outsiders, "outsider", "folio"),
    ...actorsFromGroup(competition.concurrents_directs ?? competition.directCompetitors, "unclassified", "folio"),
  ]
}

function mergeActors(actors: MutableActor[]): MutableActor[] {
  const byName = new Map<string, MutableActor>()
  for (const actor of actors) {
    const key = normalizeEntityName(actor.name)
    if (!key) continue
    const previous = byName.get(key)
    if (!previous) {
      byName.set(key, actor)
      continue
    }
    byName.set(key, {
      ...previous,
      status: STATUS_PRIORITY[actor.status] > STATUS_PRIORITY[previous.status] ? actor.status : previous.status,
      description: previous.description ?? actor.description,
      role: previous.role ?? actor.role,
      coverage: previous.coverage ?? actor.coverage,
      segment: previous.segment ?? actor.segment,
      source: previous.source === actor.source ? previous.source : "combined",
      isKredoAccount: previous.isKredoAccount || actor.isKredoAccount,
      isCurrentAccount: previous.isCurrentAccount || actor.isCurrentAccount,
      companyIds: uniqueText([...previous.companyIds, ...actor.companyIds]),
    })
  }
  return [...byName.values()]
}

function metadataAliases(metadata: unknown): string[] {
  const root = asRecord(metadata)
  const identity = asRecord(root.identite ?? root.identity)
  return uniqueText([
    ...textList(root.aliases ?? root.alternate_names),
    root.legal_name,
    root.company_name,
    identity.raison_sociale,
    identity.nom,
  ])
}

export function matchKredoAccountsToActors(
  actors: MutableActor[],
  companies: SectorCompanySource[],
  currentCompanyId: string,
): MutableActor[] {
  const result = actors.map((actor) => ({ ...actor, companyIds: [...actor.companyIds] }))

  for (const company of companies) {
    const aliases = uniqueText([company.name, company.legalName, ...metadataAliases(company.metadata)])
      .map(normalizeEntityName)
      .filter(Boolean)
    const matchingIndexes = result.flatMap((actor, index) => aliases.includes(normalizeEntityName(actor.name)) ? [index] : [])
    const bestIndex = matchingIndexes.sort((left, right) => STATUS_PRIORITY[result[right].status] - STATUS_PRIORITY[result[left].status])[0]

    if (bestIndex !== undefined) {
      const actor = result[bestIndex]
      result[bestIndex] = {
        ...actor,
        source: actor.source === "kredo" ? "kredo" : "combined",
        isKredoAccount: true,
        isCurrentAccount: actor.isCurrentAccount || company.id === currentCompanyId,
        companyIds: uniqueText([...actor.companyIds, company.id]),
        segment: actor.segment ?? company.segment,
      }
      continue
    }

    result.push({
      id: `kredo-${company.id}`,
      name: company.name,
      status: "unclassified",
      description: "Compte KREDO du secteur dont le statut concurrentiel n’est pas documenté.",
      role: "Compte KREDO non classé",
      coverage: null,
      segment: company.segment,
      source: "kredo",
      isKredoAccount: true,
      isCurrentAccount: company.id === currentCompanyId,
      companyIds: [company.id],
    })
  }

  return result
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function horizontalBase(actor: MutableActor): number {
  const evidence = [actor.coverage, actor.segment, actor.description, actor.role].filter(Boolean).join(" ")
  if (actor.status === "specialist" || NICHE_COVERAGE.test(evidence)) return 23
  if (WIDE_COVERAGE.test(evidence)) return 79
  return 51
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function positionSectorActors(actors: MutableActor[]): SectorActorView[] {
  const positioned: SectorActorView[] = []
  const ordered = [...actors].sort((left, right) => {
    const statusOrder = STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status]
    return statusOrder || left.name.localeCompare(right.name, "fr")
  })
  const offsets = [[0, 0], [9, 0], [-9, 0], [0, 5], [0, -5], [9, 5], [-9, 5], [18, 0], [-18, 0], [18, 5], [-18, 5]] as const

  for (const actor of ordered) {
    const hash = stableHash(`${normalizeEntityName(actor.name)}:${actor.status}`)
    const baseX = horizontalBase(actor) + (hash % 11) - 5
    const baseY = BAND_Y[actor.status] + (Math.floor(hash / 11) % 5) - 2
    let chosen = { x: clamp(baseX, 8, 93), y: clamp(baseY, BAND_Y[actor.status] - 6, BAND_Y[actor.status] + 6) }

    for (const [offsetX, offsetY] of offsets) {
      const candidate = {
        x: clamp(baseX + offsetX, 8, 93),
        y: clamp(baseY + offsetY, BAND_Y[actor.status] - 6, BAND_Y[actor.status] + 6),
      }
      const collides = positioned.some((item) => item.status === actor.status && Math.abs(item.x - candidate.x) < 8 && Math.abs(item.y - candidate.y) < 4)
      if (!collides) {
        chosen = candidate
        break
      }
    }

    positioned.push({ ...actor, x: chosen.x, y: chosen.y })
  }

  return positioned
}

export function normalizeSectorActors(source: ClientIntelligenceSectorSource): SectorActorView[] {
  const structured = [
    ...actorsFromGroup(source.sector.keyPlayersPaca, "unclassified", "kredo"),
    ...actorsFromGroup(source.sector.keyPlayersNational, "unclassified", "kredo"),
  ]
  const merged = mergeActors([...extractFolioActors(source.currentSectorAnalysis), ...structured])
  return positionSectorActors(matchKredoAccountsToActors(merged, source.companies, source.currentCompanyId))
}

export function sortSectorPainPoints(items: SectorPainPointView[]): SectorPainPointView[] {
  return [...items].sort((left, right) =>
    right.frequency - left.frequency ||
    (right.criticality ?? -1) - (left.criticality ?? -1) ||
    left.title.localeCompare(right.title, "fr"),
  )
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function regulatoryState(deadlineDate: string | null, now: Date): SectorRegulatoryState {
  if (!deadlineDate) return "undated"
  const today = isoDay(now)
  if (deadlineDate < today) return "expired"
  const imminentLimit = new Date(now)
  imminentLimit.setUTCDate(imminentLimit.getUTCDate() + 90)
  return deadlineDate <= isoDay(imminentLimit) ? "imminent" : "future"
}

export function sortSectorRegulatoryItems(items: SectorRegulatoryView[]): SectorRegulatoryView[] {
  const group = (item: SectorRegulatoryView) => item.state === "imminent" || item.state === "future" ? 0 : item.state === "undated" ? 1 : 2
  return [...items].sort((left, right) => {
    const groupOrder = group(left) - group(right)
    if (groupOrder) return groupOrder
    if (left.state === "expired" && right.state === "expired") return (right.deadlineDate ?? "").localeCompare(left.deadlineDate ?? "")
    return (left.deadlineDate ?? "9999-12-31").localeCompare(right.deadlineDate ?? "9999-12-31") || left.title.localeCompare(right.title, "fr")
  })
}

function validUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? value : null
  } catch {
    return null
  }
}

export function normalizeCommercialWindows(
  regulatoryItems: SectorRegulatoryView[],
  now: Date,
): SectorCommercialWindowView[] {
  const today = isoDay(now)
  return regulatoryItems
    .filter((item) => item.isCommercialWindow && (!item.deadlineDate || item.deadlineDate >= today))
    .map((item) => ({
      id: `regulatory-window-${item.id}`,
      title: item.title,
      reason: item.description,
      deadlineDate: item.deadlineDate,
      urgency: item.urgency,
      commercialAngle: item.commercialAngle,
      kredoPractice: item.kredoPractice,
      sourceUrl: item.sourceUrl,
      sourceType: "regulatory" as const,
    }))
    .sort((left, right) => (left.deadlineDate ?? "9999-12-31").localeCompare(right.deadlineDate ?? "9999-12-31"))
}

export function buildClientIntelligenceSectorView(source: ClientIntelligenceSectorSource): ClientIntelligenceSectorView {
  const now = source.now ?? new Date()
  const companyById = new Map(source.companies.map((company) => [company.id, company]))
  const actors = normalizeSectorActors(source)
  const painPoints = sortSectorPainPoints(source.painPoints.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    frequency: item.frequencyCount,
    criticality: null,
    affectedSegments: uniqueText(item.sourceCompanyIds.map((id) => companyById.get(id)?.segment)),
    commercialAngle: null,
    kredoPractice: item.kredoPractice,
  })))
  const regulatoryItems = sortSectorRegulatoryItems(source.regulatoryItems.map((item) => ({
    id: item.id,
    title: item.name,
    authority: item.authority,
    description: item.description,
    deadlineDate: item.deadlineDate,
    urgency: item.urgency,
    state: regulatoryState(item.deadlineDate, now),
    kredoPractice: item.kredoPractice,
    commercialAngle: item.commercialAngle,
    isCommercialWindow: item.isCommercialWindow,
    sourceUrl: validUrl(item.sourceUrl),
  })))
  const today = isoDay(now)
  const eventTimingRank: Record<SectorCommercialEventView["timing"], number> = {
    upcoming: 0,
    undated: 1,
    recent: 2,
  }
  const events = source.events.map((item): SectorCommercialEventView => ({
    id: item.id,
    title: item.title,
    eventType: item.eventType,
    eventDate: item.eventDate,
    location: null,
    description: item.description,
    importance: null,
    sourceUrl: validUrl(item.sourceUrl),
    commercialOpportunity: item.commercialOpportunity,
    timing: item.eventDate ? item.eventDate >= today ? "upcoming" : "recent" : "undated",
  })).sort((left, right) => {
    if (left.timing !== right.timing) return eventTimingRank[left.timing] - eventTimingRank[right.timing]
    if (left.timing === "recent") return (right.eventDate ?? "").localeCompare(left.eventDate ?? "")
    return (left.eventDate ?? "9999-12-31").localeCompare(right.eventDate ?? "9999-12-31")
  })
  const folioRoot = asRecord(source.currentSectorAnalysis)
  const folioSummary = firstText(folioRoot, ["synthese_sectorielle", "synthese"])
  const displayedKredoAccountsCount = actors.reduce((total, actor) => total + actor.companyIds.length, 0)
  const unclassifiedKredoAccountsCount = actors.reduce((total, actor) =>
    total + (actor.status === "unclassified" ? actor.companyIds.length : 0), 0)

  return {
    sectorId: source.sector.id,
    name: source.sector.name,
    slug: source.sector.slug,
    description: source.sector.description,
    folioSummary,
    status: source.sector.status,
    attractivenessScore: source.sector.attractivenessScore,
    marketSizeEurBn: source.sector.marketSizeEurBn,
    marketGrowthPct: source.sector.marketGrowthPct,
    market: normalizeSectorMarket(source.currentSectorAnalysis),
    actors,
    painPoints,
    regulatoryItems,
    events,
    openCommercialWindows: normalizeCommercialWindows(regulatoryItems, now),
    exposedAccountsCount: source.companies.length,
    displayedKredoAccountsCount,
    unclassifiedKredoAccountsCount,
  }
}

export function buildFolioFallbackSectorView(input: {
  companyId: string
  companyName: string
  companySegment: string | null
  sectorName: string
  sectorAnalysis: unknown
}): ClientIntelligenceSectorView {
  return buildClientIntelligenceSectorView({
    sector: {
      id: "folio-unlinked",
      name: input.sectorName || "Secteur non rattaché",
      slug: "folio-unlinked",
      description: null,
      status: "unlinked",
      attractivenessScore: null,
      marketSizeEurBn: null,
      marketGrowthPct: null,
      keyPlayersPaca: [],
      keyPlayersNational: [],
    },
    currentCompanyId: input.companyId,
    currentSectorAnalysis: input.sectorAnalysis,
    companies: [{
      id: input.companyId,
      name: input.companyName,
      legalName: null,
      segment: input.companySegment,
      metadata: {},
    }],
    painPoints: [],
    regulatoryItems: [],
    events: [],
  })
}
