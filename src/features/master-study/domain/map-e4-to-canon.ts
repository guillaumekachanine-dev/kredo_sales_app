import { mapOfferPracticeToKredoPractice } from "@/lib/config/practices"
import type {
  E4RegulatoryItem,
  E4SectorKnowledgeOutput,
  MasterStudyE4RpcPayload,
  MasterStudyEventPayload,
  MasterStudyPainPointPayload,
  MasterStudyRegulatoryItemPayload,
  MasterStudySectorPatchPayload,
  MasterStudyValueChainNodePayload,
} from "./e4-contracts"

export interface MapE4ToCanonOptions {
  segmentId: string
  documentTitle?: string
  documentText?: string | null
  verdictSnapshot?: unknown
}

export interface MapE4ToCanonResult {
  payload: MasterStudyE4RpcPayload
  meta: {
    segmentId: string
    segmentSlug: string
    dateSnapshot: string
    ignoredMacroRegulations: E4RegulatoryItem[]
    counts: {
      maillons: number
      dependancesCritiques: number
      painPoints: number
      regulatoryItems: number
      ignoredMacroRegulations: number
      events: number
      theses: number
      economicModels: number
      techFronts: number
      risks: number
      sources: number
      trous: number
    }
  }
}

/**
 * Normalise une date pour sector_events.event_date (type DATE SQL).
 * "YYYY" -> "YYYY-01-01"
 * "YYYY-MM" -> "YYYY-MM-01"
 * "YYYY-MM-DD" -> inchangé
 */
export function normalizeEventDate(dateStr: string): string {
  const trimmed = dateStr.trim()
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  const match = trimmed.match(/^(\d{4})/)
  if (match) {
    return `${match[1]}-01-01`
  }
  return trimmed
}

/**
 * Tronque un titre d'événement à ~120 caractères.
 */
export function truncateEventTitle(title: string, maxLength = 120): string {
  const trimmed = title.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(0, maxLength - 3).trimEnd() + "..."
}

/**
 * Transformation pure et déterministe d'un livrable E4 validé vers le payload
 * de la RPC transactionnelle `private.ingest_master_study_e4`.
 */
