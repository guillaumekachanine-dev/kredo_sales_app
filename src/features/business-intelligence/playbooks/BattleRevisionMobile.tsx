"use client"

import type { ReactNode } from "react"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { cn } from "@/lib/utils"
import { assessBattleCardRichness } from "./battle-workspace-model"

type MobileFactProps = {
  children: ReactNode
  tone?: "default" | "alert" | "positive" | "warning"
}

const FACT_TONES: Record<NonNullable<MobileFactProps["tone"]>, string> = {
  default: "border-white/10 bg-white/[0.035] text-white/85",
  alert: "border-rose-400/25 bg-rose-950/20 text-rose-100/90",
  positive: "border-emerald-400/20 bg-emerald-950/15 text-white/85",
  warning: "border-amber-400/20 bg-amber-950/15 text-white/85",
}

function MobileFact({ children, tone = "default" }: MobileFactProps) {
  return (
    <p className={cn("rounded-lg border px-3 py-2.5 text-xs leading-relaxed", FACT_TONES[tone])}>
      {children}
    </p>
  )
}

function MobileSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-white/10 pb-4 last:border-0 last:pb-0">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">{label}</h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

/**
 * Lecture mobile dédiée : aucune grille, aucun rail et aucun composant de
 * révision Desktop monté. Les trois axes d'action restent ouverts ; le
 * diagnostic détaillé est progressif pour préserver une lecture à une main.
 */
export function BattleRevisionMobile({ actor }: { actor: CompetitiveMapActor }) {
  const { details } = actor
  const { richness, filledAxisCount, totalAxisCount } = assessBattleCardRichness(actor)

  const hasDiagnostics =
    details.lignesRouges.length > 0 ||
    details.chantiersTechnologiques.length > 0 ||
    Boolean(details.iaAnnonceVsDeploye) ||
    Boolean(actor.forces) ||
    Boolean(actor.vulnerability) ||
    details.trous.length > 0

  return (
    <div className="space-y-4 text-white">
      <header className="border-b border-white/10 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              {actor.categoryLabel}
            </span>
            <h3 className="mt-1 font-heading text-lg font-bold text-white">{actor.name}</h3>
            <p className="mt-1 text-[11px] text-white/45">
              Confiance {actor.confidence}
              {richness === "rich" && filledAxisCount < totalAxisCount
                ? ` · ${filledAxisCount}/${totalAxisCount} axes`
                : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <strong className="block font-mono text-base text-brand-brass">
              {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "N/A"}
            </strong>
            <span className="text-[9px] uppercase tracking-wider text-white/40">Appétence</span>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/65">
          {actor.positioning ?? "Positionnement non renseigné"}
        </p>
      </header>

      {richness === "empty" ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
          <p className="text-xs font-semibold text-white/70">Battle Card pas encore enrichie</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
            Aucun élément de préparation n’est disponible pour ce compte.
          </p>
        </div>
      ) : null}

      {richness !== "empty" ? (
        <div className="space-y-4">
          {details.triggers.length > 0 ? (
            <MobileSection label="Pourquoi maintenant">
              {details.triggers.map((item) => <MobileFact key={item}>{item}</MobileFact>)}
            </MobileSection>
          ) : null}

          {actor.angleEntree || details.traductionCommerciale.length > 0 ? (
            <MobileSection label="Angle d’entrée">
              {actor.angleEntree ? <MobileFact>{actor.angleEntree}</MobileFact> : null}
              {details.traductionCommerciale.map((item) => <MobileFact key={item}>{item}</MobileFact>)}
            </MobileSection>
          ) : null}

          {details.coucheEsn.length > 0 ? (
            <MobileSection label="À qui parler">
              {details.coucheEsn.map((item) => <MobileFact key={item}>{item}</MobileFact>)}
            </MobileSection>
          ) : null}
        </div>
      ) : null}

      {hasDiagnostics ? (
        <details className="group rounded-xl border border-white/10 bg-slate-950/35">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-bold text-white/75 outline-none focus-visible:ring-2 focus-visible:ring-brand-brass [&::-webkit-details-marker]:hidden">
            Diagnostic détaillé
            <span aria-hidden="true" className="text-brand-brass transition-transform group-open:rotate-180 motion-reduce:transition-none">⌄</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 p-3">
            {details.lignesRouges.length > 0 ? (
              <MobileSection label="Points de vigilance">
                {details.lignesRouges.map((item) => <MobileFact key={item} tone="alert">{item}</MobileFact>)}
              </MobileSection>
            ) : null}
            {details.chantiersTechnologiques.length > 0 || details.iaAnnonceVsDeploye ? (
              <MobileSection label="Chantiers">
                {details.iaAnnonceVsDeploye ? <MobileFact>{details.iaAnnonceVsDeploye}</MobileFact> : null}
                {details.chantiersTechnologiques.map((item) => <MobileFact key={item}>{item}</MobileFact>)}
              </MobileSection>
            ) : null}
            {actor.forces ? <MobileFact tone="positive"><strong>Force · </strong>{actor.forces}</MobileFact> : null}
            {actor.vulnerability ? <MobileFact tone="warning"><strong>Vulnérabilité · </strong>{actor.vulnerability}</MobileFact> : null}
            {details.trous.length > 0 ? (
              <MobileSection label="À qualifier">
                {details.trous.map((item) => <MobileFact key={item}>{item}</MobileFact>)}
              </MobileSection>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  )
}
