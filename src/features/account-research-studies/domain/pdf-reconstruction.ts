// ─── Reconstruction d'un PDF en Markdown fidèle — module pur ─────────────────
//
// Entrée : la couche texte et les annotations de lien de chaque page, telles que
// pdf.js les expose (`getTextContent`, `getAnnotations`). Sortie : un Markdown léger
// où chaque fragment de texte du PDF apparaît UNE fois, et où chaque lien est posé
// à l'endroit exact où il se trouve dans la page :
//   - un lien qui recouvre du texte devient `[texte](url)` ;
//   - un lien sans texte (les pastilles de citation d'un rapport ChatGPT Deep
//     Research sont des icônes) devient un marqueur `[↗](url)` inséré à sa position.
//
// C'est ce qui rend les citations déterministes : la phrase et sa source sont
// voisines dans le texte, sans passer par un modèle.
//
// L'intégrité est mesurée, pas supposée : le nombre de caractères non blancs de la
// couche texte du PDF doit être égal à celui du texte reconstruit (hors syntaxe).

export type PdfTextItem = {
  str: string
  /** Abscisse et ordonnée de la ligne de base (repère PDF : y croît vers le haut). */
  x: number
  y: number
  width: number
  height: number
}

export type PdfLink = {
  url: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export type PdfPage = {
  pageNumber: number
  items: PdfTextItem[]
  links: PdfLink[]
}

export type PdfReconstruction = {
  markdown: string
  /** Offset (dans `markdown`) du début de chaque page, dans l'ordre des pages. */
  pageOffsets: { pageNumber: number; offset: number }[]
  stats: {
    pages: number
    textItems: number
    links: number
    linksOnText: number
    linksAsMarker: number
    linksAppended: number
    pdfNonWsChars: number
    markdownTextNonWsChars: number
    /** Numéros de page retirés du flux de texte — comptés, jamais perdus en silence. */
    pageNumbersRemoved: string[]
    pageNumbersNonWsChars: number
    /**
     * Chaque caractère non blanc de la couche texte du PDF est présent dans le Markdown,
     * à l'exception des seuls numéros de page, comptés à part.
     */
    identical: boolean
  }
}

export const CITATION_MARKER = "↗"

type Element =
  | { kind: "text"; x: number; right: number; str: string; height: number; url: string | null }
  | { kind: "marker"; x: number; right: number; url: string }

type Line = {
  y: number
  height: number
  elements: Element[]
}

type RenderedLine = {
  markdown: string
  /** Texte seul, sans syntaxe — sert à mesurer l'intégrité. */
  text: string
  y: number
  height: number
  heading: 0 | 1 | 2 | 3
  isListItem: boolean
  hasColumns: boolean
}

const WS = /\s/g

function countNonWs(value: string): number {
  return value.replace(WS, "").length
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function escapeLinkText(value: string): string {
  return value.replace(/[[\]]/g, (char) => `\\${char}`)
}

function groupLines(items: PdfTextItem[]): Line[] {
  const sorted = items
    .filter((item) => item.str.length > 0)
    .sort((a, b) => (Math.abs(b.y - a.y) > 0.5 ? b.y - a.y : a.x - b.x))

  const lines: Line[] = []
  for (const item of sorted) {
    const current = lines[lines.length - 1]
    const tolerance = Math.max(2.5, Math.min(item.height || 0, current?.height || 0) * 0.35)
    const element: Element = {
      kind: "text",
      x: item.x,
      right: item.x + item.width,
      str: item.str,
      height: item.height,
      url: null,
    }
    if (current && Math.abs(current.y - item.y) <= tolerance) {
      current.elements.push(element)
      if (item.str.trim()) current.height = Math.max(current.height, item.height)
    } else {
      lines.push({ y: item.y, height: item.str.trim() ? item.height : 0, elements: [element] })
    }
  }
  for (const line of lines) line.elements.sort((a, b) => a.x - b.x)
  return lines
}

function horizontalOverlap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
}

/**
 * Pose chaque lien sur la page : d'abord sur le texte qu'il recouvre, sinon comme
 * marqueur sur la ligne qu'il jouxte. Rend les liens qui n'ont trouvé aucune ligne.
 */
function placeLinks(
  lines: Line[],
  links: PdfLink[],
  counters: { onText: number; asMarker: number },
): PdfLink[] {
  const unplaced: PdfLink[] = []
  // Le plus petit rectangle d'abord : un lien de texte précis l'emporte sur une zone large.
  const ordered = [...links].sort(
    (a, b) => (a.x2 - a.x1) * (a.y2 - a.y1) - (b.x2 - b.x1) * (b.y2 - b.y1),
  )

  for (const link of ordered) {
    const top = Math.max(link.y1, link.y2)
    const bottom = Math.min(link.y1, link.y2)
    const left = Math.min(link.x1, link.x2)
    const right = Math.max(link.x1, link.x2)
    let coveredText = false

    for (const line of lines) {
      const lineBottom = line.y - line.height * 0.25
      const lineTop = line.y + Math.max(line.height, 1) * 0.9
      if (lineTop < bottom - 1 || lineBottom > top + 1) continue
      for (const element of line.elements) {
        if (element.kind !== "text" || element.url !== null || !element.str.trim()) continue
        const width = Math.max(element.right - element.x, 0.01)
        if (horizontalOverlap(element.x, element.right, left, right) >= width * 0.5) {
          element.url = link.url
          coveredText = true
        }
      }
    }

    if (coveredText) {
      counters.onText += 1
      continue
    }

    // Icône de citation : la ligne dont la base est dans la hauteur du rectangle.
    let target: Line | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const line of lines) {
      if (line.y < bottom - 4 || line.y > top + 4) continue
      const distance = Math.abs(line.y - bottom)
      if (distance < bestDistance) {
        bestDistance = distance
        target = line
      }
    }
    if (!target) {
      unplaced.push(link)
      continue
    }

    const duplicate = target.elements.some(
      (element) => element.url === link.url && Math.abs(element.x - left) < 24,
    )
    if (!duplicate) {
      target.elements.push({ kind: "marker", x: left, right, url: link.url })
      target.elements.sort((a, b) => a.x - b.x)
    }
    counters.asMarker += 1
  }

  return unplaced
}

