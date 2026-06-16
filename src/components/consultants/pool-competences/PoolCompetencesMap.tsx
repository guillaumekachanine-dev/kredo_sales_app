"use client"

import Image from "next/image"
import { linkHorizontal } from "d3-shape"
import { useMemo, useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { ConsultantDrawer } from "@/components/consultants/ConsultantDrawer"
import type {
  PracticeTerritory,
  PracticeTone,
  SkillCategory,
  SkillNode,
} from "@/lib/consultants/pool-competences-data"

type PoolCompetencesMapProps = {
  practices: PracticeTerritory[]
  skills: readonly SkillNode[]
  collaborators: PracticeCollaborator[]
}

type SkillGroup = {
  category: SkillCategory
  skills: SkillNode[]
}

type TreeBranch = {
  category: SkillCategory
  y: number
  path: string
}

type TreeLinkDatum = {
  source: [number, number]
  target: [number, number]
}

export type PracticeCollaborator = {
  id: string
  status: string
  current_title: string | null
  seniority: string | null
  practice: string | null
  person: {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  } | null
  missions: Array<{
    id: string
    title: string
    status: string
    company: { name: string } | null
  }>
}

const toneClasses: Record<
  PracticeTone,
  {
    fill: string
    border: string
    text: string
    soft: string
    line: string
    svgFill: string
    svgStroke: string
  }
> = {
  primary: {
    fill: "bg-primary text-primary-fg",
    border: "border-primary/30",
    text: "text-primary",
    soft: "bg-primary/10",
    line: "border-primary/30",
    svgFill: "fill-primary/10",
    svgStroke: "stroke-primary/35",
  },
  success: {
    fill: "bg-success text-primary-fg",
    border: "border-success/30",
    text: "text-success",
    soft: "bg-success/10",
    line: "border-success/30",
    svgFill: "fill-success/10",
    svgStroke: "stroke-success/35",
  },
  warning: {
    fill: "bg-secondary text-secondary-fg",
    border: "border-secondary/40",
    text: "text-secondary-fg",
    soft: "bg-secondary/20",
    line: "border-secondary/40",
    svgFill: "fill-secondary/15",
    svgStroke: "stroke-secondary/45",
  },
  danger: {
    fill: "bg-danger text-primary-fg",
    border: "border-danger/30",
    text: "text-danger",
    soft: "bg-danger/10",
    line: "border-danger/30",
    svgFill: "fill-danger/10",
    svgStroke: "stroke-danger/35",
  },
  accent: {
    fill: "bg-accent text-primary-fg",
    border: "border-accent/30",
    text: "text-accent",
    soft: "bg-accent/10",
    line: "border-accent/30",
    svgFill: "fill-accent/10",
    svgStroke: "stroke-accent/35",
  },
}

const practiceImages: Record<string, string> = {
  "data-ia":       "/images/practices/data-ia.jpg",
  "digital-cloud": "/images/practices/digital-cloud.jpg",
  "agile-pm":      "/images/practices/agile-pm.jpg",
  "cybersecurity": "/images/practices/cybersecurity.jpg",
  "qa-testing":    "/images/practices/qa-testing.jpg",
}

const practiceMatchers: Record<string, string[]> = {
  "data-ia": ["data", "ai", "ia", "intelligence", "artificial", "machine"],
  "digital-cloud": ["digital", "cloud", "engineering", "full-stack", "frontend", "backend"],
  "agile-pm": ["agile", "product", "owner", "pm", "design", "ux"],
  cybersecurity: ["cyber", "security", "secops", "securite", "sécurité"],
  "qa-testing": ["qa", "test", "testing", "quality", "qualite", "qualité"],
}

const categoryLabels: Record<SkillCategory, string> = {
  cloud: "Cloud",
  data: "Data",
  devops: "DevOps",
  fonctionnel: "Fonctionnel",
  framework: "Frameworks",
  langage: "Langages",
  methode: "Methodes",
  soft_skill: "Soft skills",
}

const categoryOrder: SkillCategory[] = [
  "data",
  "cloud",
  "framework",
  "langage",
  "devops",
  "fonctionnel",
  "methode",
  "soft_skill",
]

const categoryGlyphs: Record<SkillCategory, string> = {
  cloud: "CL",
  data: "DA",
  devops: "DO",
  fonctionnel: "FX",
  framework: "FW",
  langage: "LG",
  methode: "MT",
  soft_skill: "SS",
}

const branchPath = linkHorizontal<TreeLinkDatum, [number, number]>()
  .x((point) => point[0])
  .y((point) => point[1])
  .source((datum) => datum.source)
  .target((datum) => datum.target)

function groupPracticeSkills(practice: PracticeTerritory, skills: readonly SkillNode[]): SkillGroup[] {
  const byName = new Map(skills.map((skill) => [skill.name, skill]))
  const groups = new Map<SkillCategory, SkillNode[]>()

  for (const skillName of practice.skillNames) {
    const skill = byName.get(skillName)
    if (!skill) continue

    const current = groups.get(skill.category) ?? []
    current.push(skill)
    groups.set(skill.category, current)
  }

  return categoryOrder
    .map((category) => ({
      category,
      skills: groups.get(category) ?? [],
    }))
    .filter((group) => group.skills.length > 0)
}

function getTerritoryStyle(practice: PracticeTerritory): CSSProperties {
  return {
    left: `${practice.x}%`,
    top: `${practice.y}%`,
    width: `${practice.rx * 2}%`,
    minHeight: `${Math.max(86, practice.ry * 5.2)}px`,
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function getCollaboratorName(collaborator: PracticeCollaborator): string {
  const composed = `${collaborator.person?.first_name ?? ""} ${collaborator.person?.last_name ?? ""}`.trim()
  return collaborator.person?.full_name ?? (composed || "Consultant non renseigne")
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "KR"
}

function getActiveMission(collaborator: PracticeCollaborator) {
  return collaborator.missions.find((mission) => mission.status === "active") ?? null
}

function isAttachedToPractice(collaborator: PracticeCollaborator, practice: PracticeTerritory): boolean {
  const terms = practiceMatchers[practice.slug] ?? [practice.slug]
  const haystack = normalize(
    [
      collaborator.practice,
      collaborator.current_title,
      collaborator.seniority,
      getCollaboratorName(collaborator),
    ]
      .filter(Boolean)
      .join(" ")
  )

  return terms.some((term) => haystack.includes(normalize(term)))
}

function getTreeBranches(groups: SkillGroup[]): TreeBranch[] {
  const top = 58
  const bottom = 362
  const rootX = 66
  const rootY = 210
  const endX = 172
  const count = groups.length

  return groups.map((group, index) => {
    const y = count <= 1 ? rootY : top + (index * (bottom - top)) / (count - 1)

    return {
      category: group.category,
      y,
      path: branchPath({
        source: [rootX, rootY],
        target: [endX, y],
      }) ?? "",
    }
  })
}

function CompetenceTree({
  groups,
  practice,
  tone,
}: {
  groups: SkillGroup[]
  practice: PracticeTerritory
  tone: (typeof toneClasses)[PracticeTone]
}) {
  const [pinnedCategory, setPinnedCategory] = useState<SkillCategory | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<SkillCategory | null>(null)
  const activeCategory = hoveredCategory ?? pinnedCategory
  const branches = getTreeBranches(groups)
  const totalSkills = groups.reduce((sum, group) => sum + group.skills.length, 0)
  const activeGroup = activeCategory
    ? groups.find((group) => group.category === activeCategory) ?? null
    : null

  return (
    <section className="rounded-[var(--radius-medium)] border border-border bg-canvas/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", tone.text)}>
            Arbre des competences
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold tracking-tight text-heading">
            {totalSkills} competences reliees
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setPinnedCategory(null)}
          className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/35"
        >
          Tout voir
        </button>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-4">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 50%, var(--color-surface-hover) 0, transparent 34%), linear-gradient(to bottom, transparent 0, var(--color-canvas) 100%)",
          }}
          aria-hidden="true"
        />

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 520 420"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <circle
            cx="66"
            cy="210"
            r="25"
            className={cn("stroke-[1.1]", tone.svgFill, tone.svgStroke)}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 66 64 C 44 122, 44 288, 66 356"
            className={cn("fill-none stroke-[0.85]", tone.svgStroke)}
            opacity="0.25"
            vectorEffect="non-scaling-stroke"
          />
          {branches.map((branch) => {
            const focused = !activeCategory || activeCategory === branch.category

            return (
              <g key={branch.category} opacity={focused ? 1 : 0.18}>
                <path
                  d={branch.path}
                  className={cn("fill-none stroke-[1.25] transition-opacity duration-200", tone.svgStroke)}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx="172"
                  cy={branch.y}
                  r="3.5"
                  className={cn(tone.svgFill, tone.svgStroke)}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
        </svg>

        <div className="relative grid grid-cols-[96px_minmax(0,1fr)] gap-4">
          <div className="flex min-h-[360px] items-center justify-center">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-full border text-xs font-black tracking-[0.16em]", tone.border, tone.soft, tone.text)}>
              {practice.slug.slice(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="space-y-3">
            {groups.map((group) => {
              const focused = !activeCategory || activeCategory === group.category
              const pinned = pinnedCategory === group.category

              return (
                <button
                  key={group.category}
                  type="button"
                  aria-pressed={pinned}
                  onClick={() =>
                    setPinnedCategory((current) =>
                      current === group.category ? null : group.category
                    )
                  }
                  onMouseEnter={() => setHoveredCategory(group.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onFocus={() => setHoveredCategory(group.category)}
                  onBlur={() => setHoveredCategory(null)}
                  className={cn(
                    "w-full rounded-[var(--radius-medium)] border px-3 py-3 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary/35",
                    focused
                      ? cn("border-primary/25 bg-surface", pinned && tone.border)
                      : "border-border bg-surface/60 opacity-45"
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black", focused ? tone.fill : "bg-canvas text-muted")}>
                        {categoryGlyphs[group.category]}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold uppercase tracking-[0.14em] text-heading">
                          {categoryLabels[group.category]}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium text-muted">
                          {group.skills.length} feuille{group.skills.length > 1 ? "s" : ""}
                        </span>
                      </span>
                    </span>
                    <span className={cn("h-1.5 w-14 overflow-hidden rounded-full bg-border", focused && tone.soft)}>
                      <span
                        className={cn("block h-full rounded-full", tone.fill)}
                        style={{ width: `${Math.min(100, 18 + group.skills.length * 9)}%` }}
                      />
                    </span>
                  </span>

                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {group.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors",
                          focused
                            ? "border-border bg-canvas text-body"
                            : "border-transparent bg-canvas/50 text-muted"
                        )}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <p className="truncate text-muted">
          {activeGroup
            ? `${categoryLabels[activeGroup.category]}: ${activeGroup.skills.map((skill) => skill.name).join(", ")}`
            : "Survolez une categorie pour isoler une branche, cliquez pour la verrouiller."}
        </p>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", tone.fill)}>
          {activeGroup ? activeGroup.skills.length : totalSkills}
        </span>
      </div>
    </section>
  )
}

export function PoolCompetencesMap({ practices, skills, collaborators }: PoolCompetencesMapProps) {
  const [selectedSlug, setSelectedSlug] = useState(practices[0]?.slug ?? "")
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  function openDrawer(id: string) {
    setSelectedId(id)
    setDrawerOpen(true)
  }
  const selectedPractice =
    practices.find((practice) => practice.slug === selectedSlug) ?? practices[0]
  const selectedTone = toneClasses[selectedPractice.tone]
  const skillGroups = useMemo(
    () => groupPracticeSkills(selectedPractice, skills),
    [selectedPractice, skills]
  )
  const territoryStyles = useMemo(
    () =>
      new Map(
        practices.map((practice) => [
          practice.slug,
          getTerritoryStyle(practice),
        ])
      ),
    [practices]
  )
  const totalSkills = skillGroups.reduce((sum, group) => sum + group.skills.length, 0)
  const attachedCollaborators = useMemo(
    () =>
      collaborators
        .filter((collaborator) => isAttachedToPractice(collaborator, selectedPractice))
        .sort((a, b) => getCollaboratorName(a).localeCompare(getCollaboratorName(b))),
    [collaborators, selectedPractice]
  )
  const activeCategories = skillGroups.length
  const activeCoverage = skills.length > 0
    ? Math.round((totalSkills / skills.length) * 100)
    : 0
  const kpis = [
    {
      label: "Practices",
      value: practices.length,
      detail: "territoires actifs",
      progress: 100,
    },
    {
      label: "Referentiel",
      value: skills.length,
      detail: "competences suivies",
      progress: 100,
    },
    {
      label: "Practice active",
      value: totalSkills,
      detail: `${activeCategories} familles, ${activeCoverage}% du pool`,
      progress: activeCoverage,
    },
    {
      label: "Rattachement",
      value: attachedCollaborators.length,
      detail: "consultants identifies",
      progress: collaborators.length > 0
        ? Math.round((attachedCollaborators.length / collaborators.length) * 100)
        : 0,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-6">
      <header className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[minmax(220px,0.42fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Pool de competences
          </h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, index) => (
            <Metric
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              detail={kpi.detail}
              progress={kpi.progress}
              featured={index === 2}
              tone={selectedTone}
            />
          ))}
        </div>
      </header>

      <main className="grid min-h-[690px] grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)] gap-5">
        <section className="relative overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "54px 54px",
            }}
            aria-hidden="true"
          />

          <div
            className="absolute inset-8 rounded-[var(--radius-medium)] border border-border/50 bg-canvas/25"
            aria-hidden="true"
          />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {practices.map((practice) => {
              const tone = toneClasses[practice.tone]
              const active = practice.slug === selectedPractice.slug

              return (
                <g key={practice.id}>
                  <path
                    d={`M 50 50 C ${(practice.x + 50) / 2} ${(practice.y + 50) / 2} ${practice.x + 8} ${practice.y - 8} ${practice.x} ${practice.y}`}
                    className={cn(
                      "fill-none stroke-[0.42] transition-opacity duration-300",
                      tone.svgStroke,
                      active ? "opacity-90" : "opacity-20"
                    )}
                    vectorEffect="non-scaling-stroke"
                  />
                  <ellipse
                    cx={practice.x}
                    cy={practice.y}
                    rx={practice.rx}
                    ry={practice.ry}
                    className={cn(
                      "transition-opacity duration-300",
                      tone.svgFill,
                      active ? "opacity-85" : "opacity-35"
                    )}
                  />
                </g>
              )
            })}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-heading/10 bg-heading">
            <Image
              src="/logo_app.png"
              alt="Kredo"
              width={38}
              height={38}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>

          {practices.map((practice) => {
            const tone = toneClasses[practice.tone]
            const active = practice.slug === selectedPractice.slug

            return (
              <button
                key={practice.id}
                type="button"
                onClick={() => setSelectedSlug(practice.slug)}
                aria-pressed={active}
                className={cn(
                  "absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-start justify-center overflow-hidden rounded-[28px] border px-4 py-3 text-left transition duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40",
                  active
                    ? cn("bg-surface text-heading ring-1", tone.border)
                    : "border-border bg-surface/90 text-heading hover:bg-surface-hover"
                )}
                style={territoryStyles.get(practice.slug)}
              >
                {practiceImages[practice.slug] && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[28px] bg-cover bg-center transition-opacity duration-300"
                    style={{
                      backgroundImage: `url(${practiceImages[practice.slug]})`,
                      opacity: active ? 0.14 : 0.09,
                    }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative flex w-full items-start gap-2">
                  <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", tone.fill)} />
                  <span className="min-w-0">
                    <span className="block max-h-10 overflow-hidden text-sm font-bold leading-tight">
                      {practice.name}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em]",
                        active ? tone.text : "text-muted"
                      )}
                    >
                      {practice.skillNames.length} competences
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </section>

        <aside className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
          <div className={cn("relative overflow-hidden border-b border-border px-5 py-4", selectedTone.soft)}>
            {practiceImages[selectedPractice.slug] && (
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center transition-all duration-500"
                style={{
                  backgroundImage: `url(${practiceImages[selectedPractice.slug]})`,
                  opacity: 0.12,
                }}
                aria-hidden="true"
              />
            )}
            <div className="relative">
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", selectedTone.text)}>
                Practice active
              </p>
              <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
                {selectedPractice.name}
              </h2>
              <p className="mt-2 text-sm leading-5 text-body">
                {selectedPractice.perimeter}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPractice.stackTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-body"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto px-5 py-5">
            <CompetenceTree
              groups={skillGroups}
              practice={selectedPractice}
              tone={selectedTone}
            />

            <section className="mt-6 border-t border-border pt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-heading">
                    Collaborateurs
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {attachedCollaborators.length} rattaches a cette practice
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", selectedTone.fill)}>
                  {attachedCollaborators.length}
                </span>
              </div>

              {attachedCollaborators.length === 0 ? (
                <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
                  Aucun collaborateur rattache dans les donnees actuelles.
                </div>
              ) : (
                <div className="space-y-2">
                  {attachedCollaborators.map((collaborator) => {
                    const name = getCollaboratorName(collaborator)
                    const mission = getActiveMission(collaborator)

                    return (
                      <button
                        key={collaborator.id}
                        type="button"
                        onClick={() => openDrawer(collaborator.id)}
                        className="kredo-hover-reference flex w-full items-center gap-3 rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-primary/35"
                      >
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", selectedTone.fill)}>
                          {getInitials(name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-heading">
                            {name}
                          </span>
                          <span className="block truncate text-[11px] text-body">
                            {collaborator.current_title || collaborator.seniority || collaborator.practice || "Profil non renseigne"}
                          </span>
                        </span>
                        <span className="min-w-24 shrink-0 text-right">
                          <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                            {mission ? "En mission" : "Disponible"}
                          </span>
                          <span className="block truncate text-[11px] text-body">
                            {mission?.company?.name ?? collaborator.practice ?? "-"}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </aside>
      </main>

      <ConsultantDrawer
        collaboratorId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  progress,
  featured,
  tone,
}: {
  label: string
  value: number
  detail: string
  progress: number
  featured?: boolean
  tone: (typeof toneClasses)[PracticeTone]
}) {
  return (
    <div
      className={cn(
        "kredo-hover-reference group relative min-h-28 overflow-hidden rounded-[var(--radius-medium)] border bg-surface px-4 py-3.5",
        featured ? cn("border-primary/35", tone.soft) : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
        <span
          className={cn(
            "mt-0.5 h-2 w-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125",
            featured ? tone.fill : "bg-border"
          )}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 font-heading text-3xl font-bold leading-none tracking-tight text-heading">
        {value}
      </p>
      <p className="mt-2 min-h-8 text-xs leading-4 text-body">
        {detail}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70">
        <div
          className={cn("h-full rounded-full transition-all duration-500", featured ? tone.fill : "bg-heading/55")}
          style={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  )
}
