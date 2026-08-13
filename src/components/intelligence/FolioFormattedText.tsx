"use client"

import React from "react"

function isTechnicalLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Detect raw JSON strings
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      // Not valid JSON
    }
  }

  const lower = trimmed.toLowerCase()
  return (
    lower.startsWith("run_id:") ||
    lower.startsWith("workflow_id:") ||
    lower.startsWith("qa_flags:") ||
    lower.startsWith("source_refs:") ||
    lower.startsWith("raw_prompt:") ||
    lower.startsWith("version_hash:") ||
    lower.startsWith("[debug]") ||
    lower.startsWith("digest:")
  )
}

function renderBoldPhrases(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g)
  return parts.map((part, idx) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const boldText = part.slice(2, -2)
      return (
        <strong key={idx} className="font-bold text-[#1E3150]">
          {boldText}
        </strong>
      )
    }
    return part
  })
}

function renderFormattedLines(blockText: string) {
  const lines = blockText.split("\n")
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    const colonIndex = trimmed.indexOf(" : ") !== -1 ? trimmed.indexOf(" : ") : trimmed.indexOf(":")

    if (colonIndex > 0 && colonIndex < 45) {
      const label = trimmed.slice(0, colonIndex).trim()
      const content = trimmed.slice(colonIndex + 1).trim()
      if (!label.toLowerCase().startsWith("http") && !/^\d{2}:\d{2}/.test(label)) {
        return (
          <div key={idx} className="space-y-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3150]">
              {label}
            </span>
            <p className="text-xs sm:text-sm leading-relaxed text-[#334155]">
              {renderBoldPhrases(content)}
            </p>
          </div>
        )
      }
    }

    return (
      <p key={idx} className="text-xs sm:text-sm leading-relaxed text-[#334155]">
        {renderBoldPhrases(trimmed)}
      </p>
    )
  })
}

export function FolioFormattedText({ text }: { text: string }) {
  if (!text || !text.trim()) {
    return <p className="text-xs italic text-muted">Aucun contenu texte disponible.</p>
  }

  let cleanedText = text
  if (cleanedText.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(cleanedText)
      if (typeof parsed === "object" && parsed !== null) {
        if (typeof parsed.body === "string") cleanedText = parsed.body
        else if (typeof parsed.content === "string") cleanedText = parsed.content
        else if (typeof parsed.text === "string") cleanedText = parsed.text
        else if (typeof parsed.message === "string") cleanedText = parsed.message
      }
    } catch {
      // Keep original text
    }
  }

  const lines = cleanedText
    .split(/\r?\n/)
    .filter((l) => !isTechnicalLine(l))

  const blocks: string[] = []
  let currentBlock: string[] = []

  for (const line of lines) {
    if (!line.trim()) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"))
        currentBlock = []
      }
    } else {
      currentBlock.push(line)
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"))
  }

  if (blocks.length === 0) {
    return <p className="text-xs italic text-muted">Contenu indisponible.</p>
  }

  return (
    <div className="space-y-4 font-sans">
      {blocks.map((block, idx) => {
        const blockTrimmed = block.trim()
        const lower = blockTrimmed.toLowerCase()
        const isAccentBlock =
          lower.startsWith("note") ||
          lower.startsWith("important") ||
          lower.startsWith("objectif") ||
          lower.startsWith("message cl") ||
          lower.startsWith("contexte") ||
          lower.startsWith("angle")

        const isListBlock = blockTrimmed.split("\n").some((l) => /^\s*[\-\*\•\d+\.]\s+/.test(l))

        if (isAccentBlock) {
          return (
            <div
              key={idx}
              className="rounded-xl border-l-4 border-[#1E3150] border-y border-r border-[#CBD5E1] bg-[#F8FAFC] p-4 text-xs sm:text-sm leading-relaxed text-[#334155] shadow-xs space-y-2"
            >
              {renderFormattedLines(blockTrimmed)}
            </div>
          )
        }

        if (isListBlock) {
          const listLines = blockTrimmed.split("\n")
          return (
            <div key={idx} className="rounded-xl border border-[#CBD5E1] bg-white p-4 text-xs sm:text-sm leading-relaxed text-[#334155] shadow-xs space-y-2">
              {listLines.map((l, lIdx) => {
                const isBullet = /^\s*[\-\*\•]\s+/.test(l)
                const isNumbered = /^\s*\d+[\.\)]\s+/.test(l)
                const cleanLine = l.replace(/^\s*[\-\*\•\d+\.]\s+/, "")
                if (isBullet || isNumbered) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-1">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#1E3150]" />
                      <div className="min-w-0 flex-1">{renderFormattedLines(cleanLine)}</div>
                    </div>
                  )
                }
                return <div key={lIdx}>{renderFormattedLines(l)}</div>
              })}
            </div>
          )
        }

        return (
          <div
            key={idx}
            className="rounded-xl border border-[#CBD5E1] bg-white p-4 text-xs sm:text-sm leading-relaxed text-[#334155] shadow-xs space-y-2"
          >
            {renderFormattedLines(blockTrimmed)}
          </div>
        )
      })}
    </div>
  )
}
