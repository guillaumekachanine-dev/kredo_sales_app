"use client"

import { useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"
import type { SuiviData } from "@/lib/prospection/suivi-data"
import {
  ImpulsionKpiCard,
  ActionCritiqueCard,
  RelanceIACard,
} from "./suivi-parts"

// ── Suivi des Actions — Vue Desktop ──────────────────────────────────────────
// Cockpit "Impulsion Globale" : pilotage proactif des opportunités.
// Reproduit fidèlement l'organisation de la maquette :
//   1. Header avec actions
//   2. Bandeau "Impulsion Globale" (4 KPI cards)
//   3. Panneau gauche : "Actions Critiques / Retard" + filtre Collaborateur
//   4. Panneau droit  : "Relances Recommandées (IA)" + filtre Secteur

export function SuiviDesktopView({ data }: { data: SuiviData }) {
  const { impulsionKpis, actionsCritiques, relancesIA } = data

  const [filterCollab, setFilterCollab] = useState("all")
  const [filterSecteur, setFilterSecteur] = useState("all")

  // Filtres dynamiques (seront branchés sur des vraies valeurs en Lot 2)
  const filteredCritiques = actionsCritiques.filter((a) => {
    if (filterCollab === "all") return true
    return a.consultantName.toLowerCase().includes(filterCollab.toLowerCase())
  })

  const filteredRelances = relancesIA.filter((r) => {
    if (filterSecteur === "all") return true
    return r.sector.toLowerCase().includes(filterSecteur.toLowerCase())
  })

  // Unique collaborateurs pour le filtre
  const collabs = Array.from(new Set(actionsCritiques.map((a) => a.consultantName)))
  const secteurs = Array.from(new Set(relancesIA.map((r) => r.sector)))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 bg-canvas">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 select-none">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Prospection Intelligence — Suivi des Actions
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Piloter l&apos;impulsion commerciale : pilotage proactif des opportunités
          </p>
        </div>
        <div className="flex items-center gap-4">
          <HeaderCalendar />
          <HeaderAlerts />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary border border-border flex items-center justify-center font-bold text-xs text-white select-none">
              GK
            </div>
            <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 py-5">

        {/* ── Section : Impulsion Globale ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-heading">Impulsion Globale</h2>
            {/* Filtre global placeholder */}
            <div className="relative">
              <select
                className="appearance-none text-xs border border-border bg-surface text-body rounded-lg py-1 px-3 pr-7 focus:outline-none focus:border-primary cursor-pointer font-medium"
                defaultValue="all"
              >
                <option value="all">Filtres filtres</option>
                <option value="urgent">Urgents uniquement</option>
                <option value="week">Cette semaine</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {impulsionKpis.map((kpi) => (
              <SurfaceCard key={kpi.id} className="p-4 min-h-[110px] flex flex-col">
                <ImpulsionKpiCard kpi={kpi} />
              </SurfaceCard>
            ))}
          </div>
        </section>

        {/* ── Zone principale 2 colonnes ────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5 items-start">

          {/* ── Gauche : Actions Critiques / Retard ──────────────────────── */}
          <div className="col-span-7 flex flex-col gap-3">
            <SurfaceCard className="p-0 overflow-hidden">
              {/* En-tête section */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                <h2 className="text-sm font-bold text-heading">Actions Critiques / Retard</h2>
                <div className="relative">
                  <select
                    value={filterCollab}
                    onChange={(e) => setFilterCollab(e.target.value)}
                    className="appearance-none text-xs border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="all">Collaborateur</option>
                    {collabs.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Liste des actions critiques */}
              <div className="flex flex-col gap-3 p-4">
                {filteredCritiques.length === 0 ? (
                  <EmptyActions message="Aucune action critique pour ce collaborateur." />
                ) : (
                  filteredCritiques.map((action) => (
                    <ActionCritiqueCard
                      key={action.id}
                      action={action}
                      onConsigner={(id) => {
                        // TODO Lot 2 : ouvrir le drawer de consignation
                        console.info("Consigner action", id)
                      }}
                    />
                  ))
                )}
              </div>
            </SurfaceCard>
          </div>

          {/* ── Droite : Relances Recommandées (IA) ──────────────────────── */}
          <div className="col-span-5 flex flex-col gap-3">
            <SurfaceCard className="p-0 overflow-hidden" accent="primary">
              {/* En-tête section */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/[0.08]">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </span>
                  <h2 className="text-sm font-bold text-heading">Relances Recommandées (IA)</h2>
                </div>
                <div className="relative">
                  <select
                    value={filterSecteur}
                    onChange={(e) => setFilterSecteur(e.target.value)}
                    className="appearance-none text-xs border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="all">Secteur</option>
                    {secteurs.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Liste des relances IA */}
              <div className="flex flex-col gap-3 p-4">
                {filteredRelances.length === 0 ? (
                  <EmptyActions message="Aucune relance IA pour ce secteur." />
                ) : (
                  filteredRelances.map((relance) => (
                    <RelanceIACard
                      key={relance.id}
                      relance={relance}
                      onPlanifier={(id) => {
                        // TODO Lot 2 : ouvrir le drawer de planification
                        console.info("Planifier relance", id)
                      }}
                    />
                  ))
                )}
              </div>

              {/* Footer IA */}
              <div className="px-5 py-2.5 border-t border-border/40 bg-canvas/40">
                <p className="text-[9px] text-muted text-center">
                  Recommandations générées par le moteur IA n8n · pgvector semantic matching
                </p>
              </div>
            </SurfaceCard>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Composant interne : état vide ─────────────────────────────────────────────

function EmptyActions({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg className="w-8 h-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p className="text-xs text-muted">{message}</p>
    </div>
  )
}
