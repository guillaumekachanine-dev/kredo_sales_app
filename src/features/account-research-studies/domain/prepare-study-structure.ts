// ─── Structure déterministe d'une étude — module pur ────────────────────────
// Recalculée depuis le texte STOCKÉ, à l'identique, au lancement de la conversion
// (pour planifier les passes) et à sa finalisation (pour assembler). Aucun état
// intermédiaire n'est persisté : le texte brut est la seule source de vérité.

import { checkBlocksIntegrity, segmentStudy, type BlocksIntegrity, type SegmentedBlock } from "./study-segmentation"
import { extractStudySources, type StudySourceExtraction } from "./study-sources"

export type StudyExtractionMeta = {
  pages: number
  pageOffsets: { pageNumber: number; offset: number }[]
  pdf: {
    textItems: number
    links: number
    linksOnText: number
    linksAsMarker: number
    linksAppended: number
    pdfNonWsChars: number
    markdownTextNonWsChars: number
    pageNumbersRemoved: string[]
    pageNumbersNonWsChars: number
    identical: boolean
  }
}

export type StudyStructure = {
  blocks: SegmentedBlock[]
  extraction: StudySourceExtraction
  integrity: BlocksIntegrity
}

export function prepareStudyStructure(rawContent: string, meta: Pick<StudyExtractionMeta, "pageOffsets"> | null): StudyStructure {
  const blocks = segmentStudy(rawContent, meta?.pageOffsets ?? [])
  return {
    blocks,
    extraction: extractStudySources(blocks),
    integrity: checkBlocksIntegrity(rawContent, blocks),
  }
}

/** Lecture défensive de `account_research_studies.extraction` (jsonb). */
export function readExtractionMeta(raw: unknown): Pick<StudyExtractionMeta, "pageOffsets"> | null {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { pageOffsets?: unknown }).pageOffsets)) return null
  const offsets = (raw as { pageOffsets: unknown[] }).pageOffsets
    .filter((entry): entry is { pageNumber: number; offset: number } =>
      typeof entry === "object" && entry !== null &&
      typeof (entry as { pageNumber?: unknown }).pageNumber === "number" &&
      typeof (entry as { offset?: unknown }).offset === "number")
  return { pageOffsets: offsets }
}
