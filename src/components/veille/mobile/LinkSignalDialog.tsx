"use client"

import { useMemo, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox"
import { Input } from "@/components/ui/Input"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { createCompanyInteraction } from "@/app/(app)/prospection/_actions/company-interaction"
import { updateVeilleArticleAction } from "@/app/(app)/veille/_actions/veille-actions"
import type { CompanyContextStats, VeilleArticle } from "@/app/(app)/veille/_data/veille-data"

type LinkSignalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: VeilleArticle
  companies: CompanyContextStats[]
  /** Compte deviné par heuristique de texte — proposé, jamais imposé. */
  suggestedCompany: CompanyContextStats | null
  onSuccess: (updated: VeilleArticle, message: string) => void
}

/**
 * « Lier à un compte / secteur ».
 *
 * `veille_articles` ne porte AUCUNE colonne `company_id` : le rattachement à un
 * compte ne peut donc pas être stocké sur l'article. Le seul lien persistant
 * qui existe dans le modèle est une INTERACTION journalisée sur le compte —
 * c'est ce que fait ce dialogue, via l'action déjà en place. Le secteur, lui,
 * est bien une colonne de l'article (`secteur_principal`).
 */
export function LinkSignalDialog({
  open,
  onOpenChange,
  article,
  companies,
  suggestedCompany,
  onSuccess,
}: LinkSignalDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [companyQuery, setCompanyQuery] = useState(suggestedCompany?.name ?? "")
  const [companyId, setCompanyId] = useState<string | null>(suggestedCompany?.id ?? null)
  const [sector, setSector] = useState(article.secteur_principal ?? "")
  const [error, setError] = useState<string | null>(null)

  const options = useMemo<ComboboxOption[]>(() => {
    const needle = companyQuery.trim().toLowerCase()
    return companies
      .filter((company) => !needle || company.name.toLowerCase().includes(needle))
      .slice(0, 20)
      .map((company) => ({
        id: company.id,
        label: company.name,
        description: company.sector ?? undefined,
      }))
  }, [companies, companyQuery])

  const sectorChanged = sector.trim() !== (article.secteur_principal ?? "").trim()
  const canSubmit = Boolean(companyId) || sectorChanged

  const handleSubmit = () => {
    setError(null)

    startTransition(async () => {
      const done: string[] = []

      if (sectorChanged) {
        const result = await updateVeilleArticleAction(article.id, {
          secteur_principal: sector.trim() || "transverse",
        })
        if (result.error) {
          setError(result.error)
          return
        }
        done.push("secteur mis à jour")
      }

      if (companyId) {
        const company = companies.find((candidate) => candidate.id === companyId)
        const summary = [
          `Signal de veille : ${article.titre_fr}`,
          article.source_name ? `Source : ${article.source_name}` : null,
          article.resume ? `\n${article.resume}` : null,
        ]
          .filter(Boolean)
          .join("\n")

        const result = await createCompanyInteraction({
          company_id: companyId,
          type: "note",
          summary,
          occurred_at: new Date().toISOString(),
        })
        if (result.error) {
          setError(result.error)
          return
        }
        done.push(`rattaché à ${company?.name ?? "ce compte"}`)
      }

      onSuccess(
        { ...article, secteur_principal: sector.trim() || article.secteur_principal },
        `Signal ${done.join(" et ")}.`,
      )
      onOpenChange(false)
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lier à un compte / secteur"
      description="Rattache ce signal à un compte du CRM et précise son secteur."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={!canSubmit}>
            Lier
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <AlertBlock variant="danger" title="Échec du rattachement" description={error} />
        ) : null}

        <div className="space-y-1.5">
          <label
            htmlFor="veille-link-company"
            className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
          >
            Compte
          </label>
          <Combobox
            id="veille-link-company"
            value={companyQuery}
            onValueChange={(value) => {
              setCompanyQuery(value)
              setCompanyId(null)
            }}
            options={options}
            onSelect={(option) => {
              setCompanyQuery(option.label)
              setCompanyId(option.id)
            }}
            placeholder="Rechercher un compte…"
            emptyMessage="Aucun compte ne correspond."
            clearable
            onClear={() => {
              setCompanyQuery("")
              setCompanyId(null)
            }}
            fullWidth
          />
          <p className="text-xs leading-5 text-muted">
            Le rattachement est journalisé comme interaction sur la fiche du compte.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="veille-link-sector"
            className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
          >
            Secteur
          </label>
          <Input
            id="veille-link-sector"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            placeholder="transverse"
            fullWidth
          />
        </div>
      </div>
    </AppDialog>
  )
}
