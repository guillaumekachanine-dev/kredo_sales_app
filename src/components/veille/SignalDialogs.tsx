"use client"

import { useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { updateVeilleArticleAction } from "@/app/(app)/veille/_actions/veille-actions"
import { createCompanyInteraction } from "@/app/(app)/prospection/_actions/company-interaction"
import { createOpportunity, type SalesStage, type SalesPriority } from "@/app/(app)/missions/_actions/create-opportunity"
import type { VeilleArticle } from "@/app/(app)/veille/_data/veille-data"

// ──────────────────────────────────────────────────────────────────────────────
// 1. QUALIFY SIGNAL DIALOG
// ──────────────────────────────────────────────────────────────────────────────
interface QualifySignalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: VeilleArticle
  onSuccess: (updatedArticle: VeilleArticle) => void
}

export function QualifySignalDialog({
  open,
  onOpenChange,
  article,
  onSuccess,
}: QualifySignalDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [titre, setTitre] = useState(article.titre_fr)
  const [categorie, setCategorie] = useState(article.categorie || "Nominations")
  const [secteur, setSecteur] = useState(article.secteur_principal || "transverse")
  const [resume, setResume] = useState(article.resume || "")
  const [analyseKredo, setAnalyseKredo] = useState(article.analyse_kredo || "")
  const [actionCommerciale, setActionCommerciale] = useState(article.action_commerciale || "")
  const [tagsInput, setTagsInput] = useState((article.tags || []).join(", "))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    startTransition(async () => {
      const result = await updateVeilleArticleAction(article.id, {
        titre_fr: titre,
        categorie: categorie,
        secteur_principal: secteur,
        resume: resume,
        analyse_kredo: analyseKredo,
        action_commerciale: actionCommerciale,
        tags: tagsArray,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess({
          ...article,
          titre_fr: titre,
          categorie: categorie,
          secteur_principal: secteur,
          resume: resume,
          analyse_kredo: analyseKredo,
          action_commerciale: actionCommerciale,
          tags: tagsArray,
        })
        onOpenChange(false)
      }
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Qualifier le signal"
      description="Modifiez les informations stratégiques du signal pour l'adapter à vos besoins."
      className="sm:max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-danger/10 p-3 text-xxs font-semibold text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Titre du signal</label>
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            fullWidth
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-primary"
            >
              <option value="Nominations">Nominations</option>
              <option value="Réglementaire">Réglementaire</option>
              <option value="Nominations">Nominations</option>
              <option value="Marché">Marché</option>
              <option value="Comptes">Comptes</option>
              <option value="Investissement">Investissement</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Secteur</label>
            <Input
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              required
              fullWidth
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Tags (séparés par des virgules)</label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="DSI, Cloud, Cybersécurité"
            fullWidth
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Résumé</label>
          <Textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={3}
            required
            fullWidth
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Pourquoi c&apos;est important (Analyse Kredo)</label>
          <Textarea
            value={analyseKredo}
            onChange={(e) => setAnalyseKredo(e.target.value)}
            rows={3}
            required
            fullWidth
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Lecture commerciale (Action préconisée)</label>
          <Textarea
            value={actionCommerciale}
            onChange={(e) => setActionCommerciale(e.target.value)}
            rows={3}
            required
            fullWidth
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" loading={isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. CREATE ACCOUNT NOTE DIALOG
// ──────────────────────────────────────────────────────────────────────────────
interface CreateAccountNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  signalTitle: string
  onSuccess: () => void
}

export function CreateAccountNoteDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  signalTitle,
  onSuccess,
}: CreateAccountNoteDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState(`Note suite au signal : "${signalTitle}"\n\n`)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createCompanyInteraction({
        company_id: companyId,
        type: "note",
        summary: note,
        occurred_at: new Date().toISOString(),
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
        onOpenChange(false)
      }
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ajouter une note pour ${companyName}`}
      description="Cette note sera ajoutée à l'historique des interactions de ce compte."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-danger/10 p-3 text-xxs font-semibold text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Contenu de la note</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            required
            fullWidth
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" loading={isPending}>
            Ajouter la note
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. CREATE OPPORTUNITY DIALOG
// ──────────────────────────────────────────────────────────────────────────────
interface CreateOpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  signalTitle: string
  onSuccess: () => void
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  signalTitle,
  onSuccess,
}: CreateOpportunityDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(`Opportunité - ${companyName} (${signalTitle.substring(0, 30)}...)`)
  const [stage, setStage] = useState<SalesStage>("qualification")
  const [priority, setPriority] = useState<SalesPriority>("normale")
  const [conviction, setConviction] = useState(30)
  const [estimatedGain, setEstimatedGain] = useState<number | null>(null)
  const [targetDailyRate, setTargetDailyRate] = useState<number | null>(null)
  const [targetCloseDate, setTargetCloseDate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createOpportunity({
        title,
        account_id: companyId,
        account_name_new: "",
        stage,
        priority,
        conviction,
        target_close_date: targetCloseDate,
        start_date: startDate,
        duration: null,
        estimated_gain: estimatedGain,
        target_daily_rate: targetDailyRate,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
        onOpenChange(false)
      }
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Créer une opportunité"
      description={`Transformer ce signal stratégique en opportunité dans le pipeline commercial pour ${companyName}.`}
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-danger/10 p-3 text-xxs font-semibold text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Titre de l&apos;opportunité</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Étape commerciale</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as SalesStage)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-primary"
            >
              <option value="qualification">Qualification</option>
              <option value="recherche_profil">Recherche profil</option>
              <option value="cv_envoyes">CV envoyés</option>
              <option value="entretien_client">Entretien client</option>
              <option value="contractualisation">Contractualisation</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Priorité</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as SalesPriority)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-primary"
            >
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Conviction (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={conviction}
              onChange={(e) => setConviction(Number(e.target.value))}
              required
              fullWidth
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">TJM (€/j)</label>
            <Input
              type="number"
              placeholder="e.g. 600"
              value={targetDailyRate || ""}
              onChange={(e) => setTargetDailyRate(e.target.value ? Number(e.target.value) : null)}
              fullWidth
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Marge est. (€)</label>
            <Input
              type="number"
              placeholder="e.g. 15000"
              value={estimatedGain || ""}
              onChange={(e) => setEstimatedGain(e.target.value ? Number(e.target.value) : null)}
              fullWidth
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Date de démarrage</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Date de signature ciblée</label>
            <Input
              type="date"
              value={targetCloseDate}
              onChange={(e) => setTargetCloseDate(e.target.value)}
              fullWidth
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" loading={isPending}>
            Créer l&apos;opportunité
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
