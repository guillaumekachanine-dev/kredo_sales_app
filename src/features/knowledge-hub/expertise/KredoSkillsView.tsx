"use client"

import { useState } from "react"
import Link from "next/link"
import { SkillItem } from "./kredo-expertise.types"

interface SkillsViewProps {
  skills: SkillItem[]
}

const CATEGORY_METADATA: Record<string, { label: string; icon: string }> = {
  framework: { label: "Frameworks & Librairies", icon: "📦" },
  devops: { label: "DevOps, CI/CD & Dev", icon: "🔄" },
  fonctionnel: { label: "Conception & Métier", icon: "📐" },
  data: { label: "Data Intelligence & IA", icon: "📊" },
  langage: { label: "Langages de programmation", icon: "💻" },
  cloud: { label: "Cloud & Systèmes", icon: "☁️" },
  certification: { label: "Certifications", icon: "🛡️" },
  methode: { label: "Méthodologies & Agilité", icon: "⏱️" },
  soft_skill: { label: "Soft Skills", icon: "💡" },
  secteur: { label: "Secteurs d&apos;activité", icon: "🏢" },
  autre: { label: "Autres compétences", icon: "🔌" },
}

export function KredoSkillsView({
  skills,
}: SkillsViewProps) {
  const [search, setSearch] = useState("")

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
    <div className="space-y-6 animate-fade-in">
      {/* Link to Pool of Skills */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-edito-surface p-5 rounded-xl border border-edito-border shadow-xs">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5" role="img" aria-hidden="true">🌐</span>
          <div>
            <h3 className="text-xs font-bold text-edito-navy">Référentiel des Compétences</h3>
            <p className="text-[10px] text-edito-muted mt-0.5 leading-relaxed">
              Consultez la cartographie des compétences et leur répartition opérationnelle au sein du cabinet.
            </p>
          </div>
        </div>
        <Link
          href="/consultants/pool-competences"
          className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-edito-navy px-4 py-2 text-xs font-bold text-white hover:bg-edito-navy/95 transition-colors outline-none whitespace-nowrap shadow-xs"
        >
          👥 Voir dans le Pool de compétences
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
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
          className="h-9 w-full rounded-md border border-edito-border bg-edito-surface pl-9 pr-3 text-xs text-edito-body placeholder:text-edito-muted outline-none focus:border-edito-brass"
        />
      </div>

      {/* Categories of Skills */}
      <div className="grid grid-cols-1 gap-6">
        {orderedCategories.map((category) => {
          const catSkills = skillsByCategory.get(category) ?? []
          const meta = CATEGORY_METADATA[category] || { label: category.toUpperCase(), icon: "⚙️" }

          return (
            <div
              key={category}
              className="bg-edito-surface rounded-xl border border-edito-border p-5 space-y-3.5 shadow-xs"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy border-b border-edito-border/50 pb-2.5 flex items-center gap-2">
                <span className="text-sm" role="img" aria-hidden="true">{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="ml-1 rounded-full bg-edito-chip px-2 py-0.5 text-[8px] font-bold text-edito-muted border border-edito-border/40">
                  {catSkills.length}
                </span>
              </h3>
              <div className="divide-y divide-edito-border/15">
                {catSkills.map((skill) => renderSkillRow(skill))}
              </div>
            </div>
          )
        })}

        {filteredSkills.length === 0 && (
          <div className="bg-edito-surface py-12 text-center text-xs text-edito-muted rounded-xl border border-edito-border shadow-xs flex flex-col items-center justify-center gap-2">
            <span className="text-lg">📭</span>
            <span>Aucune compétence ne correspond à votre recherche.</span>
          </div>
        )}
      </div>
    </div>
  )
}
