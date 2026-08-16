"use client"

import { useState } from "react"
import { PropositionA } from "./PropositionA"
import { PropositionB } from "./PropositionB"
import { cn } from "@/lib/utils"

type SelectedProp = "A" | "B"
type StatePreset = "step1_empty" | "step1_parsed" | "step2_collapsed" | "step2_expanded" | "step3_confirm"

export default function CompetitiveMapImportRedesignLab() {
  const [proposal, setProposal] = useState<SelectedProp>("A")
  const [preset, setPreset] = useState<StatePreset>("step2_collapsed")
  const [emptyHistory, setEmptyHistory] = useState(false)

  // Map state preset to props
  const forcedStep =
    preset === "step1_empty" || preset === "step1_parsed"
      ? "upload"
      : preset === "step2_collapsed" || preset === "step2_expanded"
        ? "arbitrate"
        : "confirm"

  const forcedParsed = preset !== "step1_empty"
  const forcedExpandedIndex = preset === "step2_expanded" ? 0 : null

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white font-sans">
      <div className="mx-auto max-w-[1300px] space-y-6">
        {/* Header Design Lab */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400 border border-amber-500/30">
                KREDO DESIGN LAB
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-300">
                Refonte Graphique — Assistant &quot;Importer une cartographie&quot;
              </span>
            </div>
            <h1 className="mt-1 font-heading text-xl font-bold tracking-tight text-white">
              Prototypes Interactifs : Proposition A vs Proposition B
            </h1>
          </div>

          {/* Switch principal A | B */}
          <div className="flex rounded-lg border border-slate-600 bg-slate-900 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setProposal("A")}
              className={cn(
                "rounded-md px-4 py-2 text-xs font-bold transition-all",
                proposal === "A"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white",
              )}
            >
              Proposition A — Éditorial / Intelligence
            </button>
            <button
              type="button"
              onClick={() => setProposal("B")}
              className={cn(
                "rounded-md px-4 py-2 text-xs font-bold transition-all",
                proposal === "B"
                  ? "bg-[#2554B8] text-white shadow-md"
                  : "text-slate-400 hover:text-white",
              )}
            >
              Proposition B — Control Workspace
            </button>
          </div>
        </div>

        {/* Barre de contrôle d'état rapide */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-850 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Préréglage d&apos;étape :
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPreset("step1_empty")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  preset === "step1_empty"
                    ? "bg-slate-200 text-slate-900 font-bold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                )}
              >
                1. Avant analyse
              </button>
              <button
                type="button"
                onClick={() => setPreset("step1_parsed")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  preset === "step1_parsed"
                    ? "bg-slate-200 text-slate-900 font-bold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                )}
              >
                1. Après analyse
              </button>
              <button
                type="button"
                onClick={() => setPreset("step2_collapsed")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  preset === "step2_collapsed"
                    ? "bg-slate-200 text-slate-900 font-bold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                )}
              >
                2. Comptes repliés
              </button>
              <button
                type="button"
                onClick={() => setPreset("step2_expanded")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  preset === "step2_expanded"
                    ? "bg-slate-200 text-slate-900 font-bold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                )}
              >
                2. Compte déplié (VINCI)
              </button>
              <button
                type="button"
                onClick={() => setPreset("step3_confirm")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  preset === "step3_confirm"
                    ? "bg-slate-200 text-slate-900 font-bold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                )}
              >
                3. Finalisation
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Test Historique :
            </span>
            <button
              type="button"
              onClick={() => setEmptyHistory(!emptyHistory)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-bold transition-colors",
                emptyHistory ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-slate-800 text-slate-300 hover:bg-slate-700",
              )}
            >
              {emptyHistory ? "État vide (0)" : "Rempli (5)"}
            </button>
          </div>
        </div>

        {/* Prototype Render */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
          {proposal === "A" ? (
            <PropositionA
              key={`propA-${preset}-${emptyHistory}`}
              forcedStep={forcedStep}
              forcedParsed={forcedParsed}
              forcedExpandedIndex={forcedExpandedIndex}
              showEmptyHistory={emptyHistory}
            />
          ) : (
            <PropositionB
              key={`propB-${preset}-${emptyHistory}`}
              forcedStep={forcedStep}
              forcedParsed={forcedParsed}
              forcedExpandedIndex={forcedExpandedIndex}
              showEmptyHistory={emptyHistory}
            />
          )}
        </div>

        {/* Handoff summary cards */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-lg border border-amber-500/30 bg-slate-800/80 p-4 text-xs">
            <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="font-bold text-amber-400">PROPOSITION A — Éditorial / Intelligence</span>
              <span className="font-mono text-[10px] text-slate-400">Atmosphère Premium &amp; Analyse</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li>• <strong>Concept :</strong> Inspiré des outils de revue stratégique &amp; d&apos;intelligence décisionnelle.</li>
              <li>• <strong>Rail gauche :</strong> Minimaliste Navy `#1E3150`, timeline centrée, accent or `#D89B16`.</li>
              <li>• <strong>Étape 1 :</strong> Zone de dépôt compacte côte à côte + barre de signature d&apos;analyse.</li>
              <li>• <strong>Étape 2 :</strong> Accordéon ultra-scannable (L1: nom+statut rectangulaire, L2: métriques 1 ligne desktop, L3: rattachement). Zone dépliée 4 rubriques à fort contraste.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#2554B8]/40 bg-slate-800/80 p-4 text-xs">
            <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="font-bold text-[#63A6E8]">PROPOSITION B — Control Workspace</span>
              <span className="font-mono text-[10px] text-slate-400">Atmosphère Opérationnelle</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li>• <strong>Concept :</strong> Inspiré des consoles de contrôle commercial &amp; workflows d&apos;ingestion.</li>
              <li>• <strong>Rail gauche :</strong> Tour de contrôle Cobalt `#162650` &amp; `#2554B8`, badges carrés à fort statut.</li>
              <li>• <strong>Étape 1 :</strong> Dropzone dynamique + console JSON sombre avec feedback visuel.</li>
              <li>• <strong>Étape 2 :</strong> Accordéon avec badges statut plein à angles vifs, séparateurs à puces, et fiches de détail à bandes de statut.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
