"use client"

import React, { useEffect, useEffectEvent, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { AgendaEventTypePicker } from "./AgendaEventTypePicker"
import { AgendaQuarterHourTimeField } from "./AgendaQuarterHourTimeField"
import { AGENDA_EVENT_TYPES, COMMERCE_TYPES, MANAGEMENT_TYPES, RECRUTEMENT_TYPES } from "@/lib/agenda/agenda-config"
import { addOneHourToTime, normalizeTimeToQuarterHour } from "@/lib/agenda/agenda-time-utils"
import type {
  AgendaEvent,
  AgendaEventFormInput,
  AgendaSelectCandidate,
  AgendaSelectContact,
  AgendaSelectOpportunity,
} from "@/lib/agenda/agenda-types"
import {
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  getContactsByCompany,
  getOpportunitiesForSelect,
  getCandidatesForSelect,
} from "@/lib/agenda/agenda-actions"
import { cn } from "@/lib/utils"

interface AgendaEventDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: AgendaEvent | null
  onSaved: () => void
  initialValues?: AgendaEventDrawerInitialValues
}

export interface AgendaEventDrawerInitialValues {
  title?: string
  event_type?: string
  date?: string
  start_time?: string
  end_time?: string
  description?: string
  company?: AccountValue | null
  contact_id?: string
  opportunity_id?: string
  candidate_id?: string
}

interface FormState {
  title: string
  event_type: string
  date: string
  start_time: string
  end_time: string
  description: string
  company: AccountValue | null
  contact_id: string
  opportunity_id: string
  candidate_id: string
  create_task: boolean
  task_title: string
  task_date: string
  task_time: string
  task_priority: string
}

const INITIAL_FORM: FormState = {
  title: "",
  event_type: "rdv_client_suivi",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
  description: "",
  company: null,
  contact_id: "",
  opportunity_id: "",
  candidate_id: "",
  create_task: false,
  task_title: "",
  task_date: "",
  task_time: "08:30",
  task_priority: "normal",
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
]

