"use client"

import Image from "next/image"
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefCallback,
} from "react"
import { ConsultantDrawer } from "@/components/consultants/ConsultantDrawer"
import type {
  PracticeTerritory,
  SkillCategory,
  SkillNode,
} from "@/lib/consultants/pool-competences-data"
import { cn } from "@/lib/utils"
import { PoolCompetencesConnections } from "./PoolCompetencesConnections"
import { PoolCompetencesPracticeRow } from "./PoolCompetencesPracticeRow"
import { PoolCompetencesSkillCardsRow } from "./PoolCompetencesSkillCardsRow"
import { SkillDescriptionTooltip } from "./SkillDescriptionTooltip"
import {
  buildPracticeConnections,
  getActiveMission,
  getCollaboratorName,
  getInitials,
  groupPracticeSkills,
  isAttachedToPractice,
  practiceImages,
  toneClasses,
} from "./pool-competences-shared"
import type {
  PracticeCollaborator,
  SceneConnection,
  SceneSource,
  SkillTooltipState,
} from "./types"

type PoolCompetencesMapProps = {
  practices: PracticeTerritory[]
  skills: readonly SkillNode[]
  collaborators: PracticeCollaborator[]
}

type SceneLayout = {
  connections: SceneConnection[]
  height: number
  source: SceneSource | null
  width: number
}

