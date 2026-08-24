/**
 * Analyse des sélecteurs de corpus reçus du navigateur — ADR-0020 M-5.
 *
 * Ces objets sont la SEULE chose que l'appelant choisit ; tout le reste (workspace,
 * preset, contrat de sortie) est imposé côté serveur. Ils sont donc traités comme des
 * données hostiles : forme validée champ par champ, aucun `as` de confort, aucune clé
 * inconnue conservée. Fonctions pures — testées sans base.
 */

import type { CorpusKind, CorpusSelector } from "./mission-contracts"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Date calendaire stricte `YYYY-MM-DD` — le format des colonnes `date` de Postgres. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false
  // `2026-02-31` passe la regex mais n'existe pas : Date le normaliserait en silence.
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Nombre maximum d'identifiants acceptés dans un sélecteur `intelligence_document`. */
export const MAX_DOCUMENT_IDS_PER_SELECTOR = 100

/**
 * Rend un sélecteur typé, ou `null` si la forme reçue n'en est pas un. Ne dit jamais
 * si l'entité existe — c'est le rôle du provider, sous RLS.
 */
export function parseCorpusSelector(raw: unknown): CorpusSelector | null {
  if (typeof raw !== "object" || raw === null) return null
  const candidate = raw as Record<string, unknown>
  const kind = candidate.kind

  if (kind === "veille_period") {
    const { periodStart, periodEnd } = candidate
    if (!isIsoDate(periodStart) || !isIsoDate(periodEnd)) return null
    if (periodStart > periodEnd) return null
    return { kind: "veille_period", periodStart, periodEnd }
  }

  if (kind === "intelligence_document") {
    const { ids } = candidate
    if (!Array.isArray(ids) || ids.length === 0) return null
    if (ids.length > MAX_DOCUMENT_IDS_PER_SELECTOR) return null
    if (!ids.every(isUuid)) return null
    // Déduplication ici : deux fois le même id hydraterait deux fois le même document
    // et fausserait les compteurs de budget.
    return { kind: "intelligence_document", ids: Array.from(new Set(ids)) }
  }

  if (kind === "account_context") {
    const { companyId } = candidate
    if (!isUuid(companyId)) return null
    return { kind: "account_context", companyId }
  }

  if (kind === "delivery_period") {
    const { periodStart, periodEnd } = candidate
    if (!isIsoDate(periodStart) || !isIsoDate(periodEnd)) return null
    if (periodStart > periodEnd) return null
    return { kind: "delivery_period", periodStart, periodEnd }
  }

  if (kind === "prospection_window") {
    const { periodStart, periodEnd } = candidate
    if (!isIsoDate(periodStart) || !isIsoDate(periodEnd)) return null
    if (periodStart > periodEnd) return null
    return { kind: "prospection_window", periodStart, periodEnd }
  }

  if (kind === "staffing_horizon") {
    const { periodStart, periodEnd } = candidate
    if (!isIsoDate(periodStart) || !isIsoDate(periodEnd)) return null
    if (periodStart > periodEnd) return null
    return { kind: "staffing_horizon", periodStart, periodEnd }
  }

  if (kind === "account_delivery") {
    const { companyId } = candidate
    if (!isUuid(companyId)) return null
    return { kind: "account_delivery", companyId }
  }

  return null
}

/** Analyse une liste de sélecteurs : tout-ou-rien, jamais de silence partiel. */
export function parseCorpusSelectors(
  raw: unknown,
): { selectors: CorpusSelector[] } | { error: string } {
  if (raw === undefined || raw === null) return { selectors: [] }
  if (!Array.isArray(raw)) return { error: "`selectors` doit être un tableau." }

  const selectors: CorpusSelector[] = []
  for (const [index, entry] of raw.entries()) {
    const parsed = parseCorpusSelector(entry)
    if (!parsed) return { error: `Sélecteur de corpus invalide à l'index ${index}.` }
    selectors.push(parsed)
  }
  return { selectors }
}

/** Clé d'identité d'un sélecteur — sert à dédupliquer `base` + sélecteurs de lancement. */
export function corpusSelectorKey(selector: CorpusSelector): string {
  switch (selector.kind) {
    case "veille_period":
      return `veille_period:${selector.periodStart}:${selector.periodEnd}`
    case "intelligence_document":
      return `intelligence_document:${[...selector.ids].sort().join(",")}`
    case "account_context":
      return `account_context:${selector.companyId}`
    case "delivery_period":
      return `delivery_period:${selector.periodStart}:${selector.periodEnd}`
    case "prospection_window":
      return `prospection_window:${selector.periodStart}:${selector.periodEnd}`
    case "staffing_horizon":
      return `staffing_horizon:${selector.periodStart}:${selector.periodEnd}`
    case "account_delivery":
      return `account_delivery:${selector.companyId}`
  }
}

export function corpusSelectorKind(selector: CorpusSelector): CorpusKind {
  return selector.kind
}
