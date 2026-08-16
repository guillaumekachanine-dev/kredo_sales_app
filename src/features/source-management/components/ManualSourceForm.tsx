"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
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
    <div className="space-y-4">
      <Field label="Nom" required>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Le Monde Informatique" fullWidth />
      </Field>

      <Field label="URL du site" required description="Sert de clé de dédoublonnage — le hostname est normalisé.">
        <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="lemondeinformatique.fr" fullWidth />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Famille" required>
          <Input value={family} onChange={(event) => setFamily(event.target.value)} placeholder="Marché IT / ESN France" fullWidth />
        </Field>

        <Field label="Catégorie KREDO" required>
          <Select
            value={kredoCategory}
            onChange={(event) => setKredoCategory(event.target.value as KredoSourceCategory | "")}
            fullWidth
          >
            <option value="">Sélectionner…</option>
            {KREDO_SOURCE_CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>{KREDO_SOURCE_CATEGORY_LABELS[category]}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Flux RSS direct" optional description="Sans flux, la collecte utilisera une recherche Google News sur le domaine.">
        <Input value={rssUrl} onChange={(event) => setRssUrl(event.target.value)} placeholder="https://…/rss" fullWidth />
      </Field>

      {error ? (
        <div className="space-y-2 border border-danger/25 bg-danger/[0.04] p-3">
          <p role="alert" className="text-xs text-danger">{error}</p>
          {duplicate ? (
            <Button variant="secondary" size="sm" onClick={reactivate} loading={isPending}>
              Réactiver « {duplicate.name} »
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button variant="brass" onClick={submit} loading={isPending} loadingLabel="Enregistrement">
          {mode === "create" ? "Ajouter la source" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
