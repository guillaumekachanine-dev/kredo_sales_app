"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { SourceChipList, type ResolvedSource } from "../shared/SourceChip"
import {
  parsePlaybookPersonas,
  parsePlaybookObjections,
  parsePlaybookEntryPoints,
  parsePlaybookRoiArguments,
} from "../models/sector-playbook-parser"
import { BattleWorkspace } from "./BattleWorkspace"
import {
  BATTLE_FLIP_HALF_MS,
  BATTLE_FLIP_REDUCED_HALF_MS,
  PLAYBOOK_MAIN_SURFACE,
  PLAYBOOK_SIDE_SURFACE,
  flipDirectionFor,
  flipOpacity,
  flipRotation,
  isBattleModeAvailable,
  type FlipDirection,
  type FlipPhase,
  type PlaybookMode,
  type SectorPlaybookSectionKey,
} from "./battle-workspace-model"

export type { SectorPlaybookSectionKey }

type PlaybookSectionDef = {
  key: SectorPlaybookSectionKey
  label: string
  hasData: boolean
  countBadge?: number | null
}

type FlipState = {
  phase: FlipPhase
  direction: FlipDirection
  animated: boolean
}

const IDLE_FLIP: FlipState = { phase: "idle", direction: "forward", animated: true }

export type SectorPlaybooksModalProps = {
  open: boolean
  onClose: () => void
  knowledge: SectorKnowledgeReadModel
  segmentName?: string
  macroName?: string | null
  competitiveActors?: CompetitiveMapActor[]
  priorityAccounts?: Array<{
    id: string
    name: string
    priority?: number | string
    [key: string]: unknown
  }>
  isMobile?: boolean
  initialSectionKey?: SectorPlaybookSectionKey
  sourceResolution?: Record<number, ResolvedSource>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function SectorPlaybooksModal({
  open,
  onClose,
  knowledge,
  segmentName,
  macroName,
  competitiveActors = [],
  priorityAccounts = [],
  isMobile = false,
  initialSectionKey,
  sourceResolution,
}: SectorPlaybooksModalProps) {
  const name = segmentName || knowledge.segmentName
  const macro = macroName || knowledge.macroName

  // Resolve sources helper
  const resolveSource = (srcId: number) => sourceResolution?.[srcId] ?? null

  // Personas
  const personas = useMemo(() => parsePlaybookPersonas(knowledge.playbook), [knowledge.playbook])

  // Arguments ROI
  const roiArguments = useMemo(() => parsePlaybookRoiArguments(knowledge.playbook), [knowledge.playbook])

  // Objections
  const objections = useMemo(() => parsePlaybookObjections(knowledge.playbook), [knowledge.playbook])

  // Angles d'approche & points d'entrée
  const entryPoints = useMemo(() => parsePlaybookEntryPoints(knowledge.playbook), [knowledge.playbook])

  // Échéances réglementaires et fenêtres
  const deadlines = knowledge.regulatory

  // Sections conditionnelles — « Battle Cards » n'en fait plus partie depuis le
  // Lot 1 : c'est un mode à part entière, atteint par l'action d'entrée dédiée.
  const sections: PlaybookSectionDef[] = useMemo(() => {
    const list: PlaybookSectionDef[] = [
      {
        key: "enjeux",
        label: "Enjeux",
        hasData: knowledge.painPoints.length > 0 || Boolean(knowledge.description),
        countBadge: knowledge.painPoints.length || null,
      },
      {
        key: "personas",
        label: "Personas",
        hasData: personas.length > 0,
        countBadge: personas.length || null,
      },
      {
        key: "angles",
        label: "Angles d’approche",
        hasData: entryPoints.length > 0,
        countBadge: entryPoints.length || null,
      },
      {
        key: "objections",
        label: "Objections",
        hasData: objections.length > 0,
        countBadge: objections.length || null,
      },
      {
        key: "roi",
        label: "ROI & offres",
        hasData: roiArguments.length > 0 || Boolean(knowledge.practicesFit && Object.keys(asRecord(knowledge.practicesFit)).length > 0),
        countBadge: roiArguments.length || null,
      },
      {
        key: "pourquoi_maintenant",
        label: "Pourquoi maintenant",
        hasData: deadlines.length > 0 || knowledge.events.length > 0,
        countBadge: (deadlines.length + knowledge.events.length) || null,
      },
    ]

    return list.filter((s) => s.hasData)
  }, [knowledge, personas, entryPoints, objections, roiArguments, deadlines])

  const [activeSectionKey, setActiveSectionKey] = useState<SectorPlaybookSectionKey>(
    () => initialSectionKey ?? sections[0]?.key ?? "enjeux",
  )

  const activeSection = sections.find((s) => s.key === activeSectionKey) ?? sections[0]

  // ── Mode Playbook ↔ Battle (Lot 1) ────────────────────────────────────────
  // État local minimal. Aucun store, aucun provider, aucun état de segment
  // parallèle : le segment reste celui du workspace, reçu en props.
  const [mode, setMode] = useState<PlaybookMode>("playbook")
  const [flip, setFlip] = useState<FlipState>(IDLE_FLIP)
  // Le compte sélectionné vit ICI, au-dessus du retournement : il survit donc
  // à un aller-retour Playbook ↔ Battle (critère de sortie du Lot 1).
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)

  const flipTimer = useRef<number | null>(null)
  const flipFrames = useRef<number[]>([])
  const flipLayerRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    if (flipTimer.current !== null) window.clearTimeout(flipTimer.current)
    for (const frame of flipFrames.current) window.cancelAnimationFrame(frame)
  }, [])

  const battleAvailable = isBattleModeAvailable(competitiveActors)

  /**
   * Retournement : sortie → échange du contenu au point médian → entrée.
   * Une seule face est montée à la fois (`key={mode}` remonte l'arbre), donc
   * jamais deux arbres lourds simultanés. `prefers-reduced-motion` est lu au
   * moment du clic — pas d'état dérivé, pas de risque d'hydratation.
   */
  function switchMode(target: PlaybookMode) {
    if (target === mode || flip.phase !== "idle") return

    const direction = flipDirectionFor(target)
    const animated = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const halfMs = animated ? BATTLE_FLIP_HALF_MS : BATTLE_FLIP_REDUCED_HALF_MS

    setFlip({ phase: "leaving", direction, animated })
    flipTimer.current = window.setTimeout(() => {
      setMode(target)
      setFlip({ phase: "entering", direction, animated })
      const outer = window.requestAnimationFrame(() => {
        const inner = window.requestAnimationFrame(() => {
          setFlip({ phase: "idle", direction, animated })
          // Le bouton qui a déclenché le retournement vit dans la face démontée
          // au point médian : sans cela, le focus clavier retomberait sur
          // <body> et sortirait du piège à focus du shell. On le repose sur la
          // nouvelle face (tabIndex -1), d'où Tab reprend au premier élément.
          flipLayerRef.current?.focus({ preventScroll: true })
        })
        flipFrames.current.push(inner)
      })
      flipFrames.current.push(outer)
    }, halfMs)
  }

  const isFlipping = flip.phase !== "idle"
  const flipHalfMs = flip.animated ? BATTLE_FLIP_HALF_MS : BATTLE_FLIP_REDUCED_HALF_MS
  const flipEasing = flip.phase === "leaving" ? "ease-in" : "ease-out"
  const flipRotationDeg = flip.animated ? flipRotation(flip.phase, flip.direction) : 0

  const leftPane = (
    <div className={cn("flex h-full flex-col text-white", PLAYBOOK_SIDE_SURFACE)}>
      <div className="border-b border-white/10 p-4 shrink-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-brand-brass">
          Playbook commercial
        </span>
        <h3 className="mt-1 font-heading text-sm font-bold text-white truncate">
          {name}
        </h3>
        {macro ? (
          <p className="text-[11px] text-white/45 truncate">Macro : {macro}</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
        <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
          Sections du Playbook
        </p>
        {sections.map((section) => {
          const isSelected = section.key === activeSection?.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSectionKey(section.key)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-brass",
                isSelected
                  ? "border-brand-brass/40 bg-brand-brass/10 text-white font-semibold"
                  : "border-transparent text-white/70 hover:bg-white/[0.03] hover:text-white",
              )}
            >
              <span className="text-xs leading-tight">{section.label}</span>
              {section.countBadge ? (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-brand-brass">
                  {section.countBadge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {battleAvailable ? (
        <div className="shrink-0 border-t border-white/10 p-3">
          <BattleEntryButton
            actorCount={competitiveActors.length}
            onEnter={() => switchMode("battle")}
          />
        </div>
      ) : null}
    </div>
  )

  const renderSectionContent = () => {
    if (!activeSection) {
      return (
        <div className="py-12 text-center text-xs text-white/40 italic">
          Playbook sectoriel en préparation pour ce secteur.
        </div>
      )
    }

    switch (activeSection.key) {
      case "enjeux":
        return (
          <div className="space-y-5">
            {knowledge.description ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4 space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Cadrage sectoriel
                </h4>
                <p className="text-xs text-white/80 leading-relaxed">{knowledge.description}</p>
              </div>
            ) : null}

            {knowledge.painPoints.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Points de douleur & Enjeux prioritaires ({knowledge.painPoints.length})
                </h4>
                <div className="space-y-2.5">
                  {knowledge.painPoints.map((pp) => (
                    <div key={pp.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white">{pp.title}</span>
                        <span className="text-[10px] font-mono text-white/40 shrink-0">
                          Fréq : {pp.frequencyCount}
                        </span>
                      </div>
                      {pp.description ? (
                        <p className="text-xs text-white/70 leading-relaxed">{pp.description}</p>
                      ) : null}
                      {pp.verbatim ? (
                        <blockquote className="border-l-2 border-brand-brass/40 pl-2.5 text-[11px] italic text-white/60">
                          « {pp.verbatim} »
                        </blockquote>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )

      case "personas":
        return (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Personas cibles & Interlocuteurs ({personas.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2.5">
                  <span className="block text-xs font-bold text-white border-b border-white/10 pb-1.5">
                    {p.role}
                  </span>
                  <div className="text-xs space-y-2">
                    {p.accountability ? (
                      <p className="text-white/80 leading-relaxed">
                        <strong className="text-brand-brass">Responsabilité : </strong>
                        {p.accountability}
                      </p>
                    ) : null}
                    {p.trigger ? (
                      <p className="text-white/80 leading-relaxed">
                        <strong className="text-rose-400">Déclencheur : </strong>
                        {p.trigger}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case "angles":
        return (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Angles d’approche & Points d’entrée ({entryPoints.length})
            </h4>
            <div className="space-y-2.5">
              {entryPoints.map((ep, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2.5">
                  {ep.signal ? (
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs text-white/70">
                      <strong className="text-white/90">Signal déclencheur : </strong>
                      {ep.signal}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-xs text-white/85 leading-relaxed flex-1">
                      <strong className="text-brand-brass">Angle d’approche : </strong>
                      {ep.angle}
                    </div>
                    {ep.interlocuteur ? (
                      <span className="rounded bg-brand-brass/10 px-2 py-0.5 text-[10px] font-medium text-brand-brass shrink-0">
                        Cible : {ep.interlocuteur}
                      </span>
                    ) : null}
                  </div>
                  {ep.srcIds.length > 0 ? (
                    <div className="flex items-center gap-2 text-[10px] text-white/40 pt-0.5">
                      <span>Sources :</span>
                      <SourceChipList srcIds={ep.srcIds} resolve={resolveSource} variant="dark" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )

      case "objections":
        return (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Objections & Réponses préparées ({objections.length})
            </h4>
            <div className="space-y-3">
              {objections.map((o, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-300">« {o.objection} »</p>
                  {o.response ? (
                    <div className="border-l-2 border-brand-brass/50 pl-3 pt-0.5">
                      <p className="text-xs leading-relaxed text-white/85">{o.response}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )

      case "roi":
        return (
          <div className="space-y-5">
            {roiArguments.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Arguments ROI de valeur ({roiArguments.length})
                </h4>
                <div className="space-y-2">
                  {roiArguments.map((arg, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/30 p-3.5 space-y-2">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand-brass" />
                        <p className="text-xs leading-relaxed text-white/85 flex-1">{arg.argument}</p>
                      </div>
                      {arg.srcIds.length > 0 ? (
                        <div className="pl-4 flex items-center gap-2 text-[10px] text-white/40">
                          <span>Sources :</span>
                          <SourceChipList srcIds={arg.srcIds} resolve={resolveSource} variant="dark" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {knowledge.practicesFit && Object.keys(asRecord(knowledge.practicesFit)).length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Adéquation des Practices KREDO (Practices Fit)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(asRecord(knowledge.practicesFit)).map(([slug, fit]) => {
                    const fitRec = asRecord(fit)
                    const score = typeof fitRec.score === "number" ? fitRec.score : typeof fit === "number" ? fit : null
                    const comment = typeof fitRec.rationale === "string" ? fitRec.rationale : typeof fitRec.justification === "string" ? fitRec.justification : null
                    return (
                      <div key={slug} className="rounded-xl border border-white/5 bg-slate-900/30 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white capitalize">{slug.replace(/-/g, " ")}</span>
                          {score !== null ? (
                            <span className="font-mono text-xs font-bold text-brand-brass">{score}/100</span>
                          ) : null}
                        </div>
                        {comment ? (
                          <p className="text-[11px] text-white/60 leading-snug">{comment}</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )

      case "pourquoi_maintenant":
        return (
          <div className="space-y-5">
            {deadlines.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Échéances réglementaires & Fenêtres d’opportunité ({deadlines.length})
                </h4>
                <div className="space-y-2">
                  {deadlines.map((d) => (
                    <div key={d.id} className="rounded-xl border border-white/10 bg-slate-900/30 p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{d.name}</span>
                          {d.authority ? (
                            <span className="text-[10px] text-white/40">· {d.authority}</span>
                          ) : null}
                        </div>
                        {d.description ? (
                          <p className="text-[11px] text-white/65 mt-1">{d.description}</p>
                        ) : null}
                      </div>
                      {d.deadlineDate ? (
                        <span className="font-mono text-xs font-bold text-brand-brass bg-brand-brass/10 px-2.5 py-1 rounded shrink-0">
                          {new Date(d.deadlineDate).toLocaleDateString("fr-FR")}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {knowledge.events.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Événements structurants & Salons ({knowledge.events.length})
                </h4>
                <div className="space-y-2">
                  {knowledge.events.map((e) => (
                    <div key={e.id} className="rounded-xl border border-white/5 bg-slate-900/30 p-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-white block">{e.title}</span>
                        {e.commercialOpportunity ? (
                          <p className="text-[11px] text-brand-brass mt-0.5">{e.commercialOpportunity}</p>
                        ) : null}
                      </div>
                      {e.eventDate ? (
                        <span className="font-mono text-xs text-white/70">
                          {new Date(e.eventDate).toLocaleDateString("fr-FR")}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )
    }
  }

  const rightPane = (
    <div className={cn("flex h-full min-h-0 flex-col text-white", PLAYBOOK_MAIN_SURFACE)}>
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-brass/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Playbook actif
            </span>
            {macro ? (
              <span className="text-[10px] text-white/40">Macro : {macro}</span>
            ) : null}
          </div>
          {priorityAccounts.length > 0 ? (
            <span className="text-[10px] text-white/45">
              {priorityAccounts.length} compte{priorityAccounts.length > 1 ? "s" : ""} prioritaire{priorityAccounts.length > 1 ? "s" : ""} lié{priorityAccounts.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <h2 className="mt-2 font-heading text-xl font-bold text-white">
          {name} — {activeSection?.label}
        </h2>
      </div>

      {/* Contenu de la section active */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {renderSectionContent()}
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 justify-end border-t border-white/10 bg-slate-950/40 p-4">
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </footer>
    </div>
  )

  const mobileContent = (
    <div className={cn("flex min-h-0 flex-1 flex-col text-white", PLAYBOOK_MAIN_SURFACE)}>
      {/* Header Mobile */}
      <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
            Playbook commercial
          </span>
          <h3 className="mt-0.5 font-heading text-lg font-bold text-white">{name}</h3>
        </div>
        {battleAvailable ? (
          <BattleEntryButton
            actorCount={competitiveActors.length}
            onEnter={() => switchMode("battle")}
            isMobile
          />
        ) : null}
      </div>

      {/* Rail de navigation tactile horizontal */}
      <nav
        aria-label="Sections du Playbook"
        className="sticky top-0 z-10 flex overflow-x-auto border-b border-white/10 bg-slate-950 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section) => {
          const isSelected = section.key === activeSection?.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSectionKey(section.key)}
              aria-current={isSelected ? "page" : undefined}
              className={cn(
                "min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass",
                isSelected
                  ? "bg-brand-brass/20 text-brand-brass font-bold"
                  : "text-white/60 hover:text-white",
              )}
            >
              {section.label}
            </button>
          )
        })}
      </nav>

      {/* Contenu Mobile */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {renderSectionContent()}
      </div>

      {/* Footer Mobile */}
      <footer className="shrink-0 border-t border-white/10 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="min-h-11 w-full" onClick={onClose}>
          Fermer
        </Button>
      </footer>
    </div>
  )

  // Face Playbook — reproduit à l'identique le gabarit split du shell partagé
  // (`IntelligenceSplitModalShell`, branche sans `content`), qui n'est PAS
  // modifié : c'est le retournement qui a besoin d'une surface unique couvrant
  // les deux volets, sinon chaque volet pivoterait sur son propre axe.
  const playbookFace = isMobile ? mobileContent : (
    <div className="flex min-h-0 flex-1 items-stretch">
      <aside className="min-h-0 w-[30%] shrink-0 overflow-y-auto border-r border-white/5">
        {leftPane}
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-950/20">
        {rightPane}
      </main>
    </div>
  )

  const battleFace = (
    <BattleWorkspace
      actors={competitiveActors}
      selectedActorId={selectedActorId}
      onSelectActor={setSelectedActorId}
      knowledge={knowledge}
      segmentName={name}
      isMobile={isMobile}
      onBackToPlaybook={() => switchMode("playbook")}
      onClose={onClose}
    />
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      onClose={onClose}
      title={mode === "battle" ? `Battle Cards — ${name}` : `Playbook commercial — ${name}`}
      subtitle={
        mode === "battle"
          ? "Réviser un compte du segment et préparer la prise de parole."
          : "Traduction opérationnelle et commerciale de la connaissance sectorielle."
      }
      headerActions={
        mode === "battle" ? (
          <BackToPlaybookButton onBack={() => switchMode("playbook")} />
        ) : undefined
      }
      leftPane={null}
      rightPane={null}
      content={(
        <div className="flex min-h-0 flex-1 flex-col" style={{ perspective: "1800px" }}>
          <div
            key={mode}
            ref={flipLayerRef}
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col outline-none"
            style={{
              transform: `rotateY(${flipRotationDeg}deg)`,
              opacity: flipOpacity(flip.phase),
              transition: flip.phase === "entering"
                ? "none"
                : `transform ${flipHalfMs}ms ${flipEasing}, opacity ${flipHalfMs}ms ${flipEasing}`,
              willChange: isFlipping ? "transform, opacity" : undefined,
              pointerEvents: isFlipping ? "none" : undefined,
            }}
          >
            {mode === "playbook" ? playbookFace : battleFace}
          </div>
        </div>
      )}
      isMobile={isMobile}
    />
  )
}

function BattleEntryButton({
  actorCount,
  onEnter,
  isMobile = false,
}: {
  actorCount: number
  onEnter: () => void
  isMobile?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onEnter}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl border border-brand-brass/30 bg-brand-brass/[0.06] p-3 text-left",
        "outline-none transition-colors hover:border-brand-brass/50 hover:bg-brand-brass/10",
        "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
        isMobile && "min-h-11",
      )}
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold text-brand-brass">Battle Cards</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/50">
          {actorCount} compte{actorCount > 1 ? "s" : ""} cartographié{actorCount > 1 ? "s" : ""} · réviser et préparer
        </span>
      </span>
      <svg
        className="size-4 shrink-0 text-brand-brass transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

function BackToPlaybookButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-white/70 outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none"
    >
      <svg
        className="size-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      <span className="hidden sm:inline">Revenir au Playbook</span>
      <span className="sr-only sm:hidden">Revenir au Playbook</span>
    </button>
  )
}
