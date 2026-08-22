"use client"

import React from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

function formatRevenue(actor: CompetitiveMapActor): string {
  if (actor.revenueEstimateMeur === null) return "Non disponible"
  const value = actor.revenueEstimateMeur >= 1_000
    ? `${(actor.revenueEstimateMeur / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md€`
    : `${actor.revenueEstimateMeur.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M€`
  return actor.revenueExercice ? `${value} (${actor.revenueExercice})` : value
}

type DetailBlockProps = {
  title: string
  value?: string | null
  items?: string[]
  tone?: "default" | "warning"
}

function DetailBlock({ title, value, items = [], tone = "default" }: DetailBlockProps) {
  const visibleItems = items.filter((item) => item.trim().length > 0)
  if (!value && visibleItems.length === 0) return null

  return (
    <div className="rounded-lg border border-edito-border/70 bg-edito-canvas/40 p-3.5">
      <h3 className={`text-[10px] font-bold uppercase tracking-wider ${tone === "warning" ? "text-status-warning-ink" : "text-edito-muted"}`}>
        {title}
      </h3>
      {value ? (
        <p className="mt-1.5 text-xs leading-relaxed text-edito-body whitespace-pre-line">{value}</p>
      ) : null}
      {visibleItems.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-edito-body">
          {visibleItems.map((item, index) => (
            <li key={`${item}-${index}`} className="border-l-2 border-edito-border pl-2.5">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export type SectorAccountDrillDownDialogProps = {
  actor: CompetitiveMapActor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SectorAccountDrillDownDialog({
  actor,
  open,
  onOpenChange,
}: SectorAccountDrillDownDialogProps) {
  if (!actor) return null

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      className="w-[min(calc(100vw-2rem),48rem)] max-w-full sm:max-w-2xl"
      maxHeightClassName="max-h-[min(calc(100dvh-2rem),52rem)]"
      title={
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
              {actor.categoryLabel}
            </span>
            {actor.isBenchmarkAccount ? (
              <span className="rounded border border-edito-brass/40 bg-edito-brass/10 px-1.5 py-0.5 text-[9px] font-bold text-edito-brass">
                ★ Compte étalon
              </span>
            ) : null}
            <span className="text-[10px] font-medium text-edito-muted">
              Confiance {actor.confidence}
            </span>
          </div>
          <h2 className="mt-1 font-heading text-lg font-bold text-edito-navy sm:text-xl">
            {actor.name}
          </h2>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Grille des scores */}
        <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-edito-border bg-edito-canvas/60 p-3 sm:grid-cols-4">
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-edito-muted">
              Empreinte métier
            </span>
            <span className="mt-0.5 block font-heading text-base font-bold text-edito-navy">
              {actor.businessFootprintScore !== null ? `${actor.businessFootprintScore} / 5` : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-edito-muted">
              Maturité numérique
            </span>
            <span className="mt-0.5 block font-heading text-base font-bold text-edito-navy">
              {actor.digitalMaturityScore !== null ? `${actor.digitalMaturityScore} / 5` : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-edito-muted">
              Appétence
            </span>
            <span className="mt-0.5 flex items-baseline gap-1.5 font-heading text-base font-bold text-edito-navy">
              {actor.appetenceScore !== null ? `${actor.appetenceScore} / 35` : "—"}
              {actor.appetenceProvisoire ? (
                <span className="rounded bg-status-warning-soft px-1 py-0.5 text-[8px] font-bold text-status-warning-ink uppercase">
                  Provisoire
                </span>
              ) : null}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-edito-muted">
              Accessibilité
            </span>
            <span className="mt-0.5 block font-heading text-base font-bold text-edito-navy">
              {actor.accessibilityScore !== null ? `${actor.accessibilityScore} / 5` : "Non positionnée"}
            </span>
          </div>
        </div>

        {/* Chiffres clés */}
        {(actor.revenueEstimateMeur !== null || actor.headcountFrance) ? (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-edito-border/70 bg-edito-surface p-3 text-xs">
            {actor.revenueEstimateMeur !== null ? (
              <div>
                <span className="text-edito-muted font-medium">CA estimé : </span>
                <span className="font-bold text-edito-navy">{formatRevenue(actor)}</span>
                {actor.revenuePerimetre ? (
                  <span className="ml-1 text-[11px] text-edito-muted">({actor.revenuePerimetre})</span>
                ) : null}
              </div>
            ) : null}
            {actor.headcountFrance ? (
              <div>
                <span className="text-edito-muted font-medium">Effectif France : </span>
                <span className="font-bold text-edito-navy">{actor.headcountFrance}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Sections détaillées */}
        <div className="space-y-3">
          <DetailBlock title="Positionnement" value={actor.positioning} />
          <DetailBlock title="Angle d’entrée" value={actor.angleEntree} />
          <DetailBlock title="Proposition de valeur" value={actor.details.propositionValeur} />
          <DetailBlock title="Différenciateurs" items={actor.details.differenciateurs} />
          <DetailBlock title="Métier & chaîne de valeur" value={actor.details.metierChaineValeur} />
          <DetailBlock title="Maillon" value={actor.details.maillon} />
          <DetailBlock title="Chaîne de valeur" items={actor.details.chaineValeur} />
          <DetailBlock title="Dépendances clés" items={actor.details.dependances} />
          <DetailBlock title="Couche ESN" items={actor.details.coucheEsn} />
          <DetailBlock title="IA (Annoncé vs Déployé)" value={actor.details.iaAnnonceVsDeploye} />
          <DetailBlock title="Contrats majeurs" items={actor.details.contratsMajeurs} />
          <DetailBlock title="Chantiers technologiques" items={actor.details.chantiersTechnologiques} />
          <DetailBlock title="Grilles tarifaires / commerciales" items={actor.details.grilles} />
          <DetailBlock title="Triggers (Événements)" items={actor.details.triggers} />
          <DetailBlock title="Traduction commerciale" items={actor.details.traductionCommerciale} />
          <DetailBlock title="Forces" value={actor.forces} />
          <DetailBlock title="Vulnérabilités" value={actor.vulnerability} />
          <DetailBlock title="Lignes rouges (À ne pas dire)" items={actor.details.lignesRouges} tone="warning" />
          <DetailBlock title="Trous & Incertitudes déclarés" items={actor.details.trous} tone="warning" />
        </div>
      </div>
    </AppDialog>
  )
}

