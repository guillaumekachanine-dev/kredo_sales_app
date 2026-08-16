"use server"

import "server-only"

// Lot 4 — écriture d'un corpus E3 déjà arbitré (étapes 1-2 du wizard : parsing
// local pur + résolution en lecture seule). Aucune écriture multi-table ici :
// le seul chemin d'écriture est `public.ingest_source_corpus()` (SECURITY
// DEFINER, migration source-management Lot 1), qui revérifie elle-même
// `is_workspace_admin()` et résout le segment côté serveur. Le navigateur
// n'envoie qu'un payload déjà normalisé et déjà vu par l'utilisateur à
// l'étape 3 — même doctrine que `confirmCompetitiveMapIngestion`.

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import {
  CORPUS_QUALITY_VERDICT_VALUES,
  SOURCE_REGISTRY_AUTOMATION_FIT_VALUES,
  SOURCE_REGISTRY_CONTENT_TEMPORALITY_VALUES,
  SOURCE_REGISTRY_PACK_VALUES,
  SOURCE_REGISTRY_PRIMARY_ROLE_VALUES,
  SOURCE_REGISTRY_USAGE_SCOPE_VALUES,
  type IngestSourceCorpusPayload,
  type IngestSourceCorpusSourceItem,
} from "../domain/source-registry-output"

export type IngestSourceCorpusResult =
  | { error: null; corpusId: string; sourcesUpserted: number; itemsUpserted: number }
  | { error: string; corpusId: null; sourcesUpserted: 0; itemsUpserted: 0 }

const SNAPSHOT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidSourceItem(item: IngestSourceCorpusSourceItem, index: number): string | null {
  const path = `sources[${index}]`
  if (!item.source_key?.trim()) return `${path}.source_key requis`
  if (!item.search_domain?.trim()) return `${path}.search_domain requis`
  if (!item.external_src_id?.trim()) return `${path}.external_src_id requis`
  if (!(SOURCE_REGISTRY_CONTENT_TEMPORALITY_VALUES as readonly string[]).includes(item.content_temporality)) {
    return `${path}.content_temporality invalide`
  }
  if (!Array.isArray(item.usage_scopes) || item.usage_scopes.some((v) => !(SOURCE_REGISTRY_USAGE_SCOPE_VALUES as readonly string[]).includes(v))) {
    return `${path}.usage_scopes invalide`
  }
  if (!(SOURCE_REGISTRY_PACK_VALUES as readonly string[]).includes(item.pack)) return `${path}.pack invalide`
  if (!(SOURCE_REGISTRY_PRIMARY_ROLE_VALUES as readonly string[]).includes(item.primary_role)) return `${path}.primary_role invalide`
  if (!(SOURCE_REGISTRY_AUTOMATION_FIT_VALUES as readonly string[]).includes(item.automation_fit)) return `${path}.automation_fit invalide`
  if (typeof item.tier !== "string" || !item.tier.trim()) return `${path}.tier doit être une chaîne non vide`
  if (!Number.isInteger(item.utility_score) || item.utility_score < 0 || item.utility_score > 100) {
    return `${path}.utility_score hors bornes (0-100)`
  }
  if (item.kredo_category !== "vertical") return `${path}.kredo_category doit être 'vertical'`
  // Règle déterministe dure (E3 §8) : une source static ne peut jamais entrer dans la veille récurrente,
  // quelle que soit la décision de l'utilisateur en étape 2 — revérifié ici, pas seulement côté client.
  if (item.content_temporality === "static" && (item.is_enabled || item.news_eligible || item.account_watch_eligible)) {
    return `${path} est 'static' : ne peut pas être activée pour la veille récurrente`
  }
  return null
}

function isValidPayload(payload: IngestSourceCorpusPayload): string | null {
  if (!payload.slug?.trim()) return "slug requis"
  if (!payload.version?.trim()) return "version requise"
  if (!SNAPSHOT_DATE_PATTERN.test(payload.snapshot_date)) return "snapshot_date invalide (AAAA-MM-JJ attendu)"
  if (!(CORPUS_QUALITY_VERDICT_VALUES as readonly string[]).includes(payload.quality_verdict)) return "quality_verdict invalide"
  // §12 — le corpus ne s'active jamais tout seul à l'import : revérifié serveur, pas seulement construit ainsi côté client.
  if (payload.activation_state !== "draft") return "activation_state doit être 'draft' à l'import"
  if (!Array.isArray(payload.sources) || payload.sources.length === 0) return "sources requis (au moins une entrée)"

  for (const [index, item] of payload.sources.entries()) {
    const itemError = isValidSourceItem(item, index)
    if (itemError) return itemError
  }

  return null
}

export async function ingestSourceCorpusAction(
  payload: IngestSourceCorpusPayload,
  segmentSlug: string,
  reason: string,
): Promise<IngestSourceCorpusResult> {
  const validationError = isValidPayload(payload)
  if (validationError) return { error: `Payload invalide : ${validationError}`, corpusId: null, sourcesUpserted: 0, itemsUpserted: 0 }

  if (!segmentSlug?.trim()) return { error: "Segment requis.", corpusId: null, sourcesUpserted: 0, itemsUpserted: 0 }
  if (!reason?.trim()) return { error: "Motif d'import requis.", corpusId: null, sourcesUpserted: 0, itemsUpserted: 0 }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Non authentifié", corpusId: null, sourcesUpserted: 0, itemsUpserted: 0 }

  // Seul chemin d'écriture : la RPC SECURITY DEFINER, qui revérifie elle-même
  // is_workspace_admin() et résout le segment. Aucun .insert/.update direct
  // sur source_catalog / source_corpora / source_corpus_items depuis ce module.
  const { data, error } = await supabase.rpc("ingest_source_corpus", {
    p_payload: payload as unknown as Json,
    p_segment_slug: segmentSlug,
    p_reason: reason,
  })

  if (error) {
    return { error: error.details || error.message, corpusId: null, sourcesUpserted: 0, itemsUpserted: 0 }
  }

  const result = (data ?? {}) as { corpus_id?: string; sources_upserted?: number; items_upserted?: number }
  if (!result.corpus_id) {
    return { error: "Réponse inattendue de la RPC ingest_source_corpus.", corpusId: null, sourcesUpserted: 0, itemsUpserted: 0 }
  }

  revalidatePath("/veille")

  return {
    error: null,
    corpusId: result.corpus_id,
    sourcesUpserted: result.sources_upserted ?? 0,
    itemsUpserted: result.items_upserted ?? 0,
  }
}