/** Écart horizontal au-delà duquel deux fragments d'une ligne sont deux colonnes de tableau. */
function isColumnGap(gap: number, height: number): boolean {
  return gap > Math.max(height * 1.8, 14)
}

function renderLine(line: Line): { markdown: string; text: string; hasColumns: boolean } {
  let markdown = ""
  let text = ""
  let previous: Element | null = null
  let openUrl: string | null = null
  let linkBuffer = ""
  let hasColumns = false

  const needsSpace = (prev: Element, next: Element, lastChar: string, nextChar: string) => {
    if (!lastChar || /\s/.test(lastChar) || /\s/.test(nextChar)) return false
    if (next.kind === "marker") return true
    const gap = next.x - prev.right
    const height = Math.max(next.kind === "text" ? next.height : 0, prev.kind === "text" ? prev.height : 0, 1)
    return gap > height * 0.2
  }

  const flushLink = () => {
    if (openUrl !== null) {
      markdown += `[${escapeLinkText(linkBuffer)}](${openUrl})`
      openUrl = null
      linkBuffer = ""
    }
  }

  for (const element of line.elements) {
    const nextChar = element.kind === "text" ? element.str[0] ?? "" : "["
    const lastChar = openUrl !== null ? linkBuffer.slice(-1) || markdown.slice(-1) : markdown.slice(-1)
    const columnBreak =
      previous !== null && previous.kind === "text" && element.kind === "text" &&
      isColumnGap(element.x - previous.right, Math.max(element.height, previous.height, 1))
    if (columnBreak) {
      flushLink()
      markdown = markdown.replace(/\s+$/, "") + " | "
      text += " "
      hasColumns = true
    }
    const space = previous && !columnBreak ? needsSpace(previous, element, lastChar, nextChar) : false

    if (element.kind === "marker") {
      flushLink()
      markdown += `${space ? " " : ""}[${CITATION_MARKER}](${element.url})`
      previous = element
      continue
    }

    if (element.url !== null && element.url === openUrl) {
      linkBuffer += `${space ? " " : ""}${element.str}`
    } else {
      flushLink()
      if (element.url !== null) {
        if (space) markdown += " "
        openUrl = element.url
        linkBuffer = element.str
      } else {
        markdown += `${space ? " " : ""}${element.str}`
      }
    }
    text += `${space ? " " : ""}${element.str}`
    previous = element
  }
  flushLink()

  return { markdown: markdown.replace(/\s+$/, ""), text, hasColumns }
}

