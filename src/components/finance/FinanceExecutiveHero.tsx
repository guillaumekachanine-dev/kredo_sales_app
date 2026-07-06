"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface FinanceExecutiveHeroProps {
  executive: {
    revenueYtd: number
    grossMarginYtd: number
    grossMarginPctYtd: number
    operatingProfitYtd: number
    weightedPipe: number
    projectedLanding: number
    message: string
    messageTone: "positive" | "warning" | "danger"
  }
  annualTarget?: number
}

export function FinanceExecutiveHero({ executive, annualTarget = 2_400_000 }: FinanceExecutiveHeroProps) {
  const {
    revenueYtd,
    grossMarginYtd,
    grossMarginPctYtd,
    operatingProfitYtd,
    weightedPipe,
    projectedLanding,
    message,
    messageTone,
  } = executive

  const pctProgress = Math.min(100, (projectedLanding / annualTarget) * 100)
  const revenueProgress = Math.max(0, Math.min(100, (revenueYtd / annualTarget) * 100))
  const pipeProgress = Math.max(0, Math.min(100 - revenueProgress, (weightedPipe / annualTarget) * 100))
  const remainingToTarget = annualTarget - projectedLanding
  const gaugeCircumference = 100
  const gaugeRest = Math.max(0, gaugeCircumference - pctProgress)

  const toneConfig = {
    danger: {
      shell: "border-danger/30 bg-danger/[0.08] text-danger",
      dot: "bg-danger",
      halo: "shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-danger)_10%,transparent)]",
      rail: "from-danger via-accent to-brand-brass",
    },
    warning: {
      shell: "border-warning/30 bg-warning/[0.1] text-warning",
      dot: "bg-warning",
      halo: "shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-warning)_12%,transparent)]",
      rail: "from-warning via-brand-brass to-primary",
    },
    positive: {
      shell: "border-success/30 bg-success/[0.08] text-success",
      dot: "bg-success",
      halo: "shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-success)_10%,transparent)]",
      rail: "from-success via-domain-finance to-brand-brass",
    },
  }[messageTone]

  const kpis = [
    {
      label: "Réalisé YTD",
      value: formatEuroCompact(revenueYtd),
      context: "CA encaissé",
      tone: "text-heading",
    },
    {
      label: "Marge brute",
      value: formatPct(grossMarginPctYtd),
      context: formatEuroCompact(grossMarginYtd),
      tone: "text-success",
    },
    {
      label: "Résultat op.",
      value: formatEuroCompact(operatingProfitYtd),
      context: "YTD consolidé",
      tone: operatingProfitYtd >= 0 ? "text-heading" : "text-danger",
    },
    {
      label: "Pipe pondéré",
      value: formatEuroCompact(weightedPipe),
      context: "CRM actif",
      tone: "text-brand-brass",
    },
  ]

  return (
    <SurfaceCard
      padding="none"
      radius="xl"
      className="mb-6 border-domain-finance/25 bg-surface"
      style={{
        background:
          "radial-gradient(circle at 78% 10%, color-mix(in srgb, var(--color-brand-brass) 18%, transparent) 0, transparent 30%), radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0, transparent 28%), linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-domain-finance) 9%, var(--color-surface)) 100%)",
      }}
    >
      <div className="relative overflow-hidden px-5 py-5 lg:px-6 lg:py-6">
        <div className="pointer-events-none absolute inset-x-6 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-primary)_7%,transparent)_1px,transparent_1px),linear-gradient(0deg,color-mix(in_srgb,var(--color-domain-finance)_9%,transparent)_1px,transparent_1px)] bg-[size:42px_42px] opacity-60" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_340px] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("size-2.5 rounded-full", toneConfig.dot, toneConfig.halo)} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Cockpit de rentabilité & atterrissage
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <h2 className="font-heading text-[clamp(2rem,4vw,3.75rem)] font-extrabold leading-none text-heading">
                  {formatEuroCompact(projectedLanding)}
                </h2>
                <div className="pb-1">
                  <p className="text-sm font-semibold text-body">
                    atterrissage projeté
                  </p>
                  <p className="text-xs text-muted">
                    vs {formatEuroCompact(annualTarget)} cible annuelle
                  </p>
                </div>
              </div>

              <div className={cn("mt-2 max-w-2xl rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed", toneConfig.shell)}>
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", toneConfig.dot)} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Statut cockpit</span>
                </div>
                {message}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                <span>Piste annuelle</span>
                <span>{pctProgress.toFixed(0)}%</span>
              </div>
              <div className="relative h-7 overflow-hidden rounded-full border border-border/70 bg-surface/70 shadow-inner">
                <div className="absolute inset-y-0 left-0 flex w-full">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${revenueProgress}%` }}
                  />
                  <div
                    className="h-full bg-brand-brass"
                    style={{ width: `${pipeProgress}%` }}
                  />
                </div>
                <div className={cn("pipeline-shine-beam", `bg-gradient-to-r ${toneConfig.rail}`)} />
                <div className="absolute inset-y-0 left-[75%] w-px bg-heading/25" />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-primary" />
                  Réalisé {formatEuroCompact(revenueYtd)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-brand-brass" />
                  Pipe {formatEuroCompact(weightedPipe)}
                </span>
                <span className="font-medium text-body">
                  {remainingToTarget > 0
                    ? `${formatEuroCompact(remainingToTarget)} à sécuriser`
                    : `${formatEuroCompact(Math.abs(remainingToTarget))} au-dessus cible`}
                </span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto flex size-[260px] items-center justify-center lg:mx-0 lg:justify-self-end">
            <div className="absolute inset-0 rounded-full bg-surface/70 shadow-[inset_0_0_0_1px_var(--color-border)]" />
            <svg className="relative size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="44" fill="none" stroke="var(--color-border)" strokeWidth="10" opacity="0.75" />
              <circle
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke="var(--color-domain-finance)"
                strokeLinecap="round"
                strokeWidth="10"
                pathLength={gaugeCircumference}
                strokeDasharray={`${pctProgress} ${gaugeRest}`}
              />
              <circle
                cx="60"
                cy="60"
                r="31"
                fill="none"
                stroke="var(--color-brand-brass)"
                strokeLinecap="round"
                strokeWidth="4"
                pathLength={gaugeCircumference}
                strokeDasharray={`${Math.min(100, (weightedPipe / Math.max(projectedLanding, 1)) * 100)} 100`}
                opacity="0.9"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Couverture</span>
              <span className="mt-1 font-heading text-4xl font-extrabold text-heading">{pctProgress.toFixed(0)}%</span>
              <span className="mt-1 max-w-32 text-xs leading-snug text-body">objectif annuel sécurisé + pondéré</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl bg-surface/70 px-4 py-3 ring-1 ring-border/60 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{kpi.label}</p>
              <p className={cn("mt-1 text-xl font-extrabold", kpi.tone)}>{kpi.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-body">{kpi.context}</p>
            </div>
          ))}
        </div>
      </div>
    </SurfaceCard>
  )
}
