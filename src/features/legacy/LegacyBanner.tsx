import React from "react"

export function LegacyBanner() {
  return (
    <div className="bg-[#edf0f7] border-b border-[#dbe0eb] px-4 py-2.5 text-xs text-[#526074] flex items-center gap-2">
      <span className="font-bold text-[#1a2540] uppercase tracking-wider shrink-0 bg-[#dbe0eb] px-1.5 py-0.5 rounded text-[10px]">
        Vue historique
      </span>
      <span className="truncate">
        Contenu conservé temporairement dans le Bac à sable de KREDO.
      </span>
    </div>
  )
}
