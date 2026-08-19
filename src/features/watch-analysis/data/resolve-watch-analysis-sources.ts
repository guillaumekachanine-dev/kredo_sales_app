import "server-only"

/**
 * Résolveur serveur des sources d'une analyse à la demande (Veille, V2).
 *
 * docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/01-ARCHITECTURE-ET-CONTRATS.md §5
 *
 * Reçoit un `WatchAnalysisInputV2` déjà validé en forme par
 * `validateWatchAnalysisInput` (domain/watch-analysis-contracts.ts) et revalide
 * chaque référence contre le client Supabase de l'utilisateur (RLS) +
 * `workspaceId` explicite, même doctrine que `resolveMissionCorpus` /
 * `intelligenceDocumentProvider` : le `.eq("workspace_id", …)` est une seconde
 * serrure, pas la protection principale.
 *
 * Contrairement aux providers de corpus des Missions (qui EXCLUENT
 * silencieusement une référence introuvable et la tracent), le cadrage de ce
 * chantier impose l'inverse : une référence demandée mais inaccessible ou
 * inexistante fait échouer toute la résolution avec une erreur propre — elle
 * n'est jamais supprimée silencieusement (01-ARCHITECTURE §5, §10).
 *
 * Ne retourne jamais de contenu métier (titre, résumé, texte…) — uniquement
 * des références `{kind, id}` et des statistiques. L'hydratation du contenu
 * réel reste au lot L2, côté n8n.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { WatchAnalysisInputV2, WatchAnalysisSource } from "@/lib/n8n/types"
import { resolveKnowledgeScope } from "@/features/content-collections/data/resolve-knowledge-scope"

export type WatchAnalysisResolvedRef =
  | { kind: "veille_digest"; id: string; articleIds?: string[] }
  | { kind: "veille_article"; id: string }
  | { kind: "account_signal"; id: string }
  | { kind: "intelligence_document"; id: string }

export type ResolvedWatchAnalysisSources = {
  refs: WatchAnalysisResolvedRef[]
  stats: {
    /** Nombre de groupes de sources dans la sélection utilisateur (avant résolution). */
    sourceGroups: number
    /** Nombre de références canoniques après expansion des collections et déduplication. */
    resolvedRefs: number
  }
}

type ResolveOutcome = WatchAnalysisResolvedRef[] | { error: string }

