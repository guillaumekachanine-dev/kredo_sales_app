"use client"

import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { fetchCollectionsSummary } from "@/features/content-collections/data/content-collections-client-queries"
import type { CollectionSummary } from "@/features/content-collections/domain/content-collections-contracts"

// ─── Dynamic Playbooks · Lot 3 — contexte Knowledge ─────────────────────────
//
// Picker LÉGER et INLINE, alimentant le champ canonique
// `context.preferredCollectionIds`. Aucun second système Knowledge : c'est
// exactement le mécanisme de `CommunicationBriefForm`, résolu côté n8n par le
// nœud `Hydrate Context` (`ctx.personalCollections`).
//
// 🔴 Arbitrage R-A (Lot 0 §14) — pourquoi `ManageCollections*` n'est PAS monté
// ici : ces composants SONT eux-mêmes des `IntelligenceSplitModalShell`, et le
// Battle Workspace vit déjà dans un `IntelligenceSplitModalShell`. Le shell
// installe son écouteur sur `window` : deux shells imbriqués font fermer les
// DEUX modales sur `Échap` et se disputent le focus au `Tab`. Corriger cela
// suppose de toucher au shell partagé (12 modales) — décision A0, hors de ce
// lot. Le CTA « Gérer la connaissance » pointe donc vers `/knowledge` dans un
// nouvel onglet : la situation en cours de configuration reste intacte. Le
// gestionnaire in-modale reste à arbitrer au Lot 5.
//
// Deux limites exposées honnêtement plutôt que contournées (Lot 0 §9.3) :
//   • un Corpus sélectionné n'apporte que ses items directs — les Listes
//     imbriquées ne sont pas développées côté n8n ;
//   • le prompt plafonne à 8 items de listes personnelles.

const PROMPT_ITEM_CAP = 8

type BattleSituationKnowledgePickerProps = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  isMobile: boolean
}

export function BattleSituationKnowledgePicker({
  selectedIds,
  onChange,
  isMobile,
}: BattleSituationKnowledgePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Chargement paresseux : déclenché par l'ouverture du picker, jamais au
  // montage de Situation (cadrage §13.2 — ne rien charger qui ne soit pas
  // demandé). Dans le gestionnaire d'événement plutôt que dans un effet : il
  // n'y a aucun système externe à synchroniser, seulement une action
  // utilisateur qui déclenche une lecture, une seule fois.
  const toggleOpen = useCallback(() => {
    setIsOpen((open) => !open)
    if (collections !== null || isLoading) return
    setIsLoading(true)
    void fetchCollectionsSummary()
      .then(setCollections)
      .finally(() => setIsLoading(false))
  }, [collections, isLoading])

  const toggle = useCallback(
    (id: string) => {
      onChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id])
    },
    [onChange, selectedIds],
  )

  const selectedCount = selectedIds.length

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          className={cn(
            "rounded-lg border border-white/10 bg-slate-900/40 px-3 text-[11px] font-semibold text-white/75",
            "outline-none transition-colors hover:bg-white/[0.06] hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
            isMobile ? "min-h-11" : "min-h-9",
          )}
        >
          {isOpen ? "Masquer les listes" : "+ Ajouter du contexte"}
          {selectedCount > 0 ? (
            <span className="ml-2 rounded bg-brand-brass/15 px-1.5 py-px font-mono text-[10px] text-brand-brass">
              {selectedCount}
            </span>
          ) : null}
        </button>

        <a
          href="/knowledge"
          target="_blank"
          rel="noopener noreferrer"
          title="Ouvre l'espace Connaissance dans un nouvel onglet — la situation en cours reste intacte"
          className={cn(
            "rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-white/55",
            "inline-flex items-center outline-none transition-colors hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
            isMobile ? "min-h-11" : "min-h-9",
          )}
        >
          Gérer la connaissance ↗
        </a>
      </div>

      {isOpen ? (
        <div className="space-y-2 rounded-lg border border-white/10 bg-slate-950/40 p-3">
          {isLoading ? (
            <p className="text-[11px] text-white/45">Chargement des listes…</p>
          ) : collections && collections.length > 0 ? (
            <>
              <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                {collections.map((collection) => {
                  const isSelected = selectedIds.includes(collection.id)
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => toggle(collection.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "rounded-lg border px-3 text-left outline-none transition-colors motion-reduce:transition-none",
                        "focus-visible:ring-2 focus-visible:ring-brand-brass",
                        isMobile ? "min-h-11 py-2.5" : "py-2",
                        isSelected
                          ? "border-brand-brass/60 bg-brand-brass/[0.08]"
                          : "border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-white/[0.05]",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-white/85">{collection.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-white/40">
                          {collection.itemCount}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-white/35">
                        {collection.kind === "corpus" ? "Corpus" : "Liste"}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="text-[10px] leading-relaxed text-white/35">
                Le pitch retient au plus {PROMPT_ITEM_CAP} éléments de listes personnelles ; un
                corpus n’apporte que ses éléments directs, pas le contenu des listes qu’il contient.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-white/45">
              Aucune liste personnelle pour l’instant. Créez-en une depuis l’espace Connaissance.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