export function AgendaEventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
  initialValues,
}: AgendaEventDrawerProps) {
  const [mode, setMode] = useState<"create" | "view" | "edit">("create")
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contacts, setContacts] = useState<AgendaSelectContact[]>([])
  const [opportunities, setOpportunities] = useState<AgendaSelectOpportunity[]>([])
  const [candidates, setCandidates] = useState<AgendaSelectCandidate[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const syncDrawerState = useEffectEvent(() => {
    setErrors({})
    setServerError(null)

    if (event) {
      setMode("view")

      const start = new Date(event.starts_at)
      const end = new Date(event.ends_at)

      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const fmtTime = (d: Date) =>
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

      let taskState = {
        create_task: false,
        task_title: "",
        task_date: "",
        task_time: "08:30",
        task_priority: "normal",
      }

      if (event.preparatory_task) {
        const taskDue = event.preparatory_task.due_date
          ? new Date(event.preparatory_task.due_date)
          : null
        taskState = {
          create_task: true,
          task_title: event.preparatory_task.title,
          task_date: taskDue ? fmt(taskDue) : "",
          task_time: taskDue ? normalizeTimeToQuarterHour(fmtTime(taskDue)) : "08:30",
          task_priority: event.preparatory_task.priority || "normal",
        }
      }

      setForm({
        title: event.title,
        event_type: event.event_type,
        date: fmt(start),
        start_time: normalizeTimeToQuarterHour(fmtTime(start)),
        end_time: normalizeTimeToQuarterHour(fmtTime(end)),
        description: event.description || "",
        company: event.company ? { id: event.company.id, name: event.company.name, isNew: false } : null,
        contact_id: event.contact_id || "",
        opportunity_id: event.opportunity_id || "",
        candidate_id: event.candidate_id || "",
        ...taskState,
      })
    } else {
      setMode("create")
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, "0")
      const d = String(today.getDate()).padStart(2, "0")
      const todayStr = `${y}-${m}-${d}`
      setForm({
        ...INITIAL_FORM,
        date: todayStr,
        task_date: todayStr,
        ...initialValues,
      })
    }
  })

  useEffect(() => {
    if (!open) return
    queueMicrotask(syncDrawerState)
  }, [open, event, initialValues])

  useEffect(() => {
    getOpportunitiesForSelect().then(setOpportunities)
    getCandidatesForSelect().then(setCandidates)
  }, [])

  const companyId = form.company?.id
  const syncContacts = useEffectEvent(async (nextCompanyId?: string | null) => {
    if (nextCompanyId) {
      setLoadingContacts(true)
      const data = await getContactsByCompany(nextCompanyId)
      setContacts(data)
      setLoadingContacts(false)
      setForm((prev) =>
        prev.contact_id && !data.some((contact) => contact.id === prev.contact_id)
          ? { ...prev, contact_id: "" }
          : prev
      )
    } else {
      setContacts([])
      setForm((prev) => (prev.contact_id ? { ...prev, contact_id: "" } : prev))
    }
  })

  useEffect(() => {
    queueMicrotask(() => {
      void syncContacts(companyId)
    })
  }, [companyId])

  function handleStartTimeChange(value: string) {
    setForm((prev) => ({ ...prev, start_time: value, end_time: addOneHourToTime(value) }))

    if (errors.start_time || errors.end_time) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.start_time
        delete next.end_time
        return next
      })
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = "L'objet de l'événement est obligatoire."
    if (!form.event_type) errs.event_type = "La nature de l'événement est obligatoire."
    if (!form.date) errs.date = "La date est obligatoire."
    if (!form.start_time) errs.start_time = "L'heure de début est obligatoire."
    if (!form.end_time) errs.end_time = "L'heure de fin est obligatoire."

    if (form.date && form.start_time && form.end_time) {
      const start = new Date(`${form.date}T${form.start_time}`)
      const end = new Date(`${form.date}T${form.end_time}`)
      if (end <= start) errs.end_time = "L'heure de fin doit être postérieure au début."
    }

    if (form.create_task) {
      if (!form.task_title.trim()) errs.task_title = "Le titre de la tâche est obligatoire."
      if (!form.task_date) errs.task_date = "La date d'échéance est obligatoire."
      if (!form.task_time) errs.task_time = "L'heure d'échéance est obligatoire."

      if (form.date && form.start_time && form.task_date && form.task_time) {
        const eventStart = new Date(`${form.date}T${form.start_time}`)
        const taskDue = new Date(`${form.task_date}T${form.task_time}`)
        if (taskDue >= eventStart) {
          errs.task_date = "L'échéance de la tâche doit être antérieure au début de l'événement."
        }
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    setServerError(null)

    startTransition(async () => {
      const startsAt = new Date(`${form.date}T${form.start_time}`).toISOString()
      const endsAt = new Date(`${form.date}T${form.end_time}`).toISOString()
      const taskDueIso = form.create_task
        ? new Date(`${form.task_date}T${form.task_time}`).toISOString()
        : ""

      const payload: AgendaEventFormInput = {
        id: event?.id,
        title: form.title.trim(),
        event_type: form.event_type,
        starts_at: startsAt,
        ends_at: endsAt,
        description: form.description.trim(),
        company_id: form.company?.id || null,
        contact_id: form.contact_id || null,
        opportunity_id: form.opportunity_id || null,
        candidate_id: form.candidate_id || null,
        create_task: form.create_task,
        task_title: form.task_title.trim(),
        task_due_date: taskDueIso,
        task_priority: form.task_priority,
      }

      const res =
        mode === "create" ? await createAgendaEvent(payload) : await updateAgendaEvent(payload)

      if (res.error) {
        setServerError(res.error)
        return
      }

      onSaved()
      onOpenChange(false)
    })
  }

  function handleDelete() {
    if (!event || !window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return
    setServerError(null)

    startTransition(async () => {
      const res = await deleteAgendaEvent(event.id)
      if (res.error) {
        setServerError(res.error)
        return
      }
      onSaved()
      onOpenChange(false)
    })
  }

  const isView = mode === "view"
  const isManagement = MANAGEMENT_TYPES.has(form.event_type)
  const isRecrutement = RECRUTEMENT_TYPES.has(form.event_type)
  const isCommerce = COMMERCE_TYPES.has(form.event_type)
  const currentTypeConfig = AGENDA_EVENT_TYPES[form.event_type]

  // Suppress unused variable warning for isManagement (kept for future section)
  void isManagement

  return (
    <>
      <AgendaEventTypePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={form.event_type}
        onChange={(v) => setField("event_type", v)}
      />

      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={
          isView
            ? "Détails de l'événement"
            : mode === "edit"
              ? "Modifier l'événement"
              : "Créer un événement"
        }
        subtitle={event ? undefined : "Planification d'une nouvelle action"}
        width="default"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {event && !isPending && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-semibold text-danger hover:underline cursor-pointer"
              >
                Supprimer
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs text-muted hover:text-heading transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isView ? "Fermer" : "Annuler"}
              </button>

              {isView ? (
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-fg hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Modifier
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-fg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isPending
                    ? "Sauvegarde…"
                    : mode === "create"
                      ? "Créer l'événement"
                      : "Enregistrer les modifications"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {serverError && (
            <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
              {serverError}
            </div>
          )}

          {/* ── SECTION 1: IDENTITÉ ── */}
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
              Identité de l&apos;événement
            </p>

            {/* Nature picker */}
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Nature de l&apos;événement&nbsp;<span className="text-danger">*</span>
              </label>
              {isView ? (
                <div className={cn(
                  "w-full rounded-md border px-3 py-2 text-xs font-semibold flex items-center gap-2",
                  currentTypeConfig?.colorClasses || "bg-canvas border-border text-heading"
                )}>
                  <span className={cn("size-2 rounded-full shrink-0", currentTypeConfig?.dotClass)} />
                  {currentTypeConfig?.label || form.event_type}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={isPending}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-xs font-medium text-left flex items-center justify-between gap-2 transition-all cursor-pointer",
                    currentTypeConfig
                      ? currentTypeConfig.colorClasses
                      : "bg-canvas border-border text-muted",
                    "hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full shrink-0", currentTypeConfig?.dotClass || "bg-muted")} />
                    <span className={currentTypeConfig ? "font-semibold" : "text-muted"}>
                      {currentTypeConfig?.label || "Sélectionner le type…"}
                    </span>
                  </span>
                  <svg className="size-3.5 shrink-0 text-current opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )}
              {errors.event_type && <p className="mt-1 text-[11px] text-danger">{errors.event_type}</p>}
            </div>

            {/* Titre */}
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Objet&nbsp;<span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                disabled={isView || isPending}
                placeholder="ex. Réunion de cadrage"
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
              />
              {errors.title && <p className="mt-1 text-[11px] text-danger">{errors.title}</p>}
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── SECTION 2: DATE & HEURES ── */}
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
              Date &amp; Heures (Europe/Paris)
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Date&nbsp;<span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    setField("date", e.target.value)
                    if (!form.task_date) setField("task_date", e.target.value)
                  }}
                  disabled={isView || isPending}
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
                />
                {errors.date && <p className="mt-1 text-[11px] text-danger">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Début&nbsp;<span className="text-danger">*</span>
                </label>
                <AgendaQuarterHourTimeField
                  value={form.start_time}
                  onChange={handleStartTimeChange}
                  disabled={isView || isPending}
                  hourAriaLabel="Heure de début"
                  minuteAriaLabel="Minutes de début"
                />
                {errors.start_time && <p className="mt-1 text-[11px] text-danger">{errors.start_time}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Fin&nbsp;<span className="text-danger">*</span>
                </label>
                <AgendaQuarterHourTimeField
                  value={form.end_time}
                  onChange={(value) => setField("end_time", value)}
                  disabled={isView || isPending}
                  hourAriaLabel="Heure de fin"
                  minuteAriaLabel="Minutes de fin"
                />
                {errors.end_time && <p className="mt-1 text-[11px] text-danger">{errors.end_time}</p>}
              </div>
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── SECTION 3: RELATIONS CRM ── */}
          {isCommerce && (
            <>
              <section className="flex flex-col gap-3">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
                  Relations CRM
                </p>

                <div>
                  <label className="block text-xs font-medium text-heading mb-1.5">Compte client</label>
                  {isView ? (
                    <input
                      type="text"
                      value={event?.company?.name || "—"}
                      disabled
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-60"
                    />
                  ) : (
                    <AccountCombobox value={form.company} onChange={(val) => setField("company", val)} />
                  )}
                </div>

                {form.company && (
                  <div>
                    <label className="block text-xs font-medium text-heading mb-1.5">
                      Contact
                      {loadingContacts && <span className="text-[10px] text-muted ml-1">(chargement…)</span>}
                    </label>
                    <select
                      value={form.contact_id}
                      onChange={(e) => setField("contact_id", e.target.value)}
                      disabled={isView || isPending || loadingContacts}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <option value="">Aucun contact lié</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name} {c.job_title ? `— ${c.job_title}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-heading mb-1.5">
                    Opportunité commerciale liée
                  </label>
                  <select
                    value={form.opportunity_id}
                    onChange={(e) => setField("opportunity_id", e.target.value)}
                    disabled={isView || isPending}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">Aucune opportunité liée</option>
                    {opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.title}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <div className="border-t border-border/40" />
            </>
          )}

          {/* ── SECTION 4: CANDIDAT (RECRUTEMENT) ── */}
          {isRecrutement && (
            <>
              <section className="flex flex-col gap-3">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
                  Candidat
                </p>
                <div>
                  <label className="block text-xs font-medium text-heading mb-1.5">
                    Candidat lié
                  </label>
                  <select
                    value={form.candidate_id}
                    onChange={(e) => setField("candidate_id", e.target.value)}
                    disabled={isView || isPending}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">Aucun candidat sélectionné</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {c.status ? ` (${c.status})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <div className="border-t border-border/40" />
            </>
          )}

          {/* ── SECTION 5: NOTES ── */}
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">Détails</p>
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Description / Notes de préparation
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={isView || isPending}
                rows={4}
                placeholder="Saisissez vos remarques ou l'ordre du jour..."
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 resize-y"
              />
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── SECTION 6: TÂCHE PRÉPARATOIRE ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create_task_chk"
                checked={form.create_task}
                onChange={(e) => setField("create_task", e.target.checked)}
                disabled={isView || isPending}
                className="rounded border-border text-primary focus:ring-primary/50 h-4 w-4 cursor-pointer"
              />
              <label
                htmlFor="create_task_chk"
                className="text-xs font-bold text-heading select-none cursor-pointer"
              >
                Activer une tâche préparatoire
              </label>
            </div>

            {form.create_task && (
              <div className="rounded-md border border-border/80 bg-canvas/30 p-3 flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-heading mb-1">
                    Intitulé de la tâche&nbsp;<span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.task_title}
                    onChange={(e) => setField("task_title", e.target.value)}
                    disabled={isView || isPending}
                    placeholder="ex. Préparer le support de présentation"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  {errors.task_title && <p className="mt-1 text-[10px] text-danger">{errors.task_title}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-heading mb-1">
                      Échéance date&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.task_date}
                      onChange={(e) => setField("task_date", e.target.value)}
                      disabled={isView || isPending}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                    />
                    {errors.task_date && <p className="mt-1 text-[10px] text-danger">{errors.task_date}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-heading mb-1">
                      Heure&nbsp;<span className="text-danger">*</span>
                    </label>
                    <AgendaQuarterHourTimeField
                      value={form.task_time}
                      onChange={(value) => setField("task_time", value)}
                      disabled={isView || isPending}
                      hourAriaLabel="Heure de la tâche"
                      minuteAriaLabel="Minutes de la tâche"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-heading mb-1.5">Priorité</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        disabled={isView || isPending}
                        onClick={() => setField("task_priority", p.value)}
                        className={cn(
                          "py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer",
                          form.task_priority === p.value
                            ? "bg-primary text-primary-fg border-primary"
                            : "bg-canvas text-muted border-border hover:border-primary/30 hover:text-heading"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </AppDrawer>
    </>
  )
}
