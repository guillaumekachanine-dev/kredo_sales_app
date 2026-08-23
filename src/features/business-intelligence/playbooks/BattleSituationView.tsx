"use client"

// ─────────────────────────────────────────────────────────────────────────────
// POINT DE MONTAGE A2 — Dynamic Playbooks, Lot 3 « Configurateur Situation »
//
// Ce fichier est la frontière livrée par le Lot 1. Il est monté par
// `BattleWorkspace` et par lui seul. A2 réécrit LE CORPS de ce composant au
// Lot 3 SANS toucher à `SectorPlaybooksModal.tsx` ni à `BattleWorkspace.tsx` :
// la signature `BattleSituationViewProps` ci-dessous est le contrat gelé.
//
// Ce que le contrat garantit à A2 (source : HANDOFF-LOT-0-AUDIT-CONTRAT.md) :
//   • `actor.id`        → competitive_map_entries.id (= battleSituation.competitiveEntryId)
//   • `actor.companyId` → companies.id, NOT NULL en base, jamais nul ici
//   • `actor.details`   → projection de profile_json (angles, triggers, lignes rouges…)
//   • `knowledge.segmentId` / `.segmentName` → battleSituation.segmentId
//   • `knowledge.painPoints[]` / `.regulatory[]` / `.events[]` → options SECTEUR (avec id)
//   • `knowledge.playbook` → personas / objections / entry_points / roi_arguments
//
// Ce que A2 doit charger lui-même, pour le COMPTE ACTIF UNIQUEMENT (jamais pour
// tout le segment) : contacts CRM, account_issues, offres (`getSuggestedOffers`).
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"

export type BattleSituationViewProps = {
  /** Acteur sélectionné dans le rail. Porte `id`, `companyId` et `details`. */
  actor: CompetitiveMapActor
  /** Connaissance sectorielle résolue du segment actif (maille segment). */
  knowledge: SectorKnowledgeReadModel
  isMobile: boolean
  /** Rend la main à l'onglet Révision sans quitter le mode Battle. */
  onBackToRevision: () => void
}

export function BattleSituationView({ actor, isMobile, onBackToRevision }: BattleSituationViewProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-brass">
        Situation commerciale
      </span>
      <p className="max-w-lg text-xs leading-relaxed text-white/60">
        Le configurateur de situation pour <strong className="font-semibold text-white">{actor.name}</strong>{" "}
        arrive au Lot&nbsp;3 : interlocuteur, enjeu, angle, timing, objection et offre, puis
        génération du pitch. Cet emplacement est déjà branché sur le compte sélectionné.
      </p>
      <button
        type="button"
        onClick={onBackToRevision}
        className={cn(
          "rounded-lg border border-white/10 bg-slate-900/40 px-3 font-semibold text-white/75 outline-none transition-colors",
          "hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
          isMobile ? "min-h-11 w-full text-xs" : "min-h-9 text-[11px]",
        )}
      >
        Revenir à la révision
      </button>
    </div>
  )
}
