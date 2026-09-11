// ─── Découpage d'une étude en blocs — module pur ────────────────────────────
//
// Le texte de l'étude est partitionné en blocs verbatim, sans réécriture. Un bloc est
// l'unité qu'on classe dans une section et qu'on restitue à l'écran : chaque bloc
// apparaît dans UNE section, donc le texte entier apparaît une fois, dans l'ordre.
//
// `checkBlocksIntegrity` rend cette propriété vérifiable : la suite des caractères
// non blancs de l'étude est identique à celle des blocs mis bout à bout.

import type { StudyBlockKind } from "./study-contracts"

export type SegmentedBlock = {
  id: string
  index: number
  kind: StudyBlockKind
  text: string
  heading_path: string[]
  page: number | null
}

/** Taille au-delà de laquelle un bloc est coupé à une frontière de ligne. */
export const MAX_BLOCK_CHARS = 3500

const HEADING = /^(#{1,6})\s+(.*)$/
const LIST_ITEM = /^\s*(?:[•●▪◦–—*-]|\d{1,3}[.)])\s+/

export function normalizeStudyText(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\u0000/g, "")
}

export function blockId(index: number): string {
  return `B${String(index + 1).padStart(4, "0")}`
}

function detectKind(text: string): StudyBlockKind {
  const lines = text.split("\n").filter((line) => line.trim())
  if (lines.length === 1 && HEADING.test(lines[0])) return "heading"
  const tableLines = lines.filter((line) => line.includes(" | ")).length
  if (tableLines > 0 && tableLines / lines.length >= 0.34) return "table"
  if (lines.length > 0 && lines.every((line) => LIST_ITEM.test(line))) return "list"
  if (lines.length > 0 && lines.every((line) => line.trimStart().startsWith(">"))) return "quote"
  return "paragraph"
}

/** Coupe un bloc trop long à des frontières de ligne, puis de phrase — jamais au milieu d'un mot. */
function splitOversized(text: string): string[] {
  if (text.length <= MAX_BLOCK_CHARS) return [text]
  const parts: string[] = []
  let current = ""
  const pieces = text.split("\n").flatMap((line) =>
    line.length <= MAX_BLOCK_CHARS ? [line] : line.split(/(?<=[.!?»])\s+/),
  )
  for (const piece of pieces) {
    const candidate = current ? `${current}\n${piece}` : piece
    if (candidate.length > MAX_BLOCK_CHARS && current) {
      parts.push(current)
      current = piece
    } else {
      current = candidate
    }
  }
  if (current) parts.push(current)
  return parts
}

function pageAt(offset: number, pageOffsets: { pageNumber: number; offset: number }[]): number | null {
  let page: number | null = null
  for (const entry of pageOffsets) {
    if (entry.offset <= offset) page = entry.pageNumber
    else break
  }
  return page
}

/**
 * Partitionne le texte en blocs aux lignes vides. Un titre Markdown collé à un
 * paragraphe devient son propre bloc. Déterministe : même texte, mêmes blocs.
 */
export function segmentStudy(
  rawText: string,
  pageOffsets: { pageNumber: number; offset: number }[] = [],
): SegmentedBlock[] {
  const text = normalizeStudyText(rawText)
  const blocks: SegmentedBlock[] = []
  const headingStack: { level: number; title: string }[] = []

  const chunkPattern = /[^\n]+(?:\n(?![ \t]*\n)[^\n]*)*/g
  for (const match of text.matchAll(chunkPattern)) {
    const chunk = match[0].replace(/\s+$/, "")
    if (!chunk.trim()) continue
    const offset = match.index ?? 0

    // Un titre suivi d'une ligne de texte sans ligne vide : deux blocs.
    const lines = chunk.split("\n")
    const pieces: string[] = []
    let buffer: string[] = []
    for (const line of lines) {
      if (HEADING.test(line)) {
        if (buffer.length) pieces.push(buffer.join("\n"))
        pieces.push(line)
        buffer = []
      } else {
        buffer.push(line)
      }
    }
    if (buffer.length) pieces.push(buffer.join("\n"))

    for (const piece of pieces) {
      for (const part of splitOversized(piece)) {
        const trimmed = part.trim()
        if (!trimmed) continue
        const kind = detectKind(trimmed)
        const headingMatch = kind === "heading" ? HEADING.exec(trimmed) : null
        if (headingMatch) {
          const level = headingMatch[1].length
          while (headingStack.length && headingStack[headingStack.length - 1].level >= level) headingStack.pop()
          headingStack.push({ level, title: headingMatch[2].replace(/\*+/g, "").trim() })
        }
        const index = blocks.length
        blocks.push({
          id: blockId(index),
          index,
          kind,
          text: trimmed,
          heading_path: headingStack.map((entry) => entry.title),
          page: pageAt(offset, pageOffsets),
        })
      }
    }
  }

  return blocks
}

export type BlocksIntegrity = {
  rawNonWsChars: number
  blocksNonWsChars: number
  identical: boolean
  /** Position (en caractères non blancs) de la première divergence, `null` si identique. */
  firstDivergenceAt: number | null
}

/**
 * La preuve du « zéro perte » côté texte : les caractères non blancs de l'étude et
 * ceux des blocs, pris dans l'ordre, sont la même suite.
 */
export function checkBlocksIntegrity(rawText: string, blocks: readonly { text: string }[]): BlocksIntegrity {
  const raw = normalizeStudyText(rawText).replace(/\s/g, "")
  const joined = blocks.map((block) => block.text).join("").replace(/\s/g, "")
  let firstDivergenceAt: number | null = null
  if (raw !== joined) {
    const limit = Math.min(raw.length, joined.length)
    firstDivergenceAt = limit
    for (let i = 0; i < limit; i++) {
      if (raw[i] !== joined[i]) {
        firstDivergenceAt = i
        break
      }
    }
  }
  return {
    rawNonWsChars: raw.length,
    blocksNonWsChars: joined.length,
    identical: raw === joined,
    firstDivergenceAt,
  }
}
