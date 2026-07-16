"use client"

import { useEffect, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { formatEuro } from "@/lib/formatters"
import { getOrCreateCommercialQuoteAction, saveCommercialQuoteAction } from "@/features/financial-modeling/actions"
import type { CommercialQuote } from "@/features/financial-modeling/data/commercial-quote"

type Props = { modelId: string; open: boolean; onOpenChange: (open: boolean) => void }
const inputClass = "w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:border-primary/60"

export function CommercialQuoteDesktopDialog({ modelId, open, onOpenChange }: Props) {
  const [quote, setQuote] = useState<CommercialQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    setLoading(true); setError(null)
    void getOrCreateCommercialQuoteAction(modelId).then((result) => {
      if ("error" in result) setError(result.error ?? "Impossible de préparer le devis")
      else setQuote(result.quote)
      setLoading(false)
    })
  }, [modelId, open])
  const update = <K extends keyof CommercialQuote>(key: K, value: CommercialQuote[K]) => setQuote((current) => current ? { ...current, [key]: value } : current)
  const save = async () => {
    if (!quote) return
    setSaving(true); setError(null)
    const result = await saveCommercialQuoteAction(quote)
    if ("error" in result) setError(result.error ?? "Impossible d’enregistrer le devis")
    setSaving(false)
  }
  return <AppDialog open={open} onOpenChange={onOpenChange} title="Créer un devis" description="Brouillon commercial issu de la référence financière." className="sm:!max-w-5xl" bodyClassName="pr-0" footer={<><Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Fermer</Button><Button variant="primary" size="sm" loading={saving} disabled={!quote} onClick={save}>Enregistrer</Button></>}>
    {loading ? <p className="py-12 text-center text-xs text-muted">Préparation du devis…</p> : error ? <p className="text-xs text-danger">{error}</p> : quote ? <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
      <form className="grid grid-cols-2 gap-3" onSubmit={(event) => { event.preventDefault(); void save() }}>
        <label className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted">Titre<input className={inputClass + " mt-1"} value={quote.title} onChange={(e) => update("title", e.target.value)} /></label>
        <label className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted">Objet<input className={inputClass + " mt-1"} value={quote.subject} onChange={(e) => update("subject", e.target.value)} /></label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Début<input type="date" className={inputClass + " mt-1"} value={quote.startDate} onChange={(e) => update("startDate", e.target.value)} /></label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Fin<input type="date" className={inputClass + " mt-1"} value={quote.endDate ?? ""} onChange={(e) => update("endDate", e.target.value || null)} /></label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Jours<input type="number" className={inputClass + " mt-1"} value={quote.productionDays} onChange={(e) => update("productionDays", Number(e.target.value))} /></label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">TJM<input type="number" className={inputClass + " mt-1"} value={quote.dailyRate} onChange={(e) => update("dailyRate", Number(e.target.value))} /></label>
        <label className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted">Montant HT<input type="number" className={inputClass + " mt-1"} value={quote.totalExcludingTax} onChange={(e) => update("totalExcludingTax", Number(e.target.value))} /></label>
        <label className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted">Conditions<textarea className={inputClass + " mt-1 min-h-20"} value={quote.conditions} onChange={(e) => update("conditions", e.target.value)} /></label>
        <label className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted">Notes<textarea className={inputClass + " mt-1 min-h-16"} value={quote.notes} onChange={(e) => update("notes", e.target.value)} /></label>
      </form>
      <aside className="border-l border-border pl-6"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Aperçu client</p><h3 className="mt-4 font-heading text-lg font-bold text-heading">{quote.title}</h3><p className="mt-1 text-xs text-body">{quote.subject}</p><dl className="mt-6 space-y-3 text-xs"><div><dt className="text-muted">Compte</dt><dd className="font-semibold text-heading">{quote.account ?? "—"}</dd></div><div><dt className="text-muted">Opportunité</dt><dd className="font-semibold text-heading">{quote.opportunity ?? "—"}</dd></div><div><dt className="text-muted">Prestation</dt><dd className="font-semibold text-heading">{quote.resource} · {quote.profile ?? "—"}</dd></div><div><dt className="text-muted">Période</dt><dd className="font-semibold text-heading">{quote.startDate} — {quote.endDate ?? "Sans fin"}</dd></div></dl><div className="mt-8 border-t border-border pt-4"><p className="text-xs text-muted">{quote.productionDays} jours × {formatEuro(quote.dailyRate)}</p><p className="mt-1 font-mono text-xl font-bold text-heading">{formatEuro(quote.totalExcludingTax)} HT</p></div></aside>
    </div> : null}
  </AppDialog>
}