export function mapE4ToCanon(
  input: E4SectorKnowledgeOutput,
  options: MapE4ToCanonOptions,
): MapE4ToCanonResult {
  const { segmentId, documentTitle, documentText, verdictSnapshot } = options
  const dateSnapshot = input.meta.date_snapshot

  // 1. Scalaires marché & verrous
  const tailleStatut = input.marche.taille_statut
  const croissanceStatut = input.marche.croissance_statut

  const isTailleLocked = tailleStatut === "not_published" || tailleStatut === "not_applicable"
  const isCroissanceLocked = croissanceStatut === "not_published" || croissanceStatut === "not_applicable"

  const marketSizeEurBn = isTailleLocked ? null : (input.marche.taille_eur_bn ?? null)
  const marketGrowthPct = isCroissanceLocked ? null : (input.marche.croissance_pct ?? null)

  const resolutionLocks: Record<string, string> = {}
  if (tailleStatut && tailleStatut !== "published") {
    resolutionLocks.market_size_eur_bn = tailleStatut
  }
  if (croissanceStatut && croissanceStatut !== "published") {
    resolutionLocks.market_growth_pct = croissanceStatut
  }

  // 2. Caveats patch
  const caveatsPatch: Record<string, unknown> = {
    hors_champ: input.perimetre.hors_champ ?? [],
    regle_comparabilite: input.perimetre.regle_comparabilite,
    incertitudes: input.incertitudes ?? [],
    trous: input.trous ?? [],
  }

  // 3. Playbook patch
  // Blocs clients + modèles économiques concaténés
  const economicModelsCombined = [
    ...(input.blocs_clients ?? []),
    ...(input.modeles_economiques ?? []),
  ]

  const playbookPatch: Record<string, unknown> = {
    market_thesis: input.theses ?? [],
    economic_models: economicModelsCombined,
    tech_fronts: input.fronts_technologiques ?? [],
    dependances_critiques: input.dependances_critiques ?? [],
    risks: input.risques_opportunites ?? [],
    personas: input.playbook?.personas ?? [],
    objections: input.playbook?.objections ?? [],
    entry_points: input.playbook?.entry_points ?? [],
    roi_arguments: input.playbook?.roi_arguments ?? [],
  }

  const sectorPatch: MasterStudySectorPatchPayload = {
    description: input.perimetre.definition,
    market_size_eur_bn: marketSizeEurBn,
    market_growth_pct: marketGrowthPct,
    resolution_locks: resolutionLocks,
    playbook_patch: playbookPatch,
    caveats_patch: caveatsPatch,
  }

  // 4. Value chain nodes (amorce E4)
  // Piège §4.1 : maillons[i].rang -> value_chain_nodes.maillon, et rang === 1
  const valueChainNodes: MasterStudyValueChainNodePayload[] = (input.maillons ?? []).map((m) => ({
    maillon: m.rang,
    label: m.nom,
    description: m.contenu,
  }))

  // 5. Réglementation (filtrage portée segment vs macro)
  const regulatoryItems: MasterStudyRegulatoryItemPayload[] = []
  const ignoredMacroRegulations: E4RegulatoryItem[] = []

  for (const item of input.regulation ?? []) {
    if (item.portee === "macro") {
      ignoredMacroRegulations.push(item)
      continue
    }

    regulatoryItems.push({
      name: item.libelle,
      authority: item.authority,
      deadline_date: item.deadline_date ?? null,
      source_url: item.source_url,
      commercial_angle: item.commercial_angle,
      kredo_practice: mapOfferPracticeToKredoPractice(item.kredo_practice),
      is_commercial_window: false,
      urgency: "medium",
    })
  }

  // 6. Chronologie -> sector_events
  const events: MasterStudyEventPayload[] = (input.chronologie ?? []).map((c) => ({
    title: truncateEventTitle(c.fait),
    description: c.fait,
    event_type: "market",
    event_date: normalizeEventDate(c.date),
    source_url: null,
    commercial_opportunity: null,
  }))

  // 7. Pain points
  const painPoints: MasterStudyPainPointPayload[] = (input.pain_points ?? []).map((p) => ({
    title: p.libelle,
    frequency_count: p.frequency_count,
    source_company_ids: p.source_company_ids ?? [],
  }))

  // 8. Document & Run
  const title =
    documentTitle ||
    `04-secteur - ${input.meta.segment_slug}`

  const payload: MasterStudyE4RpcPayload = {
    segment_id: segmentId,
    study_snapshot_date: dateSnapshot,
    run: {
      input_snapshot: verdictSnapshot ?? { meta: input.meta },
      config: {
        meta: input.meta,
        source: "master_study_e4_importer",
      },
    },
    document: {
      title,
      content_text: documentText ?? null,
      content_json: input,
      scope_json: {
        feature: "master_study",
        segmentSlug: input.meta.segment_slug,
        macroSlug: input.meta.macro_slug,
        dateSnapshot,
        version: input.meta.version ?? "1.0",
      },
    },
    sector_patch: sectorPatch,
    events,
    pain_points: painPoints,
    regulatory_items: regulatoryItems,
    value_chain_nodes: valueChainNodes,
  }

  return {
    payload,
    meta: {
      segmentId,
      segmentSlug: input.meta.segment_slug,
      dateSnapshot,
      ignoredMacroRegulations,
      counts: {
        maillons: valueChainNodes.length,
        dependancesCritiques: (input.dependances_critiques ?? []).length,
        painPoints: painPoints.length,
        regulatoryItems: regulatoryItems.length,
        ignoredMacroRegulations: ignoredMacroRegulations.length,
        events: events.length,
        theses: (input.theses ?? []).length,
        economicModels: economicModelsCombined.length,
        techFronts: (input.fronts_technologiques ?? []).length,
        risks: (input.risques_opportunites ?? []).length,
        sources: (input.sources ?? []).length,
        trous: (input.trous ?? []).length,
      },
    },
  }
}
