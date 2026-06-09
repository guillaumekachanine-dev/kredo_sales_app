"use client"

import { useEffect, useState, useTransition } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import type { Opportunity, OpportunitySkill, Contact, OpportunityEvent, SalesStage, SalesOutcome, SalesPriority } from "@/types/database"
import { OpportunitySkillsPanel } from "./OpportunitySkillsPanel"
import { OpportunityContactsPanel } from "./OpportunityContactsPanel"
import { OpportunityTimelinePanel } from "./OpportunityTimelinePanel"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { upsertAccountByName } from "@/app/(app)/missions/_actions/upsert-account"
import {
  formatEuro,
  formatDate,
  formatDateTime,
} from "./opportunity-detail-utils"
import {
  PRACTICE_OPTIONS,
  TYPE_OPTIONS,
  SOURCE_OPTIONS,
  REMOTE_OPTIONS,
  SENIORITY_OPTIONS,
  STAGE_LABELS,
  PRIORITY_LABELS,
  OUTCOME_LABELS,
  getStageLabel,
  getPriorityLabel,
  getOutcomeLabel,
} from "./opportunity-detail-options"

interface OpportunityDetailData {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
  } | null
  skills: OpportunitySkill[]
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  events: OpportunityEvent[]
}

interface OpportunityEditFormProps {
  data: OpportunityDetailData
  onSuccess: () => void
}

