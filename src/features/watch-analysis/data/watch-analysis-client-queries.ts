"use client"

// Lectures directes depuis le navigateur, RLS workspace — même doctrine que
// `content-collections-client-queries.ts` : ces requêtes n'alimentent que le
// picker (références + métadonnées d'affichage), jamais le payload envoyé au
// serveur. `resolveWatchAnalysisSources()` (L0, server-only) revalide tout
// côté serveur au lancement réel (L2) ; ces lectures ne sont qu'un confort UX.

import { createClient } from "@/lib/supabase/client"

export type PickerAccountSignal = {
  id: string
  title: string
  companyId: string | null
  companyName: string | null
  detectedAt: string
  globalScore: number | null
}

/**
 * Signaux comptes actifs du workspace — lit `v_active_account_signals`
 * (exclut déjà `archived`/`dismissed` et tout signal détecté il y a plus de
 * 2 mois, cf. CLAUDE.md) plutôt que `account_signals` directement.
 */
export async function fetchAccountSignalsForPicker(): Promise<PickerAccountSignal[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("v_active_account_signals")
    .select("id, title, company_id, detected_at, global_score, companies(name)")
    .order("detected_at", { ascending: false })
    .limit(200)

  if (error || !data) return []

  return data.flatMap((row): PickerAccountSignal[] => {
    if (!row.id || !row.title || !row.detected_at) return []
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
    return [
      {
        id: row.id,
        title: row.title,
        companyId: row.company_id,
        companyName: company?.name ?? null,
        detectedAt: row.detected_at,
        globalScore: row.global_score,
      },
    ]
  })
}

export type PickerAccountSignalDetail = {
  id: string
  title: string
  companyName: string | null
  detectedAt: string
  eventAt: string | null
  globalScore: number
  urgencyScore: number
  confidenceScore: number
  potentialValueScore: number
  signalType: string
  signalCategory: string
  summary: string | null
  recommendedAction: string | null
  scoreJustification: string | null
}

/** Détail complet d'un signal compte pour la visionneuse « Consulter » du picker. */
export async function fetchAccountSignalDetailForPicker(id: string): Promise<PickerAccountSignalDetail | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("account_signals")
    .select(
      "id, title, detected_at, event_at, global_score, urgency_score, confidence_score, potential_value_score, signal_type, signal_category, summary, recommended_action, score_justification, companies(name)",
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies

  return {
    id: data.id,
    title: data.title,
    companyName: company?.name ?? null,
    detectedAt: data.detected_at,
    eventAt: data.event_at,
    globalScore: data.global_score,
    urgencyScore: data.urgency_score,
    confidenceScore: data.confidence_score,
    potentialValueScore: data.potential_value_score,
    signalType: data.signal_type,
    signalCategory: data.signal_category,
    summary: data.summary,
    recommendedAction: data.recommended_action,
    scoreJustification: data.score_justification,
  }
}

export type PickerDocument = {
  id: string
  title: string
  documentType: string
  updatedAt: string
}

/** Documents exploitables — exclut les documents archivés (cadrage §5.C). */
export async function fetchIntelligenceDocumentsForPicker(): Promise<PickerDocument[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id, title, document_type, updated_at")
    .is("archived_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(200)

  if (error || !data) return []
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    updatedAt: row.updated_at,
  }))
}

export type PickerDigestArticle = {
  id: string
  titre_fr: string
  published_at: string | null
  digest_id: string
}

/**
 * Repli lazy quand les articles d'un digest ne sont pas déjà dans les props
 * de la page (cadrage §12 : réutiliser en priorité, ne charger que si
 * nécessaire — Desktop a `allArticles`, Mobile n'a que le digest courant).
 */
export async function fetchVeilleArticlesForDigestPicker(digestId: string): Promise<PickerDigestArticle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("veille_articles")
    .select("id, titre_fr, published_at, digest_id")
    .eq("digest_id", digestId)
    .is("superseded_at", null)
    .order("selection_rank", { ascending: true })

  if (error || !data) return []
  return data
}
