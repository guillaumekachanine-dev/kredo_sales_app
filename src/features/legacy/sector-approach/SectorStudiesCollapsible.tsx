"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDateTime } from "@/lib/formatters"
import type {
  SectorActivationStudy,
  SectorPreparationStudy,
} from "@/lib/prospection/sector-activation-types"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import { Button } from "@/components/ui/Button"
import { SECTOR_STATUS_LABELS } from "./sector-activation-ui"

export function SectorStudiesCollapsible({
  available,
  preparing,
  lastUpdatedAt,
}: {
  available: SectorActivationStudy[]
  preparing: SectorPreparationStudy[]
  lastUpdatedAt: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <SurfaceCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-heading">
              Études sectorielles
            </h2>
            <StatusPill label={`${available.length} disponibles`} variant="success" />
            <StatusPill label={`${preparing.length} en préparation`} variant="draft" />
          </div>
          <p className="text-sm leading-6 text-body">
            Bibliothèque secondaire des études existantes, distincte du cockpit d&apos;activation.
          </p>
          <p className="text-xs text-muted">
            Dernière mise à jour: {formatDateTime(lastUpdatedAt)}
          </p>
        </div>

        <Button
          variant={open ? "secondary" : "primary"}
          size="sm"
          aria-expanded={open}
          aria-controls="sector-studies-panel"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Masquer" : "Afficher"}
        </Button>
      </div>

      {open ? (
        <div id="sector-studies-panel" className="mt-5 space-y-6 border-t border-border pt-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-heading">Disponibles</h3>
            <div className="grid gap-3 xl:grid-cols-2">
              {available.map((study) => (
                <SurfaceCard key={study.slug} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-heading">{study.name}</p>
                        <StatusPill label={SECTOR_STATUS_LABELS[study.status]} variant="neutral" />
                      </div>
                      <p className="text-sm text-body">
                        Attractivité {study.attractivenessScore?.toFixed(1) ?? "—"} / 5
                      </p>
                      <p className="text-xs text-muted">
                        {study.linkedAccountCount} comptes liés · {study.openWindowCount} fenêtres ouvertes
                      </p>
                    </div>
                    <Link
                      href={`/legacy/etudes/${study.slug}`}
                      className="text-sm font-medium text-primary hover:text-primary-deep"
                    >
                      Ouvrir l&apos;étude
                    </Link>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-heading">En préparation</h3>
            <div className="grid gap-3 xl:grid-cols-2">
              {preparing.map((study) => (
                <SurfaceCard key={study.slug} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-heading">{study.name}</p>
                      <p className="text-xs text-muted">
                        {study.linkedAccountCount} comptes rattachés · étude non produite
                      </p>
                    </div>
                    <StatusPill label="En préparation" variant="draft" />
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </SurfaceCard>
  )
}
