/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import { TechItem, PracticeItem } from "./kredo-expertise.types"

interface TechnologiesViewProps {
  technologies: TechItem[]
  practices: PracticeItem[]
  isMobile?: boolean
}

const PRACTICE_LOGOS: Record<string, string> = {
  "data-ai": "/images/practice_icons/practice_data_ia.png",
  "cloud-engineering": "/images/practice_icons/practice_cloud_engineering.png",
  "digital-business-solutions": "/images/practice_icons/practice_digital_business_solutions.png",
  "digital-experience": "/images/practice_icons/practice_digital_experience.png",
  "cybersecurity": "/images/practice_icons/practice_cybersecurity.png",
  "legacy-systems-mainframe": "/images/practice_icons/practice_legacy_mainframe.png",
  "project-agile-delivery": "/images/practice_icons/practice_project_agile_delivery.png",
  "quality-engineering-testing": "/images/practice_icons/practice_QA_testing.png",
}

const PRACTICE_COLORS: Record<string, { border: string }> = {
  "data-ai": { border: "border-[#1D39C4]" },
  "cloud-engineering": { border: "border-[#389E0D]" },
  "digital-business-solutions": { border: "border-[#D46B08]" },
  "digital-experience": { border: "border-[#C41D7F]" },
  cybersecurity: { border: "border-[#CF1322]" },
  "legacy-systems-mainframe": { border: "border-[#531DAB]" },
  "project-agile-delivery": { border: "border-[#595959]" },
  "quality-engineering-testing": { border: "border-[#08979C]" },
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

  const getPracticeStyle = (pName: string) => {
    const practice = practices.find((p) => p.name === pName)
    if (!practice) {
      return {
        logoUrl: "/images/practice_icons/practice_data_ia.png",
        classes: "bg-white text-edito-navy border-edito-border",
      }
    }
    const colors = PRACTICE_COLORS[practice.slug] || {
      border: "border-edito-border",
    }
    const logoUrl = PRACTICE_LOGOS[practice.slug] || "/images/practice_icons/practice_data_ia.png"
    return {
      logoUrl,
      classes: `bg-white text-edito-navy ${colors.border}`,
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filter Controls - Sticky top */}
      <div className="sticky top-[101px] md:top-0 z-30 bg-edito-canvas/90 backdrop-blur-md py-2 w-full">
        <div className="flex items-center gap-2 bg-edito-surface p-3 rounded-xl border border-edito-border shadow-xs w-full min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-edito-muted">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas pl-8 pr-2 text-xs text-edito-body placeholder:text-edito-muted outline-none focus:border-edito-brass min-w-0"
            />
          </div>

          {/* Practice Filter */}
          <div className="shrink-0 flex items-center gap-1.5 min-w-[120px] max-w-[160px]">
            <select
              id="tech-practice-filter"
              value={selectedPracticeName}
              onChange={(e) => setSelectedPracticeName(e.target.value)}
              aria-label="Filtrer par Practice"
              className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas px-2 text-xs text-edito-body outline-none focus:border-edito-brass cursor-pointer truncate font-medium"
            >
              <option value="all">Toutes les practices</option>
              {practices.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile-dedicated layout / Desktop table layout */}
      {isMobile ? (
        // Mobile cards layout - no horizontal scroll
        <div className="space-y-4">
          {filteredTechs.map((tech) => (
            <div
              key={tech.name}
              className="bg-edito-surface rounded-xl border border-edito-border p-4 space-y-3 shadow-2xs"
            >
              {/* Tech Header */}
              <div className="flex items-center gap-2">
                <span className="text-edito-brass text-[10px]" role="img" aria-hidden="true">⚡</span>
                <span className="text-xs font-bold text-edito-navy">{tech.name}</span>
              </div>

              {/* Tech Description */}
              <p className="text-[11px] leading-relaxed text-edito-body">
                {tech.description ? (
                  tech.description
                ) : (
                  <span className="text-edito-muted italic">Description non renseignée</span>
                )}
              </p>

              {/* Practices Tags */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-edito-border/50">
                {tech.practices.map((pName) => {
                  const style = getPracticeStyle(pName)
                  return (
                    <span
                      key={pName}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold ${style.classes}`}
                    >
                      <img src={style.logoUrl} alt="" className="size-3.5 object-contain" />
                      <span>{pName}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}

          {filteredTechs.length === 0 && (
            <div className="bg-edito-surface py-12 text-center text-xs text-edito-muted rounded-xl border border-edito-border shadow-xs flex flex-col items-center justify-center gap-2">
              <span className="text-lg">📭</span>
              <span>Aucune technologie ne correspond à votre recherche.</span>
            </div>
          )}
        </div>
      ) : (
        // Desktop table layout
        <div className="bg-edito-surface rounded-xl border border-edito-border overflow-hidden shadow-xs">
          {/* Table Header */}
          <div className="grid grid-cols-[180px_1fr_280px] gap-4 bg-edito-canvas/40 px-5 py-3.5 border-b border-edito-border text-[10px] font-bold uppercase tracking-wider text-edito-navy">
            <span>Technologie</span>
            <span>Description</span>
            <span className="flex items-center justify-end pr-2">Practices Concernées</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-edito-border/20">
            {filteredTechs.map((tech) => (
              <div
                key={tech.name}
                className="grid grid-cols-[180px_1fr_280px] gap-4 items-start px-5 py-4 transition-colors hover:bg-edito-chip/10"
              >
                {/* 1. Tech Name */}
                <span className="text-xs font-bold text-edito-navy pt-0.5">
                  {tech.name}
                </span>

                {/* 2. Description (flexible, multiline wrapping) */}
                <p className="text-xs leading-relaxed text-edito-body pr-4">
                  {tech.description ? (
                    tech.description
                  ) : (
                    <span className="text-edito-muted italic">Description non renseignée</span>
                  )}
                </p>

                {/* 3. Practices (right aligned with real PNG icons and border-only practice colors) */}
                <div className="flex flex-wrap justify-end gap-1.5 pt-0.5">
                  {tech.practices.map((pName) => {
                    const style = getPracticeStyle(pName)
                    return (
                      <span
                        key={pName}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold ${style.classes}`}
                      >
                        <img src={style.logoUrl} alt="" className="size-3.5 object-contain" />
                        <span>{pName}</span>
                      </span>
                    )
                  })}
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
      )}
    </div>
  )
}
