import {
  RichTextDocument,
  RichTextInline,
  RichTextMark,
  RichTextColor,
  RichTextAlign
} from "./rich-text-types"

export const DEFAULT_DOCUMENT: RichTextDocument = {
  version: 1,
  blocks: [
    {
      id: "init-block",
      type: "paragraph",
      children: [{ text: "" }]
    }
  ]
}

// Échappe le texte utilisateur avant injection dans du HTML rendu via
// dangerouslySetInnerHTML (KredoRichTextViewer). Le modèle RichTextDocument
// stocke le texte brut dans `inline.text` et les styles dans des champs
// structurés séparés (marks/align) : échapper le texte est donc sans perte,
// seuls nos tags contrôlés (strong/em/span/ul/ol/p) produisent du HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function documentToHtml(doc: RichTextDocument): string {
  if (!doc || !doc.blocks || doc.blocks.length === 0) return ""

  return doc.blocks
    .map((block) => {
      const alignStyle = block.align ? `text-align: ${block.align};` : ""
      const styleAttribute = alignStyle ? ` style="${alignStyle}"` : ""

      const content = block.children
        .map((inline) => {
          let html = escapeHtml(inline.text)
          if (inline.marks) {
            if (inline.marks.bold) {
              html = `<strong>${html}</strong>`
            }
            if (inline.marks.italic) {
              html = `<em>${html}</em>`
            }
            if (inline.marks.color && inline.marks.color !== "default") {
              html = `<span class="text-${inline.marks.color}">${html}</span>`
            }
          }
          return html
        })
        .join("")

      if (block.type === "bullet_list") {
        return `<ul${styleAttribute}><li>${content}</li></ul>`
      } else if (block.type === "ordered_list") {
        return `<ol${styleAttribute}><li>${content}</li></ol>`
      }
      return `<p${styleAttribute}>${content}</p>`
    })
    .join("")
}

export function htmlToDocument(html: string): RichTextDocument {
  const doc: RichTextDocument = { version: 1, blocks: [] }
  if (typeof window === "undefined") {
    return DEFAULT_DOCUMENT
  }

  const parser = new DOMParser()
  const parsed = parser.parseFromString(html || "<p></p>", "text/html")
  const body = parsed.body

  Array.from(body.childNodes).forEach((node, index) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement

    const id = `b-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`
    let type: "paragraph" | "bullet_list" | "ordered_list" = "paragraph"
    let align: RichTextAlign | undefined

    if (el.style.textAlign) {
      align = el.style.textAlign as RichTextAlign
    }

    let targetElement: HTMLElement = el

    if (el.tagName === "UL") {
      type = "bullet_list"
      targetElement = el.querySelector("li") || el
    } else if (el.tagName === "OL") {
      type = "ordered_list"
      targetElement = el.querySelector("li") || el
    } else if (el.tagName === "P") {
      type = "paragraph"
    }

    const children: RichTextInline[] = []

    const parseInline = (child: Node, currentMarks: RichTextMark = {}) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || ""
        if (text) {
          children.push({ text, marks: { ...currentMarks } })
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child as HTMLElement
        const newMarks = { ...currentMarks }

        if (childEl.tagName === "STRONG" || childEl.tagName === "B") {
          newMarks.bold = true
        }
        if (childEl.tagName === "EM" || childEl.tagName === "I") {
          newMarks.italic = true
        }
        if (childEl.tagName === "SPAN") {
          const colorClass = Array.from(childEl.classList).find((c) => c.startsWith("text-"))
          if (colorClass) {
            newMarks.color = colorClass.replace("text-", "") as RichTextColor
          }
        }

        Array.from(childEl.childNodes).forEach((grandChild) => {
          parseInline(grandChild, newMarks)
        })
      }
    }

    Array.from(targetElement.childNodes).forEach((child) => {
      parseInline(child)
    })

    if (children.length === 0) {
      children.push({ text: "" })
    }

    doc.blocks.push({ id, type, align, children })
  })

  if (doc.blocks.length === 0) {
    return DEFAULT_DOCUMENT
  }

  return doc
}

export function documentToPlainText(doc: RichTextDocument): string {
  if (!doc || !doc.blocks) return ""
  return doc.blocks
    .map((block) => {
      const text = block.children.map((c) => c.text).join("")
      if (block.type === "bullet_list") {
        return `• ${text}`
      } else if (block.type === "ordered_list") {
        return `1. ${text}`
      }
      return text
    })
    .join("\n")
}
