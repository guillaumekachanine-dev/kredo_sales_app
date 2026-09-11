// ─── Rendu d'un bloc verbatim de l'étude ────────────────────────────────────
// Aucun HTML injecté : le texte est découpé en segments (texte, lien, pastille de
// citation) puis rendu en éléments React. Les pastilles gardent le numéro de l'étude.

import { Fragment } from "react"

import { cn } from "@/lib/utils"

import {
  headingText,
  listItems,
  paragraphText,
  parseInline,
  tableRows,
  type StudyBlockView,
} from "../domain/study-view"

export function StudyInline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((segment, index) => {
        if (segment.kind === "text") return <Fragment key={index}>{segment.text}</Fragment>
        if (segment.kind === "citation") {
          return (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              title={segment.url}
              className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-edito-chip px-1 align-super text-[9px] font-bold text-edito-heading hover:bg-edito-navy hover:text-edito-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
            >
              {segment.label}
            </a>
          )
        }
        return (
          <a
            key={index}
            href={segment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words text-edito-heading underline decoration-edito-border underline-offset-2 hover:decoration-edito-heading"
          >
            {segment.text}
          </a>
        )
      })}
    </>
  )
}

export function StudyBlockContent({ block, isMobile = false }: { block: StudyBlockView; isMobile?: boolean }) {
  const textSize = isMobile ? "text-xs" : "text-sm"

  if (block.kind === "heading") {
    return (
      <h4 className={cn("font-bold text-edito-navy", isMobile ? "text-xs" : "text-[13px]")}>
        <StudyInline text={headingText(block.text)} />
      </h4>
    )
  }

  if (block.kind === "table") {
    const rows = tableRows(block.text)
    return (
      <div className="overflow-x-auto rounded border border-edito-border">
        <table className={cn("w-full border-collapse text-left text-edito-body", isMobile ? "text-[11px]" : "text-xs")}>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <tr key={rowIndex} className="border-t border-edito-border first:border-t-0 even:bg-edito-canvas">
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    colSpan={cells.length === 1 ? 3 : undefined}
                    className="px-2.5 py-1.5 align-top leading-relaxed"
                  >
                    <StudyInline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (block.kind === "list") {
    return (
      <ul className={cn("list-disc space-y-1 pl-5 leading-relaxed text-edito-body", textSize)}>
        {listItems(block.text).map((item, index) => (
          <li key={index}>
            <StudyInline text={item} />
          </li>
        ))}
      </ul>
    )
  }

  if (block.kind === "quote") {
    return (
      <blockquote className={cn("border-l-2 border-edito-border pl-3 italic leading-relaxed text-edito-body", textSize)}>
        <StudyInline text={paragraphText(block.text.replace(/^\s*>\s?/gm, ""))} />
      </blockquote>
    )
  }

  return (
    <p className={cn("leading-relaxed text-edito-body", textSize)}>
      <StudyInline text={paragraphText(block.text)} />
    </p>
  )
}
