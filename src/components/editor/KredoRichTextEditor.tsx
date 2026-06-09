"use client"

import React, { useRef, useEffect } from "react"
import { RichTextDocument, RichTextColor, RichTextAlign } from "./rich-text-types"
import { documentToHtml, htmlToDocument, DEFAULT_DOCUMENT } from "./rich-text-utils"
import { KredoRichTextToolbar } from "./KredoRichTextToolbar"
import { cn } from "@/lib/utils"

export interface KredoRichTextEditorProps {
  value?: RichTextDocument
  onChange: (value: RichTextDocument) => void
  placeholder?: string
  className?: string
}

export function KredoRichTextEditor({
  value = DEFAULT_DOCUMENT,
  onChange,
  placeholder = "Écrire une note...",
  className
}: KredoRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  // Sync value to DOM on mount or external changes
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML
      const targetHtml = documentToHtml(value)
      if (currentHtml !== targetHtml) {
        editorRef.current.innerHTML = targetHtml || `<p></p>`
      }
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      const doc = htmlToDocument(html)
      onChange(doc)
    }
  }

  const handleCommand = (command: string, val: string = "") => {
    document.execCommand(command, false, val)
    handleInput()
  }

  const handleColorChange = (color: RichTextColor) => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    const span = document.createElement("span")
    if (color === "default") {
      span.className = ""
    } else {
      span.className = `text-${color}`
    }

    try {
      span.appendChild(range.extractContents())
      range.insertNode(span)
    } catch (e) {
      console.error(e)
    }
    handleInput()
  }

  const handleAlignChange = (align: RichTextAlign) => {
    const selection = window.getSelection()
    if (!selection) return

    const anchorNode = selection.anchorNode
    if (!anchorNode) return

    let container: HTMLElement | null =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement

    while (container && container !== editorRef.current) {
      if (["P", "LI", "UL", "OL", "DIV"].includes(container.tagName)) {
        container.style.textAlign = align
        break
      }
      container = container.parentElement
    }
    handleInput()
  }

  return (
    <div className={cn("flex flex-col border border-border rounded-lg bg-surface overflow-hidden", className)}>
      <KredoRichTextToolbar
        onCommand={handleCommand}
        onColorChange={handleColorChange}
        onAlignChange={handleAlignChange}
      />
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          "flex-1 min-h-[150px] p-4 text-xs text-body leading-relaxed outline-none focus:ring-0",
          "prose-xs max-w-none prose-neutral focus:outline-none overflow-y-auto",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted empty:before:pointer-events-none empty:before:block"
        )}
      />
    </div>
  )
}
