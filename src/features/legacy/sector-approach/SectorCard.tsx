import React from 'react'
import Link from 'next/link'
import type { SectorStatus } from '@/types/sector'
import type { SectorListItem } from '@/lib/supabase/sector'
import { CircularGauge } from '../sector-study/blocks/CircularGauge'

export interface SectorCardProps {
  sector: SectorListItem
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

// Navy de fond des cartes secteur — la même valeur que le dégradé de superposition
// ci-dessous, extraite pour servir de fond aux secteurs sans visuel (image_url NULL).
// Sans elle, une carte sans image n'aurait aucun fond et son texte blanc deviendrait
// illisible : l'ancien fallback pointait vers /images/sectors/default.png, un fichier
// qui n'a jamais existé.
const SECTOR_CARD_NAVY = '#1A2540'

/**
 * Fond de carte : le visuel du secteur s'il en a un, sinon un aplat navy.
 * Le dégradé de superposition est appliqué par-dessus dans les deux cas, ce qui
 * garantit la lisibilité du texte blanc quelle que soit la présence d'une image.
 */
function SectorCardBackground({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return (
      <div
        className="absolute inset-0 select-none"
        style={{ backgroundColor: SECTOR_CARD_NAVY }}
      />
    )
  }

  return (
    <div
      className="absolute inset-0 bg-cover bg-center select-none"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  )
}

/**
 * SectorCardMobile - Compact, touch-friendly card representing a sector on mobile.
 * High touch target size, stacked column, simplified jauge.
 *
 * Un secteur non étudié (attractiveness_score NULL, typiquement status='watch')
 * n'affiche PAS de jauge : un 0/5 se lirait comme une évaluation alors qu'aucune
 * étude n'a encore été faite.
 */
export function SectorCardMobile({ sector }: SectorCardProps) {
  const statusBadge = STATUS_BADGES[sector.status] ?? 'bg-white/10 text-white/70 border border-white/15'
  const statusLabel = STATUS_LABELS[sector.status] ?? sector.status
  const maturityLabel = sector.digital_maturity ? MATURITY_LABELS[sector.digital_maturity] : 'Non renseignée'
  const hasScore = sector.attractiveness_score !== null

  const CardContent = (
    <div className="relative w-full h-[210px] rounded-xl overflow-hidden border border-border/10 flex flex-col justify-between transition-all duration-300 shadow-sm">
      <SectorCardBackground imageUrl={sector.image_url} />

      {/* Dark Cobalt/Navy Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A2540] via-[#1A2540]/70 to-[#1A2540]/25" />

      {/* Header Row */}
      <div className="relative z-10 p-3 flex items-start justify-between gap-1.5">
        <h3 className="text-xs font-bold text-white leading-tight drop-shadow-md line-clamp-2">
          {sector.name}
        </h3>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 backdrop-blur-sm ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Middle Attractiveness Gauge — seulement si le secteur a été étudié */}
      <div className="relative z-10 -mt-2 flex flex-col items-center justify-center">
        {hasScore ? (
          <>
            <CircularGauge
              score={sector.attractiveness_score ?? 0}
              size={52}
              strokeWidth={2.8}
              fontSizeClass="text-sm"
              subfontSizeClass="text-[6px]"
            />
            <span className="text-[7px] font-bold text-white/55 uppercase tracking-widest mt-1">
              Score d&apos;attractivité
            </span>
          </>
        ) : (
          <span className="rounded-full border border-dashed border-white/25 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-white/55">
            Étude à venir
          </span>
        )}
      </div>

      {/* Card Footer (Glassmorphism / Frosted Glass) */}
      <div className="relative z-10 backdrop-blur-md bg-white/5 border-t border-white/10 p-2.5 flex flex-col gap-1">
        {/* Maturity & Portfolio Stats */}
        <div className="grid grid-cols-2 gap-2 text-[9px]">
          {/* Digital Maturity */}
          <div className="flex items-center text-white/90">
            <svg className="w-3.5 h-3.5 mr-1 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            <span className="truncate block font-medium">{maturityLabel}</span>
          </div>

          {/* Portfolio (Accounts) */}
          <div className="flex items-center text-white/90">
            <svg className="w-3.5 h-3.5 mr-1 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="truncate block font-medium">
              {sector.companies_count} {sector.companies_count > 1 ? 'comptes' : 'compte'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Link href={`/legacy/etudes/${sector.slug}`} className="block outline-none min-h-[44px]">
      {CardContent}
    </Link>
  )
}