export function PoolCompetencesMap({
  practices,
  skills,
  collaborators,
}: PoolCompetencesMapProps) {
  const [selectedSlug, setSelectedSlug] = useState(practices[0]?.slug ?? "")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<SkillCategory | null>(null)
  const [pinnedCategory, setPinnedCategory] = useState<SkillCategory | null>(null)
  const [tooltipState, setTooltipState] = useState<SkillTooltipState>(null)
  const [sceneLayout, setSceneLayout] = useState<SceneLayout>({
    connections: [],
    height: 0,
    source: null,
    width: 0,
  })
  const [reducedMotion, setReducedMotion] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const practiceRefs = useRef(new Map<string, HTMLButtonElement>())
  const skillCardRefs = useRef(new Map<SkillCategory, HTMLDivElement>())

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
  const activeCategory = hoveredCategory ?? pinnedCategory
  const totalSkills = skillGroups.reduce((sum, group) => sum + group.skills.length, 0)
  const activeCategories = skillGroups.length
  const activeCoverage = skills.length > 0 ? Math.round((totalSkills / skills.length) * 100) : 0

  const attachedCollaborators = useMemo(
    () =>
      collaborators
        .filter((collaborator) => isAttachedToPractice(collaborator, selectedPractice))
        .sort((a, b) => getCollaboratorName(a).localeCompare(getCollaboratorName(b))),
    [collaborators, selectedPractice]
  )

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
      progress:
        collaborators.length > 0
          ? Math.round((attachedCollaborators.length / collaborators.length) * 100)
          : 0,
    },
  ]

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      const stageRect = stage.getBoundingClientRect()
      const sourceElement = practiceRefs.current.get(selectedPractice.slug)
      if (!sourceElement) return

      const sourceRect = sourceElement.getBoundingClientRect()
      const source = {
        x: sourceRect.left - stageRect.left + sourceRect.width / 2,
        y: sourceRect.bottom - stageRect.top + 18,
      }

      const targets = skillGroups
        .map((group) => {
          const element = skillCardRefs.current.get(group.category)
          if (!element) return null

          const rect = element.getBoundingClientRect()

          return {
            key: group.category,
            category: group.category,
            x: rect.left - stageRect.left + rect.width / 2,
            y: rect.top - stageRect.top + 8,
          }
        })
        .filter((target): target is NonNullable<typeof target> => target !== null)

      setSceneLayout({
        connections: buildPracticeConnections(source, targets),
        height: Math.max(1, Math.round(stageRect.height)),
        source,
        width: Math.max(1, Math.round(stageRect.width)),
      })
    }

    const observer = new ResizeObserver(() => {
      measure()
    })

    observer.observe(stage)

    const sourceElement = practiceRefs.current.get(selectedPractice.slug)
    if (sourceElement) observer.observe(sourceElement)

    for (const element of skillCardRefs.current.values()) {
      observer.observe(element)
    }

    const frame = window.requestAnimationFrame(measure)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [selectedPractice.slug, skillGroups])

  const bindPracticeRef = (slug: string): RefCallback<HTMLButtonElement> => {
    return (node) => {
      if (node) {
        practiceRefs.current.set(slug, node)
      } else {
        practiceRefs.current.delete(slug)
      }
    }
  }

  const bindSkillCardRef = (category: SkillCategory): RefCallback<HTMLDivElement> => {
    return (node) => {
      if (node) {
        skillCardRefs.current.set(category, node)
      } else {
        skillCardRefs.current.delete(category)
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-6 py-6">
      <header className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[minmax(220px,0.4fr)_minmax(0,1fr)] lg:items-end">
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
              tone={selectedPractice.tone}
            />
          ))}
        </div>
      </header>

      <main className="flex flex-col gap-5">
        <section className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
          <div className="relative px-6 py-6">
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
              className="absolute inset-x-6 top-6 h-64 rounded-[28px] border border-border/50 bg-canvas/28"
              aria-hidden="true"
            />

            <div className="relative z-20 mb-5 flex items-end justify-between gap-6">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", selectedTone.text)}>
                  Practices
                </p>
                <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
                  Selection verticale continue
                </h2>
              </div>
              <div className="text-right text-xs text-muted">
                <p>Une practice active, connexions D3 derivees du conteneur reel, cartes de competences plein axe.</p>
              </div>
            </div>

            <div ref={stageRef} className="relative min-h-[620px]">
              <PoolCompetencesPracticeRow
                bindPracticeRef={bindPracticeRef}
                onSelectPractice={(slug) => {
                  if (slug === selectedPractice.slug) return
                  setHoveredCategory(null)
                  setPinnedCategory(null)
                  setTooltipState(null)
                  startTransition(() => setSelectedSlug(slug))
                }}
                practices={practices}
                selectedSlug={selectedPractice.slug}
              />

              <div className="pointer-events-none absolute left-1/2 top-[236px] z-10 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-heading/10 bg-heading">
                <Image
                  src="/logo_app.png"
                  alt="Kredo"
                  width={38}
                  height={38}
                  className="h-9 w-9 object-contain"
                  priority
                />
              </div>

              <PoolCompetencesConnections
                activeCategory={activeCategory}
                connections={sceneLayout.connections}
                height={sceneLayout.height}
                practiceKey={selectedPractice.slug}
                reducedMotion={reducedMotion}
                source={sceneLayout.source}
                tone={selectedPractice.tone}
                width={sceneLayout.width}
              />

              <div className="relative z-10 mt-32">
                <div className="mb-4 flex items-end justify-between gap-6">
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", selectedTone.text)}>
                      Competences
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
                      {selectedPractice.name}
                    </h3>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>
                      {activeCategory
                        ? "Branche isolee sur la famille survolee ou epinglee."
                        : "Survolez une carte pour isoler sa branche, cliquez pour la figer."}
                    </p>
                  </div>
                </div>

                <PoolCompetencesSkillCardsRow
                  activeCategory={activeCategory}
                  bindSkillCardRef={bindSkillCardRef}
                  groups={skillGroups}
                  onCategoryFocus={setHoveredCategory}
                  onTogglePinnedCategory={(category) =>
                    setPinnedCategory((current) => (current === category ? null : category))
                  }
                  onTooltipChange={setTooltipState}
                  pinnedCategory={pinnedCategory}
                  reducedMotion={reducedMotion}
                  selectedTone={selectedPractice.tone}
                  tooltipState={tooltipState}
                />

                <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                  <p className="truncate text-muted">
                    {activeCategory
                      ? `${skillGroups
                          .find((group) => group.category === activeCategory)
                          ?.skills.map((skill) => skill.name)
                          .join(", ")}`
                      : "Les pastilles ayant une description sont inspectables au survol et au focus clavier."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedCategory(null)
                      setHoveredCategory(null)
                    }}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted focus:outline-none focus:ring-2 focus:ring-primary/35"
                  >
                    Reinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
          <div className={cn("relative overflow-hidden border-b border-border px-6 py-5", selectedTone.soft)}>
            {practiceImages[selectedPractice.slug] && (
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center"
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
              <p className="mt-2 max-w-[980px] text-sm leading-6 text-body">
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

          <div className="px-6 py-5">
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
                          {collaborator.current_title ||
                            collaborator.seniority ||
                            collaborator.practice ||
                            "Profil non renseigne"}
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
          </div>
        </section>
      </main>

      <SkillDescriptionTooltip state={tooltipState} />

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
  tone: PracticeTerritory["tone"]
}) {
  const toneStyle = toneClasses[tone]

  return (
    <div
      className={cn(
        "kredo-hover-reference group relative min-h-28 overflow-hidden rounded-[var(--radius-medium)] border bg-surface px-4 py-3.5",
        featured ? cn("border-primary/35", toneStyle.soft) : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
        <span
          className={cn(
            "mt-0.5 h-2 w-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125",
            featured ? toneStyle.fill : "bg-border"
          )}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 font-heading text-3xl font-bold leading-none tracking-tight text-heading">
        {value}
      </p>
      <p className="mt-2 min-h-8 text-xs leading-4 text-body">{detail}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            featured ? toneStyle.fill : "bg-heading/55"
          )}
          style={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  )
}
