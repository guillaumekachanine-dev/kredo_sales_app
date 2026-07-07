"use client"

import { useState } from "react"
import { OBJECTIVE_OPTIONS } from "@/components/accounts-contacts/intelligence/communication-brief-options"
import {
  getMailAnalyticsSnapshot,
  getSupportedMailAnalyticsAccountLabels,
  type MailAnalyticsObjectivePoint,
  type MailAnalyticsSnapshot,
  type MailAnalyticsVolumePoint,
} from "@/components/accounts-contacts/intelligence/company-documents-mail-analytics"
import { cn } from "@/lib/utils"

interface CompanyDocumentsMailAnalyticsPanelProps {
  companyName: string
}

type AnalyticsView = "volume" | "objectives"

const OBJECTIVE_LABELS = new Map(OBJECTIVE_OPTIONS.map((option) => [option.value, option.label]))

function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value)
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function getWeeklyVolumeDataset(snapshot: MailAnalyticsSnapshot): MailAnalyticsVolumePoint[] {
  return snapshot.weekly
}

function getObjectiveLabel(objective: MailAnalyticsSnapshot["objectives"][number]["objective"]): string {
  return OBJECTIVE_LABELS.get(objective) ?? objective
}

function getKpiObjectiveLabel(objective: MailAnalyticsSnapshot["objectives"][number]["objective"]): string {
  if (objective === "get_meeting") return "Obtenir un RDV"
  return getObjectiveLabel(objective)
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function MailVolumeChart({
  data,
}: {
  data: MailAnalyticsVolumePoint[]
}) {
  const safeData = data.length > 0 ? data : []
  const maxValue = Math.max(...safeData.map((point) => point.generatedCount), 1)
  const width = 920
  const height = 388
  const paddingTop = 22
  const paddingRight = 16
  const paddingBottom = 54
  const paddingLeft = 24
  const usableHeight = height - paddingTop - paddingBottom
  const step = safeData.length > 0 ? (width - paddingLeft - paddingRight) / safeData.length : width - paddingLeft - paddingRight
  const barWidth = Math.min(42, step * 0.64)

  return (
    <div className="flex h-full min-h-[26rem] w-full flex-col justify-center gap-5">
      <div className="flex items-center justify-end gap-4">
        <div className="text-right text-[11px] text-white/45">
          consommation tokens a venir
        </div>
      </div>

      <div className="flex flex-1 items-center overflow-hidden px-1 py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full min-h-[19rem] w-full"
          role="img"
          aria-label="Volume hebdomadaire des mails generes"
        >
          <title>Mails generes par semaine</title>
          <desc>Jeu de demonstration, sans contenu de mail, prepare pour accueillir une serie tokens.</desc>

          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + usableHeight - usableHeight * ratio
            const tick = Math.round(maxValue * ratio)
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="4 8"
                />
                <text
                  x={paddingLeft - 2}
                  y={y - 6}
                  textAnchor="start"
                  fontSize="10"
                  fill="rgba(255,255,255,0.45)"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {safeData.map((point, index) => {
            const valueHeight = (point.generatedCount / maxValue) * usableHeight
            const x = paddingLeft + index * step + (step - barWidth) / 2
            const y = paddingTop + usableHeight - valueHeight
            return (
              <g key={point.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={valueHeight}
                  rx="10"
                  fill="var(--color-brand-brass)"
                  opacity={0.94}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.min(18, valueHeight)}
                  rx="10"
                  fill="rgba(255,255,255,0.18)"
                />
                <text
                  x={x + barWidth / 2}
                  y={Math.max(16, y - 8)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="rgba(255,255,255,0.92)"
                >
                  {point.generatedCount}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - paddingBottom + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.58)"
                >
                  {point.shortLabel}
                </text>
              </g>
            )
          })}

          <line
            x1={paddingLeft}
            x2={width - paddingRight}
            y1={height - paddingBottom}
            y2={height - paddingBottom}
            stroke="rgba(255,255,255,0.18)"
          />
        </svg>
      </div>
    </div>
  )
}

function ObjectiveDonut({
  objectives,
  selectedObjective,
  onSelect,
}: {
  objectives: MailAnalyticsObjectivePoint[]
  selectedObjective: MailAnalyticsObjectivePoint
  onSelect: (objective: MailAnalyticsObjectivePoint) => void
}) {
  const total = Math.max(sum(objectives.map((objective) => objective.count)), 1)
  const radius = 74
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius
  const segments = objectives.reduce<Array<{
    objective: MailAnalyticsObjectivePoint
    ratio: number
    startAngle: number
    segmentAngle: number
  }>>((accumulator, objective) => {
    const previous = accumulator[accumulator.length - 1]
    const startAngle = previous ? previous.startAngle + previous.segmentAngle : 0
    const ratio = objective.count / total
    const segmentAngle = ratio * 360

    accumulator.push({
      objective,
      ratio,
      startAngle,
      segmentAngle,
    })

    return accumulator
  }, [])

  return (
    <div className="relative mx-auto flex w-full max-w-[21rem] items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-[220px] w-[220px]" role="img" aria-label="Repartition des objectifs de mails">
        <title>Repartition des objectifs</title>
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {segments.map(({ objective, ratio, startAngle, segmentAngle }) => {
          const dashLength = circumference * ratio
          const dashOffset = circumference * (1 - startAngle / 360)
          const midAngle = startAngle + segmentAngle / 2
          const labelPoint = polarToCartesian(110, 110, radius + 24, midAngle)
          const isSelected = selectedObjective.objective === objective.objective

          return (
            <g key={objective.objective}>
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={objective.colorVar}
                strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform="rotate(-90 110 110)"
                opacity={isSelected ? 1 : 0.9}
              />
              {ratio >= 0.09 ? (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.72)"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(ratio * 100)}%
                </text>
              ) : null}
              <path
                d={describeArc(110, 110, radius + strokeWidth / 2 + 8, startAngle, startAngle + segmentAngle)}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                strokeLinecap="round"
              />
            </g>
          )
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-[106px] w-[106px] flex-col items-center justify-center rounded-full bg-[#111735]/95 text-center shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
          <span className="px-3 text-[11px] font-medium leading-tight text-white/56">
            {getObjectiveLabel(selectedObjective.objective)}
          </span>
          <span className="mt-2 text-2xl font-semibold text-white">{selectedObjective.count}</span>
          <span className="mt-1 text-[11px] text-white/52">redactions</span>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {getObjectiveLabel(selectedObjective.objective)} : {selectedObjective.count} redactions
      </div>

      <div className="absolute inset-0">
        {segments.map(({ objective, ratio, startAngle, segmentAngle }) => {
            const midAngle = startAngle + segmentAngle / 2
            const triggerPoint = polarToCartesian(110, 110, radius + 30, midAngle)
            const isSelected = selectedObjective.objective === objective.objective

            return (
              <button
                key={`${objective.objective}-trigger`}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${getObjectiveLabel(objective.objective)} ${Math.round(ratio * 100)} pour cent`}
                onClick={() => onSelect(objective)}
                className={cn(
                  "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all",
                  isSelected
                    ? "border-white/28 bg-white/18"
                    : "border-transparent bg-transparent hover:border-white/14 hover:bg-white/8"
                )}
                style={{
                  left: `${(triggerPoint.x / 220) * 100}%`,
                  top: `${(triggerPoint.y / 220) * 100}%`,
                }}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: objective.colorVar }}
                  aria-hidden="true"
                />
              </button>
            )
          })}
      </div>
    </div>
  )
}

export function CompanyDocumentsMailAnalyticsPanel({
  companyName,
}: CompanyDocumentsMailAnalyticsPanelProps) {
  const [activeView, setActiveView] = useState<AnalyticsView>("volume")
  const [selectedObjectiveKey, setSelectedObjectiveKey] = useState<string | null>(null)
  const snapshot = getMailAnalyticsSnapshot(companyName)

  if (!snapshot) {
    return (
      <div className="flex h-full min-h-[420px] flex-col justify-between bg-[radial-gradient(circle_at_top,_rgba(201,154,46,0.12),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-6 py-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">
            <span className="size-2 rounded-full bg-[var(--color-brand-brass)]" aria-hidden="true" />
            Analytics mails
          </div>
          <div className="max-w-xl space-y-3">
            <h3 className="text-xl font-semibold leading-tight text-white">
              Les analytics d&apos;usage seront affiches ici des que la fonctionnalite aura plus de recul.
            </h3>
            <p className="text-sm leading-relaxed text-white/60">
              Aucun message n&apos;est mocke. En attendant la remontee de donnees reelles, la vue demo est provisionnee
              uniquement pour ROBERTET, ARKOPHARMA et VOYAGE PRIVE.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] bg-white/[0.03] px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Comptes demo disponibles
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {getSupportedMailAnalyticsAccountLabels().map((label) => (
              <span
                key={label}
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/82"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const volumeData = getWeeklyVolumeDataset(snapshot)
  const totalGenerated = sum(volumeData.map((point) => point.generatedCount))
  const averageGenerated = totalGenerated / volumeData.length
  const dominantObjective = snapshot.objectives.reduce((best, current) =>
    current.count > best.count ? current : best
  )
  const selectedObjective =
    snapshot.objectives.find((objective) => objective.objective === selectedObjectiveKey) ?? dominantObjective

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(201,154,46,0.18),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-5 py-5 sm:px-6">
      <div className="grid gap-2 pb-5 sm:grid-cols-3">
        <div className="rounded-[18px] bg-white/[0.03] px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Volume 12 semaines</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{formatCompact(totalGenerated)}</p>
          <p className="mt-0.5 text-[11px] text-white/55">Mails generes</p>
        </div>
        <div className="rounded-[18px] bg-white/[0.03] px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Rythme moyen</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{averageGenerated.toFixed(1)}</p>
          <p className="mt-0.5 text-[11px] text-white/55">Mails generes</p>
        </div>
        <div className="rounded-[18px] bg-white/[0.03] px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Objectif dominant</p>
          <p className="mt-1.5 text-base font-semibold leading-tight text-white">{getKpiObjectiveLabel(dominantObjective.objective)}</p>
          <p className="mt-0.5 text-[11px] text-white/55">{dominantObjective.count} redactions</p>
        </div>
      </div>

      <div className="border-t border-white/8 py-5">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold text-white">
            {activeView === "volume" ? "Mails generes" : "Repartition des objectifs"}
          </h4>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5">
            <button
              type="button"
              aria-pressed={activeView === "volume"}
              onClick={() => setActiveView("volume")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition-colors",
                activeView === "volume" ? "bg-white text-heading" : "text-white/62 hover:text-white"
              )}
            >
              Mails
            </button>
            <button
              type="button"
              aria-pressed={activeView === "objectives"}
              onClick={() => setActiveView("objectives")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition-colors",
                activeView === "objectives" ? "bg-white text-heading" : "text-white/62 hover:text-white"
              )}
            >
              Objectifs
            </button>
          </div>
        </div>

        <div className="relative mt-5 overflow-hidden">
          <div
            className="flex min-h-[26rem] w-[200%] transition-transform duration-300 ease-out"
            style={{ transform: activeView === "volume" ? "translateX(0%)" : "translateX(-50%)" }}
          >
            <section className="w-1/2 shrink-0 pr-4">
              <div className="flex h-full items-center rounded-[20px] bg-white/[0.02] px-1 py-2">
                <MailVolumeChart data={volumeData} />
              </div>
            </section>

            <section className="w-1/2 shrink-0 pl-4">
              <div className="grid h-full gap-6 lg:grid-cols-[minmax(16rem,18rem)_minmax(18rem,1fr)] lg:items-center">
                <ObjectiveDonut
                  objectives={snapshot.objectives}
                  selectedObjective={selectedObjective}
                  onSelect={(objective) => setSelectedObjectiveKey(objective.objective)}
                />

                <div className="grid gap-2.5 self-center">
                  {snapshot.objectives.map((objective) => {
                    const isSelected = selectedObjective.objective === objective.objective
                    const objectiveLineShare = (objective.count / Math.max(sum(snapshot.objectives.map((item) => item.count)), 1)) * 100
                    return (
                      <button
                        key={objective.objective}
                        type="button"
                        onClick={() => setSelectedObjectiveKey(objective.objective)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-[16px] px-3 py-1.5 text-left transition-colors",
                          isSelected ? "bg-white/[0.08]" : "bg-transparent hover:bg-white/[0.04]"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: objective.colorVar }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 text-sm text-white">{getObjectiveLabel(objective.objective)}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-white/66">
                          {objective.count}
                          {isSelected ? ` · ${objectiveLineShare.toFixed(0)}%` : ""}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
