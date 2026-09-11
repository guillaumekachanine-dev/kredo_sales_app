// ─── Lecture d'un PDF (pdf.js via unpdf) → pages normalisées ────────────────
// Seul point du domaine qui touche une bibliothèque PDF. Il ne fait qu'aplatir la
// couche texte et les liens ; toute décision de mise en forme vit dans
// `domain/pdf-reconstruction.ts`, pur et testé.
//
// Importé uniquement par du code serveur (Server Actions). `unpdf` embarque une
// build serverless de pdf.js, sans worker.

import { getDocumentProxy } from "unpdf"

import type { PdfLink, PdfPage, PdfTextItem } from "../domain/pdf-reconstruction"

type PdfJsTextItem = { str?: unknown; transform?: unknown; width?: unknown; height?: unknown }
type PdfJsAnnotation = { subtype?: unknown; url?: unknown; rect?: unknown }

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function extractPdfPages(bytes: Uint8Array): Promise<PdfPage[]> {
  // pdf.js peut détacher le buffer qu'on lui confie : on lui passe une copie.
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const pages: PdfPage[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const [content, annotations] = await Promise.all([page.getTextContent(), page.getAnnotations()])

    const items: PdfTextItem[] = []
    for (const raw of content.items as PdfJsTextItem[]) {
      if (typeof raw.str !== "string" || !Array.isArray(raw.transform)) continue
      items.push({
        str: raw.str,
        x: toNumber(raw.transform[4]),
        y: toNumber(raw.transform[5]),
        width: toNumber(raw.width),
        height: toNumber(raw.height),
      })
    }

    const links: PdfLink[] = []
    for (const raw of annotations as PdfJsAnnotation[]) {
      if (raw.subtype !== "Link" || typeof raw.url !== "string" || !raw.url || !Array.isArray(raw.rect)) continue
      links.push({
        url: raw.url,
        x1: toNumber(raw.rect[0]),
        y1: toNumber(raw.rect[1]),
        x2: toNumber(raw.rect[2]),
        y2: toNumber(raw.rect[3]),
      })
    }

    pages.push({ pageNumber, items, links })
  }

  await pdf.cleanup?.()
  return pages
}
