"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { SkillItem } from "./kredo-expertise.types"

interface SkillsViewProps {
  skills: SkillItem[]
}

const CATEGORY_METADATA: Record<string, { label: string; icon: string }> = {
  framework: { label: "Frameworks & Librairies", icon: "📦" },
  devops: { label: "DevOps & CI/CD", icon: "🔄" },
  fonctionnel: { label: "Conception & Métier", icon: "📐" },
  data: { label: "Data & IA", icon: "📊" },
  langage: { label: "Langages & Code", icon: "💻" },
  cloud: { label: "Cloud & Infra", icon: "☁️" },
  certification: { label: "Certifications", icon: "🛡️" },
  methode: { label: "Méthodologies", icon: "⏱️" },
  soft_skill: { label: "Soft Skills", icon: "💡" },
  secteur: { label: "Secteurs", icon: "🏢" },
  autre: { label: "Autres", icon: "🔌" },
}

export function KredoSkillsView({
  skills,
}: SkillsViewProps) {
  const [search, setSearch] = useState("")
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  // Refs for auto-scroll tracking
  const viewWrapperRef = useRef<HTMLDivElement | null>(null)
  const expandedContainerRef = useRef<HTMLDivElement | null>(null)
  const prevExpandedId = useRef<string | null>(null)

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      (skill.description && skill.description.toLowerCase().includes(search.toLowerCase()))
  )

  const skillsByCategory = new Map<string, SkillItem[]>()
  for (const skill of filteredSkills) {
    const category = skill.category.toLowerCase()
    if (!skillsByCategory.has(category)) {
      skillsByCategory.set(category, [])
    }
    skillsByCategory.get(category)!.push(skill)
  }

  const orderedCategories = Object.keys(CATEGORY_METADATA).filter((cat) =>
    skillsByCategory.has(cat)
  )

  for (const cat of skillsByCategory.keys()) {
    if (!CATEGORY_METADATA[cat] && !orderedCategories.includes(cat)) {
      orderedCategories.push(cat)
    }
  }

  // Smooth viewport scrolling traveling
  useEffect(() => {
    if (expandedCategoryId) {
      prevExpandedId.current = expandedCategoryId
      setTimeout(() => {
        const container = expandedContainerRef.current
        if (container) {
          // Align container perfectly below the sticky header controls
          const elementPosition = container.getBoundingClientRect().top + window.scrollY
          const offsetPosition = elementPosition - 170
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          })
        }
      }, 180)
    } else if (prevExpandedId.current) {
      setTimeout(() => {
        const wrapper = viewWrapperRef.current
        if (wrapper) {
          wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }, 100)
      prevExpandedId.current = null
    }
  }, [expandedCategoryId])

  const renderSkillRow = (skill: SkillItem) => {
    return (
      <div
        key={skill.id}
        className="flex items-center justify-between border-b border-edito-border/30 py-3 last:border-b-0 gap-4 hover:bg-edito-chip/20 px-2 rounded-md transition-colors"
      >
        <div className="min-w-0 flex items-start gap-2.5">
          <span className="text-edito-brass shrink-0 mt-0.5 text-[10px]">🔸</span>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-edito-navy block">
              {skill.name}
            </span>
            {skill.description && (
              <p className="text-[10px] text-edito-muted leading-relaxed mt-0.5 line-clamp-1">
                {skill.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center rounded-md border border-edito-brass/20 bg-edito-brass/5 px-2 py-0.5 text-[9px] font-bold text-edito-brass">
            👥 {skill.profileCount} {skill.profileCount > 1 ? "profils" : "profil"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div ref={viewWrapperRef} className="scroll-mt-24 space-y-6 animate-fade-in">
      {/* Search Input and Pool Button on the same row, Sticky at top */}
      <div className="sticky top-[101px] md:top-0 z-30 bg-edito-canvas/90 backdrop-blur-md py-2 w-full">
        <div className="flex items-center gap-3 w-full min-w-0 bg-edito-surface p-3 rounded-xl border border-edito-border shadow-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-edito-muted">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une compétence..."
              className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas pl-9 pr-3 text-xs text-edito-body placeholder:text-edito-muted outline-none focus:border-edito-brass min-w-0"
            />
          </div>

          {/* Pool Button */}
          <Link
            href="/consultants/pool-competences"
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-edito-navy px-4 py-2 text-xs font-bold text-white hover:bg-edito-navy/95 transition-colors outline-none whitespace-nowrap shadow-xs shrink-0"
          >
            👥 Pool de compétences
          </Link>
        </div>
      </div>

      {/* Grid of Category cards: 8 per line on Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {orderedCategories.map((category) => {
          const catSkills = skillsByCategory.get(category) ?? []
          const meta = CATEGORY_METADATA[category] || { label: category.toUpperCase(), icon: "⚙️" }
          const isExpanded = expandedCategoryId === category

          return (
            <button
              key={category}
              type="button"
              onClick={() => setExpandedCategoryId(isExpanded ? null : category)}
              className={`kredo-cockpit-hover-motion aspect-square flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer outline-none ${
                isExpanded
                  ? "border-edito-brass border-2 bg-white ring-1 ring-edito-brass/10 shadow-sm"
                  : "border-edito-border bg-edito-surface hover:border-edito-muted"
              }`}
            >
              <span className="text-lg" role="img" aria-hidden="true">{meta.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-1.5 line-clamp-2 w-full text-edito-navy">
                {meta.label}
              </span>
              <span className="text-[7px] font-bold text-edito-muted uppercase tracking-wide mt-0.5 block">
                {catSkills.length} {catSkills.length > 1 ? "compétences" : "compétence"}
              </span>
            </button>
          )
        })}
      </div>

      {/* Expanded Category skills list */}
      {expandedCategoryId && (() => {
        const catSkills = skillsByCategory.get(expandedCategoryId) ?? []
        const meta = CATEGORY_METADATA[expandedCategoryId] || { label: expandedCategoryId.toUpperCase(), icon: "⚙️" }

        return (
          <div
            ref={expandedContainerRef}
            className="scroll-mt-36 bg-edito-surface rounded-xl border border-edito-brass/30 ring-1 ring-edito-brass/10 p-5 shadow-sm animate-fade-in"
          >
            <div className="space-y-4">
              {/* Clickable Header Trigger to collapse the section easily */}
              <button
                type="button"
                onClick={() => setExpandedCategoryId(null)}
                className="w-full text-left flex items-center justify-between border-b border-edito-border/50 pb-3 hover:opacity-85 transition-opacity cursor-pointer group outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{meta.icon}</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5">
                    <span>COMPÉTENCES :</span>
                    <span className="text-edito-brass">{meta.label}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-edito-muted group-hover:text-edito-brass transition-colors shrink-0">
                  <span>Fermer la section</span>
                  <span className="text-[10px]">✕</span>
                </div>
              </button>

              <div className="divide-y divide-edito-border/15 mt-2">
                {catSkills.map((skill) => renderSkillRow(skill))}
              </div>
            </div>
          </div>
        )
      })()}

      {filteredSkills.length === 0 && (
        <div className="bg-edito-surface py-12 text-center text-xs text-edito-muted rounded-xl border border-edito-border shadow-xs flex flex-col items-center justify-center gap-2">
          <span className="text-lg">📭</span>
          <span>Aucune compétence ne correspond à votre recherche.</span>
        </div>
      )}
    </div>
  )
}
