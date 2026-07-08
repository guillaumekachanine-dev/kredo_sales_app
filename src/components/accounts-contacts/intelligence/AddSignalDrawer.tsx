"use client"

import { useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { createManualSignal } from "./create-manual-signal"
import { AlertBlock } from "@/components/ui/AlertBlock"

type AddSignalDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onSignalAdded: (newSignalId: string) => void
}

const CATEGORIES = [
  { value: "growth", label: "Croissance & Business" },
  { value: "technology", label: "Technologie & IT" },
  { value: "regulatory", label: "Réglementaire" },
  { value: "people", label: "Mouvements & RH" },
  { value: "other", label: "Autre" }
]

export function AddSignalDrawer({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSignalAdded,
}: AddSignalDrawerProps) {
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [category, setCategory] = useState("growth")
  const [comment, setComment] = useState("")
  const [detectedAt, setDetectedAt] = useState(() => new Date().toISOString().split("T")[0])

  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !excerpt.trim()) {
      setFeedback({ tone: "error", message: "Le titre et l'extrait observés sont obligatoires." })
      return
    }

    setFeedback(null)
    startTransition(async () => {
      const result = await createManualSignal({
        companyId,
        title: title.trim(),
        summary: excerpt.trim(), // default summary to excerpt text
        url: url.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        category,
        comment: comment.trim() || undefined,
        detectedAt: detectedAt ? new Date(detectedAt).toISOString() : undefined,
      })

      if (result.error || !result.data) {
        setFeedback({ tone: "error", message: result.error || "Une erreur est survenue lors de la création." })
      } else {
        setFeedback({ tone: "success", message: "Signal manuel ajouté avec succès !" })
        onSignalAdded(result.data.id)
        
        // Reset form
        setTitle("")
        setUrl("")
        setExcerpt("")
        setCategory("growth")
        setComment("")
        setDetectedAt(new Date().toISOString().split("T")[0])

        // Close drawer after short delay
        setTimeout(() => {
          onOpenChange(false)
          setFeedback(null)
        }, 800)
      }
    })
  }

  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"
  const inputCls = "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-semibold text-heading outline-none transition-colors focus:border-primary placeholder-muted/60"
  const textareaCls = "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-semibold text-heading outline-none transition-colors focus:border-primary placeholder-muted/60 min-h-[70px]"

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter un signal manuel"
      eyebrow="Veille spécifique"
      subtitle={`Saisir un signal (profil/post LinkedIn ou note) pour ${companyName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Titre du signal */}
        <div>
          <label htmlFor="signal-title" className={labelCls}>Titre du signal *</label>
          <input
            id="signal-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Nomination d'un nouveau DSI"
            className={inputCls}
            disabled={isPending}
          />
        </div>

        {/* URL optionnelle */}
        <div>
          <label htmlFor="signal-url" className={labelCls}>URL source (LinkedIn ou autre) / Optionnelle</label>
          <input
            id="signal-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/..."
            className={inputCls}
            disabled={isPending}
          />
        </div>

        {/* Extrait ou contenu observé */}
        <div>
          <label htmlFor="signal-excerpt" className={labelCls}>Extrait ou contenu observé *</label>
          <textarea
            id="signal-excerpt"
            required
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Copiez-collez ici le post, la description ou les faits observés..."
            className={textareaCls}
            disabled={isPending}
          />
        </div>

        {/* Catégorie */}
        <div>
          <label htmlFor="signal-category" className={labelCls}>Catégorie</label>
          <select
            id="signal-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
            disabled={isPending}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Commentaire / Action recommandée */}
        <div>
          <label htmlFor="signal-comment" className={labelCls}>Commentaires / Actions recommandées</label>
          <textarea
            id="signal-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Opportunité de cross-sell sur l'offre Cloud..."
            className={textareaCls}
            disabled={isPending}
          />
        </div>

        {/* Date du signal */}
        <div>
          <label htmlFor="signal-date" className={labelCls}>Date du signal</label>
          <input
            id="signal-date"
            type="date"
            value={detectedAt}
            onChange={(e) => setDetectedAt(e.target.value)}
            className={inputCls}
            disabled={isPending}
          />
        </div>

        {/* Feedback banner */}
        {feedback && (
          <AlertBlock
            variant={feedback.tone === "success" ? "success" : "danger"}
            title={feedback.message}
          />
        )}

        {/* Submit */}
        <div className="pt-4 border-t border-border flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-muted hover:text-body text-xs font-bold"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            loadingLabel="Ajout en cours..."
            className="text-xs font-bold"
          >
            Ajouter le signal
          </Button>
        </div>
      </form>
    </AppDrawer>
  )
}
