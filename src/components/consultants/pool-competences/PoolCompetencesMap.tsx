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
import { useDrawerState } from "@/hooks/use-drawer-state"
import type {
  PoolCompetencesDataset,
  PracticeTerritory,
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

export function PoolCompetencesMap({
  dataset,
  collaborators,
}: PoolCompetencesMapProps) {
  const { practices, skills, lastUpdatedAt } = dataset
  const [selectedSlug, setSelectedSlug] = useState(practices[0]?.slug ?? "")
  const { open: drawerOpen, selectedId, openDrawer, setOpen: setDrawerOpen } = useDrawerState()
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

  const selectedPractice =
    practices.find((practice) => practice.slug === selectedSlug) ?? practices[0]
  const selectedTone = toneClasses[selectedPractice?.tone ?? "neutral"]
  const skillGroups = useMemo(
    () => (selectedPractice ? groupPracticeSkills(selectedPractice, skills) : []),
    [selectedPractice, skills]
  )
  const activeCategory = hoveredCategory ?? pinnedCategory
  const selectedSkills = skillGroups.flatMap((group) => group.skills)
  const totalSelectedSkills = selectedSkills.length
  const suppliedSelectedSkills = selectedSkills.filter((skill) => skill.supplyCount > 0).length
  const selectedDemandCount = selectedSkills.reduce((sum, skill) => sum + skill.demandCount, 0)
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

  const topSkills = [...selectedSkills]
    .sort(
      (left, right) =>
        right.supplyCount + right.demandCount * 2 - (left.supplyCount + left.demandCount * 2) ||
        left.name.localeCompare(right.name)
    )
    .slice(0, 12)

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
        y: sourceRect.bottom - stageRect.top + 14,
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

    const observer = new ResizeObserver(measure)

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
  }, [selectedPractice, skillGroups])

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

  if (!selectedPractice) {
    return (
      <div className="mx-auto w-full max-w-[1480px] px-6 py-6">
        <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-surface px-5 py-6 text-sm text-muted">
          Aucune practice active disponible dans la base.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="grid gap-4 border-b border-border pb-5 xl:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)] xl:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Equipe / Pool de competences
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">
            Catalogue vivant practices, offres et competences
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
          <div className="relative px-4 py-5 sm:px-6">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
              aria-hidden="true"
            />

            <div className="relative z-20 mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", selectedTone.text)}>
                  Navigation modulaire
                </p>
                <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
                  Practices actives depuis Supabase
                </h2>
              </div>
              <p className="max-w-xl text-xs leading-5 text-muted lg:text-right">
                Selectionnez une practice pour recalculer les familles de competences, les offres,
                les profils et le rattachement consultants.
              </p>
            </div>

            <div ref={stageRef} className="relative z-10 min-h-[620px]">
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

              <div className="pointer-events-none absolute left-1/2 top-[calc(50%_-_40px)] z-10 hidden h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-heading/10 bg-heading md:flex">
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

              <div className="relative z-10 mt-12">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", selectedTone.text)}>
                      Competences
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
                      {selectedPractice.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <StatusPill label={`${selectedPractice.offers.length} offres`} tone={selectedPractice.tone} />
                    <StatusPill label={`${selectedPractice.profiles.length} profils`} tone={selectedPractice.tone} />
                    <StatusPill label={`${selectedDemandCount} demandes`} tone={selectedPractice.tone} />
                  </div>
                </div>

                {skillGroups.length === 0 ? (
                  <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
                    Aucune competence rattachee a cette practice dans les donnees actuelles.
                  </div>
                ) : (
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
                )}

                <div className="mt-4 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted">
                    {activeCategory
                      ? `${categoryLabels[activeCategory]} isolee dans la scene.`
                      : "Survolez une famille pour isoler sa branche, cliquez pour la figer."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedCategory(null)
                      setHoveredCategory(null)
                    }}
                    className="w-fit rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted focus:outline-none focus:ring-2 focus:ring-primary/35"
                  >
                    Reinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.45fr)]">
          <PracticeDetail
            practice={selectedPractice}
            topSkills={topSkills}
          />
          <CollaboratorPanel
            collaborators={attachedCollaborators}
            onOpenCollaborator={openDrawer}
            practice={selectedPractice}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
          <OffersPanel practice={selectedPractice} />
          <ProfilesPanel practice={selectedPractice} />
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