const LIST_ITEM = /^\s*(?:[•●▪◦–—-]|\d{1,3}[.)])\s/
const PAGE_NUMBER = /^\s*\d{1,3}\s*$/
const SENTENCE_END = /[.!?:;»")\]]\s*$/

/**
 * Reconstruit le Markdown d'un document entier. Pure et déterministe : deux appels
 * sur les mêmes pages rendent le même texte, octet pour octet.
 */
export function reconstructPdfMarkdown(pages: PdfPage[]): PdfReconstruction {
  const counters = { onText: 0, asMarker: 0 }
  let linksAppended = 0
  let totalLinks = 0
  let textItems = 0
  let pdfNonWs = 0
  const pageNumbersRemoved: string[] = []
  const appendedUrls: string[] = []

  const pageLines: { pageNumber: number; lines: RenderedLine[]; appended: PdfLink[] }[] = []
  const allHeights: number[] = []

  for (const page of pages) {
    textItems += page.items.filter((item) => item.str.length > 0).length
    pdfNonWs += page.items.reduce((sum, item) => sum + countNonWs(item.str), 0)
    totalLinks += page.links.length

    const lines = groupLines(page.items)
    const unplaced = placeLinks(lines, page.links, counters)
    linksAppended += unplaced.length

    const rendered: RenderedLine[] = lines
      .map((line) => {
        const { markdown, text, hasColumns } = renderLine(line)
        return { markdown, text, y: line.y, height: line.height, heading: 0 as const, isListItem: false, hasColumns }
      })
      .filter((line) => line.markdown.trim().length > 0)

    // Numéro de page : la ligne la plus basse, composée de chiffres seuls.
    const lowest = rendered.reduce<RenderedLine | null>((low, line) => (!low || line.y < low.y ? line : low), null)
    if (lowest && PAGE_NUMBER.test(lowest.text) && !lowest.markdown.includes("](")) {
      pageNumbersRemoved.push(lowest.text.trim())
      rendered.splice(rendered.indexOf(lowest), 1)
    }

    for (const line of rendered) if (line.height > 0) allHeights.push(line.height)
    pageLines.push({ pageNumber: page.pageNumber, lines: rendered, appended: unplaced })
  }

  const bodyHeight = median(allHeights) || 10

  // Interligne de référence du CORPS de texte, sur tout le document : calculé page par
  // page, il est faussé par les tableaux serrés et fait d'une ligne sur deux un paragraphe.
  const bodyGaps: number[] = []
  for (const page of pageLines) {
    for (let i = 1; i < page.lines.length; i++) {
      const a = page.lines[i - 1]
      const b = page.lines[i]
      const gap = a.y - b.y
      if (gap > 0 && Math.abs(a.height - bodyHeight) < 0.6 && Math.abs(b.height - bodyHeight) < 0.6) bodyGaps.push(gap)
    }
  }
  const typicalGap = median(bodyGaps) || bodyHeight * 1.4

  for (const page of pageLines) {
    for (const line of page.lines) {
      const short = line.text.trim().length <= 160
      if (short && line.height >= bodyHeight * 1.7) line.heading = 1
      else if (short && line.height >= bodyHeight * 1.4) line.heading = 2
      else if (short && line.height >= bodyHeight * 1.15) line.heading = 3
      line.isListItem = !line.heading && LIST_ITEM.test(line.text)
    }
  }

  let markdown = ""
  let markdownTextNonWs = 0
  const pageOffsets: PdfReconstruction["pageOffsets"] = []
  let lastLine: RenderedLine | null = null

  for (const page of pageLines) {
    page.lines.forEach((line, index) => {
      const previousOnPage = index > 0 ? page.lines[index - 1] : null
      let separator: string
      if (!lastLine) {
        separator = ""
      } else if (!previousOnPage) {
        // Saut de page : on ne recolle que la phrase manifestement coupée en deux.
        const continues =
          !line.heading && !lastLine.heading && !line.isListItem &&
          !SENTENCE_END.test(lastLine.text) && /^[a-zà-ÿ(«"]/.test(line.text.trim())
        separator = continues ? "\n" : "\n\n"
      } else {
        const gap = previousOnPage.y - line.y
        const sameHeading = line.heading !== 0 && line.heading === previousOnPage.heading && gap <= line.height * 2.2
        const inTable = (line.hasColumns || previousOnPage.hasColumns) && gap <= typicalGap * 2.6
        if (sameHeading) separator = " "
        else if (line.heading || previousOnPage.heading) separator = "\n\n"
        else if (inTable) separator = "\n"
        else if (gap > typicalGap * 1.45) separator = "\n\n"
        else separator = "\n"
      }

      if (index === 0) pageOffsets.push({ pageNumber: page.pageNumber, offset: markdown.length + separator.length })

      const continuesHeading = separator === " "
      const prefix = line.heading && !continuesHeading ? `${"#".repeat(line.heading)} ` : ""
      markdown += separator + prefix + line.markdown.trim()
      markdownTextNonWs += countNonWs(line.text)
      lastLine = line
    })

    if (page.lines.length === 0) pageOffsets.push({ pageNumber: page.pageNumber, offset: markdown.length })

    for (const link of page.appended) if (!appendedUrls.includes(link.url)) appendedUrls.push(link.url)
  }

  // Liens sans ligne d'accroche (logo, en-tête) : regroupés en fin de document, pour ne
  // jamais couper un paragraphe qui chevauche une page.
  if (appendedUrls.length > 0) {
    markdown += `${markdown ? "\n\n" : ""}${appendedUrls.map((url) => `[${CITATION_MARKER}](${url})`).join(" ")}`
  }

  const pageNumbersNonWs = pageNumbersRemoved.reduce((sum, value) => sum + countNonWs(value), 0)

  return {
    markdown,
    pageOffsets,
    stats: {
      pages: pages.length,
      textItems,
      links: totalLinks,
      linksOnText: counters.onText,
      linksAsMarker: counters.asMarker,
      linksAppended,
      pdfNonWsChars: pdfNonWs,
      markdownTextNonWsChars: markdownTextNonWs,
      pageNumbersRemoved,
      pageNumbersNonWsChars: pageNumbersNonWs,
      identical: pdfNonWs === markdownTextNonWs + pageNumbersNonWs,
    },
  }
}
