import "server-only"

/**
 * Provider de corpus `veille_period` — ADR-0020 §5.1.
 *
 * Hydrate le CONTENU de la veille sur un intervalle : les digests de la période et
 * les articles qui leur sont rattachés. C'est ce qui manquait — les deux agrégateurs
 * existants (`getMonthlyWatchGenerationContext` et le cron `monthly-watch`) ne rendent
 * que des identifiants, le contenu étant hydraté côté n8n. M-1 le rapatrie ici.
 *
 * Mode d'exécution : `user_rls`. Les deux tables portent le motif RLS workspace standard
 * (`workspace_id = current_workspace_id()`, vérifié live le 2026-08-18) : le client de
 * l'utilisateur suffit. Le `.eq("workspace_id", ctx.workspaceId)` explicite ci-dessous
 * n'est donc pas la protection principale mais une seconde serrure — même doctrine que
 * `reference-service-client.ts` : ne jamais lire sans filtre de workspace.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Bornes dures de requête : une garde de volume, pas une règle métier. */
export const VEILLE_DIGEST_QUERY_LIMIT = 200
export const VEILLE_ARTICLE_QUERY_LIMIT = 500

/** Priorité de conservation — cf. `corpus-provider-registry.ts`. */
export const VEILLE_PERIOD_WEIGHT = 50

function section(label: string, value: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? `${label} : ${trimmed}` : null
}

function compose(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join("\n\n")
}

function capExclusion(
  table: string,
  label: string,
  limit: number,
): CorpusExclusion {
  return {
    // La référence pointe la table saturée, pas une ligne : c'est un fait de collecte.
    ref: { kind: "veille_period", table, id: `__query_limit__` },
    title: `${label} : borne de requête atteinte (${limit})`,
    provenance: table,
    reason: "provider_limit",
  }
}

export const veillePeriodProvider: CorpusProvider<{
  kind: "veille_period"
  periodStart: string
  periodEnd: string
}> = {
  kind: "veille_period",
  execution: "user_rls",
  weight: VEILLE_PERIOD_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    const { data: digests, error: digestError } = await ctx.supabase
      .from("veille_digests")
      .select("id, titre_digest, resume_hebdo, digest_date")
      .eq("workspace_id", ctx.workspaceId)
      .gte("digest_date", selector.periodStart)
      .lte("digest_date", selector.periodEnd)
      .order("digest_date", { ascending: false })
      .limit(VEILLE_DIGEST_QUERY_LIMIT)

    if (digestError) {
      throw new Error(`Lecture des digests de veille impossible : ${digestError.message}`)
    }

    const digestRows = digests ?? []
    if (digestRows.length === VEILLE_DIGEST_QUERY_LIMIT) {
      exclusions.push(capExclusion("veille_digests", "Digests de veille", VEILLE_DIGEST_QUERY_LIMIT))
    }

    const digestDateById = new Map<string, string>()
    for (const digest of digestRows) {
      digestDateById.set(digest.id, digest.digest_date)
      const content = compose([section("Synthèse de la période", digest.resume_hebdo)])
      if (!content) continue
      items.push({
        ref: { kind: "veille_period", table: "veille_digests", id: digest.id },
        title: digest.titre_digest,
        date: digest.digest_date,
        provenance: "veille_digests",
        content,
        chars: content.length,
      })
    }

    if (digestRows.length === 0) return { items, exclusions }

    // Jointure en deux temps, comme partout ailleurs dans le repo : jamais d'embed
    // PostgREST sur ces deux tables.
    const { data: articles, error: articleError } = await ctx.supabase
      .from("veille_articles")
      .select(
        "id, titre_fr, resume, analyse_kredo, action_commerciale, published_at, source_name, digest_id",
      )
      .eq("workspace_id", ctx.workspaceId)
      .in("digest_id", Array.from(digestDateById.keys()))
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("selection_rank", { ascending: true })
      .limit(VEILLE_ARTICLE_QUERY_LIMIT)

    if (articleError) {
      throw new Error(`Lecture des articles de veille impossible : ${articleError.message}`)
    }

    const articleRows = articles ?? []
    if (articleRows.length === VEILLE_ARTICLE_QUERY_LIMIT) {
      exclusions.push(capExclusion("veille_articles", "Articles de veille", VEILLE_ARTICLE_QUERY_LIMIT))
    }

    for (const article of articleRows) {
      const content = compose([
        section("Résumé", article.resume),
        section("Analyse Kredo", article.analyse_kredo),
        section("Action commerciale", article.action_commerciale),
      ])
      if (!content) continue
      items.push({
        ref: { kind: "veille_period", table: "veille_articles", id: article.id },
        title: article.titre_fr,
        // `published_at` peut manquer ; la date du digest porteur reste une date de
        // période exacte, bien meilleure qu'une absence pour le tri du budget.
        date: article.published_at ?? digestDateById.get(article.digest_id) ?? null,
        provenance: article.source_name
          ? `veille_articles · ${article.source_name}`
          : "veille_articles",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
