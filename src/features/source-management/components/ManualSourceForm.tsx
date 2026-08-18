"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import {
  createManualSourceAction,
  reactivateManualSourceAction,
  updateManualSourceAction,
} from "../actions/source-management-actions"
import {
  KREDO_SOURCE_CATEGORY_LABELS,
  KREDO_SOURCE_CATEGORY_ORDER,
  type KredoSourceCategory,
  type ManualSourceFormInput,
  type SourceCatalogEntry,
} from "../domain/source-management-contracts"

export interface ManualSourceFormProps {
  mode: "create" | "edit"
  initial?: SourceCatalogEntry
  onCancel: () => void
  onSuccess: () => void
}

export function ManualSourceForm({ mode, initial, onCancel, onSuccess }: ManualSourceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initial?.name ?? "")
  const [url, setUrl] = useState(initial?.domain ?? initial?.homepageUrl ?? "")
  const [family, setFamily] = useState(initial?.family ?? "")
  const [kredoCategory, setKredoCategory] = useState<KredoSourceCategory | "">(initial?.kredoCategory ?? "")
  const [rssUrl, setRssUrl] = useState(initial?.collectionUrl ?? "")
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<{ id: string; name: string; isActive: boolean } | null>(null)

  const submit = () => {
    setError(null)
    setDuplicate(null)
    const input: ManualSourceFormInput = { name, url, family, kredoCategory, rssUrl }

    startTransition(async () => {
      const result = mode === "create"
        ? await createManualSourceAction(input)
        : await updateManualSourceAction(initial!.id, input)

      if (!result.success) {
        setError(result.error)
        if (result.duplicate && result.duplicate.origin === "manual" && !result.duplicate.isActive) {
          setDuplicate({ id: result.duplicate.id, name: result.duplicate.name, isActive: result.duplicate.isActive })
        }
        return
      }

      router.refresh()
      onSuccess()
    })
  }

  const reactivate = () => {
    if (!duplicate) return
    startTransition(async () => {
      const result = await reactivateManualSourceAction(duplicate.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess()
    })
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="border-b border-white/5 pb-3">
        <h3 className="text-sm font-bold text-white">
          {mode === "create" ? "Ajouter une nouvelle source manuelle" : `Modifier « ${initial?.name} »`}
        </h3>
        <p className="mt-0.5 text-xs text-white/50">
          Les sources manuelles enrichissent le socle d&apos;actualités et de veille KREDO.
        </p>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1" htmlFor="source-name">
            Nom de la source <span className="text-brand-brass">*</span>
          </label>
          <input
            id="source-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Le Monde Informatique"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1" htmlFor="source-url">
            URL du site <span className="text-brand-brass">*</span>
          </label>
          <input
            id="source-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="lemondeinformatique.fr"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
          />
          <p className="mt-1 text-[10px] text-white/40">Sert de clé de dédoublonnage — le hostname est normalisé.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1" htmlFor="source-family">
              Famille <span className="text-brand-brass">*</span>
            </label>
            <input
              id="source-family"
              type="text"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="Marché IT / ESN France"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1" htmlFor="source-category">
              Catégorie KREDO <span className="text-brand-brass">*</span>
            </label>
            <select
              id="source-category"
              value={kredoCategory}
              onChange={(e) => setKredoCategory(e.target.value as KredoSourceCategory | "")}
              className="w-full rounded-xl border border-white/10 bg-[#161a3d] px-3 py-2 text-xs text-white outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
            >
              <option value="">Sélectionner…</option>
              {KREDO_SOURCE_CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>{KREDO_SOURCE_CATEGORY_LABELS[category]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1" htmlFor="source-rss">
            Flux RSS direct <span className="text-white/40 font-normal">(optionnel)</span>
          </label>
          <input
            id="source-rss"
            type="text"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="https://…/rss"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
          />
          <p className="mt-1 text-[10px] text-white/40">Sans flux, la collecte utilisera une recherche Google News sur le domaine.</p>
        </div>
      </div>

      {error ? (
        <div className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
          <p role="alert" className="text-xs font-medium text-rose-300">{error}</p>
          {duplicate ? (
            <Button variant="secondary" size="sm" onClick={reactivate} loading={isPending}>
              Réactiver « {duplicate.name} »
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
        <Button variant="secondary" size="sm" onClick={onCancel} className="!border-white/15 !bg-white/5 hover:!bg-white/10 !text-white">
          Annuler
        </Button>
        <Button variant="brass" size="sm" onClick={submit} loading={isPending} loadingLabel="Enregistrement">
          {mode === "create" ? "Ajouter la source" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