export function OpportunityEditForm({ data, onSuccess }: OpportunityEditFormProps) {
  const { opportunity, account } = data
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const initialAccountValue: AccountValue | null = account
    ? { id: account.id, name: account.name, isNew: false }
    : null

  const [selectedAccount, setSelectedAccount] = useState<AccountValue | null>(initialAccountValue)

  // Form State
  const [form, setForm] = useState({
    title: opportunity.title,
    practice: opportunity.practice || "",
    opportunity_type: opportunity.opportunity_type || "",
    source: opportunity.source || "",
    stage: opportunity.stage,
    outcome: opportunity.outcome,
    priority: opportunity.priority,
    conviction: opportunity.conviction,
    seniority: opportunity.seniority || "",
    need_summary: opportunity.need_summary || "",
    need_detail: opportunity.need_detail || "",
    client_context: opportunity.client_context || "",
    engagement_notes: opportunity.engagement_notes || "",
    target_daily_rate: opportunity.target_daily_rate ?? "",
    duration: opportunity.duration ?? "",
    estimated_gain: opportunity.estimated_gain ?? "",
    target_close_date: opportunity.target_close_date || "",
    start_date: opportunity.start_date || "",
    next_action_label: opportunity.next_action_label || "",
    next_action_at: opportunity.next_action_at ? opportunity.next_action_at.slice(0, 16) : "",
    location: opportunity.location || "",
    remote_policy: opportunity.remote_policy || "",
    win_reason: opportunity.win_reason || "",
    loss_reason: opportunity.loss_reason || "",
  })

  // Détection layout mobile/desktop dynamique pour éviter le display:none CSS
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkLayout = () => setIsMobile(window.innerWidth < 768)
    checkLayout()
    window.addEventListener("resize", checkLayout)
    return () => window.removeEventListener("resize", checkLayout)
  }, [])

  const handleCancel = () => {
    setIsEditing(false)
    setErrorMsg(null)
    setSelectedAccount(initialAccountValue)
    // Réinitialise
    setForm({
      title: opportunity.title,
      practice: opportunity.practice || "",
      opportunity_type: opportunity.opportunity_type || "",
      source: opportunity.source || "",
      stage: opportunity.stage,
      outcome: opportunity.outcome,
      priority: opportunity.priority,
      conviction: opportunity.conviction,
      seniority: opportunity.seniority || "",
      need_summary: opportunity.need_summary || "",
      need_detail: opportunity.need_detail || "",
      client_context: opportunity.client_context || "",
      engagement_notes: opportunity.engagement_notes || "",
      target_daily_rate: opportunity.target_daily_rate ?? "",
      duration: opportunity.duration ?? "",
      estimated_gain: opportunity.estimated_gain ?? "",
      target_close_date: opportunity.target_close_date || "",
      start_date: opportunity.start_date || "",
      next_action_label: opportunity.next_action_label || "",
      next_action_at: opportunity.next_action_at ? opportunity.next_action_at.slice(0, 16) : "",
      location: opportunity.location || "",
      remote_policy: opportunity.remote_policy || "",
      win_reason: opportunity.win_reason || "",
      loss_reason: opportunity.loss_reason || "",
    })
  }

  const handleSave = () => {
    setErrorMsg(null)
    startTransition(async () => {
      let finalAccountId: string | null = null

      if (selectedAccount) {
        if (selectedAccount.isNew) {
          const upsertRes = await upsertAccountByName(selectedAccount.name)
          if (upsertRes.error) {
            setErrorMsg(upsertRes.error)
            return
          }
          finalAccountId = upsertRes.data?.id ?? null
        } else {
          finalAccountId = selectedAccount.id
        }
      }

      const result = await updateOpportunity({
        id: opportunity.id,
        title: form.title,
        account_id: finalAccountId,
        practice: form.practice || null,
        opportunity_type: form.opportunity_type || null,
        source: form.source || null,
        stage: form.stage,
        outcome: form.outcome,
        priority: form.priority,
        conviction: form.conviction,
        seniority: form.seniority || null,
        need_summary: form.need_summary || null,
        need_detail: form.need_detail || null,
        client_context: form.client_context || null,
        engagement_notes: form.engagement_notes || null,
        target_daily_rate: form.target_daily_rate === "" ? null : Number(form.target_daily_rate),
        duration: form.duration === "" ? null : Number(form.duration),
        estimated_gain: form.estimated_gain === "" ? null : Number(form.estimated_gain),
        target_close_date: form.target_close_date || null,
        start_date: form.start_date || null,
        next_action_label: form.next_action_label || null,
        next_action_at: form.next_action_at || null,
        location: form.location || null,
        remote_policy: form.remote_policy || null,
        win_reason: form.win_reason || null,
        loss_reason: form.loss_reason || null,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setIsEditing(false)
        onSuccess()
      }
    })
  }

  // Render helpers
  const inputClass = "w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"
  const labelClass = "block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1"

  if (isMobile) {
    // ----------------------------------------------------------------
    //  VUE MOBILE
    // ----------------------------------------------------------------
    return (
      <div className="w-full px-4 py-6 flex flex-col gap-5">
        {/* Header mobile */}
        <div className="flex flex-col gap-2 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-success border border-success/20 px-1.5 py-0.5 rounded bg-success/10">
                Opportunité
              </span>
              {account && <span className="text-xs font-semibold text-muted">{account.name}</span>}
            </div>

            {/* Boutons d'action mobile */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-[11px] font-semibold rounded bg-primary text-primary-fg hover:bg-primary/90 transition-colors"
              >
                Modifier
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-canvas border border-border text-muted hover:text-heading transition-colors disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-success text-success-fg hover:bg-success/90 transition-colors disabled:opacity-40"
                >
                  {isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}
          </div>

          {/* Erreur Mobile */}
          {errorMsg && (
            <div className="text-[11px] text-danger bg-danger/10 border border-danger/20 rounded p-2 mt-1">
              {errorMsg}
            </div>
          )}

          {isEditing ? (
            <div className="mt-2 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Intitulé de l&apos;opportunité</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Client</label>
                <AccountCombobox
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                />
                {selectedAccount?.isNew && (
                  <p className="mt-1 text-[10px] text-muted">
                    Le compte «&nbsp;{selectedAccount.name}&nbsp;» sera créé automatiquement.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-heading leading-snug">{opportunity.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span>{getStageLabel(opportunity.stage)}</span>
                <span>•</span>
                <span>{getPriorityLabel(opportunity.priority)}</span>
              </div>
            </>
          )}
        </div>

        {/* 1. Synthèse */}
        <SurfaceCard className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
            Synthèse
          </h2>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Résumé du besoin</label>
                <input
                  type="text"
                  value={form.need_summary}
                  onChange={(e) => setForm({ ...form, need_summary: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Confiance (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.conviction}
                  onChange={(e) => setForm({ ...form, conviction: Number(e.target.value) })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">ACV</span>
                  <p className="text-sm font-bold text-heading tabular-nums mt-0.5">
                    {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">Confiance</span>
                  <p className="text-sm font-bold text-heading mt-0.5">{opportunity.conviction}%</p>
                </div>
              </div>
              {opportunity.need_summary && (
                <div className="mt-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">Résumé du besoin</span>
                  <p className="text-xs text-body mt-1 font-medium bg-canvas/30 p-2 rounded border border-border/40">
                    {opportunity.need_summary}
                  </p>
                </div>
              )}
            </>
          )}
        </SurfaceCard>

        {/* 2. Qualification */}
        <SurfaceCard className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
            Qualification
          </h2>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Practice</label>
                <select
                  value={form.practice}
                  onChange={(e) => setForm({ ...form, practice: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  {PRACTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Type d&apos;opportunité</label>
                <select
                  value={form.opportunity_type}
                  onChange={(e) => setForm({ ...form, opportunity_type: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Séniorité</label>
                <select
                  value={form.seniority}
                  onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Étape</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value as SalesStage })}
                  className={inputClass}
                  disabled={isPending}
                >
                  {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priorité</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as SalesPriority })}
                  className={inputClass}
                  disabled={isPending}
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Practice</span>
                <span className="font-semibold text-heading">{opportunity.practice || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Type d&apos;opportunité</span>
                <span className="font-semibold text-heading capitalize">
                  {opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Séniorité</span>
                <span className="font-semibold text-heading capitalize">{opportunity.seniority || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Source</span>
                <span className="font-semibold text-heading capitalize">
                  {opportunity.source ? opportunity.source.replace("_", " ") : "—"}
                </span>
              </div>
            </div>
          )}
        </SurfaceCard>

        <OpportunitySkillsPanel
          opportunityId={opportunity.id}
          skills={data.skills}
          onRefresh={onSuccess}
        />

        {/* 3. Économie */}
        <SurfaceCard className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
            Économie
          </h2>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>TJM Cible (€)</label>
                <input
                  type="number"
                  value={form.target_daily_rate}
                  onChange={(e) => setForm({ ...form, target_daily_rate: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Durée (jours)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Gain estimé (€)</label>
                <input
                  type="number"
                  value={form.estimated_gain}
                  onChange={(e) => setForm({ ...form, estimated_gain: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs bg-canvas/30 p-2.5 rounded border border-border/40">
                <div>
                  <span className="text-muted block text-[9px] uppercase">ACV (Généré)</span>
                  <span className="font-bold text-heading">{formatEuro(opportunity.acv)}</span>
                </div>
                <div>
                  <span className="text-muted block text-[9px] uppercase">Gain Pondéré</span>
                  <span className="font-bold text-heading">{formatEuro(opportunity.weighted_gain)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">TJM Cible</span>
                <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.target_daily_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Durée</span>
                <span className="font-semibold text-heading">{opportunity.duration ? `${opportunity.duration} jours` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Gain estimé</span>
                <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.estimated_gain)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Gain pondéré</span>
                <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.weighted_gain)}</span>
              </div>
            </div>
          )}
        </SurfaceCard>

        {/* 4. Prochaine Action */}
        {isEditing ? (
          <SurfaceCard className="p-4 flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
              Prochaine Action
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Libellé de l&apos;action</label>
                <input
                  type="text"
                  value={form.next_action_label}
                  onChange={(e) => setForm({ ...form, next_action_label: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Date de l&apos;action</label>
                <input
                  type="datetime-local"
                  value={form.next_action_at}
                  onChange={(e) => setForm({ ...form, next_action_at: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            </div>
          </SurfaceCard>
        ) : (
          (opportunity.next_action_label || opportunity.next_action_at) && (
            <SurfaceCard className="p-4 flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
                Prochaine action
              </h2>
              <div className="text-xs">
                <p className="font-semibold text-heading">{opportunity.next_action_label || "—"}</p>
                {opportunity.next_action_at && (
                  <p className="text-[10px] text-muted mt-1">
                    Prévue le : {formatDateTime(opportunity.next_action_at)}
                  </p>
                )}
              </div>
            </SurfaceCard>
          )
        )}

        <OpportunityTimelinePanel
          opportunityId={opportunity.id}
          events={data.events}
          onRefresh={onSuccess}
        />

        {/* 5. Contexte mission */}
        <SurfaceCard className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
            Contexte mission
          </h2>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Localisation</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Télétravail</label>
                <select
                  value={form.remote_policy}
                  onChange={(e) => setForm({ ...form, remote_policy: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  {REMOTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Localisation</span>
                <span className="font-semibold text-heading">{opportunity.location || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Télétravail</span>
                <span className="font-semibold text-heading capitalize">{opportunity.remote_policy || "—"}</span>
              </div>
            </div>
          )}
        </SurfaceCard>

        <OpportunityContactsPanel
          opportunityId={opportunity.id}
          contacts={data.contacts}
          onRefresh={onSuccess}
        />
      </div>
    )
  }

  // ----------------------------------------------------------------
  //  VUE DESKTOP
  // ----------------------------------------------------------------
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header Desktop */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success border border-success/20 px-2 py-0.5 rounded bg-success/10">
              Opportunité
            </span>
            {account && <span className="text-xs text-muted">{account.name}</span>}
          </div>

          {isEditing ? (
            <div className="mt-2 flex flex-col gap-3.5 w-2/3">
              <div>
                <label className={labelClass}>Intitulé de l&apos;opportunité</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-xs font-bold text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
                  placeholder="Titre de l'opportunité"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Client</label>
                <AccountCombobox
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                />
                {selectedAccount?.isNew && (
                  <p className="mt-1 text-[10px] text-muted">
                    Le compte «&nbsp;{selectedAccount.name}&nbsp;» sera créé automatiquement.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
              {opportunity.title}
            </h1>
          )}
        </div>

        {/* Boutons Desktop */}
        <div className="flex items-center gap-3 shrink-0">
          {errorMsg && (
            <span className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-md">
              {errorMsg}
            </span>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-fg hover:bg-primary/90 transition-colors"
            >
              Modifier
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-canvas border border-border text-muted hover:text-heading transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-success text-success-fg hover:bg-success/90 transition-colors disabled:opacity-40"
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          )}

          <div className="flex flex-col items-end border-l border-border pl-4">
            <span className="text-[10px] uppercase text-muted tracking-wider font-semibold">ACV Estimé</span>
            <span className="text-lg font-bold text-heading tabular-nums">
              {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
            </span>
          </div>
        </div>
      </div>

      {/* Colonnes Desktop */}
      <div className="grid grid-cols-12 gap-6">
        {/* Colonne Principale (8) */}
        <div className="col-span-8 flex flex-col gap-6">
          {/* Besoin client */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Besoin client
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Résumé du besoin</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.need_summary}
                    onChange={(e) => setForm({ ...form, need_summary: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <p className="text-xs text-body mt-1 font-medium bg-canvas/30 p-2.5 rounded border border-border/40">
                    {opportunity.need_summary || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Détail du besoin</label>
                {isEditing ? (
                  <textarea
                    value={form.need_detail}
                    onChange={(e) => setForm({ ...form, need_detail: e.target.value })}
                    className={inputClass + " h-24 resize-none"}
                    disabled={isPending}
                  />
                ) : (
                  <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                    {opportunity.need_detail || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Contexte client</label>
                {isEditing ? (
                  <textarea
                    value={form.client_context}
                    onChange={(e) => setForm({ ...form, client_context: e.target.value })}
                    className={inputClass + " h-20 resize-none"}
                    disabled={isPending}
                  />
                ) : (
                  <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                    {opportunity.client_context || "—"}
                  </p>
                )}
              </div>
            </div>
          </SurfaceCard>

          {/* Engagement commercial */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Engagement commercial
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Source de l&apos;opportunité</label>
                {isEditing ? (
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-body mt-1 font-medium capitalize">
                    {opportunity.source ? opportunity.source.replace("_", " ") : "—"}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Prochaine action</label>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={form.next_action_label}
                      onChange={(e) => setForm({ ...form, next_action_label: e.target.value })}
                      className={inputClass}
                      placeholder="Libellé de l'action"
                      disabled={isPending}
                    />
                    <input
                      type="datetime-local"
                      value={form.next_action_at}
                      onChange={(e) => setForm({ ...form, next_action_at: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-body mt-1 font-medium">
                    {opportunity.next_action_label || "—"}
                    {opportunity.next_action_at && (
                      <span className="text-muted block text-[10px] mt-0.5 font-normal">
                        Prévue le : {formatDateTime(opportunity.next_action_at)}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes d&apos;engagement</label>
              {isEditing ? (
                <textarea
                  value={form.engagement_notes}
                  onChange={(e) => setForm({ ...form, engagement_notes: e.target.value })}
                  className={inputClass + " h-20 resize-none"}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                  {opportunity.engagement_notes || "—"}
                </p>
              )}
            </div>
          </SurfaceCard>

          <OpportunityTimelinePanel
            opportunityId={opportunity.id}
            events={data.events}
            onRefresh={onSuccess}
          />

          {/* Résultat */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Résultat
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Outcome (Statut)</label>
                {isEditing ? (
                  <select
                    value={form.outcome || ""}
                    onChange={(e) => setForm({ ...form, outcome: (e.target.value as SalesOutcome) || null })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">En cours</option>
                    {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-body mt-1 font-medium capitalize">
                    {opportunity.outcome ? getOutcomeLabel(opportunity.outcome) : "En cours"}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Raison (Gain / Perte / Abandon)</label>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Raison de gain"
                      value={form.win_reason}
                      onChange={(e) => setForm({ ...form, win_reason: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                    <input
                      type="text"
                      placeholder="Raison de perte / abandon"
                      value={form.loss_reason}
                      onChange={(e) => setForm({ ...form, loss_reason: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-body mt-1 italic">
                    {opportunity.outcome === "gagnee"
                      ? (opportunity.win_reason || "Non renseignée")
                      : (opportunity.loss_reason || "Non renseignée")}
                  </p>
                )}
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Colonne Latérale (4) */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Qualification */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Qualification
            </h2>
            <div className="flex flex-col gap-3">
              {/* Practice */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Practice</span>
                {isEditing ? (
                  <select
                    value={form.practice}
                    onChange={(e) => setForm({ ...form, practice: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {PRACTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading">{opportunity.practice || "—"}</span>
                )}
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Type d&apos;opportunité</span>
                {isEditing ? (
                  <select
                    value={form.opportunity_type}
                    onChange={(e) => setForm({ ...form, opportunity_type: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading capitalize">
                    {opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}
                  </span>
                )}
              </div>

              {/* Séniorité */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Séniorité requise</span>
                {isEditing ? (
                  <select
                    value={form.seniority}
                    onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading capitalize">{opportunity.seniority || "—"}</span>
                )}
              </div>

              {/* Étape */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Étape</span>
                {isEditing ? (
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value as SalesStage })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading">{getStageLabel(opportunity.stage)}</span>
                )}
              </div>

              {/* Priorité */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Priorité</span>
                {isEditing ? (
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as SalesPriority })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading">{getPriorityLabel(opportunity.priority)}</span>
                )}
              </div>

              {/* Conviction */}
              <div className="flex flex-col gap-1 pb-1">
                <span className="text-[10px] text-muted font-medium">Confiance (%)</span>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.conviction}
                    onChange={(e) => setForm({ ...form, conviction: Number(e.target.value) })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{opportunity.conviction}%</span>
                )}
              </div>
            </div>
          </SurfaceCard>

          <OpportunitySkillsPanel
            opportunityId={opportunity.id}
            skills={data.skills}
            onRefresh={onSuccess}
          />

          {/* Économie */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Économie
            </h2>
            <div className="flex flex-col gap-3">
              {/* TJM */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">TJM Cible</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={form.target_daily_rate}
                    onChange={(e) => setForm({ ...form, target_daily_rate: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.target_daily_rate)}</span>
                )}
              </div>

              {/* Durée */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Durée (jours)</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{opportunity.duration ? `${opportunity.duration} jours` : "—"}</span>
                )}
              </div>

              {/* Gain estimé */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Gain estimé</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={form.estimated_gain}
                    onChange={(e) => setForm({ ...form, estimated_gain: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.estimated_gain)}</span>
                )}
              </div>

              {/* ACV (lecture seule) */}
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">ACV (calculé)</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.acv)}</span>
              </div>

              {/* Gain pondéré (lecture seule) */}
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Gain pondéré</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.weighted_gain)}</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Planning */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Planning
            </h2>
            <div className="flex flex-col gap-3">
              {/* Date Début */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Date de début</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{formatDate(opportunity.start_date)}</span>
                )}
              </div>

              {/* Date Clôture */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Clôture cible</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={form.target_close_date}
                    onChange={(e) => setForm({ ...form, target_close_date: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{formatDate(opportunity.target_close_date)}</span>
                )}
              </div>

              {/* Dernière MàJ */}
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Dernière MaJ</span>
                <span className="text-xs font-semibold text-heading">{formatDate(opportunity.updated_at)}</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Contexte mission */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Contexte mission
            </h2>
            <div className="flex flex-col gap-3">
              {/* Localisation */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Localisation</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{opportunity.location || "—"}</span>
                )}
              </div>

              {/* Télétravail */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted font-medium">Politique de télétravail</span>
                {isEditing ? (
                  <select
                    value={form.remote_policy}
                    onChange={(e) => setForm({ ...form, remote_policy: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {REMOTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading capitalize">{opportunity.remote_policy || "—"}</span>
                )}
              </div>
            </div>
          </SurfaceCard>

          <OpportunityContactsPanel
            opportunityId={opportunity.id}
            contacts={data.contacts}
            onRefresh={onSuccess}
          />
        </div>
      </div>
    </div>
  )
}
