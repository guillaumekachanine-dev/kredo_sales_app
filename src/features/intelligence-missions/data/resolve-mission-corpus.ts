import "server-only"

/**
 * Résolveur de corpus — ADR-0020 §4.3 / M-5.
 *
 * Preset + sélecteurs de lancement → `ResolvedCorpus` borné et tracé. S'exécute côté
 * serveur, dans `/api/n8n/trigger`, avant tout appel à n8n.
 *
 * ── L'ALLOWLIST ──────────────────────────────────────────────────────────────────
 * L'appelant ne choisit pas ses corpus : il ne fait que renseigner les sélecteurs des
 * origines que le preset l'autorise à fournir. Un sélecteur portant un `kind` absent de
 * `base` / `requiredAtLaunch` / `userAddition.kinds` fait échouer le lancement — il n'est
 * jamais « ignoré silencieusement », ce qui masquerait une tentative d'élargissement.
 *
 * Même doctrine que `resolveKnowledgeScope` : le client Supabase est INJECTÉ (RLS de
 * l'utilisateur), la fonction ne le fabrique jamais, et elle rend une union plutôt que de
 * lever.
 */

import {
  applyCorpusBudget,
  type CorpusCandidate,
} from "../domain/apply-corpus-budget"
import type {
  CorpusExclusion,
  CorpusKind,
  CorpusResolveContext,
  CorpusSelector,
  MissionSpec,
  ResolvedCorpus,
} from "../domain/mission-contracts"
import { corpusSelectorKey } from "../domain/mission-selectors"
import { CORPUS_PROVIDERS } from "./corpus/corpus-provider-registry"

/** Borne dure sur le nombre de sélecteurs d'un lancement. */
export const MAX_SELECTORS_PER_LAUNCH = 20

export function allowedCorpusKinds(spec: MissionSpec): Set<CorpusKind> {
  const allowed = new Set<CorpusKind>(spec.corpus.base.map((selector) => selector.kind))
  for (const kind of spec.corpus.requiredAtLaunch) allowed.add(kind)
  // `kinds` ne compte QUE si l'ajout utilisateur est ouvert : une liste laissée remplie
  // sur un preset fermé ne doit rien autoriser.
  if (spec.corpus.userAddition.allowed) {
    for (const kind of spec.corpus.userAddition.kinds) allowed.add(kind)
  }
  return allowed
}

export async function resolveMissionCorpus(
  ctx: CorpusResolveContext,
  spec: MissionSpec,
  launchSelectors: CorpusSelector[],
): Promise<ResolvedCorpus | { error: string }> {
  if (launchSelectors.length > MAX_SELECTORS_PER_LAUNCH) {
    return { error: `Trop de sélecteurs de corpus (maximum ${MAX_SELECTORS_PER_LAUNCH}).` }
  }

  const allowed = allowedCorpusKinds(spec)
  for (const selector of launchSelectors) {
    if (!allowed.has(selector.kind)) {
      return { error: `Corpus « ${selector.kind} » non autorisé par la mission « ${spec.slug} ».` }
    }
  }

  const providedAtLaunch = new Set(launchSelectors.map((selector) => selector.kind))
  for (const required of spec.corpus.requiredAtLaunch) {
    if (!providedAtLaunch.has(required)) {
      return { error: `La mission « ${spec.slug} » exige un sélecteur « ${required} » au lancement.` }
    }
  }

  // Déduplication : `base` et le lancement peuvent porter le même sélecteur, l'hydrater
  // deux fois fausserait le budget et doublerait le contenu envoyé au LLM.
  const bySelectorKey = new Map<string, CorpusSelector>()
  for (const selector of [...spec.corpus.base, ...launchSelectors]) {
    bySelectorKey.set(corpusSelectorKey(selector), selector)
  }
  const selectors = Array.from(bySelectorKey.values())

  const candidates: CorpusCandidate[] = []
  const exclusions: CorpusExclusion[] = []

  try {
    // Parallèle : l'ordre d'arrivée n'a aucune incidence, `applyCorpusBudget` impose un
    // ordre total sur (weight, date, table, id).
    const results = await Promise.all(
      selectors.map(async (selector) => {
        const provider = CORPUS_PROVIDERS[selector.kind]
        return { provider, result: await provider.resolve(ctx, selector) }
      }),
    )

    for (const { provider, result } of results) {
      for (const item of result.items) candidates.push({ item, weight: provider.weight })
      exclusions.push(...result.exclusions)
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Résolution du corpus impossible." }
  }

  return applyCorpusBudget(candidates, spec.corpus.budget, exclusions)
}
