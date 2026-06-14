import React from 'react'
import Link from 'next/link'
import type { SectorStatus, PracticeKey } from '@/types/sector'
import type { SectorListItem } from '@/lib/supabase/sector'
import { CircularGauge } from './blocks/CircularGauge'

export interface SectorCardProps {
  sector: SectorListItem & { image_url?: string }
}

const STATUS_BADGES: Record<SectorStatus, string> = {
  active: 'bg-success/20 text-success border border-success/35',
  development: 'bg-warning/20 text-warning border border-warning/35',
  watch: 'bg-white/10 text-white/70 border border-white/15',
}

const STATUS_LABELS: Record<SectorStatus, string> = {
  active: 'Actif',
  development: 'En développement',
  watch: 'Sous veille',
}

const MATURITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Forte',
}

const PRACTICE_LABELS: Record<PracticeKey, string> = {
  data_ai: 'Data & AI',
  cloud_eng: 'Cloud Eng',
  product: 'Product',
  cyber: 'Cyber',
}

/**
 * SectorCardDesktop - Premium 2x2 Grid card representing a sector on desktop.
 * Background image, dark gradient overlay, central circular gauge, glassmorphic footer.
 */
export function SectorCardDesktop({ sector }: SectorCardProps) {
  const statusBadge = STATUS_BADGES[sector.status] ?? 'bg-white/10 text-white/70 border border-white/15'
  const statusLabel = STATUS_LABELS[sector.status] ?? sector.status
  const maturityLabel = sector.digital_maturity ? MATURITY_LABELS[sector.digital_maturity] : 'Non renseignée'

  // Sort and pick top 2 practices fit
  const sortedPractices = Object.entries(sector.practices_fit || {})
    .map(([key, value]) => ({ key: key as PracticeKey, value }))
    .sort((a, b) => b.value - a.value)
  const top2 = sortedPractices.slice(0, 2)

  // Is this card clickable? (Only if it's the active one matching Parfumerie, aromas, cosmetics slug)
  const isClickable = sector.slug === 'parfumerie-aromes'
  
  const CardContent = (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-border/20 flex flex-col justify-between transition-all duration-300 group shadow-sm">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${sector.image_url || '/images/sectors/default.png'})` }}
      />
      
      {/* Dark Cobalt/Navy Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A2540] via-[#1A2540]/65 to-[#1A2540]/15" />
      
      {/* Card Header (Internal) */}
      <div className="relative z-10 p-5 flex items-start justify-between gap-4">
        <h3 className="text-base font-bold text-white leading-tight drop-shadow-md group-hover:text-secondary transition-colors">
          {sector.name}
        </h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 backdrop-blur-sm ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Main Visual (Donut Attractiveness Gauge) */}
      <div className="relative z-10 flex flex-col items-center justify-center -mt-4">
        <CircularGauge score={sector.attractiveness_score ?? 0} size={92} strokeWidth={3.8} />
        <span className="text-[10px] font-bold text-white/55 uppercase tracking-widest mt-2">
          Score d&apos;attractivité
        </span>
      </div>

      {/* Card Footer (Glassmorphism / Frosted Glass) */}
      <div className="relative z-10 backdrop-blur-md bg-white/5 border-t border-white/10 p-4 flex flex-col gap-3">
        {/* Maturity & Portfolio Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Digital Maturity */}
          <div className="flex items-center text-white/90">
            {/* Chart/Bars Icon */}
            <svg className="w-4 h-4 mr-2 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            <div>
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block leading-none mb-0.5">
                Maturité
              </span>
              <span className="font-semibold">{maturityLabel}</span>
            </div>
          </div>

          {/* Portfolio (Accounts) */}
          <div className="flex items-center text-white/90">
            {/* Building Icon */}
            <svg className="w-4 h-4 mr-2 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block leading-none mb-0.5">
                Portefeuille
              </span>
              <span className="font-semibold">
                {sector.companies_count} {sector.companies_count > 1 ? 'comptes' : 'compte'}
              </span>
            </div>
          </div>
        </div>

        {/* Practice Fit Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
          {top2.map(({ key, value }) => {
            const label = PRACTICE_LABELS[key] ?? key
            return (
              <span
                key={key}
                className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/10 border border-white/10 text-white/95"
              >
                {label} : {value.toFixed(1)}/5
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (isClickable) {
    return (
      <Link href={`/prospection/approche-sectorielle/${sector.slug}`} className="block outline-none">
        {CardContent}
      </Link>
    )
  }

  return (
    <div className="cursor-not-allowed opacity-90">
      {CardContent}
    </div>
  )
}

/**
 * SectorCardMobile - Compact, touch-friendly card representing a sector on mobile.
 * High touch target size, stacked column, simplified jauge.
 */
export function SectorCardMobile({ sector }: SectorCardProps) {
  const statusBadge = STATUS_BADGES[sector.status] ?? 'bg-white/10 text-white/70 border border-white/15'
  const statusLabel = STATUS_LABELS[sector.status] ?? sector.status
  const maturityLabel = sector.digital_maturity ? MATURITY_LABELS[sector.digital_maturity] : 'Non renseignée'

  const sortedPractices = Object.entries(sector.practices_fit || {})
    .map(([key, value]) => ({ key: key as PracticeKey, value }))
    .sort((a, b) => b.value - a.value)
  const top2 = sortedPractices.slice(0, 2)

  const isClickable = sector.slug === 'parfumerie-aromes'

  const CardContent = (
    <div className="relative w-full min-h-[160px] rounded-lg overflow-hidden border border-border/10 flex flex-col justify-between transition-all duration-300 p-4 shadow-sm">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none"
        style={{ backgroundImage: `url(${sector.image_url || '/images/sectors/default.png'})` }}
      />
      
      {/* Dark Cobalt/Navy Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A2540] via-[#1A2540]/70 to-[#1A2540]/30" />

      {/* Header Row */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-white leading-tight drop-shadow-md">
          {sector.name}
        </h3>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 backdrop-blur-sm ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Middle/Footer Row: Gauge on one side, details on the other */}
      <div className="relative z-10 flex items-end justify-between gap-4 mt-4">
        {/* Left Side: Stats and Badges */}
        <div className="space-y-2.5">
          {/* Quick Metrics */}
          <div className="flex gap-4 text-[10px] text-white/95">
            <span className="flex items-center font-medium">
              <svg className="w-3.5 h-3.5 mr-1 text-white/55 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              {maturityLabel}
            </span>
            <span className="flex items-center font-medium">
              <svg className="w-3.5 h-3.5 mr-1 text-white/55 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {sector.companies_count} {sector.companies_count > 1 ? 'comptes' : 'compte'}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {top2.map(({ key, value }) => (
              <span
                key={key}
                className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/5 text-white/90"
              >
                {PRACTICE_LABELS[key] ?? key} : {value.toFixed(1)}/5
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Small Circular Gauge */}
        <div className="shrink-0 flex flex-col items-center">
          <CircularGauge score={sector.attractiveness_score ?? 0} size={54} strokeWidth={3} showLabel={true} />
        </div>
      </div>
    </div>
  )

  if (isClickable) {
    return (
      <Link href={`/prospection/approche-sectorielle/${sector.slug}`} className="block outline-none min-h-[44px]">
        {CardContent}
      </Link>
    )
  }

  return (
    <div className="cursor-not-allowed opacity-90 min-h-[44px]">
      {CardContent}
    </div>
  )
}
