"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

type BattleCardsSectionProps = {
  actors: CompetitiveMapActor[]
  isMobile?: boolean
}

export function BattleCardsSection({ actors, isMobile = false }: BattleCardsSectionProps) {
  const [selectedActorId, setSelectedActorId] = useState<string>(() => actors[0]?.id ?? "")

  if (actors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <p className="font-semibold text-brand-brass">Aucune Battle Card disponible</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/55">
          Aucun acteur ou profil d’étude concurrentielle n’est encore associé à ce segment.
          Les Battle Cards sont projetées automatiquement dès qu’une cartographie concurrentielle est ingérée.
        </p>
      </div>
    )
  }

  const selectedActor = actors.find((a) => a.id === selectedActorId) ?? actors[0]

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Sélecteur d'acteur mobile */}
        <div>
          <label htmlFor="mobile-battlecard-actor" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/45">
            Acteur ({actors.length})
          </label>
          <select
            id="mobile-battlecard-actor"
            value={selectedActor.id}
            onChange={(e) => setSelectedActorId(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-brass"
          >
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name} ({actor.categoryLabel}) — Appétence {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "N/A"}
              </option>
            ))}
          </select>
        </div>

        {/* Fiche Mobile */}
        <BattleCardContent actor={selectedActor} />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[480px] gap-5">
      {/* Liste des acteurs (Sous-colonne gauche) */}
      <div className="w-64 shrink-0 space-y-2 overflow-y-auto pr-1">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          Acteurs cartographiés ({actors.length})
        </p>
        <div className="space-y-1">
          {actors.map((actor) => {
            const isSelected = actor.id === selectedActor.id
            return (
              <button
                key={actor.id}
                type="button"
                onClick={() => setSelectedActorId(actor.id)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-brass",
                  isSelected
                    ? "border-brand-brass/40 bg-brand-brass/10 text-white"
                    : "border-white/5 bg-slate-900/30 text-white/70 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-semibold text-xs leading-tight block truncate">
                    {actor.name}
                    {actor.isBenchmarkAccount ? " ★" : ""}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-bold text-brand-brass">
                    {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "—"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-white/40">
                  <span className="truncate">{actor.categoryLabel}</span>
                  <span>{actor.accessibilityScore !== null ? `Accès ${actor.accessibilityScore}/5` : "—"}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Détail de la Battle Card (Sous-colonne droite) */}
      <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/30 p-5">
        <BattleCardContent actor={selectedActor} />
      </div>
    </div>
  )
}

function BattleCardContent({ actor }: { actor: CompetitiveMapActor }) {
  const { details } = actor

  return (
    <div className="space-y-5 text-white">
      {/* Header Fiche */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-brand-brass/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              {actor.categoryLabel}
            </span>
            {actor.isBenchmarkAccount ? (
              <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Compte étalon ★
              </span>
            ) : null}
            <span className="text-[10px] text-white/40">
              Confiance {actor.confidence}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-bold text-brand-brass">
              Appétence {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "N/A"}
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-medium text-white/70">
              {actor.accessibilityScore !== null ? `Accessibilité ${actor.accessibilityScore}/5` : "Accès non renseigné"}
            </span>
          </div>
        </div>

        <h3 className="mt-2.5 font-heading text-lg font-bold text-white">
          {actor.name}
        </h3>

        {/* Chiffres clés en grille */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Chiffre d&apos;affaires</span>
            <span className="mt-0.5 block font-bold text-white">
              {actor.revenueEstimateMeur !== null ? `${actor.revenueEstimateMeur} M€` : "Non publié"}
              {actor.revenueExercice ? ` (${actor.revenueExercice})` : ""}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Effectif France</span>
            <span className="mt-0.5 block font-bold text-white">
              {actor.headcountFrance ?? "Non renseigné"}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Positionnement</span>
            <span className="mt-0.5 block font-semibold text-white/80 truncate" title={actor.positioning ?? ""}>
              {actor.positioning ?? "Standard"}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Maillon chaîne</span>
            <span className="mt-0.5 block font-semibold text-white/80 truncate" title={details.maillon ?? ""}>
              {details.maillon ?? "Acteur direct"}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Trigger — Pourquoi j'appelle maintenant */}
      {details.triggers.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
            Le Trigger — Pourquoi j&apos;appelle maintenant
          </h4>
          <div className="space-y-1.5">
            {details.triggers.map((trigger, idx) => (
              <div key={idx} className="rounded-lg border border-brand-brass/20 bg-brand-brass/[0.04] p-3 text-xs leading-relaxed text-white/90">
                {trigger}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 2. L'Angle & Les Accroches */}
      {(actor.angleEntree || details.traductionCommerciale.length > 0) ? (
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
            L&apos;Angle & Les Accroches commerciales
          </h4>
          {actor.angleEntree ? (
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3 text-xs leading-relaxed text-white">
              <strong className="text-brand-brass">Angle d&apos;entrée : </strong>
              {actor.angleEntree}
            </div>
          ) : null}
          {details.traductionCommerciale.length > 0 ? (
            <div className="space-y-1.5">
              {details.traductionCommerciale.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/80">
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 3. À qui parler & Couche ESN */}
      {details.coucheEsn.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
            À qui parler & Organisation SI (Couche ESN)
          </h4>
          <div className="space-y-1.5">
            {details.coucheEsn.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-white/5 bg-slate-900/30 p-3 text-xs leading-relaxed text-white/75">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 4. ⛔ Ce qu'il ne faut PAS dire */}
      {details.lignesRouges.length > 0 ? (
        <section className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">
            <span>⛔</span> Ce qu&apos;il ne faut PAS dire
          </h4>
          <div className="space-y-1.5">
            {details.lignesRouges.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-rose-500/25 bg-rose-950/20 p-3 text-xs leading-relaxed text-rose-200/90">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 5. Chantiers & Forces / Vulnérabilités */}
      {(actor.forces || actor.vulnerability || details.chantiersTechnologiques.length > 0 || details.iaAnnonceVsDeploye) ? (
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
            Chantiers & Éléments de diagnostic
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {actor.forces ? (
              <div className="rounded-lg border border-white/5 bg-slate-900/30 p-3 space-y-1">
                <span className="block text-[10px] font-bold uppercase text-emerald-400">Forces clés</span>
                <p className="text-white/75 leading-relaxed">{actor.forces}</p>
              </div>
            ) : null}
            {actor.vulnerability ? (
              <div className="rounded-lg border border-white/5 bg-slate-900/30 p-3 space-y-1">
                <span className="block text-[10px] font-bold uppercase text-amber-400">Vulnérabilité</span>
                <p className="text-white/75 leading-relaxed">{actor.vulnerability}</p>
              </div>
            ) : null}
            {details.iaAnnonceVsDeploye ? (
              <div className="md:col-span-2 rounded-lg border border-white/5 bg-slate-900/30 p-3 space-y-1">
                <span className="block text-[10px] font-bold uppercase text-brand-brass">IA (Annoncé vs Déployé)</span>
                <p className="text-white/75 leading-relaxed">{details.iaAnnonceVsDeploye}</p>
              </div>
            ) : null}
            {details.chantiersTechnologiques.length > 0 ? (
              <div className="md:col-span-2 rounded-lg border border-white/5 bg-slate-900/30 p-3 space-y-1.5">
                <span className="block text-[10px] font-bold uppercase text-white/50">Chantiers technologiques identifiés</span>
                <ul className="space-y-1 pl-3 list-disc text-white/70">
                  {details.chantiersTechnologiques.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 6. Points à qualifier (trous) */}
      {details.trous.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/45">
            À qualifier pendant l&apos;appel (inconnues identifiées)
          </h4>
          <ul className="space-y-1 rounded-lg border border-white/5 bg-slate-950/20 p-3 text-xs text-white/60 list-disc pl-5">
            {details.trous.map((trou, idx) => (
              <li key={idx}>{trou}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
