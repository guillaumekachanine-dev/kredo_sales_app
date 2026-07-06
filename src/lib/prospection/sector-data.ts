import { createClient } from "@/lib/supabase/server"
import type {
  SectorWithRelations,
  SectorIntelligence,
  SectorPainPoint,
  SectorRegulatoryItem,
  SectorEvent,
  SectorCompany,
} from "@/types/sector"

// ─────────────────────────────────────────────────────────────────────────────
//  Approche Sectorielle — couche données
//
//  Charge le premier secteur actif du workspace (ou celui dont le slug est
//  passé en argument) avec toutes ses relations :
//   - sector_pain_points  (triés par frequency_count DESC)
//   - sector_regulatory_items (triés par deadline_date ASC nulls last)
//   - sector_events (triés par event_date ASC)
//   - companies liées via companies.sector_id
//
//  Stratégie : 5 requêtes parallèles plutôt qu'un JOIN complexe.
//  Volumétrie faible (≤ 50 items par secteur) → pas de vue SQL nécessaire.
//
//  ⚠️ sector_news est intentionnellement absent : read-only depuis n8n,
//  aucune donnée seedée pour l'instant. SEAM: ajouter quand disponible.
// ─────────────────────────────────────────────────────────────────────────────

// Approche loose-client identique à synthese-data.ts pour éviter les
// conflits de types entre le client Supabase généré et les JSONB.
type AnyQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type AnyTable = {
  select<T>(columns: string): {
    order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): AnyQuery<T>
    eq(col: string, value: string): {
      order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): AnyQuery<T>
      single(): PromiseLike<{ data: T | null; error: { message: string } | null }>
    }
    not(col: string, operator: string, value: unknown): {
      order(col: string, opts?: { ascending?: boolean }): AnyQuery<T>
    }
    single(): PromiseLike<{ data: T | null; error: { message: string } | null }>
  }
}
type AnyClient = { from(table: string): AnyTable }

// ─── Types internes (colonnes brutes Supabase) ────────────────────────────────

type RawSector = Omit<SectorIntelligence, 'practices_fit' | 'key_players_paca' | 'key_players_national' | 'playbook'> & {
  practices_fit: unknown
  key_players_paca: unknown
  key_players_national: unknown
  playbook: unknown
}

type RawPainPoint = SectorPainPoint & { sector_id: string }
type RawRegulatory = SectorRegulatoryItem & { sector_id: string }
type RawEvent = SectorEvent & { sector_id: string }
type RawCompany = SectorCompany & { sector_id: string | null }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === "object") return value as T
  if (typeof value === "string") {
    try { return JSON.parse(value) as T } catch { return fallback }
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

// ─── Entrée publique ──────────────────────────────────────────────────────────

export async function getSectorData(slug?: string): Promise<SectorWithRelations | null> {
  const supabase = (await createClient()) as unknown as AnyClient

  // Étape 1 : charger le secteur cible
  const sectorTable = supabase.from("sector_intelligence")
  const sectorQuery = slug
    ? sectorTable
        .select<RawSector>("id,name,slug,description,status,attractiveness_score,market_size_eur_bn,market_growth_pct,digital_maturity,practices_fit,key_players_paca,key_players_national,avg_tjm_min,avg_tjm_max,playbook,created_at,updated_at")
        .eq("slug", slug)
        .order("attractiveness_score", { ascending: false })
    : sectorTable
        .select<RawSector>("id,name,slug,description,status,attractiveness_score,market_size_eur_bn,market_growth_pct,digital_maturity,practices_fit,key_players_paca,key_players_national,avg_tjm_min,avg_tjm_max,playbook,created_at,updated_at")
        .order("attractiveness_score", { ascending: false })

  // On récupère la liste et on prend le premier
  type SectorListQuery = PromiseLike<{ data: RawSector[] | null; error: { message: string } | null }>
  const sectorResult = await (sectorQuery as unknown as SectorListQuery)

  if (sectorResult.error || !sectorResult.data?.length) return null

  const raw = sectorResult.data[0]
  const sectorId = raw.id

  // Étape 2 : charger toutes les relations en parallèle
  const [ppResult, regResult, eventsResult, companiesResult] = await Promise.all([
    supabase
      .from("sector_pain_points")
      .select<RawPainPoint>("id,title,description,frequency_count,kredo_practice,verbatim,sector_id")
      .eq("sector_id", sectorId)
      .order("frequency_count", { ascending: false }) as unknown as PromiseLike<{ data: RawPainPoint[] | null; error: unknown }>,

    supabase
      .from("sector_regulatory_items")
      .select<RawRegulatory>("id,name,authority,description,deadline_date,urgency,kredo_practice,commercial_angle,is_commercial_window,sector_id")
      .eq("sector_id", sectorId)
      .order("deadline_date", { ascending: true }) as unknown as PromiseLike<{ data: RawRegulatory[] | null; error: unknown }>,

    supabase
      .from("sector_events")
      .select<RawEvent>("id,title,event_type,description,event_date,commercial_opportunity,status,sector_id")
      .eq("sector_id", sectorId)
      .order("event_date", { ascending: true }) as unknown as PromiseLike<{ data: RawEvent[] | null; error: unknown }>,

    supabase
      .from("companies")
      .select<RawCompany>("id,name,lifecycle_status,legacy_folio_score,sector_id")
      .eq("sector_id", sectorId)
      .order("legacy_folio_score", { ascending: false }) as unknown as PromiseLike<{ data: RawCompany[] | null; error: unknown }>,
  ])

  const sector: SectorWithRelations = {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    status: raw.status,
    attractiveness_score: toNumber(raw.attractiveness_score),
    market_size_eur_bn: toNumber(raw.market_size_eur_bn),
    market_growth_pct: toNumber(raw.market_growth_pct),
    digital_maturity: raw.digital_maturity,
    avg_tjm_min: toNumber(raw.avg_tjm_min),
    avg_tjm_max: toNumber(raw.avg_tjm_max),
    practices_fit: parseJsonField(raw.practices_fit, { data_ai: 0, cloud_eng: 0, product: 0, cyber: 0 }),
    key_players_paca: parseJsonField(raw.key_players_paca, []),
    key_players_national: parseJsonField(raw.key_players_national, []),
    playbook: parseJsonField(raw.playbook, { personas: [], roi_arguments: [], objections: [], entry_points: [] }),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    pain_points: (ppResult.data ?? []).map(({ sector_id: _, ...rest }) => rest as SectorPainPoint),
    regulatory_items: (regResult.data ?? []).map(({ sector_id: _, ...rest }) => rest as SectorRegulatoryItem),
    events: (eventsResult.data ?? []).map(({ sector_id: _, ...rest }) => rest as SectorEvent),
    companies: (companiesResult.data ?? []).map(({ sector_id: _, ...rest }) => ({
      ...rest,
      revenue: null,
      legacy_folio_score: toNumber(rest.legacy_folio_score),
    }) as SectorCompany),
  }

  return sector
}