function PracticeDetail({
  practice,
  topSkills,
}: {
  practice: PracticeTerritory
  topSkills: Array<PoolCompetencesDataset["skills"][number]>
}) {
  const tone = toneClasses[practice.tone]

  return (
    <section className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
      <div className={cn("relative overflow-hidden border-b border-border px-5 py-5", tone.soft)}>
        {practiceImages[practice.slug] && (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${practiceImages[practice.slug]})`,
              opacity: 0.12,
            }}
            aria-hidden="true"
          />
        )}

        <div className="relative">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", tone.text)}>
            Practice active
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
            {practice.name}
          </h2>
          <p className="mt-2 max-w-[980px] text-sm leading-6 text-body">
            {practice.perimeter}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {practice.stackTags.slice(0, 14).map((tag) => (
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

      <div className="px-5 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-heading">
              Signaux competences
            </h3>
            <p className="mt-1 text-xs text-muted">
              Competences priorisees par couverture consultants et demande opportunites.
            </p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone.fill)}>
            {practice.skillNames.length}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {topSkills.map((skill) => (
            <div key={skill.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/45 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-heading">{skill.name}</p>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
                  {categoryLabels[skill.category]}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <MiniStat label="Pool" value={skill.supplyCount} />
                <MiniStat label="Demande" value={skill.demandCount} />
                <MiniStat label="Niv." value={skill.averageLevel ?? "-"} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
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
    <section className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-heading">
              Collaborateurs rattaches
            </h2>
            <p className="mt-1 text-xs text-muted">
              Rattachement calcule depuis la practice et le titre courant.
            </p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone.fill)}>
            {collaborators.length}
          </span>
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto px-5 py-4">
        {collaborators.length === 0 ? (
          <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
            Aucun collaborateur rattache dans les donnees actuelles.
          </div>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collaborator) => {
              const name = getCollaboratorName(collaborator)
              const mission = getActiveMission(collaborator)

              return (
                <button
                  key={collaborator.id}
                  type="button"
                  onClick={() => onOpenCollaborator(collaborator.id)}
                  className="kredo-hover-reference flex w-full items-center gap-3 rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-primary/35"
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
  const tone = toneClasses[practice.tone]

  return (
    <section className="rounded-[var(--radius-medium)] border border-border bg-surface px-5 py-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", tone.text)}>
            Offres
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-heading">
            Catalogue actif
          </h2>
        </div>
        <span className="text-xs text-muted">{practice.offers.length} offres rattachees</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {practice.offers.map((offer) => (
          <article key={offer.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/45 px-4 py-4">
            <h3 className="text-sm font-bold leading-5 text-heading">{offer.name}</h3>
            <p className="mt-2 text-xs leading-5 text-body">
              {offer.shortDescription ?? "Description courte a completer."}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {offer.typicalProfiles.slice(0, 3).map((profile) => (
                <span key={profile} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {profile}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProfilesPanel({ practice }: { practice: PracticeTerritory }) {
  return (
    <section className="rounded-[var(--radius-medium)] border border-border bg-surface px-5 py-5">
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-heading">
          Profils reperes
        </h2>
        <p className="mt-1 text-xs text-muted">
          Roles et stacks issus de `job_profiles`.
        </p>
      </div>

      {practice.profiles.length === 0 ? (
        <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-canvas/45 px-4 py-5 text-sm text-muted">
          Aucun profil type actif pour cette practice.
        </div>
      ) : (
        <div className="space-y-3">
          {practice.profiles.slice(0, 6).map((profile) => (
            <article key={profile.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <h3 className="text-sm font-bold text-heading">{profile.title}</h3>
              <p className="mt-1 text-xs leading-5 text-body">{profile.mainMission}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.techStack.slice(0, 5).map((tag) => (
                  <span key={tag} className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold text-muted">
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

function StatusPill({ label, tone }: { label: string; tone: PracticeTerritory["tone"] }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", toneClasses[tone].fill)}>
      {label}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-surface px-2 py-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 font-heading text-sm font-bold text-heading">{value}</p>
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
