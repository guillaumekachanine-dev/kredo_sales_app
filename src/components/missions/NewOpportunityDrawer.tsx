"use client"

import { useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Select } from "@/components/ui/Select"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import {
  createOpportunity,
  type SalesPriority,
  type SalesStage,
} from "@/app/(app)/missions/_actions/create-opportunity"
import { cn } from "@/lib/utils"

export const STAGE_OPTIONS: Array<{ value: SalesStage; label: string }> = [
  { value: "qualification",    label: "Qualification" },
  { value: "recherche_profil",  label: "Recherche profils" },
  { value: "cv_envoyes",       label: "CV envoyés" },
  { value: "entretien_client", label: "Entretien client" },
]

const PRIORITY_OPTIONS: Array<{ value: SalesPriority; label: string }> = [
  { value: "basse", label: "Basse" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
]

interface FormState {
  title: string
  account: AccountValue | null
  stage: SalesStage
  priority: SalesPriority
  conviction: number
  target_close_date: string
  start_date: string
  duration: string
  estimated_gain: string
  target_daily_rate: string
}

const INITIAL_FORM: FormState = {
  title: "",
  account: null,
  stage: "qualification",
  priority: "normale",
  conviction: 50,
  target_close_date: "",
  start_date: "",
  duration: "",
  estimated_gain: "",
  target_daily_rate: "",
}

function getInitialForm(defaultStage?: SalesStage): FormState {
  return {
    ...INITIAL_FORM,
    stage: defaultStage ?? "qualification",
  }
}

interface NewOpportunityDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  defaultStage?: SalesStage
}

export function NewOpportunityDrawer({
  open,
  onOpenChange,
  onCreated,
  defaultStage,
}: NewOpportunityDrawerProps) {
  const [form, setForm] = useState<FormState>(() => getInitialForm(defaultStage))
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const acvComputed = (() => {
    const duration = parseInt(form.duration, 10)
    const tjm = parseFloat(form.target_daily_rate)
    if (!Number.isNaN(duration) && !Number.isNaN(tjm) && duration > 0 && tjm > 0) {
      return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(duration * tjm)
    }
    return null
  })()

  const isValid = form.title.trim().length > 0

  function handleClose() {
    if (isPending) return
    setForm(getInitialForm(defaultStage))
    setServerError(null)
    onOpenChange(false)
  }

  function handleSubmit() {
    if (!isValid || isPending) return
    setServerError(null)

    startTransition(async () => {
      const result = await createOpportunity({
        title: form.title,
        account_id: form.account?.isNew ? null : (form.account?.id ?? null),
        account_name_new: form.account?.isNew ? form.account.name : "",
        stage: form.stage,
        priority: form.priority,
        conviction: form.conviction,
        target_close_date: form.target_close_date,
        start_date: form.start_date,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        estimated_gain: form.estimated_gain ? parseFloat(form.estimated_gain) : null,
        target_daily_rate: form.target_daily_rate ? parseFloat(form.target_daily_rate) : null,
      })

      if (result.error) {
        setServerError(result.error)
        return
      }

      handleClose()
      onCreated?.()
    })
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleClose}
      title="Nouvelle opportunité"
      subtitle="Assistance technique"
      side="right"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2 text-xs text-muted hover:text-heading transition-colors disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-fg hover:bg-primary/90 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? "Création…" : "Créer l'opportunité"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {serverError && (
          <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
            {serverError}
          </div>
        )}

        <section className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
            Identité
          </p>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Intitulé&nbsp;<span className="text-danger" aria-hidden>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              placeholder="ex. Transformation SI — BNP Paribas"
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Client
            </label>
            <AccountCombobox
              value={form.account}
              onChange={(value) => setField("account", value)}
            />
            {form.account?.isNew && (
              <p className="mt-1 text-[10px] text-muted">
                Le compte «&nbsp;{form.account.name}&nbsp;» sera créé automatiquement dans companies.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Étape
            </label>
            <Select
              value={form.stage}
              onChange={(event) => setField("stage", event.target.value as SalesStage)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors appearance-none cursor-pointer"
            >
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <div className="border-t border-border/40" />

        <section className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
            Qualification
          </p>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Priorité
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setField("priority", priority.value)}
                  className={cn(
                    "py-1.5 rounded-md text-xs font-medium border transition-all",
                    form.priority === priority.value
                      ? "bg-primary text-primary-fg border-primary"
                      : "bg-canvas text-muted border-border hover:border-primary/40 hover:text-heading"
                  )}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-heading">
                Niveau de confiance
              </label>
              <span className="text-xs font-semibold text-primary">
                {form.conviction}&nbsp;%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.conviction}
              onChange={(event) => setField("conviction", parseInt(event.target.value, 10))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted mt-0.5 select-none">
              <span>Incertain</span>
              <span>Confiant</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Début prévu
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => setField("start_date", event.target.value)}
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Durée
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(event) => setField("duration", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-border bg-canvas pl-3 pr-8 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none select-none">
                  j
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                TJM cible
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={form.target_daily_rate}
                  onChange={(event) => setField("target_daily_rate", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-border bg-canvas pl-3 pr-10 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none select-none">
                  €/j
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                ACV estimé
              </label>
              <div className={cn(
                "relative w-full rounded-md border py-2 pl-3 pr-8 text-xs transition-all select-none",
                acvComputed
                  ? "border-primary/30 bg-primary/5 font-semibold text-primary"
                  : "border-border bg-canvas text-muted/30"
              )}>
                <span>{acvComputed ?? "—"}</span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none">
                  €
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppDrawer>
  )
}
