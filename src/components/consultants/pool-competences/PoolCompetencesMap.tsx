"use client"

import Image from "next/image"
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefCallback,
} from "react"
import { ConsultantDrawer } from "@/components/consultants/ConsultantDrawer"
import { useDrawerState } from "@/hooks/use-drawer-state"
import type {
  PoolCompetencesDataset,
  PracticeTerritory,
  PracticeTone,
  SkillCategory,
} from "@/lib/consultants/pool-competences-data"
import { cn } from "@/lib/utils"
import { PoolCompetencesConnections } from "./PoolCompetencesConnections"
import { PoolCompetencesPracticeRow } from "./PoolCompetencesPracticeRow"
import { PoolCompetencesSkillCardsRow } from "./PoolCompetencesSkillCardsRow"
import { SkillDescriptionTooltip } from "./SkillDescriptionTooltip"
import {
  buildPracticeConnections,
  categoryLabels,
  getActiveMission,
  getCollaboratorName,
  getInitials,
  groupPracticeSkills,
  isAttachedToPractice,
  practiceImages,
  toneClasses,
  type SkillGroup,
} from "./pool-competences-shared"
import type {
  PracticeCollaborator,
  SceneConnection,
  SceneSource,
  SkillTooltipState,
} from "./types"

type PoolCompetencesMapProps = {
  dataset: PoolCompetencesDataset
  collaborators: PracticeCollaborator[]
}

type PracticeCategoryKey = "offers" | "skills" | "profiles" | "talent" | "market"

type PracticeCategoryNode = {
  key: PracticeCategoryKey
  label: string
  iconSrc: string
}

type SceneLayout = {
  connections: SceneConnection[]
  height: number
  source: SceneSource | null
  width: number
}

type MetricItem = {
  label: string
  value: number | string
  detail: string
  progress: number
}

type PoolSkill = PoolCompetencesDataset["skills"][number]

type MarketSignalNode = PoolSkill & {
  delay: number
  pressure: number
  radius: number
  score: number
  x: number
  y: number
}

type MarketSignalSummary = {
  averageLevel: number | null
  maxPressure: number
  nodes: MarketSignalNode[]
  totalDemand: number
  totalSupply: number
}

type MarketSignalPalette = {
  accent: string
  border: string
  fill: string
  ink: string
  soft: string
}

const practiceCategoryNodes: PracticeCategoryNode[] = [
  {
    key: "offers",
    label: "Offres",
    iconSrc: "/icons_set/equipe/equipe_offres.png",
  },
  {
    key: "skills",
    label: "Compétences",
    iconSrc: "/icons_set/equipe/equipe_competences.png",
  },
  {
    key: "profiles",
    label: "Métiers",
    iconSrc: "/icons_set/equipe/equipe_metiers.png",
  },
  {
    key: "talent",
    label: "Vivier",
    iconSrc: "/icons_set/equipe/equipe_vivier_consultants.png",
  },
  {
    key: "market",
    label: "Marché",
    iconSrc: "/icons_set/equipe/equipe_marche.png",
  },
]

const marketSignalPositions = [
  [74, 116],
  [156, 62],
  [238, 136],
  [318, 82],
  [414, 126],
  [492, 58],
  [118, 174],
  [212, 42],
  [376, 176],
  [472, 170],
  [292, 170],
  [548, 116],
] as const

const marketSignalPalettes: Partial<Record<SkillCategory, MarketSignalPalette>> = {
  certification: {
    accent: "#BE3E3E",
    border: "rgba(190, 62, 62, 0.34)",
    fill: "rgba(190, 62, 62, 0.16)",
    ink: "#7C2626",
    soft: "rgba(190, 62, 62, 0.08)",
  },
  cloud: {
    accent: "#3F798B",
    border: "rgba(63, 121, 139, 0.34)",
    fill: "rgba(63, 121, 139, 0.16)",
    ink: "#275565",
    soft: "rgba(63, 121, 139, 0.08)",
  },
  data: {
    accent: "#2554B8",
    border: "rgba(37, 84, 184, 0.34)",
    fill: "rgba(37, 84, 184, 0.16)",
    ink: "#173D89",
    soft: "rgba(37, 84, 184, 0.08)",
  },
  devops: {
    accent: "#2C7D5C",
    border: "rgba(44, 125, 92, 0.34)",
    fill: "rgba(44, 125, 92, 0.16)",
    ink: "#1E5D43",
    soft: "rgba(44, 125, 92, 0.08)",
  },
  fonctionnel: {
    accent: "#4E788C",
    border: "rgba(78, 120, 140, 0.32)",
    fill: "rgba(78, 120, 140, 0.15)",
    ink: "#36596B",
    soft: "rgba(78, 120, 140, 0.08)",
  },
  framework: {
    accent: "#6B5CF6",
    border: "rgba(107, 92, 246, 0.32)",
    fill: "rgba(107, 92, 246, 0.14)",
    ink: "#4638B8",
    soft: "rgba(107, 92, 246, 0.07)",
  },
  langage: {
    accent: "#D97020",
    border: "rgba(217, 112, 32, 0.34)",
    fill: "rgba(217, 112, 32, 0.16)",
    ink: "#9A4C13",
    soft: "rgba(217, 112, 32, 0.08)",
  },
  methode: {
    accent: "#FFB812",
    border: "rgba(180, 126, 0, 0.34)",
    fill: "rgba(255, 184, 18, 0.2)",
    ink: "#7A5600",
    soft: "rgba(255, 184, 18, 0.1)",
  },
  secteur: {
    accent: "#6B7D2F",
    border: "rgba(107, 125, 47, 0.32)",
    fill: "rgba(107, 125, 47, 0.15)",
    ink: "#4F5D21",
    soft: "rgba(107, 125, 47, 0.08)",
  },
  soft_skill: {
    accent: "#9E5E73",
    border: "rgba(158, 94, 115, 0.32)",
    fill: "rgba(158, 94, 115, 0.15)",
    ink: "#734153",
    soft: "rgba(158, 94, 115, 0.08)",
  },
}

