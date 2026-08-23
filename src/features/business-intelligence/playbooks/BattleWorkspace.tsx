"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { BattleAccountRail } from "./BattleAccountRail"
import { BattleCardsEmptyState } from "./BattleCardsEmptyState"
import { BattleModeSwitcher } from "./BattleModeSwitcher"
import { BattleSituationView } from "./BattleSituationView"
import {
  BATTLE_MAIN_TINT_IMAGE,
  BATTLE_SIDE_TINT_IMAGE,
  PLAYBOOK_MAIN_SURFACE,
  PLAYBOOK_SIDE_SURFACE,
  resolveBattleActor,
  type BattleTab,
} from "./battle-workspace-model"

const BattleRevisionMobile = dynamic(() =>
  import("./BattleRevisionMobile").then((module) => module.BattleRevisionMobile),
)

const BattleCardContent = dynamic(() =>
  import("./BattleCardsSection").then((module) => module.BattleCardContent),
)

// Identité Battle (Lot 2) : même fond que le Playbook, dégradé cobalt posé
// par-dessus en `background-image` (jamais en `backgroundColor`, pour ne
// jamais recouvrir la base et rester un accent, pas un changement de couleur).
const BATTLE_SIDE_TINT_STYLE = { backgroundImage: BATTLE_SIDE_TINT_IMAGE }
const BATTLE_MAIN_TINT_STYLE = { backgroundImage: BATTLE_MAIN_TINT_IMAGE }

type BattleWorkspaceProps = {
  actors: CompetitiveMapActor[]
  /** Sélection portée par `SectorPlaybooksModal`, au-dessus du retournement. */
  selectedActorId: string | null
  onSelectActor: (actorId: string) => void
  knowledge: SectorKnowledgeReadModel
  segmentName: string
  isMobile: boolean
  onBackToPlaybook: () => void
  onClose: () => void
}

/**
 * Mode Battle de la modale Playbook (Lot 1).
 *
 * Aucune requête : tout vient de `competitiveActors`, déjà chargés côté serveur
 * par Business Intelligence et transmis en props par la modale. Aucun état de
 * segment parallèle : le segment reste celui du workspace.
 *
 * Frontière Mobile (Lot 6) : le branchement `isMobile` ci-dessous est le SEUL
 * point de bascule. Une variante mobile dédiée s'y substituera sans toucher au
 * chemin Desktop — et sans jamais monter le Desktop pour le masquer en CSS.
 */
export function BattleWorkspace({
  actors,
  selectedActorId,
  onSelectActor,
  knowledge,
  segmentName,
  isMobile,
  onBackToPlaybook,
  onClose,
}: BattleWorkspaceProps) {
  // L'onglet est un état interne au mode : il se réinitialise sur un
  // aller-retour Playbook ↔ Battle, contrairement au compte sélectionné qui,
  // lui, est explicitement préservé (critère de sortie du Lot 1).
  const [tab, setTab] = useState<BattleTab>("revision")

  const actor = resolveBattleActor(actors, selectedActorId)

  if (!actor) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", PLAYBOOK_MAIN_SURFACE)} style={BATTLE_MAIN_TINT_STYLE}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <BattleCardsEmptyState />
        </div>
      </div>
    )
  }

  if (isMobile) {
    const mobileZone = tab === "revision" ? (
      <BattleRevisionMobile actor={actor} />
    ) : (
      <BattleSituationView
        actor={actor}
        knowledge={knowledge}
        isMobile
        onBackToRevision={() => setTab("revision")}
      />
    )

    return (
      <div className={cn("flex min-h-0 flex-1 flex-col text-white", PLAYBOOK_MAIN_SURFACE)} style={BATTLE_MAIN_TINT_STYLE}>
        <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Battle Cards
            </span>
            <h3 className="mt-0.5 font-heading text-lg font-bold text-white">{segmentName}</h3>
          </div>

          <div>
            <label
              htmlFor="battle-actor-picker"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/45"
            >
              Compte actif ({actors.length})
            </label>
            <select
              id="battle-actor-picker"
              value={actor.id}
              onChange={(event) => onSelectActor(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-brass"
            >
              {actors.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.categoryLabel}) — Appétence{" "}
                  {option.appetenceScore !== null ? `${option.appetenceScore}/35` : "N/A"}
                </option>
              ))}
            </select>
          </div>

          <BattleModeSwitcher value={tab} onChange={setTab} isMobile />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{mobileZone}</div>

        <footer className="shrink-0 border-t border-white/10 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="min-h-11 w-full" onClick={onBackToPlaybook}>
            ← Revenir au Playbook
          </Button>
        </footer>
      </div>
    )
  }

  const desktopZone = tab === "revision" ? (
    <BattleCardContent actor={actor} />
  ) : (
    <BattleSituationView
      actor={actor}
      knowledge={knowledge}
      isMobile={false}
      onBackToRevision={() => setTab("revision")}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 items-stretch">
      <aside
        className={cn("min-h-0 w-[30%] shrink-0 overflow-hidden border-r border-white/5", PLAYBOOK_SIDE_SURFACE)}
        style={BATTLE_SIDE_TINT_STYLE}
      >
        <BattleAccountRail
          actors={actors}
          selectedActorId={actor.id}
          onSelectActor={onSelectActor}
        />
      </aside>

      <main
        className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-white", PLAYBOOK_MAIN_SURFACE)}
        style={BATTLE_MAIN_TINT_STYLE}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Battle Card · {segmentName}
            </span>
            <h2 className="mt-1 truncate font-heading text-xl font-bold text-white">{actor.name}</h2>
          </div>
          <BattleModeSwitcher value={tab} onChange={setTab} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">{desktopZone}</div>

        <footer className="flex shrink-0 justify-end border-t border-white/10 bg-slate-950/40 p-4">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </footer>
      </main>
    </div>
  )
}
