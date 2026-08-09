import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  SectorWithRelations,
  SectorStatus,
  PracticeKey,
  KeyPlayer,
  SectorPlaybook,
  SectorCaveats,
  SectorPainPoint,
  SectorRegulatoryItem,
  SectorEvent,
  SectorCompany,
} from "@/types/sector"

export interface SectorListItem {
  id: string
  name: string
  slug: string
  status: SectorStatus
  attractiveness_score: number | null
  digital_maturity: 'low' | 'medium' | 'high' | null
  practices_fit: Record<PracticeKey, number>
  companies_count: number
  /** Visuel de carte. NULL = pas de visuel : la carte rend un fond navy. */
  image_url: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === "object") return value as T
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Récupère la liste des secteurs d'intelligence pour la page index.
 * Inclut le count des entreprises liées.
 * Trié par attractiveness_score DESC NULLS LAST.
 */
export async function getSectors(): Promise<SectorListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sector_intelligence")
    .select(`
      id,
      name,
      slug,
      status,
      attractiveness_score,
      digital_maturity,
      practices_fit,
      image_url,
      companies (
        id
      )
    `)
    .eq("level", "macro")
    .neq("status", "development")
    .order("attractiveness_score", { ascending: false, nullsFirst: false })

  if (error) {
    console.error("Error fetching sectors list:", error)
    return []
  }

  if (!data) return []

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    status: item.status as SectorStatus,
    attractiveness_score: toNumber(item.attractiveness_score),
    digital_maturity: item.digital_maturity as 'low' | 'medium' | 'high' | null,
    practices_fit: parseJsonField<Record<PracticeKey, number>>(item.practices_fit, {
      data_ai: 0,
      cloud_eng: 0,
      product: 0,
      cyber: 0,
    }),
    companies_count: Array.isArray(item.companies) ? item.companies.length : 0,
    image_url: item.image_url ?? null,
  }))
}

/**
 * Récupère le détail d'un secteur par son slug avec toutes ses relations.
 * Les relations sont chargées et triées selon les règles :
 *  - pain_points : frequency_count DESC
 *  - regulatory_items : deadline_date ASC NULLS LAST
 *  - events : event_date DESC NULLS LAST
 *  - companies : id, name, revenue, lifecycle_status, legacy_folio_score
 */
export async function getSectorBySlug(slug: string): Promise<SectorWithRelations | null> {
  const supabase = await createClient()

  // 1. Récupération du secteur par son slug
  const { data: raw, error: sectorError } = await supabase
    .from("sector_intelligence")
    .select("id, name, slug, description, status, attractiveness_score, market_size_eur_bn, market_growth_pct, digital_maturity, practices_fit, key_players_paca, key_players_national, avg_tjm_min, avg_tjm_max, playbook, caveats, created_at, updated_at")
    .eq("slug", slug)
    .single()

  if (sectorError || !raw) {
    console.error(`Error fetching sector with slug "${slug}":`, sectorError)
    return null
  }

  const sectorId = raw.id

  // 2. Chargement des relations en parallèle
  const [ppResult, regResult, eventsResult, companiesResult] = await Promise.all([
    supabase
      .from("sector_pain_points")
      .select("id, title, description, frequency_count, kredo_practice, verbatim")
      .eq("sector_id", sectorId)
      .order("frequency_count", { ascending: false }),

    supabase
      .from("sector_regulatory_items")
      .select("id, name, authority, description, deadline_date, urgency, kredo_practice, commercial_angle, is_commercial_window, source_url")
      .eq("sector_id", sectorId)
      .order("deadline_date", { ascending: true, nullsFirst: false }),

    supabase
      .from("sector_events")
      .select("id, title, event_type, description, event_date, commercial_opportunity, status")
      .eq("sector_id", sectorId)
      .order("event_date", { ascending: false, nullsFirst: false }),

    supabase
      .from("companies")
      .select("id, name, website, revenue, lifecycle_status, legacy_folio_score")
      .eq("sector_id", sectorId)
  ])

  // Traces d'erreurs en cas de problème sur les relations
  if (ppResult.error) console.error("Error fetching pain points:", ppResult.error)
  if (regResult.error) console.error("Error fetching regulatory items:", regResult.error)
  if (eventsResult.error) console.error("Error fetching events:", eventsResult.error)
  if (companiesResult.error) console.error("Error fetching companies:", companiesResult.error)

  const sector: SectorWithRelations = {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    status: raw.status as SectorStatus,
    attractiveness_score: toNumber(raw.attractiveness_score),
    market_size_eur_bn: toNumber(raw.market_size_eur_bn),
    market_growth_pct: toNumber(raw.market_growth_pct),
    digital_maturity: raw.digital_maturity as 'low' | 'medium' | 'high' | null,
    practices_fit: parseJsonField<Record<PracticeKey, number>>(raw.practices_fit, {
      data_ai: 0,
      cloud_eng: 0,
      product: 0,
      cyber: 0,
    }),
    key_players_paca: parseJsonField<KeyPlayer[]>(raw.key_players_paca, []),
    key_players_national: parseJsonField<KeyPlayer[]>(raw.key_players_national, []),
    avg_tjm_min: toNumber(raw.avg_tjm_min),
    avg_tjm_max: toNumber(raw.avg_tjm_max),
    playbook: parseJsonField<SectorPlaybook>(raw.playbook, {
      personas: [],
      roi_arguments: [],
      objections: [],
      entry_points: [],
    }),
    // NULL délibérément conservé : « pas de caveats » et « caveats vides » sont
    // deux choses différentes, et l'UI doit pouvoir dire laquelle.
    caveats: parseJsonField<SectorCaveats | null>(raw.caveats, null),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    pain_points: (ppResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      frequency_count: item.frequency_count,
      kredo_practice: item.kredo_practice as PracticeKey | 'multi' | null,
      verbatim: item.verbatim,
    })),
    regulatory_items: (regResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      authority: item.authority,
      description: item.description,
      deadline_date: item.deadline_date,
      urgency: item.urgency as SectorRegulatoryItem["urgency"],
      kredo_practice: item.kredo_practice as PracticeKey | 'multi' | null,
      commercial_angle: item.commercial_angle,
      is_commercial_window: item.is_commercial_window,
      source_url: item.source_url ?? null,
    })),
    events: (eventsResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      event_type: item.event_type as SectorEvent["event_type"],
      description: item.description,
      event_date: item.event_date,
      commercial_opportunity: item.commercial_opportunity,
      status: item.status as SectorEvent["status"],
    })),
    companies: (companiesResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      website: item.website ?? null,
      revenue: item.revenue,
      lifecycle_status: item.lifecycle_status,
      legacy_folio_score: toNumber(item.legacy_folio_score),
    })),
    errors: {
      pain_points: !!ppResult.error,
      regulatory_items: !!regResult.error,
      events: !!eventsResult.error,
      companies: !!companiesResult.error,
    },
  }

  return sector;
}
