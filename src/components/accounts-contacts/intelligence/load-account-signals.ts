"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"

export async function loadAccountSignals(
  companyId: string,
): Promise<{ data: ClientIntelligenceSignal[]; error: string | null }> {
  if (!companyId) return { data: [], error: "Compte introuvable" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("account_signals")
    .select(`
      id,
      signal_category,
      signal_type,
      title,
      summary,
      detected_at,
      last_evidence_at,
      expires_at,
      global_score,
      relevance_score,
      urgency_score,
      confidence_score,
      status,
      primary_source_id,
      recommended_action,
      recommended_practice_id,
      intelligence_sources(id,source_name,source_url,published_at)
    `)
    .eq("company_id", companyId)
    .neq("status", "dismissed")
    .order("global_score", { ascending: false })
    .order("detected_at", { ascending: false })
    .limit(100)

  if (error) return { data: [], error: error.message }

  return {
    error: null,
    data: (data ?? []).map((row) => {
      const source = Array.isArray(row.intelligence_sources)
        ? row.intelligence_sources[0]
        : row.intelligence_sources
      return {
        id: row.id,
        category: row.signal_category,
        type: row.signal_type,
        title: row.title,
        summary: row.summary,
        detectedAt: row.detected_at,
        lastEvidenceAt: row.last_evidence_at,
        expiresAt: row.expires_at,
        publishedAt: source?.published_at ?? null,
        globalScore: row.global_score,
        interestScore: row.relevance_score,
        urgencyScore: row.urgency_score,
        confidenceScore: row.confidence_score,
        status: row.status,
        primarySourceId: row.primary_source_id,
        recommendedAction: row.recommended_action,
        recommendedPracticeId: row.recommended_practice_id,
        primarySource: source
          ? { id: source.id, source_name: source.source_name, source_url: source.source_url }
          : null,
      }
    }),
  }
}
