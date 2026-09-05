import "server-only"

/**
 * Résolution serveur d'un lancement de digest — ADR-0022 §3.4 et §3.5.
 *
 * Reçoit un `DigestLaunchInputV2` déjà validé EN FORME par
 * `parseDigestLaunchInput` et revalide chaque référence contre le client
 * Supabase de l'utilisateur (RLS) + `workspaceId` explicite. Même doctrine que
 * `resolveWatchAnalysisSources` (INTEL-021 V2) et `resolveMissionCorpus`
 * (ADR-0020) : le `.eq("workspace_id", …)` est une seconde serrure, pas la
 * protection principale.
 *
 * Comme le résolveur de l'analyse à la demande, et contrairement aux providers
 * de corpus des Missions, une référence demandée mais inaccessible fait ÉCHOUER
 * la résolution avec une erreur propre — jamais de suppression silencieuse.
 *
 * Un corpus sans aucune source collectable est un refus, pas un digest vide :
 * un appel LLM sur un corpus vide ne produit qu'une hallucination facturée.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  buildSectorDigestPreset,
  findDigestPreset,
  GLOBAL_DIGEST_TOPIC_KEY,
  type DigestPreset,
} from "../domain/digest-presets"
import { assembleDigestFraming } from "../domain/assemble-digest-framing"
import type { DigestLaunchInputV2 } from "../domain/digest-launch-contracts"

/**
 * Contrat de source attendu par le workflow. Reprend EXACTEMENT les clés
 * produites par le nœud « Vérifier et Normaliser Sources », pour que la branche
 * v2 n'ait rien à remapper.
 */
export type ResolvedDigestSource = {
  sourceId: string
  sourceKey: string
  sourceName: string
  publisher: string | null
  domain: string | null
  searchDomain: string
  collectionUrl: string | null
  collectionMode: "rss" | "site_search"
  family: string | null
  kredoCategory: string | null
  origin: string
  corpusId: string | null
}

export type ResolvedDigestTopic = {
  topicKey: string
  label: string
  /** Renseigné seulement pour un sujet sectoriel. */
  sectorId: string | null
  presetVersion: number
}

export type ResolvedDigestLaunch = {
  topic: ResolvedDigestTopic
  corpus: { id: string; slug: string; scopeKind: string } | null
  framing: string
  sources: ResolvedDigestSource[]
  stats: { sourcesCount: number; rssCount: number; siteSearchCount: number }
}

type Client = SupabaseClient<Database>

/** `rss` dès qu'une URL de collecte existe — même règle que la vue et que n8n. */
function toCollectionMode(collectionUrl: string | null): "rss" | "site_search" {
  return collectionUrl ? "rss" : "site_search"
}

async function resolveTopic(
  supabase: Client,
  workspaceId: string,
  topicKey: string,
): Promise<{ preset: DigestPreset; sectorId: string | null } | { error: string }> {
  const preset = findDigestPreset(topicKey)
  if (preset) return { preset, sectorId: null }

  // Pas dans le registre : la seule autre valeur légitime est un slug de segment.
  const { data: segment, error } = await supabase
    .from("sector_intelligence")
    .select("id, slug, name, level")
    .eq("workspace_id", workspaceId)
    .eq("slug", topicKey)
    .maybeSingle()

  if (error) return { error: `Lecture du segment impossible : ${error.message}` }
  if (!segment) return { error: `Sujet inconnu : « ${topicKey} ».` }
  if (segment.level !== "segment") {
    return {
      error: `« ${topicKey} » est un secteur macro, pas un segment — un digest sectoriel se cadre toujours sur un segment.`,
    }
  }

  return {
    preset: buildSectorDigestPreset({ slug: segment.slug, name: segment.name }),
    sectorId: segment.id,
  }
}

async function resolveDefaultSources(
  supabase: Client,
): Promise<ResolvedDigestSource[] | { error: string }> {
  // Mode par défaut : exactement ce que lit le cron aujourd'hui.
  const { data, error } = await supabase
    .from("v_effective_watch_sources")
    .select(
      "source_id, source_key, source_name, publisher, domain, search_domain, collection_url, collection_mode, family, kredo_category, origin, corpus_id, priority, utility_score",
    )
    .eq("usage_scope", "news")
    .order("priority", { ascending: true })
    .order("utility_score", { ascending: false })

  if (error) return { error: `Lecture des sources effectives impossible : ${error.message}` }

  return (data ?? []).map((row) => ({
    sourceId: row.source_id as string,
    sourceKey: row.source_key as string,
    sourceName: row.source_name as string,
    publisher: row.publisher,
    domain: row.domain,
    searchDomain: row.search_domain as string,
    collectionUrl: row.collection_url,
    collectionMode: toCollectionMode(row.collection_url),
    family: row.family,
    kredoCategory: row.kredo_category,
    origin: row.origin as string,
    corpusId: row.corpus_id,
  }))
}

