import React from "react"
import { RichTextDocument } from "./rich-text-types"
import { documentToHtml } from "./rich-text-utils"
import { cn } from "@/lib/utils"

export interface KredoRichTextViewerProps {
  value: RichTextDocument
  className?: string
}

export function KredoRichTextViewer({ value, className }: KredoRichTextViewerProps) {
  const html = documentToHtml(value)

  return (
    <div
      className={cn(
        "prose-xs max-w-none text-xs text-body leading-relaxed",
        "[&_strong]:font-bold [&_strong]:text-heading",
        "[&_em]:italic",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
        "[&_p]:my-2",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
