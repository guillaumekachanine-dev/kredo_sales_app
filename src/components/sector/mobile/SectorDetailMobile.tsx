"use client"

import React, { useState } from 'react'
import type { SectorWithRelations } from '@/types/sector'
import { ScoreBar } from '../blocks/ScoreBar'
import { PracticesFit } from '../blocks/PracticesFit'
import { PainPointsList } from '../blocks/PainPointsList'
import { RegulatoryCalendar } from '../blocks/RegulatoryCalendar'
import { TriggerEventsList } from '../blocks/TriggerEventsList'
import { AccountsList } from '../blocks/AccountsList'
import { PlaybookPanel } from '../blocks/PlaybookPanel'
import { AppDrawer } from '@/components/ui/AppDrawer'

export interface SectorDetailMobileProps {
  sector: SectorWithRelations
}

const MATURITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
}

/**
 * SectorDetailMobile - Layout of the sector studies detailed page for mobile view.
 * Displays content vertically: Header, compact metrics grid, top 3 pain points with collapse/expand,
 * critical/high regulatory calendar items, and a sticky bottom sheet trigger for the commercial playbook.
 */
export function SectorDetailMobile({ sector }: SectorDetailMobileProps) {
  const [playbookOpen, setPlaybookOpen] = useState(false)
  const [painPointsExpanded, setPainPointsExpanded] = useState(false)

  const maturityLabel = sector.digital_maturity ? MATURITY_LABELS[sector.digital_maturity] : 'Non renseignée'

  // Filter regulatory calendar: critical and high urgency only
  const filteredRegulatory = sector.regulatory_items.filter(
    (item) => item.urgency === 'critical' || item.urgency === 'high'
  )

  // Pain points show top 3, expand to all
  const painPointsToShow = painPointsExpanded
    ? sector.pain_points
    : sector.pain_points.slice(0, 3)

  const hasMorePainPoints = sector.pain_points.length > 3

  return (
    <div className="space-y-5 pb-24">
      {/* Header (Name, score, status) */}
      <div className="bg-surface border border-border p-4 rounded flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-sm font-bold text-heading leading-snug">{sector.name}</h1>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15 shrink-0">
            {sector.status === 'active' ? 'Actif' : sector.status === 'development' ? 'Développement' : 'Veille'}
          </span>
        </div>

        {/* Score info */}
        <div className="border-t border-border/30 pt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">Attractivité</span>
            <span className="font-bold text-primary">
              {sector.attractiveness_score !== null ? `${sector.attractiveness_score.toFixed(1)}/5.0` : '—'}
            </span>
          </div>
          <ScoreBar score={sector.attractiveness_score ?? 0} />
        </div>
      </div>

      {/* Metrics Section (Compact cards) */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Market Size & Growth */}
        <div className="bg-surface border border-border p-3 rounded flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Marché</span>
          <span className="font-bold text-heading">
            {sector.market_size_eur_bn !== null ? `${sector.market_size_eur_bn.toFixed(1)} Md€` : '—'}
          </span>
          {sector.market_growth_pct !== null && (
            <span className="text-[10px] text-success font-semibold">
              +{sector.market_growth_pct.toFixed(1)}% / an
            </span>
          )}
        </div>

        {/* TJM */}
        <div className="bg-surface border border-border p-3 rounded flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider">TJM Moyen</span>
          <span className="font-bold text-heading">
            {sector.avg_tjm_min !== null && sector.avg_tjm_max !== null
              ? `${sector.avg_tjm_min} - ${sector.avg_tjm_max} €`
              : sector.avg_tjm_min !== null
              ? `>= ${sector.avg_tjm_min} €`
              : '—'}
          </span>
          <span className="text-[10px] text-muted font-medium">Taux journalier</span>
        </div>

        {/* Digital Maturity */}
        <div className="bg-surface border border-border p-3 rounded flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Maturité Digitale</span>
          <span className="font-bold text-heading">{maturityLabel}</span>
          <span className="text-[10px] text-muted font-medium">Niveau du secteur</span>
        </div>

        {/* Practices Fit */}
        <div className="bg-surface border border-border p-3 rounded flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Comptes liés</span>
          <span className="font-bold text-heading">
            {sector.companies.length} {sector.companies.length > 1 ? 'comptes' : 'compte'}
          </span>
          <span className="text-[10px] text-muted font-medium">Au portefeuille</span>
        </div>
      </div>

      {/* Pain Points (Top 3 expand/collapse) */}
      <div className="bg-surface border border-border p-4 rounded">
        <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
          Points de douleur ({sector.pain_points.length})
        </h2>
        <PainPointsList items={painPointsToShow} hasError={sector.errors?.pain_points} />
        {hasMorePainPoints && (
          <button
            onClick={() => setPainPointsExpanded(!painPointsExpanded)}
            className="w-full text-center text-[10px] font-bold text-primary uppercase tracking-wider pt-3 mt-3 border-t border-border/30 active:opacity-75 cursor-pointer outline-none"
          >
            {painPointsExpanded ? 'Réduire' : 'Voir plus de points de douleur'}
          </button>
        )}
      </div>

      {/* Regulatory Calendar (Critical & High only) */}
      <div className="bg-surface border border-border p-4 rounded">
        <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
          Alertes Réglementations ({filteredRegulatory.length})
        </h2>
        <RegulatoryCalendar items={filteredRegulatory} hasError={sector.errors?.regulatory_items} />
      </div>

      {/* Practices Fit details */}
      <div className="bg-surface border border-border p-4 rounded">
        <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
          Adéquation practices
        </h2>
        <PracticesFit fit={sector.practices_fit} />
      </div>

      {/* Trigger Events */}
      <div className="bg-surface border border-border p-4 rounded">
        <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
          Événements déclencheurs
        </h2>
        <TriggerEventsList items={sector.events} hasError={sector.errors?.events} />
      </div>

      {/* Related companies */}
      <div className="bg-surface border border-border p-4 rounded">
        <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
          Comptes associés
        </h2>
        <AccountsList companies={sector.companies} hasError={sector.errors?.companies} />
      </div>

      {/* Sticky Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-canvas via-canvas/95 to-transparent border-t border-border/30 z-50">
        <button
          onClick={() => setPlaybookOpen(true)}
          className="w-full bg-primary hover:bg-primary-deep text-primary-fg font-bold text-xs py-3 px-4 rounded transition-colors active:scale-98 duration-100 cursor-pointer outline-none"
        >
          Playbook commercial
        </button>
      </div>

      {/* Playbook Bottom Sheet */}
      <AppDrawer
        open={playbookOpen}
        onOpenChange={setPlaybookOpen}
        title="Playbook Commercial"
        subtitle={sector.name}
        side="bottom"
      >
        <div className="px-1 py-2">
          <PlaybookPanel playbook={sector.playbook} />
        </div>
      </AppDrawer>
    </div>
  )
}
