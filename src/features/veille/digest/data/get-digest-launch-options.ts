import "server-only"

/**
 * Options de lancement d'un digest, pour la modale Desktop et la feuille Mobile —
 * ADR-0022 §3.1 et Lot 3.
 *
 * Le compte de sources vient d'ICI, résolu serveur, et non de
 * `latestDigest.nb_sources_actives` : ce dernier est le compte du run PRÉCÉDENT,
 * pas celui du corpus que l'utilisateur s'apprête à choisir.
 *
 * Un corpus en brouillon est retourné mais marqué `selectable: false` : il doit
 * rester visible (on sait qu'il existe) sans être lançable.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { listDigestPresets, GLOBAL_DIGEST_TOPIC_KEY } from "../domain/digest-presets"

export type DigestTopicOption = {
  topicKey: string
  label: string
  group: "thematique" | "segment"
  defaultCorpusSlug: string | null
}

export type DigestCorpusOption = {
  id: string
  slug: string
  label: string
  group: "socle" | "thematique" | "sectoriel"
  scopeKind: string
  selectable: boolean
  /** Nombre de sources collectables. `0` pour un corpus non activé (absent de la vue). */
  sourcesCount: number
  unavailableReason: string | null
}

export type DigestLaunchOptions = {
  topics: DigestTopicOption[]
  corpora: DigestCorpusOption[]
  /** Sources du mode par défaut (le socle), affichées quand aucun corpus n'est choisi. */
  defaultSourcesCount: number
}

const GROUP_BY_SCOPE: Record<string, DigestCorpusOption["group"]> = {
  system: "socle",
  thematic: "thematique",
  sector: "sectoriel",
}

export async function getDigestLaunchOptions(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<DigestLaunchOptions> {
  const [presetTopics, segmentsResult, corporaResult, corpusSourcesResult, defaultSourcesResult] =
    await Promise.all([
      Promise.resolve(listDigestPresets()),
      supabase
        .from("sector_intelligence")
        .select("id, slug, name")
        .eq("workspace_id", workspaceId)
        .eq("level", "segment")
        .order("name", { ascending: true }),
      supabase
        .from("source_corpora")
        .select("id, slug, scope_kind, activation_state, is_current")
        .eq("workspace_id", workspaceId)
        .eq("is_current", true)
        .order("scope_kind", { ascending: true })
        .order("slug", { ascending: true }),
      supabase.from("v_corpus_news_sources").select("corpus_id"),
      supabase.from("v_effective_watch_sources").select("source_id").eq("usage_scope", "news"),
    ])

  const sourcesByCorpus = new Map<string, number>()
  for (const row of corpusSourcesResult.data ?? []) {
    const corpusId = row.corpus_id
    if (!corpusId) continue
    sourcesByCorpus.set(corpusId, (sourcesByCorpus.get(corpusId) ?? 0) + 1)
  }

  const topics: DigestTopicOption[] = [
    ...presetTopics.map((preset) => ({
      topicKey: preset.key,
      label: preset.label,
      group: "thematique" as const,
      defaultCorpusSlug: preset.defaultCorpusSlug,
    })),
    // Le sujet d'un segment EST son slug (ADR-0022 §3.2).
    ...(segmentsResult.data ?? []).map((segment) => ({
      topicKey: segment.slug,
      label: segment.name,
      group: "segment" as const,
      defaultCorpusSlug: null,
    })),
  ]

  const corpora: DigestCorpusOption[] = (corporaResult.data ?? []).map((corpus) => {
    const sourcesCount = sourcesByCorpus.get(corpus.id) ?? 0
    const isDraft = corpus.activation_state !== "active"
    return {
      id: corpus.id,
      slug: corpus.slug,
      label: corpus.slug,
      group: GROUP_BY_SCOPE[corpus.scope_kind] ?? "thematique",
      scopeKind: corpus.scope_kind,
      selectable: !isDraft && sourcesCount > 0,
      sourcesCount,
      unavailableReason: isDraft
        ? "Corpus en brouillon : à activer avant utilisation."
        : sourcesCount === 0
          ? "Aucune source collectable dans ce corpus."
          : null,
    }
  })

  return {
    topics,
    corpora,
    defaultSourcesCount: (defaultSourcesResult.data ?? []).length,
  }
}

export { GLOBAL_DIGEST_TOPIC_KEY }
