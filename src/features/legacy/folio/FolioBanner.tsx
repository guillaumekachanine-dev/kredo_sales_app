import React from "react"

export function FolioBanner() {
  return (
    <div className="mb-6 rounded-lg border border-[#CBD5E1] bg-[#1E3150] p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded bg-[#D89B16] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1E293B]">
          FOLIO original
        </span>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
          Archive FOLIO
        </h4>
      </div>
      <p className="mt-1 text-xs text-[#CBD5E1] leading-relaxed">
        Contenu original importé en lecture seule. Cette étude est distincte de l'intelligence sectorielle KREDO.
      </p>
    </div>
  )
}
