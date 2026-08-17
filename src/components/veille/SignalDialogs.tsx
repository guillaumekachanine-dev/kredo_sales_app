"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Select } from "@/components/ui/Select"
import { createClient } from "@/lib/supabase/client"
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
  companies?: Array<{ id: string; name: string }>
  onSuccess: (updatedArticle: VeilleArticle) => void
}

export function QualifySignalDialog({
  open,
  onOpenChange,
  article,
  companies,
  onSuccess,
}: QualifySignalDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [titre, setTitre] = useState(article.titre_fr)
  const [categorie, setCategorie] = useState(article.categorie || "Nominations")
  const [secteur, setSecteur] = useState(article.secteur_principal || "transverse")
  const [companyId, setCompanyId] = useState<string | null>(article.company_id ?? null)
  const [companyList, setCompanyList] = useState<Array<{ id: string; name: string }>>(companies ?? [])
  const [resume, setResume] = useState(article.resume || "")
  const [analyseKredo, setAnalyseKredo] = useState(article.analyse_kredo || "")
  const [actionCommerciale, setActionCommerciale] = useState(article.action_commerciale || "")
  const [tagsInput, setTagsInput] = useState((article.tags || []).join(", "))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitre(article.titre_fr)
    setCategorie(article.categorie || "Nominations")
    setSecteur(article.secteur_principal || "transverse")
    setCompanyId(article.company_id ?? null)
    setResume(article.resume || "")
    setAnalyseKredo(article.analyse_kredo || "")
    setActionCommerciale(article.action_commerciale || "")
    setTagsInput((article.tags || []).join(", "))
  }, [article])

  useEffect(() => {
    if (companies && companies.length > 0) {
      setCompanyList(companies)
      return
    }
    if (!open) return
    const supabase = createClient()
    void supabase
      .from("companies")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setCompanyList(data)
      })
  }, [open, companies])

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
        company_id: companyId,
        resume: resume,
        analyse_kredo: analyseKredo,
        action_commerciale: actionCommerciale,
        tags: tagsArray,
      })

      if (result.error) {
        setError(result.error)
      } else {
        if (companyId && companyId !== article.company_id) {
          const summary = [
            `Signal de veille : ${titre}`,
            article.source_name ? `Source : ${article.source_name}` : null,
            resume ? `\n${resume}` : null,
          ]
            .filter(Boolean)
            .join("\n")

          await createCompanyInteraction({
            company_id: companyId,
            type: "note",
            summary,
            occurred_at: new Date().toISOString(),
          })
        }

        onSuccess({
          ...article,
          titre_fr: titre,
          categorie: categorie,
          secteur_principal: secteur,
          company_id: companyId,
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

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Catégorie</label>
          <Select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            fullWidth
          >
            <option value="Nominations">Nominations</option>
            <option value="Projets & Transfo">Projets & Transfo</option>
            <option value="Finances & Levées">Finances & Levées</option>
            <option value="Stratégie & M&A">Stratégie & M&A</option>
            <option value="Réglementation">Réglementation</option>
            <option value="Partenariats">Partenariats</option>
            <option value="Technologie & IA">Technologie & IA</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Secteur</label>
            <Input
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              placeholder="e.g. Banque, Retail..."
              fullWidth
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Lier à un compte</label>
            <Select
              value={companyId || ""}
              onChange={(e) => setCompanyId(e.target.value || null)}
              fullWidth
            >
              <option value="">-- Aucun compte rattaché --</option>
              {companyList.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Résumé</label>
          <Textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={3}
            fullWidth
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Pourquoi c&apos;est important (Analyse KREDO)</label>
          <Textarea
            value={analyseKredo}
            onChange={(e) => setAnalyseKredo(e.target.value)}
            rows={3}
            fullWidth
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Action commerciale proposée</label>
          <Textarea
            value={actionCommerciale}
            onChange={(e) => setActionCommerciale(e.target.value)}
            rows={3}
            fullWidth
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Tags (séparés par des virgules)</label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="IA, Cloud, Digitalisation..."
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
  const [note, setNote] = useState(`Note issue du signal : ${signalTitle}\n\n`)
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
      title="Créer une note compte"
      description={`Ajouter une note stratégique dans le fil d'activité de ${companyName}.`}
      className="sm:max-w-lg"
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
// 3. CREATE COMMERCIAL WINDOW DIALOG ("Créer une fenêtre commerciale")
// ──────────────────────────────────────────────────────────────────────────────
interface CreateCommercialWindowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId?: string
  companyName?: string
  signalTitle?: string
  article?: VeilleArticle | null
  onSuccess: () => void
}

export function CreateCommercialWindowDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  signalTitle,
  article,
  onSuccess,
}: CreateCommercialWindowDialogProps) {
  const [isPending, startTransition] = useTransition()
  const initialTitle = article ? article.titre_fr : signalTitle ? `Fenêtre - ${signalTitle.substring(0, 40)}` : ""
  const [title, setTitle] = useState(initialTitle)
  const [account, setAccount] = useState(companyName || "")
  const [secteur, setSecteur] = useState(article?.secteur_principal || article?.categorie || "")
  const [horizon, setHorizon] = useState("immediat")
  const initialAngle = article
    ? [article.action_commerciale ? `Action : ${article.action_commerciale}` : null, article.resume ? `Résumé : ${article.resume}` : null]
        .filter(Boolean)
        .join("\n\n")
    : ""
  const [angleCommercial, setAngleCommercial] = useState(initialAngle)
  const [conviction, setConviction] = useState(60)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (article) {
      setTitle(article.titre_fr)
      setSecteur(article.secteur_principal || article.categorie || "")
      setAngleCommercial(
        [
          article.action_commerciale ? `Action : ${article.action_commerciale}` : null,
          article.resume ? `Résumé : ${article.resume}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
    } else if (signalTitle) {
      setTitle(`Fenêtre - ${signalTitle}`)
    }
    if (companyName) setAccount(companyName)
  }, [article, companyName, signalTitle])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (companyId) {
        const result = await createOpportunity({
          title,
          account_id: companyId,
          account_name_new: "",
          stage: "qualification",
          priority: "normale",
          conviction,
          target_close_date: "",
          start_date: "",
          duration: null,
          estimated_gain: null,
          target_daily_rate: null,
        })
        if (result.error) {
          setError(result.error)
          return
        }
      }
      onSuccess()
      onOpenChange(false)
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Créer une fenêtre commerciale"
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-danger/10 p-3 text-xxs font-semibold text-danger">
            {error}
          </div>
        )}

        {/* Banner V2 Callout */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-heading">
          <p className="font-bold text-primary">💡 V2 à venir</p>
          <p className="mt-1 text-muted">
            Dans la prochaine version, cette modale proposera automatiquement les éléments de discours du playbook sectoriel, le lien avec les enjeux réglementaires et la liste des contacts pertinents du compte.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Intitulé de la fenêtre commerciale</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Compte concerné</label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Nom du compte..."
              fullWidth
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Secteur / Thématique</label>
            <Input
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              placeholder="e.g. Banque, Cloud..."
              fullWidth
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Horizon / Échéance</label>
            <Select value={horizon} onChange={(e) => setHorizon(e.target.value)} fullWidth>
              <option value="immediat">Immédiat (signal à chaud)</option>
              <option value="30jours">30 jours (Court terme)</option>
              <option value="trimestre">Trimestre en cours</option>
              <option value="reglementaire">Échéance réglementaire</option>
            </Select>
          </div>

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
          </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Angle commercial & Justification</label>
          <Textarea
            value={angleCommercial}
            onChange={(e) => setAngleCommercial(e.target.value)}
            rows={4}
            placeholder="Arguments et contexte d'attaque..."
            fullWidth
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" loading={isPending}>
            Créer la fenêtre commerciale
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}

export const CreateOpportunityDialog = CreateCommercialWindowDialog
