// ─── Sources d'une étude — extraction déterministe, module pur ──────────────
//
// Toutes les URL du texte reconstruit deviennent des documents cités, sans exception et
// sans modèle : c'est la garantie « zéro perte » côté sources. Deux niveaux :
//   - le DOCUMENT (`DOC-xxx`) : une URL normalisée — ce que citent les affirmations ;
//   - l'AUTORITÉ (`SRC-xxx`) : un domaine — l'unité d'un registre E3 et d'un corpus.
// Le modèle QUALIFIE ensuite chaque autorité (tier, rôle…), jamais ne décide qu'elle
// existe. Une URL écartée l'est par une règle écrite ici, avec son motif.

import { CITATION_MARKER } from "./pdf-reconstruction"
import type { SegmentedBlock } from "./study-segmentation"

export type StudyLinkOccurrence = { url: string; text: string; index: number }

/** Un DOCUMENT cité par l'étude (une URL normalisée). `DOC-001`… */
export type StudySourceCandidate = {
  id: string
  /** Autorité (domaine) à laquelle le document appartient — `SRC-001`… du registre E3. */
  authority_id: string
  url: string
  normalized_url: string
  domain: string
  /** Libellé déterministe (titre de bibliographie si trouvé, sinon domaine). */
  label: string
  /** Numéros de citation portés par les pastilles `[n](url)` de l'étude. */
  citation_numbers: number[]
  cited_in_block_ids: string[]
}

/** Une AUTORITÉ au sens E3 : un domaine, et tous les documents de l'étude qui en viennent. */
export type StudyAuthorityCandidate = {
  id: string
  domain: string
  document_ids: string[]
}

export type StudySourceExtraction = {
  sources: StudySourceCandidate[]
  authorities: StudyAuthorityCandidate[]
  excluded: { url: string; reason: string }[]
  /** Nombre d'URL distinctes (normalisées) rencontrées dans le texte. */
  urlsDetected: number
  /** Documents cités par bloc : `blockId → DOC-xxx[]`. */
  blockSourceRefs: Map<string, string[]>
}

const MARKDOWN_LINK = /\[((?:\\.|[^\]\\])*)\]\((https?:\/\/[^)\s]+)\)/g
const BARE_URL = /https?:\/\/[^\s<>()[\]"'«»]+/g
const TRACKING_PARAM = /^(utm_[a-z]+|utm_src)$/i

/** Liens de l'outil producteur : jamais des sources de l'étude. */
const PRODUCER_HOSTS = new Set(["chatgpt.com", "chat.openai.com", "openai.com"])

export function documentId(index: number): string {
  return `DOC-${String(index + 1).padStart(3, "0")}`
}

export function authorityId(index: number): string {
  return `SRC-${String(index + 1).padStart(3, "0")}`
}

function trimUrl(url: string): string {
  return url.replace(/[.,;:!?]+$/, "")
}

export function normalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(trimUrl(url))
    parsed.hash = ""
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key)
    }
    parsed.hostname = parsed.hostname.toLowerCase()
    let normalized = parsed.toString()
    if (normalized.endsWith("?")) normalized = normalized.slice(0, -1)
    return normalized
  } catch {
    return trimUrl(url)
  }
}

export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return ""
  }
}

function unescapeLinkText(value: string): string {
  return value.replace(/\\(.)/g, "$1")
}

/** Toutes les URL d'un texte, liens Markdown puis URL nues hors liens, dans l'ordre du texte. */
export function extractLinkOccurrences(text: string): StudyLinkOccurrence[] {
  const occurrences: StudyLinkOccurrence[] = []
  const covered: [number, number][] = []
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    const index = match.index ?? 0
    occurrences.push({ url: match[2], text: unescapeLinkText(match[1]), index })
    covered.push([index, index + match[0].length])
  }
  for (const match of text.matchAll(BARE_URL)) {
    const index = match.index ?? 0
    if (covered.some(([start, end]) => index >= start && index < end)) continue
    occurrences.push({ url: trimUrl(match[0]), text: trimUrl(match[0]), index })
  }
  return occurrences.sort((a, b) => a.index - b.index)
}

