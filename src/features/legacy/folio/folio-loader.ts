"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SectorAnalysisData } from "./types"

export type FolioSectorStudyListItem = {
  id: string
  name: string
  sector: string
  logoPath: string | null
  analysisAt: string | null
  analysisStatus: string | null
}

export async function getFolioSectorStudies() {
  try {
    const supabase = await createClient()

    // Query only necessary metadata keys to avoid fetching the massive sector_analysis block
    const { data, error } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        sector,
        logo_path:metadata->logo_path,
        analysis_at:metadata->sector_analysis_at,
        analysis_status:metadata->sector_analysis_status
      `)
      .not("metadata->sector_analysis", "is", null)

    if (error) {
      console.error("Error loading Folio sector studies list:", error)
      return { success: false, data: [] }
    }

    const list: FolioSectorStudyListItem[] = (data || []).map((company: any) => ({
      id: company.id,
      name: company.name,
      sector: company.sector || "Secteur inconnu",
      logoPath: company.logo_path || null,
      analysisAt: company.analysis_at || null,
      analysisStatus: company.analysis_status || null,
    }))

    return { success: true, data: list }
  } catch (error) {
    console.error("Error loading Folio sector studies:", error)
    return { success: false, data: [] }
  }
}

export async function getFolioSectorStudyByCompanyId(companyId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        sector,
        logo_path:metadata->logo_path,
        analysis_at:metadata->sector_analysis_at,
        sector_analysis:metadata->sector_analysis
      `)
      .eq("id", companyId)
      .single()

    if (error) {
      console.error(`Error loading Folio sector study for company ${companyId}:`, error)
      return { success: false, error: "not_found" }
    }

    if (!data || !data.sector_analysis) {
      return { success: false, error: "no_study" }
    }

    const study = {
      id: data.id,
      name: data.name,
      sector: data.sector || "Secteur inconnu",
      logoPath: (data.logo_path as string) || null,
      analysisAt: (data.analysis_at as string) || null,
      sectorAnalysis: data.sector_analysis as SectorAnalysisData,
    }

    return { success: true, data: study }
  } catch (error) {
    console.error(`Error loading Folio sector study for company ${companyId}:`, error)
    return { success: false, error: "error" }
  }
}
