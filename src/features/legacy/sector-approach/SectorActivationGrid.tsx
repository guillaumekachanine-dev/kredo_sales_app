"use client"

import Link from "next/link"
import type { SectorActivationSector } from "@/lib/prospection/sector-activation-types"
import { EmptyState } from "@/components/dashboard/widgets/EmptyState"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  ACTIVATION_STATE_LABELS,
  describeActivationState,
  getActivationStateAccent,
  getActivationStateVariant,
  getCoverageText,
  PRACTICE_LABELS,
  SECTOR_STATUS_LABELS,
} from "./sector-activation-ui"

export function SectorActivationGrid({
  sectors,
}: {
  sectors: SectorActivationSector[]
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold text-heading">
          Activation par secteur
        </h2>
        <p className="text-sm leading-6 text-body">
          Lecture compacte des secteurs réellement couverts en base, avec leur niveau d&apos;activation et leur capacité de conversion.
        </p>
      </div>

      {sectors.length === 0 ? (
        <EmptyState
          title="Aucun secteur visible"
          description="Aucun secteur réel en base ne correspond aux filtres actifs."
          className="min-h-[16rem]"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sectors.map((sector) => (
            <SurfaceCard
              key={sector.id}
              accent={getActivationStateAccent(sector.activationState)}
              className="p-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-heading">{sector.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        label={SECTOR_STATUS_LABELS[sector.status]}
                        variant="neutral"
                      />
                      <StatusPill
                        label={ACTIVATION_STATE_LABELS[sector.activationState]}
                        variant={getActivationStateVariant(sector.activationState)}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/legacy/etudes/${sector.slug}`}
                    className="text-sm font-medium text-primary hover:text-primary-deep"
                  >
                    Ouvrir l&apos;étude
                  </Link>
                </div>

                <dl className="grid gap-x-4 gap-y-2 rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-3 text-sm min-[1280px]:grid-cols-3">
                  <Metric label="Practice dominante" value={PRACTICE_LABELS[sector.topPracticeKey]} />
                  <Metric label="Fenêtres ouvertes" value={String(sector.openWindowCount)} />
                  <Metric label="Comptes liés" value={String(sector.linkedAccountCount)} />
                  <Metric
                    label="Reach moyen"
                    value={sector.averageReachScore === null ? "—" : `${sector.averageReachScore} / 100`}
                  />
                  <Metric
                    label="Couverture des données"
                    value={getCoverageText(sector.coveredAccountCount, sector.linkedAccountCount)}
                  />
                </dl>

                <p className="text-sm leading-6 text-body">
                  {describeActivationState(sector)}
                </p>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-heading">{value}</dd>
    </div>
  )
}
