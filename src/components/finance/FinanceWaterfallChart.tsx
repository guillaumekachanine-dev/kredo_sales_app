"use client"

import React from "react"
import { formatEuroCompact } from "@/lib/formatters"

interface FinanceWaterfallChartProps {
  revenue: number
  salaries: number
  subcontracting: number
  structural: number
  operatingProfit: number
}

export function FinanceWaterfallChart({
  revenue,
  salaries,
  subcontracting,
  structural,
  operatingProfit,
}: FinanceWaterfallChartProps) {
  if (!revenue) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Données waterfall indisponibles
      </div>
    )
  }

  const W = 700
  const H = 260
  const mL = 70
  const mR = 20
  const mT = 30
  const mB = 45

  const plotW = W - mL - mR
  const plotH = H - mT - mB
  const scale = plotH / revenue

  const stepW = plotW / 5
  const barW = stepW * 0.55
  const padX = (stepW - barW) / 2

  // Coordonnées :
  const caY = mT + plotH - revenue * scale
  const caH = revenue * scale

  const salY = caY
  const salH = salaries * scale

  const subY = caY + salH
  const subH = subcontracting * scale

  const strY = subY + subH
  const strH = structural * scale

  const opVal = operatingProfit
  const opY = mT + plotH - Math.max(0, opVal) * scale
  const opH = Math.abs(opVal) * scale

  const bars = [
    {
      label: "CA YTD",
      y: caY,
      h: caH,
      val: revenue,
      color: "var(--color-primary)",
      type: "positive"
    },
    {
      label: "Salaires",
      y: salY,
      h: salH,
      val: -salaries,
      color: "var(--color-danger)",
      type: "negative"
    },
    {
      label: "Sous-traitance",
      y: subY,
      h: subH,
      val: -subcontracting,
      color: "var(--color-accent)",
      type: "negative"
    },
    {
      label: "Structure",
      y: strY,
      h: strH,
      val: -structural,
      color: "var(--color-status-neutral)",
      type: "negative"
    },
    {
      label: "Résultat Op.",
      y: opY,
      h: opH,
      val: opVal,
      color: opVal >= 0 ? "var(--color-success)" : "var(--color-danger)",
      type: "total"
    }
  ]

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" aria-label="Waterfall P&L">
        {/* Lignes de repère */}
        <line
          x1={mL} x2={W - mR}
          y1={mT + plotH} y2={mT + plotH}
          stroke="var(--color-border-strong)"
          strokeWidth={1.5}
        />
        <line
          x1={mL} x2={W - mR}
          y1={mT} y2={mT}
          stroke="var(--color-border)"
          strokeOpacity={0.4}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Lignes de liaison de la cascade */}
        {/* CA -> Salaires */}
        <line
          x1={mL + barW + padX}
          x2={mL + stepW + padX}
          y1={caY}
          y2={caY}
          stroke="var(--color-border-strong)"
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />
        {/* Salaires -> Sous-traitance */}
        <line
          x1={mL + stepW + barW + padX}
          x2={mL + stepW * 2 + padX}
          y1={salY + salH}
          y2={salY + salH}
          stroke="var(--color-border-strong)"
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />
        {/* Sous-traitance -> Structure */}
        <line
          x1={mL + stepW * 2 + barW + padX}
          x2={mL + stepW * 3 + padX}
          y1={subY + subH}
          y2={subY + subH}
          stroke="var(--color-border-strong)"
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />
        {/* Structure -> Résultat Op. */}
        <line
          x1={mL + stepW * 3 + barW + padX}
          x2={mL + stepW * 4 + padX}
          y1={strY + strH}
          y2={strY + strH}
          stroke="var(--color-border-strong)"
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />

        {/* Rendu des barres */}
        {bars.map((bar, i) => {
          const x = mL + i * stepW + padX
          const isNegative = bar.type === "negative"
          const displayVal = bar.val > 0 ? `+${formatEuroCompact(bar.val)}` : formatEuroCompact(bar.val)

          return (
            <g key={bar.label}>
              {/* Rectangle de la barre */}
              <rect
                x={x}
                y={bar.y}
                width={barW}
                height={Math.max(2, bar.h)}
                fill={bar.color}
                opacity={0.85}
                rx={3}
              />
              
              {/* Valeurs chiffrées au-dessus */}
              <text
                x={x + barW / 2}
                y={bar.y - 8}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={isNegative ? "var(--color-danger)" : bar.type === "positive" ? "var(--color-primary)" : "var(--color-success)"}
                className="font-sans"
              >
                {displayVal}
              </text>

              {/* Étiquette X */}
              <text
                x={x + barW / 2}
                y={H - 12}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill="var(--color-heading)"
              >
                {bar.label}
              </text>
            </g>
          )
        })}

        {/* Échelle Y */}
        {[0, 0.5, 1].map((ratio) => {
          const val = revenue * ratio
          const y = mT + plotH - val * scale
          return (
            <g key={ratio}>
              <text
                x={mL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fontWeight={600}
                fill="var(--color-muted)"
              >
                {formatEuroCompact(val)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
