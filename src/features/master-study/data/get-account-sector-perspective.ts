import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  getSectorKnowledgeReadModel,
  type SectorKnowledgeEventItem,
  type SectorKnowledgeRegulatoryItem,
  type SectorResolvedLevel,
} from "./get-sector-knowledge-read-model"
import {
  getCompetitiveMapCitation,
  type CompetitiveMapEntrySnapshot,
} from "@/features/competitive-map/data/get-competitive-map-citation"

export type { SectorResolvedLevel }

export type SectorMarketThesis = {
  id: number
  these: string
  doncCommercialement: string
  srcIds: number[]
}

export type SectorTechFront = {
  nom: string
  etat: string
  zoneDeTransition: boolean
  doncCommercialement: string
  srcIds: number[]
}

export type SectorCriticalDependency = {
  nom: string
  criticite: string
  risque: string
  situation: string
  practiceKredo: string | null
  prestationOuverte: string | null
  doncCommercialement: string
  srcIds: number[]
}

export type AccountSectorValueChainNode = {
  id: string
  couche: string
  maillon: number | null
  rang: number
  label: string
  description: string | null
  captureValeur: number | null
  captureJustification: string | null
  confiance: string
}

// Alias direct sur le type déjà exporté par get-competitive-map-citation.ts — ne pas dupliquer sa définition.
export type AccountCompetitiveContext = CompetitiveMapEntrySnapshot

export type AccountSectorInterpretation = {
  positioning: string | null           // entry.positioning
  angleEntree: string | null           // entry.angleEntree
  metierChaineValeur: string | null    // entry.profileJson.metier_chaine_valeur
  maillonNarrative: string | null      // entry.profileJson.maillon (prose, jamais parsée)
  commercialAngle: string | null       // entry.profileJson.traduction_commerciale.angle
  commercialHooks: string[]            // entry.profileJson.traduction_commerciale.accroches
  doNotSay: string | null              // entry.profileJson.traduction_commerciale.a_ne_pas_dire
}

export type AccountSectorPerspective = {
  segment: {
    id: string
    name: string
    macroId: string | null
    macroName: string | null
    snapshotDate: string | null
    status: string  // effectiveStatus du read model
  }
  essentialContext: {
    definition: string | null
    definitionLevel: SectorResolvedLevel
    keyTheses: SectorMarketThesis[]
    keyThesesLevel: SectorResolvedLevel
  }
  whyNow: {
    relevantDynamics: SectorKnowledgeEventItem[]        // type déjà exporté par get-sector-knowledge-read-model.ts
    relevantRegulatoryItems: SectorKnowledgeRegulatoryItem[]
    relevantTechFronts: SectorTechFront[]
    relevantTechFrontsLevel: SectorResolvedLevel        // = playbookLevel
  }
  competitivePosition: AccountCompetitiveContext | null
  valueChainPosition: {
    segmentNodes: AccountSectorValueChainNode[]
    dependencies: SectorCriticalDependency[]
    dependenciesLevel: SectorResolvedLevel              // = playbookLevel
  }
  accountInterpretation: AccountSectorInterpretation
  provenance: {
    runId: string | null
    snapshotDate: string | null
    documentId: string | null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
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

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function regulatoryState(deadlineDate: string | null, now: Date): "future" | "imminent" | "expired" | "undated" {
  if (!deadlineDate) return "undated"
  const today = isoDay(now)
  if (deadlineDate < today) return "expired"
  const imminentLimit = new Date(now)
  imminentLimit.setUTCDate(imminentLimit.getUTCDate() + 90)
  return deadlineDate <= isoDay(imminentLimit) ? "imminent" : "future"
}

function parseTheses(playbook: Record<string, unknown> | null): SectorMarketThesis[] {
  if (!playbook) return []
  const rawList = asArray(playbook.market_thesis ?? playbook.marketThesis ?? playbook.theses)
  const results: SectorMarketThesis[] = []

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue
    const rec = asRecord(item)
    const rawId = rec.id
    const id = typeof rawId === "number" ? rawId : (parseNumber(rawId) ?? (results.length + 1))
    const these = cleanText(rec.these ?? rec.thesis ?? rec.nom ?? rec.label)
    if (!these) continue

    const doncCommercialement = cleanText(rec.donc_commercialement ?? rec.doncCommercialement) ?? ""
    const rawSrcIds = asArray(rec.src_ids ?? rec.srcIds)
    const srcIds = rawSrcIds
      .map((x) => (typeof x === "number" ? x : parseNumber(x)))
      .filter((x): x is number => x !== null)

    results.push({
      id,
      these,
      doncCommercialement,
      srcIds,
    })
  }

  return results
}

function parseTechFronts(playbook: Record<string, unknown> | null): SectorTechFront[] {
  if (!playbook) return []
  const rawList = asArray(playbook.tech_fronts ?? playbook.techFronts ?? playbook.fronts_technologiques)
  const results: SectorTechFront[] = []

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue
    const rec = asRecord(item)
    const nom = cleanText(rec.nom ?? rec.name ?? rec.label)
    if (!nom) continue

    const etat = cleanText(rec.etat ?? rec.state ?? rec.description) ?? ""
    const zoneDeTransition = Boolean(rec.zone_de_transition ?? rec.zoneDeTransition)
    const doncCommercialement = cleanText(rec.donc_commercialement ?? rec.doncCommercialement) ?? ""
    const rawSrcIds = asArray(rec.src_ids ?? rec.srcIds)
    const srcIds = rawSrcIds
      .map((x) => (typeof x === "number" ? x : parseNumber(x)))
      .filter((x): x is number => x !== null)

    results.push({
      nom,
      etat,
      zoneDeTransition,
      doncCommercialement,
      srcIds,
    })
  }

  return results
}

