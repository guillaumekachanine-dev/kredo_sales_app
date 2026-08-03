"use client"

import { useState } from "react"
import { TechItem, PracticeItem } from "./kredo-expertise.types"

interface TechnologiesViewProps {
  technologies: TechItem[]
  practices: PracticeItem[]
  isMobile?: boolean
}

const PRACTICE_ICONS: Record<string, string> = {
  "data-ai": "🧠",
  "cloud-engineering": "☁️",
  "digital-business-solutions": "💻",
  "digital-experience": "🎨",
  "cybersecurity": "🛡️",
  "legacy-systems-mainframe": "⚙️",
  "project-agile-delivery": "⏱️",
  "quality-engineering-testing": "🧪",
}

export function KredoTechnologiesView({
  technologies,
  practices,
  isMobile = false,
}: TechnologiesViewProps) {
  const [search, setSearch] = useState("")
  const [selectedPracticeName, setSelectedPracticeName] = useState<string>("all")

  // Filter techs based on search and selected practice
  const filteredTechs = technologies.filter((tech) => {
    const matchesSearch = tech.name.toLowerCase().includes(search.toLowerCase())
    const matchesPractice =
      selectedPracticeName === "all" ||
      tech.practices.some((pName) => pName === selectedPracticeName)

    return matchesSearch && matchesPractice
  })

  const getPracticeIcon = (pName: string) => {
    const practice = practices.find((p) => p.name === pName)
    if (!practice) return "💼"
    return PRACTICE_ICONS[practice.slug] || "💼"
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-edito-surface p-4 rounded-xl border border-edito-border shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-edito-muted">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une technologie..."
            className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas pl-9 pr-3 text-xs text-edito-body placeholder:text-edito-muted outline-none focus:border-edito-brass"
          />
        </div>

        {/* Practice Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="tech-practice-filter" className="text-[10px] font-bold uppercase tracking-wider text-edito-navy shrink-0 flex items-center gap-1">
            <span>👁️</span> Practice :
          </label>
          <select
            id="tech-practice-filter"
            value={selectedPracticeName}
            onChange={(e) => setSelectedPracticeName(e.target.value)}
            className="h-9 rounded-md border border-edito-border bg-edito-canvas px-3 text-xs text-edito-body outline-none focus:border-edito-brass cursor-pointer"
          >
            <option value="all">Toutes les technologies</option>
            {practices.map((p) => (
              <option key={p.id} value={p.name}>
                {PRACTICE_ICONS[p.slug] || "💼"} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tech list - Editorial table style */}
      <div className="bg-edito-surface rounded-xl border border-edito-border overflow-hidden shadow-xs">
        {/* Header row (Desktop only) */}
        {!isMobile && (
          <div className="grid grid-cols-[1fr_280px_120px] gap-4 bg-edito-canvas/40 px-5 py-3.5 border-b border-edito-border text-[10px] font-bold uppercase tracking-wider text-edito-navy">
            <span className="flex items-center gap-1.5">⚙️ Technologie</span>
            <span className="flex items-center gap-1.5">🧠 Practices Concernées</span>
            <span className="text-right flex items-center justify-end gap-1.5">💼 Métiers</span>
          </div>
        )}

        <div className="divide-y divide-edito-border/20">
          {filteredTechs.map((tech) => (
            <div
              key={tech.name}
              className={`px-5 py-3.5 flex flex-col gap-2.5 transition-colors hover:bg-edito-chip/10 ${
                !isMobile ? "md:grid md:grid-cols-[1fr_280px_120px] md:items-center md:gap-4" : ""
              }`}
            >
              {/* Tech Name */}
              <div className="flex items-center gap-2">
                <span className="text-edito-brass text-[10px]" role="img" aria-hidden="true">⚡</span>
                <span className="text-xs font-bold text-edito-navy">
                  {tech.name}
                </span>
              </div>

              {/* Practices Tags */}
              <div className="flex flex-wrap gap-1.5">
                {tech.practices.length > 0 ? (
                  tech.practices.map((pName) => {
                    const pIcon = getPracticeIcon(pName)
                    return (
                      <span
                        key={pName}
                        className="inline-flex items-center gap-1 rounded border border-edito-border/50 bg-edito-chip px-1.5 py-0.5 text-[8px] font-bold text-edito-muted"
                      >
                        <span className="text-[10px]">{pIcon}</span>
                        <span>{pName}</span>
                      </span>
                    )
                  })
                ) : (
                  <span className="text-[9px] text-edito-muted italic">Aucune</span>
                )}
              </div>

              {/* Job Count */}
              <div className={`text-xs ${!isMobile ? "md:text-right" : ""}`}>
                <span className="inline-flex items-center rounded border border-edito-brass/25 bg-edito-brass/5 px-2.5 py-0.5 text-[9px] font-bold text-edito-brass">
                  🛠️ {tech.jobCount} {tech.jobCount > 1 ? "métiers" : "métier"}
                </span>
              </div>
            </div>
          ))}

          {filteredTechs.length === 0 && (
            <div className="py-12 text-center text-xs text-edito-muted flex flex-col items-center justify-center gap-2">
              <span className="text-lg">📭</span>
              <span>Aucune technologie ne correspond à votre recherche.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
