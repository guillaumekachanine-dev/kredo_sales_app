/**
 * Budget et troncature du corpus — ADR-0020 §4.4.
 *
 * Fonction PURE : aucune I/O, aucune horloge, aucun aléa. Deux exécutions sur les mêmes
 * entrées produisent le même corpus ET la même trace, quel que soit l'ordre d'arrivée
 * des providers (qui s'exécutent en parallèle). C'est la raison du tri total ci-dessous.
 *
 * Ordre imposé, jamais délégué au LLM :
 *   1. troncature de chaque élément à `maxCharsPerItem` (coupe en fin, marqueur explicite) ;
 *   2. tri par (weight DESC, date DESC) ;
 *   3. conservation jusqu'à `maxTotalChars` / `maxItems` ;
 *   4. tout élément écarté est compté ET tracé.
 */

import type {
  CorpusBudget,
  CorpusExclusion,
  CorpusItem,
  ResolvedCorpus,
} from "./mission-contracts"

/** Longueur fixe : le marqueur ne doit jamais faire varier la borne par élément. */
export const TRUNCATION_MARKER = "\n[…contenu tronqué]"

export type CorpusCandidate = {
  item: CorpusItem
  /** `weight` du provider d'origine — priorité de conservation. */
  weight: number
}

function truncate(item: CorpusItem, maxCharsPerItem: number): { item: CorpusItem; truncated: boolean } {
  if (maxCharsPerItem <= 0) {
    return { item: { ...item, content: "", chars: 0 }, truncated: item.content.length > 0 }
  }
  if (item.content.length <= maxCharsPerItem) {
    // `chars` est recalculé et non repris du provider : un provider qui se trompe de
    // compte ne doit pas pouvoir fausser le budget.
    return { item: { ...item, chars: item.content.length }, truncated: false }
  }

  // Le marqueur est compris DANS la borne : un élément tronqué ne dépasse jamais
  // `maxCharsPerItem`. Si la borne est plus courte que le marqueur, on coupe sec.
  const content =
    maxCharsPerItem > TRUNCATION_MARKER.length
      ? item.content.slice(0, maxCharsPerItem - TRUNCATION_MARKER.length) + TRUNCATION_MARKER
      : item.content.slice(0, maxCharsPerItem)

  return { item: { ...item, content, chars: content.length }, truncated: true }
}

/**
 * Ordre TOTAL — aucun ex aequo ne subsiste, donc aucune dépendance à la stabilité du
 * tri natif ni à l'ordre d'arrivée des providers :
 *   weight DESC → date DESC (date absente en dernier) → table ASC → id ASC.
 * Une date absente n'est pas « la plus ancienne » mais « inconnue » : elle passe après
 * toutes les dates connues, à weight égal.
 */
function compareCandidates(a: CorpusCandidate, b: CorpusCandidate): number {
  if (a.weight !== b.weight) return b.weight - a.weight

  const dateA = a.item.date
  const dateB = b.item.date
  if (dateA !== dateB) {
    if (dateA === null) return 1
    if (dateB === null) return -1
    return dateA < dateB ? 1 : -1
  }

  if (a.item.ref.table !== b.item.ref.table) {
    return a.item.ref.table < b.item.ref.table ? -1 : 1
  }
  if (a.item.ref.id !== b.item.ref.id) {
    return a.item.ref.id < b.item.ref.id ? -1 : 1
  }
  return 0
}

function compareExclusions(a: CorpusExclusion, b: CorpusExclusion): number {
  if (a.ref.table !== b.ref.table) return a.ref.table < b.ref.table ? -1 : 1
  if (a.ref.id !== b.ref.id) return a.ref.id < b.ref.id ? -1 : 1
  return 0
}

export function applyCorpusBudget(
  candidates: CorpusCandidate[],
  budget: CorpusBudget,
  exclusions: CorpusExclusion[] = [],
): ResolvedCorpus {
  // 1. Troncature — avant le tri : c'est la taille RÉELLE qui pèse sur le budget total.
  const truncated = candidates.map(({ item, weight }) => {
    const result = truncate(item, budget.maxCharsPerItem)
    return { candidate: { item: result.item, weight }, truncated: result.truncated }
  })

  // 2. Tri déterministe.
  truncated.sort((a, b) => compareCandidates(a.candidate, b.candidate))

  // 3. Conservation dans l'ordre de priorité. Le premier élément qui ne tient pas
  //    ARRÊTE la conservation : la priorité prime sur le remplissage. Laisser passer un
  //    élément moins prioritaire parce qu'il est plus petit rendrait la sortie
  //    difficilement explicable, pour un gain borné par `maxCharsPerItem`.
  const items: CorpusItem[] = []
  const trace: ResolvedCorpus["trace"] = []
  let totalChars = 0
  let budgetExhausted = false

  for (const entry of truncated) {
    const { item } = entry.candidate
    const base = { ref: item.ref, title: item.title, provenance: item.provenance }

    if (items.length >= budget.maxItems) {
      trace.push({ ...base, kept: false, reason: "budget_items" })
      continue
    }
    if (budgetExhausted || totalChars + item.chars > budget.maxTotalChars) {
      budgetExhausted = true
      trace.push({ ...base, kept: false, reason: "budget_total" })
      continue
    }

    items.push(item)
    totalChars += item.chars
    trace.push({ ...base, kept: true, ...(entry.truncated ? { reason: "truncated" as const } : {}) })
  }

  // 4. Les écarts décidés par les providers ferment la trace, triés eux aussi.
  for (const exclusion of [...exclusions].sort(compareExclusions)) {
    trace.push({
      ref: exclusion.ref,
      title: exclusion.title,
      provenance: exclusion.provenance,
      kept: false,
      reason: exclusion.reason,
    })
  }

  return {
    items,
    stats: {
      // `requested` = tout ce qui a été considéré, écarts de provider compris.
      // Invariant : requested === kept + dropped === trace.length.
      requested: truncated.length + exclusions.length,
      kept: items.length,
      dropped: truncated.length + exclusions.length - items.length,
      totalChars,
    },
    trace,
  }
}
