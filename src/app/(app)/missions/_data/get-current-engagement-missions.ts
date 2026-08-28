import "server-only"

import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────────
//  Liste des missions AT « en cours » pour le rail de gauche du shell Engagements.
//
//  « En cours » = missions.status = 'active' — même définition que
//  /missions/actives (MissionsActivesPage filtre m.status === "active").
//
//  Requête volontairement légère : on ne lit PAS le blob companies.metadata
//  (TOASTé, ~14 Ko/ligne), seulement la colonne générée companies.meta_logo_path.
// ─────────────────────────────────────────────────────────────────────────────

export interface EngagementMissionListItem {
  id: string
  title: string
  status: string
  startDate: string | null
  endDate: string | null
  roleTitle: string | null
  practice: string | null
  seniority: string | null
  tjm: number
  grossMarginPct: number | null
  clientName: string
  clientWebsite: string | null
  clientLogoPath: string | null
}

interface DBCompany {
  name: string | null
  website: string | null
  meta_logo_path: string | null
}

interface DBRow {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  role_title: string | null
  practice: string | null
  seniority: string | null
  tjm: number | null
  gross_margin_pct: number | null
  companies: DBCompany | DBCompany[] | null
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getCurrentEngagementMissions(): Promise<EngagementMissionListItem[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("missions")
      .select(
        `
        id,
        title,
        status,
        start_date,
        end_date,
        role_title,
        practice,
        seniority,
        tjm,
        gross_margin_pct,
        companies (
          name,
          website,
          meta_logo_path
        )
      `
      )
      .eq("status", "active")
      .order("start_date", { ascending: false })

    if (error) {
      console.error("[getCurrentEngagementMissions]", error.message, error.code)
      return []
    }

    return ((data as unknown as DBRow[]) ?? []).map((row) => {
      const company = pickOne(row.companies)
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        roleTitle: row.role_title,
        practice: row.practice,
        seniority: row.seniority,
        tjm: row.tjm ?? 0,
        grossMarginPct: row.gross_margin_pct,
        clientName: company?.name ?? "Compte non renseigné",
        clientWebsite: company?.website ?? null,
        clientLogoPath: company?.meta_logo_path ?? null,
      }
    })
  } catch (err) {
    console.error("[getCurrentEngagementMissions] unhandled", err)
    return []
  }
}