function parseDependencies(playbook: Record<string, unknown> | null): SectorCriticalDependency[] {
  if (!playbook) return []
  const rawList = asArray(playbook.dependances_critiques ?? playbook.dependancesCritiques ?? playbook.critical_dependencies)
  const results: SectorCriticalDependency[] = []

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue
    const rec = asRecord(item)
    const nom = cleanText(rec.nom ?? rec.name ?? rec.label)
    if (!nom) continue

    const criticite = cleanText(rec.criticite ?? rec.criticality) ?? "moyenne"
    const risque = cleanText(rec.risque ?? rec.risk) ?? ""
    const situation = cleanText(rec.situation ?? rec.description) ?? ""
    const practiceKredo = cleanText(rec.practice_kredo ?? rec.practiceKredo)
    const prestationOuverte = cleanText(rec.prestation_ouverte ?? rec.prestationOuverte)
    const doncCommercialement = cleanText(rec.donc_commercialement ?? rec.doncCommercialement) ?? ""
    const rawSrcIds = asArray(rec.src_ids ?? rec.srcIds)
    const srcIds = rawSrcIds
      .map((x) => (typeof x === "number" ? x : parseNumber(x)))
      .filter((x): x is number => x !== null)

    results.push({
      nom,
      criticite,
      risque,
      situation,
      practiceKredo,
      prestationOuverte,
      doncCommercialement,
      srcIds,
    })
  }

  return results
}

function parseInterpretation(entry: CompetitiveMapEntrySnapshot | null): AccountSectorInterpretation {
  if (!entry) {
    return {
      positioning: null,
      angleEntree: null,
      metierChaineValeur: null,
      maillonNarrative: null,
      commercialAngle: null,
      commercialHooks: [],
      doNotSay: null,
    }
  }

  const profile = asRecord(entry.profileJson)
  const profilCompte = asRecord(profile.profil_compte ?? profile.profilCompte)
  const trad = asRecord(
    profilCompte.traduction_commerciale ??
      profilCompte.traductionCommerciale ??
      profile.traduction_commerciale ??
      profile.traductionCommerciale,
  )

  const metierChaineValeur = cleanText(
    profilCompte.metier_chaine_valeur ??
      profilCompte.metierChaineValeur ??
      profile.metier_chaine_valeur ??
      profile.metierChaineValeur,
  )

  const maillonNarrative = cleanText(
    profilCompte.maillon ??
      profilCompte.maillonNarrative ??
      profile.maillon ??
      profile.maillonNarrative,
  )

  const commercialAngle = cleanText(
    trad.angle ??
      trad.commercial_angle ??
      trad.commercialAngle ??
      profile.angle ??
      profile.commercial_angle ??
      profile.commercialAngle,
  )

  const rawHooks = asArray(
    trad.accroches ??
      trad.accroche ??
      trad.commercial_hooks ??
      trad.commercialHooks ??
      profile.accroches,
  )
  const commercialHooks = rawHooks
    .map(cleanText)
    .filter((hook): hook is string => typeof hook === "string" && hook.length > 0)

  const doNotSay = cleanText(
    trad.a_ne_pas_dire ??
      trad.aNePasDire ??
      trad.do_not_say ??
      trad.doNotSay ??
      profilCompte.a_ne_pas_dire ??
      profilCompte.aNePasDire ??
      profile.a_ne_pas_dire ??
      profile.aNePasDire,
  )

  return {
    positioning: entry.positioning ?? null,
    angleEntree: entry.angleEntree ?? null,
    metierChaineValeur,
    maillonNarrative,
    commercialAngle,
    commercialHooks,
    doNotSay,
  }
}

/**
 * Read model compte-centric : « qu'est-ce que ce segment signifie pour CE compte ? » (ADR §4.2).
 *
 * Fonction de lecture pure côté serveur, consommant les données résolues de GATE A
 * (getCompetitiveMapCitation), du SectorKnowledgeReadModel (L4) et de value_chain_nodes.
 * Ne lit JAMAIS sector_intelligence, sector_pain_points, sector_events, sector_news,
 * sector_regulatory_items directement en table brute.
 */