/** Texte lisible d'une ligne : liens réduits à leur texte, marqueurs de citation retirés. */
export function plainLine(line: string): string {
  return line
    .replace(MARKDOWN_LINK, (_, text: string) => (text === CITATION_MARKER || /^\d{1,3}$/.test(text) ? "" : unescapeLinkText(text)))
    .replace(/^#+\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Libellé de bibliographie : dans un rapport ChatGPT, chaque entrée est une ligne
 * « [n] Titre » suivie de la ligne « URL ». On prend la ligne qui précède la
 * première ligne dont le texte de lien EST l'URL.
 */
function findBibliographyLabel(lines: string[], normalized: string): string | null {
  const isUrlLineFor = (line: string) =>
    [...line.matchAll(MARKDOWN_LINK)].some(
      (match) => normalizeSourceUrl(match[2]) === normalized && /^https?:\/\//.test(unescapeLinkText(match[1])),
    )
  const isTitleStart = (line: string) =>
    [...line.matchAll(MARKDOWN_LINK)].some(
      (match) => normalizeSourceUrl(match[2]) === normalized && /^\d{1,3}$/.test(unescapeLinkText(match[1])),
    )

  for (let i = 0; i < lines.length; i++) {
    if (!isUrlLineFor(lines[i])) continue
    // Un titre peut courir sur plusieurs lignes : on remonte jusqu'à la ligne qui porte
    // les pastilles de citation de cette source (début de l'entrée), trois lignes au plus.
    const parts: string[] = []
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      if (isUrlLineFor(lines[j])) break
      const label = plainLine(lines[j])
      if (label && !/^https?:\/\//.test(label)) parts.unshift(label)
      if (isTitleStart(lines[j])) break
    }
    if (parts.length) return parts.join(" ")
  }
  return null
}

export function extractStudySources(blocks: readonly SegmentedBlock[]): StudySourceExtraction {
  const byNormalized = new Map<string, StudySourceCandidate>()
  const excluded = new Map<string, string>()
  const blockSourceRefs = new Map<string, string[]>()
  const allLines = blocks.flatMap((block) => block.text.split("\n"))

  for (const block of blocks) {
    const refs: string[] = []
    for (const occurrence of extractLinkOccurrences(block.text)) {
      const normalized = normalizeSourceUrl(occurrence.url)
      const domain = sourceDomain(normalized)
      if (!domain) {
        excluded.set(normalized, "URL illisible")
        continue
      }
      if (PRODUCER_HOSTS.has(domain)) {
        excluded.set(normalized, "Lien de l'outil producteur (ChatGPT) — pas une source de l'étude")
        continue
      }

      let candidate = byNormalized.get(normalized)
      if (!candidate) {
        candidate = {
          id: documentId(byNormalized.size),
          authority_id: "",
          url: trimUrl(occurrence.url),
          normalized_url: normalized,
          domain,
          label: domain,
          citation_numbers: [],
          cited_in_block_ids: [],
        }
        byNormalized.set(normalized, candidate)
      }
      const citation = /^\d{1,3}$/.test(occurrence.text) ? Number(occurrence.text) : null
      if (citation !== null && !candidate.citation_numbers.includes(citation)) candidate.citation_numbers.push(citation)
      if (!candidate.cited_in_block_ids.includes(block.id)) candidate.cited_in_block_ids.push(block.id)
      if (!refs.includes(candidate.id)) refs.push(candidate.id)
    }
    if (refs.length) blockSourceRefs.set(block.id, refs)
  }

  const authorities = new Map<string, StudyAuthorityCandidate>()
  for (const candidate of byNormalized.values()) {
    candidate.label = findBibliographyLabel(allLines, candidate.normalized_url) ?? candidate.domain
    candidate.citation_numbers.sort((a, b) => a - b)
    let authority = authorities.get(candidate.domain)
    if (!authority) {
      authority = { id: authorityId(authorities.size), domain: candidate.domain, document_ids: [] }
      authorities.set(candidate.domain, authority)
    }
    authority.document_ids.push(candidate.id)
    candidate.authority_id = authority.id
  }

  return {
    sources: [...byNormalized.values()],
    authorities: [...authorities.values()],
    excluded: [...excluded.entries()].map(([url, reason]) => ({ url, reason })),
    urlsDetected: byNormalized.size + excluded.size,
    blockSourceRefs,
  }
}
