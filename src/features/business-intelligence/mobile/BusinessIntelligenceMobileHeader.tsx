"use client"

import type { BiChapter } from "../navigation/business-intelligence-chapters"

const MOBILE_HEADER_TITLES: Record<BiChapter, string> = {
  home: "Discours terrain",
  "sector-analysis": "Analyse sectorielle",
  "competitive-environment": "Paysage concurrentiel",
  "regulatory-calendar": "Calendrier réglementaire",
  "value-chain": "Chaîne de valeur",
  "sector-news": "Actualité sectorielle",
}

function CompactPlanes() {
  return (
    <>
      <div
        className="absolute inset-0 bg-edito-navy"
        style={{ clipPath: "polygon(0 0, 68% 0, 63% 100%, 0 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-surface"
        style={{ clipPath: "polygon(68% 0, 71% 0, 66% 100%, 63% 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-brass"
        style={{ clipPath: "polygon(71% 0, 100% 0, 100% 100%, 66% 100%)" }}
        aria-hidden="true"
      />
    </>
  )
}

export function BusinessIntelligenceMobileHeader({
  segmentName,
  activeChapter,
  onChangeSegment,
}: {
  segmentName: string
  activeChapter: BiChapter
  onChangeSegment: () => void
}) {
  const chapterTitle = MOBILE_HEADER_TITLES[activeChapter] ?? "Discours terrain"

  return (
    <header className="relative shrink-0 overflow-hidden border-b border-edito-border bg-edito-navy pt-[env(safe-area-inset-top)]">
      <CompactPlanes />
      <div className="relative z-10 flex h-[72px] items-center justify-between px-4">
        {/* Partie gauche Navy : condensée et centrée verticalement */}
        <div className="flex min-w-0 max-w-[62%] flex-col justify-center">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-white/70 leading-none">
            {segmentName}
          </p>
          <h1 className="mt-1 font-heading text-[15px] font-black uppercase tracking-tight text-white leading-tight line-clamp-2">
            {chapterTitle}
          </h1>
        </div>

        {/* Partie droite Ambre : recentrée en hauteur et alignée à droite */}
        <div className="flex h-full flex-col items-end justify-center text-right select-none pr-1">
          <span className="font-heading text-[10px] font-black uppercase tracking-[0.14em] text-edito-navy leading-none">
            Business
          </span>
          <span className="mt-0.5 font-heading text-[12px] font-black uppercase tracking-[0.06em] text-edito-navy leading-none">
            Intelligence
          </span>
          <button
            type="button"
            onClick={onChangeSegment}
            aria-label={`Changer le segment actif, actuellement ${segmentName}`}
            className="relative mt-1 inline-flex min-h-[44px] -my-2.5 items-center justify-end text-[9px] font-bold uppercase tracking-wider transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="rounded border border-edito-navy bg-edito-navy px-2 py-0.5 leading-tight text-white shadow-xs">
              Changer
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