const neutralMarketSignalPalette: MarketSignalPalette = {
  accent: "#667085",
  border: "rgba(102, 112, 133, 0.3)",
  fill: "rgba(102, 112, 133, 0.14)",
  ink: "#475467",
  soft: "rgba(102, 112, 133, 0.08)",
}

export function PoolCompetencesMap({
  dataset,
  collaborators,
}: PoolCompetencesMapProps) {
  const { practices, skills, lastUpdatedAt } = dataset
  const [selectedSlug, setSelectedSlug] = useState(practices[0]?.slug ?? "")
  const [activeCategory, setActiveCategory] = useState<PracticeCategoryKey | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<PracticeCategoryKey | null>(null)
  const [hoveredSkillCategory, setHoveredSkillCategory] = useState<SkillCategory | null>(null)
  const [pinnedSkillCategory, setPinnedSkillCategory] = useState<SkillCategory | null>(null)
  const [tooltipState, setTooltipState] = useState<SkillTooltipState>(null)
  const [sceneLayout, setSceneLayout] = useState<SceneLayout>({
    connections: [],
    height: 0,
    source: null,
    width: 0,
  })
  const [reducedMotion, setReducedMotion] = useState(false)
  const { open: drawerOpen, selectedId, openDrawer, setOpen: setDrawerOpen } = useDrawerState()

  const stageRef = useRef<HTMLDivElement | null>(null)
  const practiceRefs = useRef(new Map<string, HTMLButtonElement>())
  const categoryRefs = useRef(new Map<PracticeCategoryKey, HTMLButtonElement>())
  const skillCardRefs = useRef(new Map<SkillCategory, HTMLDivElement>())

  const selectedPractice =
    practices.find((practice) => practice.slug === selectedSlug) ?? practices[0]
  const skillGroups = useMemo(
    () => (selectedPractice ? groupPracticeSkills(selectedPractice, skills) : []),
    [selectedPractice, skills]
  )
  const activeSkillCategory = hoveredSkillCategory ?? pinnedSkillCategory
  const selectedSkills = skillGroups.flatMap((group) => group.skills)
  const totalSelectedSkills = selectedSkills.length
  const suppliedSelectedSkills = selectedSkills.filter((skill) => skill.supplyCount > 0).length
  const coverageRate =
    totalSelectedSkills > 0 ? Math.round((suppliedSelectedSkills / totalSelectedSkills) * 100) : 0

  const attachedCollaborators = useMemo(
    () =>
      selectedPractice
        ? collaborators
            .filter((collaborator) => isAttachedToPractice(collaborator, selectedPractice))
            .sort((a, b) => getCollaboratorName(a).localeCompare(getCollaboratorName(b)))
        : [],
    [collaborators, selectedPractice]
  )

  const rankedSkills = [...selectedSkills].sort(
    (left, right) =>
      right.supplyCount + right.demandCount * 2 - (left.supplyCount + left.demandCount * 2) ||
      left.name.localeCompare(right.name)
  )

  const categoryNodes = practiceCategoryNodes

  const metrics: MetricItem[] = [
    {
      label: "Practices",
      value: practices.length,
      detail: "territoires actifs",
      progress: 100,
    },
    {
      label: "Offres",
      value: practices.reduce((sum, practice) => sum + practice.offers.length, 0),
      detail: "offres catalogue branchees",
      progress: 100,
    },
    {
      label: "Referentiel",
      value: skills.length,
      detail: "competences de la base",
      progress: 100,
    },
    {
      label: "Couverture active",
      value: `${coverageRate}%`,
      detail: `${suppliedSelectedSkills}/${totalSelectedSkills} competences portees`,
      progress: coverageRate,
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
    if (!stage || !selectedPractice) return

    const measure = () => {
      const stageRect = stage.getBoundingClientRect()
      const sourceElement = practiceRefs.current.get(selectedPractice.slug)
      if (!sourceElement) return

      const sourceRect = sourceElement.getBoundingClientRect()
      const source = {
        x: sourceRect.left - stageRect.left + sourceRect.width / 2,
        y: sourceRect.bottom - stageRect.top,
      }

      const targets = categoryNodes
        .map((category) => {
          const element = categoryRefs.current.get(category.key)
          if (!element) return null

          const rect = element.getBoundingClientRect()

          return {
            key: category.key,
            category: category.key,
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

    const observer = new ResizeObserver(measure)

    observer.observe(stage)
    const sourceElement = practiceRefs.current.get(selectedPractice.slug)
    if (sourceElement) observer.observe(sourceElement)

    for (const element of categoryRefs.current.values()) {
      observer.observe(element)
    }

    const frame = window.requestAnimationFrame(measure)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [categoryNodes, selectedPractice])

  const bindPracticeRef = (slug: string): RefCallback<HTMLButtonElement> => {
    return (node) => {
      if (node) {
        practiceRefs.current.set(slug, node)
      } else {
        practiceRefs.current.delete(slug)
      }
    }
  }

  const bindCategoryRef = (category: PracticeCategoryKey): RefCallback<HTMLButtonElement> => {
    return (node) => {
      if (node) {
        categoryRefs.current.set(category, node)
      } else {
        categoryRefs.current.delete(category)
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

  if (!selectedPractice) {
    return (
      <div className="mx-auto w-full max-w-[1480px] px-6 py-6">
        <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-surface px-5 py-6 text-sm text-muted">
          Aucune practice active disponible dans la base.
        </div>
      </div>
    )
  }

  const activeConnectorKey = hoveredCategory ?? activeCategory

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="grid gap-4 border-b border-border pb-5 xl:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)] xl:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Equipe / Pool de competences
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">
            Parcours practices, categories et contenus
          </h1>
          <p className="mt-2 text-sm leading-6 text-body">
            Derniere mise a jour base : {formatDate(lastUpdatedAt)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <Metric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              progress={metric.progress}
              featured={index === 3}
              tone={selectedPractice.tone}
            />
          ))}
        </div>
      </header>

      <main className="flex flex-col gap-5">
        <section className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
          <div className="relative px-4 py-4 sm:pl-14 sm:pr-5">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
              aria-hidden="true"
            />
            <StepRailLabel label="Practices" tone={selectedPractice.tone} />

            <div ref={stageRef} className="relative z-10">
              <PoolCompetencesPracticeRow
                bindPracticeRef={bindPracticeRef}
                onSelectPractice={(slug) => {
                  if (slug === selectedPractice.slug) return
                  setActiveCategory(null)
                  setHoveredCategory(null)
                  setHoveredSkillCategory(null)
                  setPinnedSkillCategory(null)
                  setTooltipState(null)
                  startTransition(() => setSelectedSlug(slug))
                }}
                practices={practices}
                selectedSlug={selectedPractice.slug}
              />

              <PoolCompetencesConnections
                activeKey={activeConnectorKey}
                connections={sceneLayout.connections}
                height={sceneLayout.height}
                practiceKey={selectedPractice.slug}
                reducedMotion={reducedMotion}
                source={sceneLayout.source}
                tone={selectedPractice.tone}
                width={sceneLayout.width}
              />

              <div className="relative z-10 mt-8 sm:pl-12">
                <StepRailLabel label="Categories" tone={selectedPractice.tone} />
                <CategoryNodeGrid
                  activeCategory={activeCategory}
                  bindCategoryRef={bindCategoryRef}
                  categories={categoryNodes}
                  onHoverCategory={setHoveredCategory}
                  onSelectCategory={(category) => {
                    setTooltipState(null)
                    setHoveredSkillCategory(null)
                    setPinnedSkillCategory(null)
                    startTransition(() => {
                      setActiveCategory(category)
                    })
                  }}
                  reducedMotion={reducedMotion}
                  selectedTone={selectedPractice.tone}
                />
              </div>
            </div>
          </div>
        </section>

        <PracticeCategoryContent
          activeCategory={activeCategory}
          activeSkillCategory={activeSkillCategory}
          bindSkillCardRef={bindSkillCardRef}
          collaborators={attachedCollaborators}
          onOpenCollaborator={openDrawer}
          onSkillCategoryFocus={setHoveredSkillCategory}
          onSkillCategoryToggle={(category) =>
            setPinnedSkillCategory((current) => (current === category ? null : category))
          }
          onClearSkillFocus={() => {
            setHoveredSkillCategory(null)
            setPinnedSkillCategory(null)
          }}
          onTooltipChange={setTooltipState}
          pinnedSkillCategory={pinnedSkillCategory}
          practice={selectedPractice}
          rankedSkills={rankedSkills}
          reducedMotion={reducedMotion}
          skillGroups={skillGroups}
          tooltipState={tooltipState}
        />
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

function StepRailLabel({ label, tone }: { label: string; tone: PracticeTone }) {
  const toneStyle = toneClasses[tone]

  return (
    <>
      <div className="mb-3 flex items-center gap-2 sm:hidden">
        <span className={cn("h-px w-7 border-t", toneStyle.line)} aria-hidden="true" />
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", toneStyle.text)}>
          {label}
        </span>
      </div>
      <div
        className="pointer-events-none absolute bottom-4 left-4 top-4 hidden w-5 flex-col items-center sm:flex"
        aria-hidden="true"
      >
        <span className={cn("h-full border-l", toneStyle.line)} />
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rotate-180 bg-surface px-1.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] [writing-mode:vertical-rl]",
            toneStyle.text
          )}
        >
          {label}
        </span>
      </div>
    </>
  )
}

function CategoryNodeGrid({
  activeCategory,
  bindCategoryRef,
  categories,
  onHoverCategory,
  onSelectCategory,
  reducedMotion,
  selectedTone,
}: {
  activeCategory: PracticeCategoryKey | null
  bindCategoryRef: (category: PracticeCategoryKey) => RefCallback<HTMLButtonElement>
  categories: PracticeCategoryNode[]
  onHoverCategory: (category: PracticeCategoryKey | null) => void
  onSelectCategory: (category: PracticeCategoryKey) => void
  reducedMotion: boolean
  selectedTone: PracticeTone
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {categories.map((category, index) => (
        <CategoryNodeCard
          key={category.key}
          active={activeCategory === category.key}
          category={category}
          dimmed={activeCategory !== null && activeCategory !== category.key}
          index={index}
          onHoverCategory={onHoverCategory}
          onSelectCategory={onSelectCategory}
          reducedMotion={reducedMotion}
          refCallback={bindCategoryRef(category.key)}
          selectedTone={selectedTone}
        />
      ))}
    </div>
  )
}

function CategoryNodeCard({
  active,
  category,
  dimmed,
  index,
  onHoverCategory,
  onSelectCategory,
  reducedMotion,
  refCallback,
  selectedTone,
}: {
  active: boolean
  category: PracticeCategoryNode
  dimmed: boolean
  index: number
  onHoverCategory: (category: PracticeCategoryKey | null) => void
  onSelectCategory: (category: PracticeCategoryKey) => void
  reducedMotion: boolean
  refCallback: RefCallback<HTMLButtonElement>
  selectedTone: PracticeTone
}) {
  const tone = toneClasses[selectedTone]

  return (
    <button
      ref={refCallback}
      type="button"
      aria-expanded={active}
      aria-controls="pool-practice-category-content"
      onClick={() => onSelectCategory(category.key)}
      onMouseEnter={() => onHoverCategory(category.key)}
      onMouseLeave={() => onHoverCategory(null)}
      onFocus={() => onHoverCategory(category.key)}
      onBlur={() => onHoverCategory(null)}
      className={cn(
        "group flex min-h-[68px] w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition-[border-color,background-color,opacity,transform] duration-500 ease-out motion-reduce:duration-150 sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(20%-0.6rem)] focus:outline-none focus:ring-2 focus:ring-primary/35",
        active
          ? cn("order-first max-w-[360px] basis-full bg-surface shadow-sm lg:basis-full", tone.border)
          : "border-border bg-surface/84 hover:border-heading/10 hover:bg-surface",
        dimmed && "opacity-45 hover:opacity-80"
      )}
      style={
        reducedMotion
          ? undefined
          : {
              animation: `pool-competences-card-in 520ms cubic-bezier(0.22, 1, 0.36, 1) ${120 + index * 55}ms both`,
            }
      }
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Image
          src={category.iconSrc}
          alt=""
          aria-hidden
          width={40}
          height={40}
          className="h-9 w-9 object-contain"
        />
      </span>
      <span className="min-w-0 truncate text-sm font-bold leading-5 text-heading">
        {category.label}
      </span>
    </button>
  )
}

function PracticeCategoryContent({
  activeCategory,
  activeSkillCategory,
  bindSkillCardRef,
  collaborators,
  onOpenCollaborator,
  onClearSkillFocus,
  onSkillCategoryFocus,
  onSkillCategoryToggle,
  onTooltipChange,
  pinnedSkillCategory,
  practice,
  rankedSkills,
  reducedMotion,
  skillGroups,
  tooltipState,
}: {
  activeCategory: PracticeCategoryKey | null
  activeSkillCategory: SkillCategory | null
  bindSkillCardRef: (category: SkillCategory) => RefCallback<HTMLDivElement>
  collaborators: PracticeCollaborator[]
  onOpenCollaborator: (id: string) => void
  onClearSkillFocus: () => void
  onSkillCategoryFocus: (category: SkillCategory | null) => void
  onSkillCategoryToggle: (category: SkillCategory) => void
  onTooltipChange: (nextState: SkillTooltipState) => void
  pinnedSkillCategory: SkillCategory | null
  practice: PracticeTerritory
  rankedSkills: PoolSkill[]
  reducedMotion: boolean
  skillGroups: SkillGroup[]
  tooltipState: SkillTooltipState
}) {
  if (!activeCategory) {
    return (
      <section
        id="pool-practice-category-content"
        className="relative rounded-[var(--radius-medium)] border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted sm:pl-14 sm:pr-5"
      >
        <StepRailLabel label="Contenu" tone={practice.tone} />
        <div>Selectionnez une categorie pour deployer le contenu de {practice.name}.</div>
      </section>
    )
  }

  return (
    <div
      id="pool-practice-category-content"
      key={`${practice.slug}-${activeCategory}`}
      className="motion-reduce:transition-none"
      style={
        reducedMotion
          ? undefined
          : {
              animation: "pool-competences-card-in 620ms cubic-bezier(0.22, 1, 0.36, 1) both",
            }
      }
    >
      {activeCategory === "offers" ? (
        <OffersPanel practice={practice} />
      ) : null}

      {activeCategory === "skills" ? (
        <SkillsPanel
          activeSkillCategory={activeSkillCategory}
          bindSkillCardRef={bindSkillCardRef}
          onClearSkillFocus={onClearSkillFocus}
          onSkillCategoryFocus={onSkillCategoryFocus}
          onSkillCategoryToggle={onSkillCategoryToggle}
          onTooltipChange={onTooltipChange}
          pinnedSkillCategory={pinnedSkillCategory}
          practice={practice}
          reducedMotion={reducedMotion}
          skillGroups={skillGroups}
          tooltipState={tooltipState}
        />
      ) : null}

      {activeCategory === "profiles" ? (
        <ProfilesPanel practice={practice} />
      ) : null}

      {activeCategory === "talent" ? (
        <CollaboratorPanel
          collaborators={collaborators}
          onOpenCollaborator={onOpenCollaborator}
          practice={practice}
        />
      ) : null}

      {activeCategory === "market" ? (
        <MarketSignalsPanel practice={practice} signals={rankedSkills} />
      ) : null}
    </div>
  )
}

function SkillsPanel({
  activeSkillCategory,
  bindSkillCardRef,
  onClearSkillFocus,
  onSkillCategoryFocus,
  onSkillCategoryToggle,
  onTooltipChange,
  pinnedSkillCategory,
  practice,
  reducedMotion,
  skillGroups,
  tooltipState,
}: {
  activeSkillCategory: SkillCategory | null
  bindSkillCardRef: (category: SkillCategory) => RefCallback<HTMLDivElement>
  onClearSkillFocus: () => void
  onSkillCategoryFocus: (category: SkillCategory | null) => void
  onSkillCategoryToggle: (category: SkillCategory) => void
  onTooltipChange: (nextState: SkillTooltipState) => void
  pinnedSkillCategory: SkillCategory | null
  practice: PracticeTerritory
  reducedMotion: boolean
  skillGroups: SkillGroup[]
  tooltipState: SkillTooltipState
}) {
  return (
    <section className="relative rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-5 sm:pl-14 sm:pr-5">
      <StepRailLabel label="Competences" tone={practice.tone} />
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClearSkillFocus}
          disabled={!activeSkillCategory}
          className="w-fit rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-primary/35"
        >
          Reinitialiser focus
        </button>
      </div>

      {skillGroups.length === 0 ? (
        <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
          Aucune competence rattachee a cette practice dans les donnees actuelles.
        </div>
      ) : (
        <PoolCompetencesSkillCardsRow
          activeCategory={activeSkillCategory}
          bindSkillCardRef={bindSkillCardRef}
          groups={skillGroups}
          onCategoryFocus={onSkillCategoryFocus}
          onTogglePinnedCategory={onSkillCategoryToggle}
          onTooltipChange={onTooltipChange}
          pinnedCategory={pinnedSkillCategory}
          reducedMotion={reducedMotion}
          selectedTone={practice.tone}
          tooltipState={tooltipState}
        />
      )}
    </section>
  )
}

function MarketSignalsPanel({
  practice,
  signals,
}: {
  practice: PracticeTerritory
  signals: PoolSkill[]
}) {
  const summary = getMarketSignalSummary(signals)
  const leadingSignal = summary.nodes[0] ?? null
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null)
  const [previewSignalId, setPreviewSignalId] = useState<string | null>(null)
  const activeSignalId = previewSignalId ?? selectedSignalId ?? leadingSignal?.id ?? null
  const activeSignal =
    summary.nodes.find((signal) => signal.id === activeSignalId) ?? leadingSignal
  const topSignals = summary.nodes.slice(0, 5)
  const hiddenSignalsCount = Math.max(0, signals.length - summary.nodes.length)
  const activePalette = getMarketSignalPalette(activeSignal?.category)
  const activePressureWidth = activeSignal
    ? Math.max(8, Math.round((activeSignal.pressure / Math.max(1, summary.maxPressure)) * 100))
    : 0
  const activateSignal = (signalId: string) => setSelectedSignalId(signalId)
  const handleSignalKeyDown = (event: KeyboardEvent<SVGGElement>, signalId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    activateSignal(signalId)
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
      <div
        className="relative overflow-hidden px-4 py-5 transition-colors duration-500 sm:pl-14 sm:pr-5"
        style={{
          background:
            signals.length > 0
              ? `linear-gradient(135deg, ${activePalette.soft}, transparent 42%), var(--color-surface)`
              : undefined,
        }}
      >
        <StepRailLabel label="Marche" tone={practice.tone} />
        {practiceImages[practice.slug] && (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${practiceImages[practice.slug]})`,
              opacity: 0.08,
            }}
            aria-hidden="true"
          />
        )}

        {signals.length === 0 ? (
          <div className="relative rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
            Aucun signal competence disponible pour cette practice.
          </div>
        ) : (
          <div className="relative grid gap-5 lg:grid-cols-[minmax(230px,0.42fr)_minmax(0,1fr)_minmax(240px,0.48fr)] lg:items-stretch">
            <div className="relative z-10 flex min-h-48 flex-col justify-between">
              <div>
                <p className="max-w-sm font-heading text-2xl font-bold leading-tight tracking-tight text-heading">
                  {activeSignal ? activeSignal.name : "Signaux competences"}
                </p>
                {activeSignal ? (
                  <div className="mt-4 rounded-[20px] border border-border/80 bg-surface/82 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                        style={{
                          backgroundColor: activePalette.fill,
                          color: activePalette.ink,
                        }}
                      >
                        {categoryLabels[activeSignal.category]}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                        Signal actif
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${activePressureWidth}%`,
                            backgroundColor: activePalette.accent,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-muted">
                        x{formatSignalValue(activeSignal.pressure)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <SignalKpi label="Signaux" value={signals.length} tone={practice.tone} />
                <SignalKpi label="Demande" value={summary.totalDemand} tone={practice.tone} />
                <SignalKpi label="Tension" value={`x${formatSignalValue(summary.maxPressure)}`} tone={practice.tone} />
              </div>
            </div>

            <div className="relative min-h-[236px] overflow-hidden rounded-[24px] border border-border/80 bg-canvas/55 px-3 py-3">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(circle at 20% 28%, rgba(255,255,255,0.85), transparent 22%), radial-gradient(circle at 78% 68%, rgba(255,255,255,0.5), transparent 24%)",
                }}
                aria-hidden="true"
              />
              <svg
                viewBox="0 0 600 220"
                className="relative h-full min-h-[208px] w-full overflow-visible"
                aria-labelledby="market-signal-title"
                role="img"
              >
                <title id="market-signal-title">
                  Constellation des signaux competences pour {practice.name}
                </title>
                <path
                  d="M34 142 C130 32 208 196 302 96 C386 8 462 202 574 74"
                  className="fill-none stroke-[1.1] transition-colors duration-500"
                  strokeDasharray="4 10"
                  opacity="0.42"
                  stroke={activePalette.accent}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M54 174 C164 116 216 52 326 128 C412 188 486 108 566 134"
                  className="fill-none stroke-heading/10 stroke-[1]"
                  vectorEffect="non-scaling-stroke"
                />

                {summary.nodes.map((node, index) => {
                  const nodePalette = getMarketSignalPalette(node.category)
                  const active = node.id === activeSignal?.id
                  const muted = Boolean(activeSignal && !active)

                  return (
                    <g
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Selectionner ${node.name}, tension x${formatSignalValue(node.pressure)}`}
                      aria-pressed={active}
                      className="cursor-pointer outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-primary/35"
                      opacity={muted ? 0.42 : 1}
                      onClick={() => activateSignal(node.id)}
                      onFocus={() => setPreviewSignalId(node.id)}
                      onBlur={() => setPreviewSignalId(null)}
                      onKeyDown={(event) => handleSignalKeyDown(event, node.id)}
                      onMouseEnter={() => setPreviewSignalId(node.id)}
                      onMouseLeave={() => setPreviewSignalId(null)}
                      style={{
                        animation: `pool-competences-card-in 520ms cubic-bezier(0.22, 1, 0.36, 1) ${node.delay}ms both`,
                      }}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius + (active ? 25 : 16)}
                        fill={nodePalette.fill}
                        stroke={active ? nodePalette.accent : nodePalette.border}
                        strokeWidth={active ? 1.4 : 0.8}
                        opacity={active ? 0.88 : index < 3 ? 0.5 : 0.32}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={nodePalette.fill}
                        stroke={nodePalette.accent}
                        strokeWidth={active ? 2.2 : 1.4}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={active ? 4.2 : 2.8}
                        fill="var(--color-surface)"
                        stroke={nodePalette.accent}
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                      {index < 5 ? (
                        <text
                          x={node.x}
                          y={node.y - node.radius - 9}
                          textAnchor="middle"
                          className="text-[10px] font-bold"
                          fill={active ? nodePalette.ink : "var(--color-heading)"}
                        >
                          {index + 1}
                        </text>
                      ) : null}
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="relative z-10 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                {topSignals.map((signal, index) => (
                  <SignalRailItem
                    key={signal.id}
                    index={index}
                    onActivate={activateSignal}
                    onClearPreview={() => setPreviewSignalId(null)}
                    onPreview={setPreviewSignalId}
                    previewed={signal.id === activeSignal?.id}
                    selected={signal.id === selectedSignalId}
                    maxPressure={summary.maxPressure}
                    signal={signal}
                    tone={practice.tone}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-border/80 bg-canvas/45 px-3 py-2 text-[11px] text-muted">
                <span>
                  {hiddenSignalsCount > 0
                    ? `+${hiddenSignalsCount} signaux consolides`
                    : "Tous les signaux visibles"}
                </span>
                <span>
                  Niveau moyen {summary.averageLevel ? formatSignalValue(summary.averageLevel) : "-"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function SignalKpi({
  label,
  tone,
  value,
}: {
  label: string
  tone: PracticeTerritory["tone"]
  value: number | string
}) {
  return (
    <div className="rounded-[18px] border border-border/80 bg-surface/82 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={cn("mt-1 font-heading text-xl font-bold leading-none", toneClasses[tone].text)}>
        {value}
      </p>
    </div>
  )
}

function SignalRailItem({
  index,
  maxPressure,
  onActivate,
  onClearPreview,
  onPreview,
  previewed,
  selected,
  signal,
  tone,
}: {
  index: number
  maxPressure: number
  onActivate: (signalId: string) => void
  onClearPreview: () => void
  onPreview: (signalId: string) => void
  previewed: boolean
  selected: boolean
  signal: MarketSignalNode
  tone: PracticeTerritory["tone"]
}) {
  const fallbackTone = toneClasses[tone]
  const palette = getMarketSignalPalette(signal.category)
  const pressureWidth = Math.max(8, Math.round((signal.pressure / Math.max(1, maxPressure)) * 100))

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onActivate(signal.id)}
      onFocus={() => onPreview(signal.id)}
      onBlur={onClearPreview}
      onMouseEnter={() => onPreview(signal.id)}
      onMouseLeave={onClearPreview}
      className={cn(
        "group w-full rounded-[18px] border px-3 py-2.5 text-left transition-[background-color,border-color,opacity,transform] duration-300 focus:outline-none focus:ring-2 focus:ring-primary/35",
        previewed ? "bg-surface opacity-100" : "bg-surface/78 opacity-78 hover:bg-surface hover:opacity-100",
        selected ? "translate-x-0.5" : ""
      )}
      style={{
        borderColor: previewed ? palette.border : "var(--color-border)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
            index === 0 && !previewed ? fallbackTone.fill : ""
          )}
          style={
            previewed || index > 0
              ? {
                  backgroundColor: previewed ? palette.accent : palette.fill,
                  color: previewed ? "var(--color-primary-fg)" : palette.ink,
                }
              : undefined
          }
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold leading-5 text-heading">{signal.name}</p>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: palette.fill,
                color: palette.ink,
              }}
            >
              {categoryLabels[signal.category]}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pressureWidth}%`,
                  backgroundColor: palette.accent,
                }}
              />
            </div>
            <span className="w-9 text-right text-[10px] font-bold text-muted">
              x{formatSignalValue(signal.pressure)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
            <span>{signal.demandCount} demande</span>
            <span>{signal.supplyCount} pool</span>
            <span>Niv. {signal.averageLevel ?? "-"}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function getMarketSignalSummary(signals: PoolSkill[]): MarketSignalSummary {
  const totalDemand = signals.reduce((sum, signal) => sum + signal.demandCount, 0)
  const totalSupply = signals.reduce((sum, signal) => sum + signal.supplyCount, 0)
  const levels = signals
    .map((signal) => signal.averageLevel)
    .filter((level): level is number => typeof level === "number")
  const averageLevel =
    levels.length > 0
      ? levels.reduce((sum, level) => sum + level, 0) / levels.length
      : null
  const maxScore = Math.max(
    1,
    ...signals.map((signal) => getMarketSignalScore(signal))
  )

  const rankedSignals = signals
    .map((signal) => ({
      signal,
      pressure: getMarketSignalPressure(signal),
      score: getMarketSignalScore(signal),
    }))
    .sort((left, right) => right.score - left.score || left.signal.name.localeCompare(right.signal.name))

  const maxPressure = Math.max(1, ...rankedSignals.map((signal) => signal.pressure))
  const nodes = rankedSignals.slice(0, marketSignalPositions.length).map(({ pressure, score, signal }, index) => {
    const [x, y] = marketSignalPositions[index]

    return {
      ...signal,
      delay: 90 + index * 38,
      pressure,
      radius: 7 + Math.round((score / maxScore) * 17),
      score,
      x,
      y,
    }
  })

  return {
    averageLevel,
    maxPressure,
    nodes,
    totalDemand,
    totalSupply,
  }
}

function getMarketSignalScore(signal: PoolSkill): number {
  return signal.demandCount * 2.6 + signal.supplyCount * 0.8 + (signal.averageLevel ?? 0)
}

function getMarketSignalPressure(signal: PoolSkill): number {
  return Math.round(((signal.demandCount + 1) / (signal.supplyCount + 1)) * 10) / 10
}

function formatSignalValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function getMarketSignalPalette(category: SkillCategory | undefined): MarketSignalPalette {
  if (!category) return neutralMarketSignalPalette
  return marketSignalPalettes[category] ?? neutralMarketSignalPalette
}

function CollaboratorPanel({
  collaborators,
  onOpenCollaborator,
  practice,
}: {
  collaborators: PracticeCollaborator[]
  onOpenCollaborator: (id: string) => void
  practice: PracticeTerritory
}) {
  const tone = toneClasses[practice.tone]

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-4 sm:pl-14 sm:pr-5">
      <StepRailLabel label="Vivier" tone={practice.tone} />
      <div className="mb-3 flex justify-end">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone.fill)}>
          {collaborators.length}
        </span>
      </div>

      <div className="max-h-[620px] overflow-y-auto">
        {collaborators.length === 0 ? (
          <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
            Aucun collaborateur rattache dans les donnees actuelles.
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {collaborators.map((collaborator) => {
              const name = getCollaboratorName(collaborator)
              const mission = getActiveMission(collaborator)

              return (
                <button
                  key={collaborator.id}
                  type="button"
                  onClick={() => onOpenCollaborator(collaborator.id)}
                  className="kredo-hover-reference flex min-h-16 w-full items-center gap-3 rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-primary/35"
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", tone.fill)}>
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
  )
}

function OffersPanel({ practice }: { practice: PracticeTerritory }) {
  return (
    <section className="relative rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-5 sm:pl-14 sm:pr-5">
      <StepRailLabel label="Catalogue" tone={practice.tone} />
      <div className="mb-3 flex justify-end">
        <span className="text-xs text-muted">{practice.offers.length} offres rattachees</span>
      </div>

      {practice.offers.length === 0 ? (
        <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
          Aucune offre active pour cette practice.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {practice.offers.map((offer) => (
            <article key={offer.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/45 px-4 py-4">
              <h3 className="text-sm font-bold leading-5 text-heading">{offer.name}</h3>
              <p className="mt-2 text-xs leading-5 text-body">
                {offer.shortDescription ?? "Description courte a completer."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {offer.typicalProfiles.map((profile) => (
                  <span key={profile} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {profile}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ProfilesPanel({ practice }: { practice: PracticeTerritory }) {
  return (
    <section className="relative rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-5 sm:pl-14 sm:pr-5">
      <StepRailLabel label="Metiers" tone={practice.tone} />

      {practice.profiles.length === 0 ? (
        <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
          Aucun profil type actif pour cette practice.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {practice.profiles.map((profile) => (
            <article key={profile.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/45 px-4 py-4">
              <h3 className="text-sm font-bold text-heading">{profile.title}</h3>
              <p className="mt-1 text-xs leading-5 text-body">{profile.mainMission}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.techStack.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
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
  value: number | string
  detail: string
  progress: number
  featured?: boolean
  tone: PracticeTerritory["tone"]
}) {
  const toneStyle = toneClasses[tone]

  return (
    <div
      className={cn(
        "kredo-hover-reference group relative min-h-24 overflow-hidden rounded-[var(--radius-medium)] border bg-surface px-4 py-3.5",
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
      <p className="mt-3 font-heading text-2xl font-bold leading-none tracking-tight text-heading">
        {value}
      </p>
      <p className="mt-2 min-h-8 text-xs leading-4 text-body">{detail}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
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

function formatDate(value: string | null): string {
  if (!value) return "non renseignee"

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}