async function resolveDigestSource(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  source: Extract<WatchAnalysisSource, { kind: "digest" }>,
): Promise<ResolveOutcome> {
  const { data: digest, error: digestError } = await supabase
    .from("veille_digests")
    .select("id")
    .eq("id", source.digestId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (digestError) return { error: `Lecture du digest impossible : ${digestError.message}` }
  if (!digest) return { error: `Digest introuvable ou inaccessible : ${source.digestId}` }

  if (!source.articleIds || source.articleIds.length === 0) {
    return [{ kind: "veille_digest", id: source.digestId }]
  }

  const { data: articles, error: articlesError } = await supabase
    .from("veille_articles")
    .select("id, digest_id")
    .eq("workspace_id", workspaceId)
    .in("id", source.articleIds)

  if (articlesError) return { error: `Lecture des articles de veille impossible : ${articlesError.message}` }

  const articleById = new Map((articles ?? []).map((row) => [row.id, row]))
  for (const articleId of source.articleIds) {
    const row = articleById.get(articleId)
    if (!row) return { error: `Article introuvable ou inaccessible : ${articleId}` }
    if (row.digest_id !== source.digestId) {
      return { error: `Article hors du digest sélectionné : ${articleId}` }
    }
  }

  return [{ kind: "veille_digest", id: source.digestId, articleIds: [...source.articleIds] }]
}

async function resolveAccountSignalsSource(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  source: Extract<WatchAnalysisSource, { kind: "account_signals" }>,
): Promise<ResolveOutcome> {
  const { data, error } = await supabase
    .from("account_signals")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", source.signalIds)

  if (error) return { error: `Lecture des signaux comptes impossible : ${error.message}` }

  const found = new Set((data ?? []).map((row) => row.id))
  for (const signalId of source.signalIds) {
    if (!found.has(signalId)) return { error: `Signal compte introuvable ou inaccessible : ${signalId}` }
  }

  return source.signalIds.map((id) => ({ kind: "account_signal", id }) as const)
}

async function resolveIntelligenceDocumentsSource(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  source: Extract<WatchAnalysisSource, { kind: "intelligence_documents" }>,
): Promise<ResolveOutcome> {
  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", source.documentIds)

  if (error) return { error: `Lecture des documents d'intelligence impossible : ${error.message}` }

  const found = new Set((data ?? []).map((row) => row.id))
  for (const documentId of source.documentIds) {
    if (!found.has(documentId)) return { error: `Document introuvable ou inaccessible : ${documentId}` }
  }

  return source.documentIds.map((id) => ({ kind: "intelligence_document", id }) as const)
}

async function resolveKnowledgeCollectionSource(
  supabase: SupabaseClient<Database>,
  source: Extract<WatchAnalysisSource, { kind: "knowledge_collection" }>,
): Promise<ResolveOutcome> {
  // Réutilisation OBLIGATOIRE (cadrage §5.4) — repart toujours du seul
  // `collectionId` ; ne fait jamais confiance à des refs fournies ailleurs.
  const resolved = await resolveKnowledgeScope(supabase, source.collectionId)
  if ("error" in resolved) {
    return { error: `Liste/Corpus introuvable ou inaccessible : ${resolved.error}` }
  }

  return resolved.refs.map((ref) =>
    ref.contentType === "veille_article"
      ? ({ kind: "veille_article", id: ref.contentId } as const)
      : ({ kind: "intelligence_document", id: ref.contentId } as const),
  )
}

/**
 * Fusionne des références potentiellement dupliquées (une même référence
 * choisie directement ET via une Liste/Corpus, par exemple). Pour
 * `veille_digest`, un digest complet (sans `articleIds`) l'emporte toujours
 * sur une sélection partielle — restreindre silencieusement un digest déjà
 * demandé en entier serait une perte d'information, pas une déduplication.
 */
function dedupeRefs(refs: WatchAnalysisResolvedRef[]): WatchAnalysisResolvedRef[] {
  const deduped: WatchAnalysisResolvedRef[] = []
  const digestIndexById = new Map<string, number>()
  const seenOther = new Set<string>()

  for (const ref of refs) {
    if (ref.kind === "veille_digest") {
      const existingIndex = digestIndexById.get(ref.id)
      if (existingIndex === undefined) {
        digestIndexById.set(ref.id, deduped.length)
        deduped.push(ref)
        continue
      }
      const existing = deduped[existingIndex] as Extract<WatchAnalysisResolvedRef, { kind: "veille_digest" }>
      if (!existing.articleIds || !ref.articleIds) {
        deduped[existingIndex] = { kind: "veille_digest", id: ref.id }
      } else {
        deduped[existingIndex] = {
          kind: "veille_digest",
          id: ref.id,
          articleIds: Array.from(new Set([...existing.articleIds, ...ref.articleIds])),
        }
      }
      continue
    }

    const key = `${ref.kind}:${ref.id}`
    if (seenOther.has(key)) continue
    seenOther.add(key)
    deduped.push(ref)
  }

  return deduped
}

export async function resolveWatchAnalysisSources(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  input: WatchAnalysisInputV2,
): Promise<ResolvedWatchAnalysisSources | { error: string }> {
  const collected: WatchAnalysisResolvedRef[] = []

  for (const source of input.sources) {
    const outcome: ResolveOutcome =
      source.kind === "digest"
        ? await resolveDigestSource(supabase, workspaceId, source)
        : source.kind === "account_signals"
          ? await resolveAccountSignalsSource(supabase, workspaceId, source)
          : source.kind === "intelligence_documents"
            ? await resolveIntelligenceDocumentsSource(supabase, workspaceId, source)
            : await resolveKnowledgeCollectionSource(supabase, source)

    if ("error" in outcome) return outcome
    collected.push(...outcome)
  }

  const refs = dedupeRefs(collected)

  return {
    refs,
    stats: {
      sourceGroups: input.sources.length,
      resolvedRefs: refs.length,
    },
  }
}
