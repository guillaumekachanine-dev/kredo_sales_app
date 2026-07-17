"use client"

import Link from "next/link"
import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { upsertAccountByName } from "@/app/(app)/missions/_actions/upsert-account"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { PRACTICE_OPTIONS, REMOTE_OPTIONS, SENIORITY_OPTIONS, SOURCE_OPTIONS, TYPE_OPTIONS } from "./opportunity-detail-options"
import { OpportunityStageRail } from "./OpportunityStageRail"
import type { SalesPriority, SalesStage } from "@/types/database-domain"

interface OpportunityEditWorkspaceProps {
  data: OpportunityDetailData
}

const inputClassName = "w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2.5 text-sm text-heading outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted focus:border-primary/55 focus:bg-surface focus:ring-4 focus:ring-primary/10"
const labelClassName = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted"

function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={labelClassName}>{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] leading-4 text-muted">{hint}</span> : null}
    </label>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border/80 bg-surface-hover/35 px-4 py-4 sm:px-5">
        <h2 className="font-heading text-base font-bold tracking-tight text-heading">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-body">{description}</p>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </SurfaceCard>
  )
}

function NullableNumber(value: string) {
  if (value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function OpportunityEditWorkspace({ data }: OpportunityEditWorkspaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { opportunity, account } = data
  const [error, setError] = useState<string | null>(null)
  const [accountValue, setAccountValue] = useState<AccountValue | null>(
    account ? { id: account.id, name: account.name, isNew: false } : null,
  )
  const [form, setForm] = useState({
    title: opportunity.title,
    stage: opportunity.stage as SalesStage,
    opportunityType: opportunity.opportunity_type ?? "",
    priority: opportunity.priority as SalesPriority,
    source: opportunity.source ?? "",
    conviction: String(opportunity.conviction ?? 0),
    targetDailyRate: opportunity.target_daily_rate === null ? "" : String(opportunity.target_daily_rate),
    estimatedGain: opportunity.estimated_gain === null ? "" : String(opportunity.estimated_gain),
    budget: opportunity.budget === null || opportunity.budget === undefined ? "" : String(opportunity.budget),
    duration: opportunity.duration === null || opportunity.duration === undefined ? "" : String(opportunity.duration),
    startDate: opportunity.start_date ?? "",
    targetCloseDate: opportunity.target_close_date ?? "",
    nextActionLabel: opportunity.next_action_label ?? "",
    nextActionAt: opportunity.next_action_at ?? "",
    needSummary: opportunity.need_summary ?? "",
    needDetail: opportunity.need_detail ?? "",
    clientContext: opportunity.client_context ?? "",
    engagementNotes: opportunity.engagement_notes ?? "",
    requiresStaffing: Boolean(opportunity.requires_staffing),
    requiredHeadcount: String(opportunity.required_headcount ?? 1),
    seniority: opportunity.seniority ?? "",
    searchedProfile: opportunity.searched_profile ?? "",
    practice: opportunity.practice ?? "",
    location: opportunity.location ?? "",
    remotePolicy: opportunity.remote_policy ?? "",
    rythme: opportunity.rythme ?? "",
    openedAt: opportunity.opened_at ?? "",
    diffusionDate: opportunity.diffusion_date ?? "",
    decisionDate: opportunity.decision_date ?? "",
    winReason: opportunity.win_reason ?? "",
    lossReason: opportunity.loss_reason ?? "",
  })

  const setValue = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const isTerminal = isTerminalOpportunityStage(form.stage)

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      let accountId = accountValue?.id ?? null
      if (accountValue?.isNew) {
        const result = await upsertAccountByName(accountValue.name)
        if (result.error || !result.data) {
          setError(result.error ?? "La création du compte a échoué.")
          return
        }
        accountId = result.data.id
      }

      const result = await updateOpportunity({
        id: opportunity.id,
        title: form.title,
        account_id: accountId,
        stage: form.stage,
        priority: form.priority,
        opportunity_type: form.opportunityType || null,
        source: form.source || null,
        conviction: NullableNumber(form.conviction) ?? 0,
        target_daily_rate: NullableNumber(form.targetDailyRate),
        estimated_gain: NullableNumber(form.estimatedGain),
        budget: NullableNumber(form.budget),
        duration: NullableNumber(form.duration),
        start_date: form.startDate || null,
        target_close_date: form.targetCloseDate || null,
        next_action_label: form.nextActionLabel || null,
        next_action_at: form.nextActionAt || null,
        need_summary: form.needSummary || null,
        need_detail: form.needDetail || null,
        client_context: form.clientContext || null,
        engagement_notes: form.engagementNotes || null,
        requires_staffing: form.requiresStaffing,
        ...(form.requiresStaffing ? { required_headcount: Math.max(1, Math.round(NullableNumber(form.requiredHeadcount) ?? 1)) } : {}),
        seniority: form.seniority || null,
        searched_profile: form.searchedProfile || null,
        practice: form.practice || null,
        location: form.location || null,
        remote_policy: form.remotePolicy || null,
        rythme: form.rythme || null,
        opened_at: form.openedAt || null,
        diffusion_date: form.diffusionDate || null,
        decision_date: form.decisionDate || null,
        win_reason: form.winReason || null,
        loss_reason: form.lossReason || null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/missions/opps/${opportunity.id}`)
      router.refresh()
    })
  }

  return (
    <main className="mx-auto w-full max-w-[1360px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href={`/missions/opps/${opportunity.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-body transition-colors hover:text-primary">
            <span aria-hidden="true">←</span> Retour à l&apos;opportunité
          </Link>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Édition de l&apos;opportunité</p>
          <h1 className="mt-1 truncate font-heading text-2xl font-bold tracking-tight text-heading sm:text-3xl">{opportunity.title}</h1>
          <p className="mt-2 text-sm text-body">{account?.name ?? "Compte à renseigner"}</p>
        </div>
        <p className="max-w-md text-sm leading-6 text-body">Mettez à jour les informations commerciales, opérationnelles et de staffing dans un seul espace.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <OpportunityStageRail stage={form.stage} onChange={(stage) => setValue("stage", stage)} />

        {error ? (
          <div role="alert" className="rounded-[var(--radius-medium)] border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
          <div className="space-y-5">
            <Section title="Cadrage commercial" description="Les fondamentaux qui identifient et qualifient l&apos;opportunité.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Compte client" className="sm:col-span-2">
                  <AccountCombobox value={accountValue} onChange={setAccountValue} openOnFocus size="md" />
                </Field>
                <Field label="Intitulé de l&apos;opportunité" className="sm:col-span-2">
                  <input value={form.title} onChange={(event) => setValue("title", event.target.value)} className={inputClassName} required />
                </Field>
                <Field label="Type d&apos;opportunité">
                  <Select value={form.opportunityType} onChange={(event) => setValue("opportunityType", event.target.value)} fullWidth>
                    <option value="">Non renseigné</option>
                    {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </Field>
                <Field label="Origine">
                  <Select value={form.source} onChange={(event) => setValue("source", event.target.value)} fullWidth>
                    <option value="">Non renseignée</option>
                    {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </Field>
                <Field label="Priorité">
                  <Select value={form.priority} onChange={(event) => setValue("priority", event.target.value as SalesPriority)} fullWidth>
                    <option value="basse">Basse</option>
                    <option value="moyenne">Normale</option>
                    <option value="haute">Haute</option>
                  </Select>
                </Field>
                <Field label="Conviction (%)">
                  <input type="number" min="0" max="100" value={form.conviction} onChange={(event) => setValue("conviction", event.target.value)} className={inputClassName} />
                </Field>
                <Field label="Résumé du besoin" className="sm:col-span-2" hint="Une phrase claire qui sera visible dans les vues de synthèse.">
                  <textarea value={form.needSummary} onChange={(event) => setValue("needSummary", event.target.value)} className={cn(inputClassName, "min-h-24 resize-y leading-6")} placeholder="Quel besoin souhaitez-vous couvrir ?" />
                </Field>
              </div>
            </Section>

            <Section title="Contexte et décision" description="Les éléments utiles pour préparer l&apos;équipe et piloter la relation client.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contexte client" className="sm:col-span-2">
                  <textarea value={form.clientContext} onChange={(event) => setValue("clientContext", event.target.value)} className={cn(inputClassName, "min-h-24 resize-y leading-6")} />
                </Field>
                <Field label="Détail du besoin" className="sm:col-span-2">
                  <textarea value={form.needDetail} onChange={(event) => setValue("needDetail", event.target.value)} className={cn(inputClassName, "min-h-28 resize-y leading-6")} />
                </Field>
                <Field label="Notes d&apos;engagement" className="sm:col-span-2">
                  <textarea value={form.engagementNotes} onChange={(event) => setValue("engagementNotes", event.target.value)} className={cn(inputClassName, "min-h-24 resize-y leading-6")} />
                </Field>
                <Field label="Ouverte le"><input type="date" value={form.openedAt} onChange={(event) => setValue("openedAt", event.target.value)} className={inputClassName} /></Field>
                <Field label="Décision attendue le"><input type="date" value={form.decisionDate} onChange={(event) => setValue("decisionDate", event.target.value)} className={inputClassName} /></Field>
                {isTerminal ? (
                  <Field label={form.stage === "gagne" ? "Raison du gain" : "Raison de clôture"} className="sm:col-span-2">
                    <textarea value={form.stage === "gagne" ? form.winReason : form.lossReason} onChange={(event) => setValue(form.stage === "gagne" ? "winReason" : "lossReason", event.target.value)} className={cn(inputClassName, "min-h-20 resize-y leading-6")} />
                  </Field>
                ) : null}
              </div>
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Chiffrage et planning" description="Les hypothèses financières et les dates qui structurent la prévision.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="TJM cible (€)"><input inputMode="decimal" type="number" min="0" value={form.targetDailyRate} onChange={(event) => setValue("targetDailyRate", event.target.value)} className={inputClassName} /></Field>
                <Field label="Gain estimé (€)"><input inputMode="decimal" type="number" min="0" value={form.estimatedGain} onChange={(event) => setValue("estimatedGain", event.target.value)} className={inputClassName} /></Field>
                <Field label="Budget client (€)"><input inputMode="decimal" type="number" min="0" value={form.budget} onChange={(event) => setValue("budget", event.target.value)} className={inputClassName} /></Field>
                <Field label="Durée estimée (jours)"><input type="number" min="1" value={form.duration} onChange={(event) => setValue("duration", event.target.value)} className={inputClassName} /></Field>
                <Field label="Démarrage souhaité"><input type="date" value={form.startDate} onChange={(event) => setValue("startDate", event.target.value)} className={inputClassName} /></Field>
                <Field label="Clôture cible"><input type="date" value={form.targetCloseDate} onChange={(event) => setValue("targetCloseDate", event.target.value)} className={inputClassName} /></Field>
                <Field label="Prochaine action" className="sm:col-span-2"><input value={form.nextActionLabel} onChange={(event) => setValue("nextActionLabel", event.target.value)} placeholder="Ex. relancer le décideur" className={inputClassName} /></Field>
                <Field label="À réaliser avant le" className="sm:col-span-2"><input type="date" value={form.nextActionAt} onChange={(event) => setValue("nextActionAt", event.target.value)} className={inputClassName} /></Field>
              </div>
            </Section>

            <Section title="Staffing et delivery" description="Précisez le besoin opérationnel pour préparer le bon positionnement.">
              <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3.5 py-3">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span><span className="block text-sm font-semibold text-heading">Besoin en staffing</span><span className="mt-0.5 block text-xs text-body">Une ressource ou une équipe doit être positionnée.</span></span>
                  <input type="checkbox" checked={form.requiresStaffing} onChange={(event) => setValue("requiresStaffing", event.target.checked)} className="size-4 accent-[var(--color-primary)]" />
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {form.requiresStaffing ? <Field label="Nombre de profils requis"><input type="number" min="1" step="1" value={form.requiredHeadcount} onChange={(event) => setValue("requiredHeadcount", event.target.value)} className={inputClassName} /></Field> : null}
                <Field label="Practice" className={form.requiresStaffing ? undefined : "sm:col-span-2"}>
                  <Select value={form.practice} onChange={(event) => setValue("practice", event.target.value)} fullWidth><option value="">Non renseignée</option>{PRACTICE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</Select>
                </Field>
                <Field label="Séniorité"><Select value={form.seniority} onChange={(event) => setValue("seniority", event.target.value)} fullWidth><option value="">Non renseignée</option>{SENIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
                <Field label="Rythme"><input value={form.rythme} onChange={(event) => setValue("rythme", event.target.value)} placeholder="Ex. 3 jours / semaine" className={inputClassName} /></Field>
                <Field label="Profil recherché" className="sm:col-span-2"><input value={form.searchedProfile} onChange={(event) => setValue("searchedProfile", event.target.value)} placeholder="Ex. Data engineer senior" className={inputClassName} /></Field>
                <Field label="Localisation"><input value={form.location} onChange={(event) => setValue("location", event.target.value)} placeholder="Ex. Paris" className={inputClassName} /></Field>
                <Field label="Télétravail"><Select value={form.remotePolicy} onChange={(event) => setValue("remotePolicy", event.target.value)} fullWidth><option value="">Non renseigné</option>{REMOTE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
                <Field label="Diffusion du besoin" className="sm:col-span-2"><input type="date" value={form.diffusionDate} onChange={(event) => setValue("diffusionDate", event.target.value)} className={inputClassName} /></Field>
              </div>
            </Section>
          </div>
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-12px_32px_-28px_rgba(14,29,59,0.6)] backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-[1360px] items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push(`/missions/opps/${opportunity.id}`)}>Annuler</Button>
            <Button type="submit" loading={isPending} loadingLabel="Enregistrement…">Enregistrer les modifications</Button>
          </div>
        </footer>
      </form>
    </main>
  )
}
