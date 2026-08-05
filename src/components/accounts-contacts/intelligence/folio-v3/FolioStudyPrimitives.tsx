"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function FolioStudySubheading({ label, isMobile = false }: { label: string; isMobile?: boolean }) {
  return (
    <h4 className={cn(
      "font-bold uppercase text-[#243B63]",
      isMobile ? "text-[10px] tracking-wide" : "text-[11px] tracking-wider"
    )}>
      {label}
    </h4>
  )
}

export function FolioNarrativeBlock({ children, isMobile = false }: { children: ReactNode; isMobile?: boolean }) {
  return (
    <div className={cn(
      "leading-relaxed",
      isMobile ? "text-xs text-body space-y-2" : "text-sm text-[#334155] space-y-3"
    )}>
      {children}
    </div>
  )
}

export function FolioEditorialList({
  label,
  items,
  isMobile = false,
}: {
  label?: string
  items: { name?: string; description: string }[]
  isMobile?: boolean
}) {
  if (items.length === 0) return null

  // Affichage maximum 10 items (selon la charte) - le reste via disclosure (V3_EXTENSION)
  const displayItems = items.slice(0, 10)
  const remaining = items.length - 10

  return (
    <div className="space-y-1.5 mt-3 first:mt-0">
      {label && <FolioStudySubheading label={label} isMobile={isMobile} />}
      <ul className={cn(
        "list-disc pl-4",
        isMobile ? "space-y-1.5 text-xs text-body leading-relaxed" : "space-y-0.5 text-xs text-[#334155]"
      )}>
        {displayItems.map((item, idx) => (
          <li key={idx}>
            {item.name ? <strong>{item.name}</strong> : null}
            {item.name && item.description ? " — " : ""}
            {item.description}
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <p className={cn("pl-4 text-muted italic mt-1", isMobile ? "text-[10px]" : "text-[11px]")}>
          + {remaining} autre{remaining > 1 ? "s" : ""} élément{remaining > 1 ? "s" : ""} masqué{remaining > 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}

export function FolioSourceMarker({ index, url, onClick }: { index: number; url?: string | null; onClick?: () => void }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Source [${index}]`}
        className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] text-[9px] text-[#D89B16] cursor-pointer align-super hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D89B16]"
      >
        [{index}]
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Source [${index}]`}
      className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] text-[9px] text-[#D89B16] cursor-pointer align-super hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D89B16]"
    >
      [{index}]
    </button>
  )
}

export function FolioSourceDisclosure({ sources, isMobile = false }: { sources: { index: number; url: string | null; title: string; date: string | null; type: string }[]; isMobile?: boolean }) {
  if (sources.length === 0) return null
  
  return (
    <details className="mt-4 border-t border-[#CBD5E1] pt-3 group">
      <summary className="text-[10px] text-[#64748B] font-medium cursor-pointer list-none flex items-center gap-2 select-none min-h-[44px] hover:text-[#243B63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded px-1 -ml-1">
        <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Sources — {sources.length}
      </summary>
      <ol className="mt-2 pl-6 list-decimal space-y-1.5 text-[10px] text-[#64748B]">
        {sources.map((src) => (
          <li key={src.index} className="pl-1">
            {src.url ? (
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#243B63]">
                {src.type} : {src.title}
              </a>
            ) : (
              <span>{src.type} : {src.title}</span>
            )}
            {src.date ? ` (${src.date})` : ""}
          </li>
        ))}
      </ol>
    </details>
  )
}

export function FolioEvidenceState({ state }: { state: "confirmed" | "contradicted" | "insufficient_evidence" | "institutional" }) {
  const styles = {
    confirmed: { color: "#D89B16", icon: "✓", label: "Confirmé" },
    contradicted: { color: "#ef4444", icon: "!", label: "Contredit" },
    insufficient_evidence: { color: "#64748B", icon: "?", label: "Preuve insuffisante" },
    institutional: { color: "#334155", icon: "«»", label: "Déclaratif institutionnel" },
  }[state]

  return (
    <span title={styles.label} aria-label={styles.label} className="inline-flex items-center gap-1 text-[10px] italic" style={{ color: styles.color }}>
      <span aria-hidden="true" className="font-bold">{styles.icon}</span>
    </span>
  )
}
