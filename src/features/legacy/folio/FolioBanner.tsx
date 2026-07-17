import React from "react"

export function FolioBanner() {
  return (
    <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4 text-slate-100 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950">
          FOLIO original
        </span>
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Archive FOLIO
        </h4>
      </div>
      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
        Contenu original importé en lecture seule. Cette étude est distincte de l’intelligence sectorielle KREDO.
      </p>
    </div>
  )
}