export async function getAccountSectorPerspective(
  companyId: string,
  options?: {
    supabase?: SupabaseClient<Database>
    now?: Date
  },
): Promise<AccountSectorPerspective | null> {
  const supabase = options?.supabase ?? (await createClient())
  const now = options?.now ?? new Date()

  // 1. Identification du compte et de son segment
  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("id, segment_id")
    .eq("id", companyId)
    .maybeSingle()

  if (companyError) {
    throw new Error(`Failed to query company ${companyId}: ${companyError.message}`)
  }

  if (!companyRow || !companyRow.segment_id) {
    return null
  }

  const segmentId = companyRow.segment_id

  // 2, 3, 4, 5. Récupération parallèle : ReadModel segment (L4), GATE A, chaîne de valeur, doc probant
  const [readModel, citationResult, vcnResult, docResult] = await Promise.all([
    getSectorKnowledgeReadModel(segmentId, options),
    getCompetitiveMapCitation(companyId),
    supabase
      .from("value_chain_nodes")
      .select("id, couche, maillon, rang, label, description, capture_valeur, capture_justification, confiance")
      .eq("sector_id", segmentId)
      .order("maillon", { ascending: true })
      .order("rang", { ascending: true }),
    supabase
      .from("intelligence_documents")
      .select("id")
      .eq("document_type", "master_study")
      .eq("primary_entity_type", "sector")
      .eq("primary_entity_id", segmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!readModel) {
    return null
  }

  if (vcnResult.error) {
    throw new Error(`Failed to query value_chain_nodes for segment ${segmentId}: ${vcnResult.error.message}`)
  }

  // 6. Chaîne de valeur segment (liste complète ordonnée)
  const segmentNodes: AccountSectorValueChainNode[] = (vcnResult.data ?? []).map((row) => ({
    id: row.id,
    couche: row.couche,
    maillon: row.maillon,
    rang: row.rang,
    label: row.label,
    description: row.description,
    captureValeur: typeof row.capture_valeur === "number" ? row.capture_valeur : null,
    captureJustification: row.capture_justification,
    confiance: row.confiance,
  }))

  // 7. Filtrage & Tri Why Now (réglementation non expirée, événements ordonnés)
  const today = isoDay(now)
  const relevantRegulatoryItems: SectorKnowledgeRegulatoryItem[] = readModel.regulatory
    .filter((item) => regulatoryState(item.deadlineDate, now) !== "expired")
    .sort((left, right) => (left.deadlineDate ?? "9999-12-31").localeCompare(right.deadlineDate ?? "9999-12-31") || left.name.localeCompare(right.name, "fr"))

  const eventTimingRank = (item: SectorKnowledgeEventItem): number => {
    if (!item.eventDate) return 2 // undated
    return item.eventDate >= today ? 0 : 1 // upcoming (0) vs recent (1)
  }

  const relevantDynamics: SectorKnowledgeEventItem[] = [...readModel.events].sort((left, right) => {
    const rankLeft = eventTimingRank(left)
    const rankRight = eventTimingRank(right)
    if (rankLeft !== rankRight) return rankLeft - rankRight

    if (rankLeft === 1) {
      // Recent : antéchronologique (plus récent d'abord)
      return (right.eventDate ?? "").localeCompare(left.eventDate ?? "")
    }
    // Upcoming ou undated : chronologique ascendant
    return (left.eventDate ?? "9999-12-31").localeCompare(right.eventDate ?? "9999-12-31") || left.title.localeCompare(right.title, "fr")
  })

  // 8. Parsing défensif du playbook
  const keyTheses = parseTheses(readModel.playbook)
  const relevantTechFronts = parseTechFronts(readModel.playbook)
  const dependencies = parseDependencies(readModel.playbook)

  // 9. Interpretation compte depuis GATE A
  const competitivePosition = citationResult.entry
  const accountInterpretation = parseInterpretation(competitivePosition)

  // 10. Assemblage de la perspective
  return {
    segment: {
      id: readModel.segmentId,
      name: readModel.segmentName,
      macroId: readModel.macroId,
      macroName: readModel.macroName,
      snapshotDate: readModel.studySnapshotDate,
      status: readModel.effectiveStatus,
    },
    essentialContext: {
      definition: readModel.description,
      definitionLevel: readModel.descriptionLevel,
      keyTheses,
      keyThesesLevel: readModel.playbookLevel,
    },
    whyNow: {
      relevantDynamics,
      relevantRegulatoryItems,
      relevantTechFronts,
      relevantTechFrontsLevel: readModel.playbookLevel,
    },
    competitivePosition,
    valueChainPosition: {
      segmentNodes,
      dependencies,
      dependenciesLevel: readModel.playbookLevel,
    },
    accountInterpretation,
    provenance: {
      runId: readModel.sourceRunId,
      snapshotDate: readModel.studySnapshotDate,
      documentId: docResult.data?.id ?? null,
    },
  }
}
