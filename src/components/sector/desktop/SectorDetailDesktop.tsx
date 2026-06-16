import React from 'react'
import type { SectorWithRelations } from '@/types/sector'
import { ScoreBar } from '../blocks/ScoreBar'
import { PracticesFit } from '../blocks/PracticesFit'
import { PainPointsList } from '../blocks/PainPointsList'
import { RegulatoryCalendar } from '../blocks/RegulatoryCalendar'
import { TriggerEventsList } from '../blocks/TriggerEventsList'
import { AccountsList } from '../blocks/AccountsList'
import { PlaybookPanel } from '../blocks/PlaybookPanel'

export interface SectorDetailDesktopProps {
  sector: SectorWithRelations
}

const MATURITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
}

/**
 * SectorDetailDesktop - Layout of the sector studies detailed page for desktop view.
 * Layout 2 columns:
 *  - Left column (2/3): Description, PainPointsList, RegulatoryCalendar, TriggerEventsList, AccountsList
 *  - Right column (1/3): ScoreBar, metrics, PracticesFit, PlaybookPanel
 */
export function SectorDetailDesktop({ sector }: SectorDetailDesktopProps) {
  const maturityLabel = sector.digital_maturity ? MATURITY_LABELS[sector.digital_maturity] : 'Non renseignée'

  return (
    <div className="space-y-6">
      {/* Sector Header */}
      <div className="bg-surface border border-border p-6 rounded flex items-start justify-between gap-6">
        <div>
          <h1 className="text-lg font-black text-heading leading-tight font-heading">{sector.name}</h1>
          {sector.description && (
            <p className="text-xs text-body mt-2 leading-relaxed max-w-3xl">{sector.description}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Statut</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
            {sector.status === 'active' ? 'Actif' : sector.status === 'development' ? 'En développement' : 'Sous veille'}
          </span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pain Points */}
          <div className="bg-surface border border-border p-5 rounded">
            <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-4 font-heading border-b border-border/40 pb-2">
              Points de douleur identifiés (Pain Points)
            </h2>
            <PainPointsList items={sector.pain_points} hasError={sector.errors?.pain_points} />
          </div>

          {/* Regulatory Calendar */}
          <div className="bg-surface border border-border p-5 rounded">
            <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-4 font-heading border-b border-border/40 pb-2">
              Calendrier réglementaire & commercial
            </h2>
            <RegulatoryCalendar items={sector.regulatory_items} hasError={sector.errors?.regulatory_items} />
          </div>

          {/* Trigger Events */}
          <div className="bg-surface border border-border p-5 rounded">
            <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-4 font-heading border-b border-border/40 pb-2">
              Événements déclencheurs (Trigger Events)
            </h2>
            <TriggerEventsList items={sector.events} hasError={sector.errors?.events} />
          </div>

          {/* Accounts List */}
          <div className="bg-surface border border-border p-5 rounded">
            <h2 className="text-xs font-bold text-heading uppercase tracking-wider mb-4 font-heading border-b border-border/40 pb-2">
              Comptes rattachés au portefeuille
            </h2>
            <AccountsList companies={sector.companies} hasError={sector.errors?.companies} />
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Attractiveness & Metrics */}
          <div className="bg-surface border border-border p-5 rounded space-y-4">
            <div>
              <h3 className="text-[10px] font-bold text-heading font-heading uppercase tracking-wider mb-2">
                Score d&apos;attractivité
              </h3>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-3xl font-black text-primary leading-none">
                  {sector.attractiveness_score !== null ? sector.attractiveness_score.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-muted">/ 5.0</span>
              </div>
              <ScoreBar score={sector.attractiveness_score ?? 0} />
            </div>

            {/* Metrics List */}
            <div className="border-t border-border/40 pt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted font-medium">Taille du marché</span>
                <span className="font-bold text-heading">
                  {sector.market_size_eur_bn !== null ? `${sector.market_size_eur_bn.toFixed(1)} Md€` : '—'}
                  {sector.market_growth_pct !== null ? ` (+${sector.market_growth_pct.toFixed(1)}%)` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted font-medium">Maturité digitale</span>
                <span className="font-bold text-heading">{maturityLabel}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted font-medium">TJM Moyen (min / max)</span>
                <span className="font-bold text-heading">
                  {sector.avg_tjm_min !== null && sector.avg_tjm_max !== null
                    ? `${sector.avg_tjm_min} € - ${sector.avg_tjm_max} €`
                    : sector.avg_tjm_min !== null
                    ? `>= ${sector.avg_tjm_min} €`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Practices Fit */}
          <div className="bg-surface border border-border p-5 rounded">
            <h3 className="text-[10px] font-bold text-heading font-heading uppercase tracking-wider border-b border-border/40 pb-2 mb-3">
              Adéquation Practices Kredo
            </h3>
            <PracticesFit fit={sector.practices_fit} />
          </div>

          {/* Playbook commercial */}
          <div className="bg-surface border border-border p-5 rounded">
            <h3 className="text-[10px] font-bold text-heading font-heading uppercase tracking-wider border-b border-border/40 pb-2 mb-3">
              Playbook commercial
            </h3>
            <PlaybookPanel playbook={sector.playbook} />
          </div>
        </div>
      </div>
    </div>
  )
}