async function resolveCorpusSources(
  supabase: Client,
  workspaceId: string,
  corpusId: string,
): Promise<
  { corpus: { id: string; slug: string; scopeKind: string }; sources: ResolvedDigestSource[] } | { error: string }
> {
  const { data: corpus, error: corpusError } = await supabase
    .from("source_corpora")
    .select("id, slug, scope_kind, activation_state, is_current")
    .eq("id", corpusId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (corpusError) return { error: `Lecture du corpus impossible : ${corpusError.message}` }
  if (!corpus) return { error: "Corpus introuvable ou inaccessible." }
  if (!corpus.is_current) return { error: `Le corpus « ${corpus.slug} » n'est pas la version courante.` }
  if (corpus.activation_state !== "active") {
    return { error: `Le corpus « ${corpus.slug} » est en brouillon : il doit être activé avant d'être utilisé.` }
  }

  // v_corpus_news_sources, JAMAIS v_effective_watch_sources filtrée sur corpus_id :
  // son DISTINCT ON fait gagner la ligne origin='system' (corpus_id NULL), ce qui
  // supprimerait précisément les sources partagées avec le socle (ADR-0022 §3.5).
  const { data, error } = await supabase
    .from("v_corpus_news_sources")
    .select(
      "source_id, source_key, source_name, publisher, domain, search_domain, collection_url, collection_mode, family, kredo_category, origin, corpus_id, priority, utility_score",
    )
    .eq("corpus_id", corpusId)
    .order("priority", { ascending: true })
    .order("utility_score", { ascending: false })

  if (error) return { error: `Lecture des sources du corpus impossible : ${error.message}` }

  return {
    corpus: { id: corpus.id, slug: corpus.slug, scopeKind: corpus.scope_kind },
    sources: (data ?? []).map((row) => ({
      sourceId: row.source_id as string,
      sourceKey: row.source_key as string,
      sourceName: row.source_name as string,
      publisher: row.publisher,
      domain: row.domain,
      searchDomain: row.search_domain as string,
      collectionUrl: row.collection_url,
      collectionMode: toCollectionMode(row.collection_url),
      family: row.family,
      kredoCategory: row.kredo_category,
      origin: row.origin as string,
      corpusId: row.corpus_id,
    })),
  }
}

async function loadActiveSectorNames(supabase: Client, workspaceId: string): Promise<string[]> {
  const { data } = await supabase
    .from("sector_intelligence")
    .select("name")
    .eq("workspace_id", workspaceId)
    .eq("level", "macro")
    .order("name", { ascending: true })

  return (data ?? []).map((row) => row.name).filter((name): name is string => Boolean(name))
}

export async function resolveDigestLaunch(
  supabase: Client,
  workspaceId: string,
  input: DigestLaunchInputV2,
): Promise<ResolvedDigestLaunch | { error: string }> {
  const topic = await resolveTopic(supabase, workspaceId, input.topicKey)
  if ("error" in topic) return topic

  let corpus: { id: string; slug: string; scopeKind: string } | null = null
  let sources: ResolvedDigestSource[]

  if (input.corpusId) {
    const resolved = await resolveCorpusSources(supabase, workspaceId, input.corpusId)
    if ("error" in resolved) return resolved
    corpus = resolved.corpus
    sources = resolved.sources
  } else {
    const resolved = await resolveDefaultSources(supabase)
    if ("error" in resolved) return resolved
    sources = resolved
  }

  if (sources.length === 0) {
    return {
      error: corpus
        ? `Le corpus « ${corpus.slug} » ne contient aucune source collectable : aucun digest ne serait produit.`
        : "Aucune source de veille active : aucun digest ne serait produit.",
    }
  }

  const activeSectors = await loadActiveSectorNames(supabase, workspaceId)
  const segmentLabel = topic.sectorId ? topic.preset.label : null

  return {
    topic: {
      topicKey: topic.preset.key,
      label: topic.preset.label,
      sectorId: topic.sectorId,
      presetVersion: topic.preset.version,
    },
    corpus,
    framing: assembleDigestFraming(topic.preset, { activeSectors, segmentLabel }),
    sources,
    stats: {
      sourcesCount: sources.length,
      rssCount: sources.filter((source) => source.collectionMode === "rss").length,
      siteSearchCount: sources.filter((source) => source.collectionMode === "site_search").length,
    },
  }
}

export { GLOBAL_DIGEST_TOPIC_KEY }
