"use client"

import { useState } from "react"
import { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { formatDayMonthYear } from "@/lib/formatting/date-fr"
import { FolioStudySubheading } from "./FolioStudyPrimitives"
import { cn } from "@/lib/utils"

function SignalSourceLink({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-[#243B63] hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      Source
    </a>
  )
}

export function AccountSignalsCompactList({
  signals,
  totalSignalsCount = signals.length,
  onOpenAll,
}: {
  signals: ClientIntelligenceSignal[]
  totalSignalsCount?: number
  onOpenAll: () => void
}) {
  if (signals.length === 0) {
    return <p className="text-xs italic text-[#64748B]">Aucun signal récent capté pour ce compte.</p>
  }

  const displaySignals = signals.slice(0, 3)
  const remainingCount = totalSignalsCount - displaySignals.length

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {displaySignals.map((signal) => (
          <div key={signal.id} className="p-3 border border-[#CBD5E1]/60 rounded bg-[#F8FAFC]/50 hover:bg-[#F8FAFC] transition-colors">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h5 className="text-[11px] font-bold text-[#243B63] leading-snug">{signal.title}</h5>
              <span className="text-[10px] text-[#64748B] shrink-0 whitespace-nowrap">
                {signal.publishedAt ? formatDayMonthYear(signal.publishedAt) : formatDayMonthYear(signal.detectedAt)}
              </span>
            </div>
            {signal.summary && (
              <p className="text-xs text-[#334155] leading-relaxed line-clamp-2 mb-2">
                {signal.summary}
              </p>
            )}
            {signal.primarySourceId && <SignalSourceLink url={signal.primarySourceId} />}
          </div>
        ))}
      </div>
      
      {remainingCount > 0 && (
        <button
          type="button"
          onClick={onOpenAll}
          className="w-full text-center py-2 text-[11px] font-bold uppercase tracking-wider text-[#1E3150] hover:text-[#D89B16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded cursor-pointer"
        >
          Voir tous les signaux ({totalSignalsCount})
        </button>
      )}
    </div>
  )
}

export function AccountSignalsMobileCards({
  signals,
  totalSignalsCount = signals.length,
  onOpenAll,
}: {
  signals: ClientIntelligenceSignal[]
  totalSignalsCount?: number
  onOpenAll: () => void
}) {
  if (signals.length === 0) {
    return <p className="text-[10px] italic text-[#64748B]">Aucun signal récent capté pour ce compte.</p>
  }

  const displaySignals = signals.slice(0, 3)
  const remainingCount = totalSignalsCount - displaySignals.length

  return (
    <div className="space-y-3">
      {displaySignals.map((signal) => (
        <div key={signal.id} className="p-3.5 border border-[#CBD5E1]/60 rounded-lg bg-surface hover:bg-surface-hover active:bg-surface-hover/80 transition-colors">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h5 className="text-xs font-bold text-[#243B63] leading-snug">{signal.title}</h5>
            <span className="text-[10px] text-[#64748B] shrink-0 whitespace-nowrap">
              {signal.publishedAt ? formatDayMonthYear(signal.publishedAt) : formatDayMonthYear(signal.detectedAt)}
            </span>
          </div>
          {signal.summary && (
            <p className="text-[11px] text-[#334155] leading-relaxed line-clamp-2 mb-2">
              {signal.summary}
            </p>
          )}
          {signal.primarySourceId && <SignalSourceLink url={signal.primarySourceId} />}
        </div>
      ))}
      {remainingCount > 0 && (
        <button
          type="button"
          onClick={onOpenAll}
          className="w-full text-center py-2 text-[10px] font-bold uppercase tracking-wider text-[#1E3150] hover:text-[#D89B16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded cursor-pointer"
        >
          Voir tous les signaux ({totalSignalsCount})
        </button>
      )}
    </div>
  )
}

export function AccountSignalsModal({
  open,
  onClose,
  signals,
  isMobile = false,
}: {
  open: boolean
  onClose: () => void
  signals: ClientIntelligenceSignal[]
  isMobile?: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(signals[0]?.id || null)
  const selectedSignal = signals.find((s) => s.id === selectedId) || signals[0]

  if (!open) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1E3150] text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider">Tendances et actualités</h2>
          <button onClick={onClose} className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded focus-visible:outline-none cursor-pointer">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="p-3.5 border border-[#CBD5E1] rounded-lg bg-white">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-xs font-bold text-[#243B63] leading-snug">{signal.title}</h3>
                <span className="text-[10px] text-[#64748B] shrink-0 whitespace-nowrap">
                  {signal.publishedAt ? formatDayMonthYear(signal.publishedAt) : formatDayMonthYear(signal.detectedAt)}
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] text-[#334155] leading-relaxed">
                  {signal.summary || "Aucun résumé disponible."}
                </p>
                {signal.primarySourceId && <SignalSourceLink url={signal.primarySourceId} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const leftPane = (
    <div className="flex flex-col h-full bg-[#1E293B]">
      {signals.map((signal) => (
        <button
          key={signal.id}
          type="button"
          onClick={() => setSelectedId(signal.id)}
          className={cn(
            "text-left px-4 py-3 border-b border-white/5 transition-colors focus-visible:outline-none cursor-pointer",
            selectedId === signal.id ? "bg-white/10" : "hover:bg-white/5"
          )}
        >
          <h4 className="text-xs font-semibold text-white leading-snug mb-1 line-clamp-2">{signal.title}</h4>
          <span className="text-[10px] text-white/50">
            {signal.publishedAt ? formatDayMonthYear(signal.publishedAt) : formatDayMonthYear(signal.detectedAt)}
          </span>
        </button>
      ))}
    </div>
  )

  const rightPane = selectedSignal ? (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#243B63] mb-2">{selectedSignal.title}</h2>
        <div className="flex gap-4 items-center text-[11px] text-[#64748B]">
          <span>{selectedSignal.publishedAt ? formatDayMonthYear(selectedSignal.publishedAt) : formatDayMonthYear(selectedSignal.detectedAt)}</span>
          {selectedSignal.category && <span className="uppercase font-semibold text-[#1E3150]">{selectedSignal.category}</span>}
        </div>
      </div>
      <div className="space-y-4 text-[#334155] text-sm leading-relaxed">
        {selectedSignal.summary ? (
          <p>{selectedSignal.summary}</p>
        ) : (
          <p className="italic text-[#64748B]">Aucun résumé détaillé pour ce signal.</p>
        )}
      </div>
      {selectedSignal.primarySourceId && (
        <div className="pt-4 border-t border-[#CBD5E1]/50">
          <SignalSourceLink url={selectedSignal.primarySourceId} />
        </div>
      )}
    </div>
  ) : (
    <div className="flex h-full items-center justify-center p-8 text-sm italic text-[#64748B]">
      Sélectionnez un signal pour voir les détails.
    </div>
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      title="Tendances et actualités"
      onClose={onClose}
      leftPane={leftPane}
      rightPane={rightPane}
    />
  )
}
