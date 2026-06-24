"use client"

import React, { useEffect, useEffectEvent, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Select } from "@/components/ui/Select"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { AgendaEventTypePicker } from "./AgendaEventTypePicker"
import { AgendaQuarterHourTimeField } from "./AgendaQuarterHourTimeField"
import {
  AGENDA_EVENT_TYPES,
  COMMERCE_TYPES,
  RECRUTEMENT_TYPES,
} from "@/lib/agenda/agenda-config"
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

interface AgendaMobileEventDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: AgendaEvent | null
  onSaved: () => void
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

export function AgendaMobileEventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
}: AgendaMobileEventDrawerProps) {
  const [mode, setMode] = useState<"create" | "view" | "edit">("create")
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contacts, setContacts] = useState<AgendaSelectContact[]>([])
  const [opportunities, setOpportunities] = useState<AgendaSelectOpportunity[]>([])
  const [candidates, setCandidates] = useState<AgendaSelectCandidate[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<FormState>(INITIAL_FORM)

  const syncDrawerState = useEffectEvent(() => {
    setErrors({})
    setServerError(null)
    setStep(1)

    if (event) {
      setMode("view")

      const start = new Date(event.starts_at)
      const end = new Date(event.ends_at)

      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const fmtT = (d: Date) =>
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
          task_time: taskDue ? normalizeTimeToQuarterHour(fmtT(taskDue)) : "08:30",
          task_priority: event.preparatory_task.priority || "normal",
        }
      }

      const loaded: FormState = {
        title: event.title,
        event_type: event.event_type,
        date: fmt(start),
        start_time: normalizeTimeToQuarterHour(fmtT(start)),
        end_time: normalizeTimeToQuarterHour(fmtT(end)),
        description: event.description || "",
        company: event.company ? { id: event.company.id, name: event.company.name, isNew: false } : null,
        contact_id: event.contact_id || "",
        opportunity_id: event.opportunity_id || "",
        candidate_id: event.candidate_id || "",
        ...taskState,
      }

      setForm(loaded)
      setInitialFormSnapshot(loaded)
    } else {
      setMode("create")
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, "0")
      const d = String(today.getDate()).padStart(2, "0")
      const todayStr = `${y}-${m}-${d}`
      const empty: FormState = { ...INITIAL_FORM, date: todayStr, task_date: todayStr }
      setForm(empty)
      setInitialFormSnapshot(empty)
    }
  })

  useEffect(() => {
    if (!open) return
    queueMicrotask(syncDrawerState)
  }, [open, event])

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

  const handleStartTimeChange = (value: string) => {
    setForm((prev) => ({ ...prev, start_time: value, end_time: addOneHourToTime(value) }))
    setErrors((prev) => {
      if (!prev.start_time && !prev.end_time) return prev
      const next = { ...prev }
      delete next.start_time
      delete next.end_time
      return next
    })
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

  const scrollToError = () => {
    setTimeout(() => {
      const el = document.querySelector("[data-error-field='true']")
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 50)
  }

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = "L'objet de l'événement est obligatoire."
    if (!form.event_type) errs.event_type = "La nature est obligatoire."
    if (!form.date) errs.date = "La date est obligatoire."
    if (!form.start_time) errs.start_time = "L'heure de début est obligatoire."
    if (!form.end_time) errs.end_time = "L'heure de fin est obligatoire."
    if (form.date && form.start_time && form.end_time) {
      const s = new Date(`${form.date}T${form.start_time}`)
      const e = new Date(`${form.date}T${form.end_time}`)
      if (e <= s) errs.end_time = "L'heure de fin doit être postérieure au début."
    }
    setErrors(errs)
    const ok = Object.keys(errs).length === 0
    if (!ok) scrollToError()
    return ok
  }

  function validateStep2() {
    const errs: Record<string, string> = {}
    if (form.create_task) {
      if (!form.task_title.trim()) errs.task_title = "L'intitulé est obligatoire."
      if (!form.task_date) errs.task_date = "La date est obligatoire."
      if (!form.task_time) errs.task_time = "L'heure est obligatoire."
      if (form.date && form.start_time && form.task_date && form.task_time) {
        const eventStart = new Date(`${form.date}T${form.start_time}`)
        const taskDue = new Date(`${form.task_date}T${form.task_time}`)
        if (taskDue >= eventStart)
          errs.task_date = "La tâche doit expirer avant le début de l'événement."
      }
    }
    setErrors((prev) => ({ ...prev, ...errs }))
    const ok = Object.keys(errs).length === 0
    if (!ok) scrollToError()
    return ok
  }

  function handleNext() {
    if (validateStep1()) setStep(2)
  }

  function handleSave() {
    if (!validateStep1() || !validateStep2()) return
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
        scrollToError()
        return
      }

      onSaved()
      onOpenChange(false)
    })
  }

  function handleDelete() {
    if (!event || !window.confirm("Voulez-vous vraiment supprimer cet événement ?")) return
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

  const isFormDirty = JSON.stringify(form) !== JSON.stringify(initialFormSnapshot)
  const handleRequestClose = () => {
    if (mode !== "view" && isFormDirty)
      return window.confirm("Des modifications sont en cours. Fermer sans enregistrer ?")
    return true
  }

  const isView = mode === "view"
  const currentTypeConfig = AGENDA_EVENT_TYPES[form.event_type]
  const isCommerce = COMMERCE_TYPES.has(form.event_type)
  const isRecrutement = RECRUTEMENT_TYPES.has(form.event_type)

  const isTaskCompleted = event?.preparatory_task
    ? ["completed", "done"].includes(event.preparatory_task.status)
    : false

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
        side="bottom"
        dirty={isFormDirty && !isView}
        onRequestClose={handleRequestClose}
        title={
          isView
            ? "Détails"
            : mode === "edit"
              ? `Modifier (${step}/2)`
              : `Créer (${step}/2)`
        }
        subtitle={
          isView
            ? event?.title
            : step === 1
              ? "Étape 1 : Informations de base"
              : "Étape 2 : Contexte & Tâches"
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3 pb-[var(--safe-area-bottom)]">
            {isView ? (
              event && !isPending && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs font-bold text-danger hover:underline cursor-pointer"
                >
                  Supprimer
                </button>
              )
            ) : step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="px-4 py-2.5 text-xs font-semibold text-muted hover:text-heading transition-colors disabled:opacity-40 cursor-pointer"
              >
                Retour
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="px-4 py-2.5 text-xs font-semibold text-muted hover:text-heading transition-colors disabled:opacity-40 cursor-pointer"
              >
                Annuler
              </button>
            )}

            <div className="flex items-center gap-2">
              {isView ? (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-body hover:text-heading cursor-pointer bg-canvas border border-border rounded-md"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="px-5 py-2.5 text-xs font-bold rounded-md bg-primary text-primary-fg hover:bg-primary/95 cursor-pointer shadow-sm"
                  >
                    Modifier
                  </button>
                </>
              ) : step === 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 text-xs font-bold rounded-md bg-primary text-primary-fg hover:bg-primary/95 cursor-pointer shadow-sm"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold rounded-md bg-primary text-primary-fg hover:bg-primary/95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isPending ? "Enregistrement…" : mode === "create" ? "Créer l'événement" : "Enregistrer"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pb-4">
          {serverError && (
            <div
              data-error-field="true"
              className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2.5 text-xs text-danger"
            >
              {serverError}
            </div>
          )}

          {/* ── VIEW MODE ─────────────────────────────────────────────────── */}
          {isView && event && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border w-fit",
                    currentTypeConfig?.colorClasses || "bg-canvas border-border text-heading"
                  )}>
                    {currentTypeConfig?.label || event.event_type}
                  </span>
                  <h2 className="font-heading text-lg font-bold text-heading mt-1">
                    {event.title}
                  </h2>
                </div>
              </div>

              <div className="bg-canvas/50 border border-border/60 rounded-xl p-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-heading">
                    {new Date(event.starts_at).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[11px] text-body">
                    De {new Date(event.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} à{" "}
                    {new Date(event.ends_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {(event.company || event.contact || event.opportunity || event.candidate) && (
                <div className="flex flex-col gap-2.5 bg-canvas/30 border border-border/40 rounded-xl p-3.5">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Relations</p>
                  {event.company && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-normal shrink-0">Compte :</span>
                      <span className="font-semibold text-heading truncate">{event.company.name}</span>
                    </div>
                  )}
                  {event.contact && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-normal shrink-0">Contact :</span>
                      <span className="font-semibold text-heading truncate">
                        {event.contact.full_name}{event.contact.job_title ? ` (${event.contact.job_title})` : ""}
                      </span>
                    </div>
                  )}
                  {event.opportunity && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-normal shrink-0">Opportunité :</span>
                      <span className="font-semibold text-heading truncate">{event.opportunity.title}</span>
                    </div>
                  )}
                  {event.candidate && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-normal shrink-0">Candidat :</span>
                      <span className="font-semibold text-heading truncate">{event.candidate.full_name}</span>
                    </div>
                  )}
                </div>
              )}

              {event.description && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Notes de préparation</p>
                  <div className="bg-canvas/30 border border-border/40 rounded-xl p-3 text-xs text-body leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              )}

              {event.preparatory_task && (
                <div className="flex flex-col gap-2 border border-border/80 bg-canvas/30 rounded-xl p-3.5 mt-1">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Tâche préparatoire</p>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-xs font-bold text-heading">{event.preparatory_task.title}</h4>
                      {event.preparatory_task.due_date && (
                        <span className="text-[10px] text-body">
                          Échéance : {new Date(event.preparatory_task.due_date).toLocaleString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      isTaskCompleted ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}>
                      {isTaskCompleted ? "Terminée" : "En cours"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT / CREATE MODE ────────────────────────────────────────── */}
          {!isView && (
            <div className="flex flex-col gap-4">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="flex flex-col gap-3.5">
                  {/* Type picker trigger */}
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Nature de l&apos;événement&nbsp;<span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-md border px-3 py-2.5 text-xs font-medium text-left flex items-center justify-between gap-2 cursor-pointer transition-all",
                        currentTypeConfig
                          ? currentTypeConfig.colorClasses
                          : "bg-canvas border-border text-muted",
                        "hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full shrink-0", currentTypeConfig?.dotClass || "bg-muted")} />
                        <span className={currentTypeConfig ? "font-semibold" : "text-muted"}>
                          {currentTypeConfig?.label || "Sélectionner le type…"}
                        </span>
                      </span>
                      <svg className="size-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                    {errors.event_type && <p className="mt-1 text-[10px] text-danger">{errors.event_type}</p>}
                  </div>

                  {/* Title */}
                  <div data-error-field={errors.title ? "true" : "false"}>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Objet&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      disabled={isPending}
                      placeholder="ex. Point hebdomadaire"
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                    {errors.title && <p className="mt-1 text-[10px] text-danger">{errors.title}</p>}
                  </div>

                  {/* Date */}
                  <div data-error-field={errors.date ? "true" : "false"}>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Date&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => {
                        setField("date", e.target.value)
                        if (!form.task_date) setField("task_date", e.target.value)
                      }}
                      disabled={isPending}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                    {errors.date && <p className="mt-1 text-[10px] text-danger">{errors.date}</p>}
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-2 gap-3">
                    <div data-error-field={errors.start_time ? "true" : "false"}>
                      <label className="block text-xs font-bold text-heading mb-1">
                        Début&nbsp;<span className="text-danger">*</span>
                      </label>
                      <AgendaQuarterHourTimeField
                        value={form.start_time}
                        onChange={handleStartTimeChange}
                        disabled={isPending}
                        hourAriaLabel="Heure de début"
                        minuteAriaLabel="Minutes de début"
                      />
                    </div>
                    <div data-error-field={errors.end_time ? "true" : "false"}>
                      <label className="block text-xs font-bold text-heading mb-1">
                        Fin&nbsp;<span className="text-danger">*</span>
                      </label>
                      <AgendaQuarterHourTimeField
                        value={form.end_time}
                        onChange={(value) => setField("end_time", value)}
                        disabled={isPending}
                        hourAriaLabel="Heure de fin"
                        minuteAriaLabel="Minutes de fin"
                      />
                    </div>
                  </div>
                  {errors.end_time && <p className="text-[10px] text-danger -mt-1">{errors.end_time}</p>}
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  {/* Commerce CRM fields */}
                  {isCommerce && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-heading mb-1">Compte client</label>
                        <AccountCombobox value={form.company} onChange={(val) => setField("company", val)} />
                      </div>

                      {form.company && (
                        <div>
                          <label className="block text-xs font-bold text-heading mb-1">
                            Contact {loadingContacts && <span className="text-[10px] text-muted">(chargement…)</span>}
                          </label>
                          <Select
                            value={form.contact_id}
                            onChange={(e) => setField("contact_id", e.target.value)}
                            disabled={isPending || loadingContacts}
                            className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                          >
                            <option value="">Aucun contact lié</option>
                            {contacts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.full_name} {c.job_title ? `— ${c.job_title}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-heading mb-1">Opportunité liée</label>
                        <Select
                          value={form.opportunity_id}
                          onChange={(e) => setField("opportunity_id", e.target.value)}
                          disabled={isPending}
                          className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                        >
                          <option value="">Aucune opportunité liée</option>
                          {opportunities.map((opp) => (
                            <option key={opp.id} value={opp.id}>
                              {opp.title}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Recrutement candidat field */}
                  {isRecrutement && (
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">Candidat lié</label>
                      <Select
                        value={form.candidate_id}
                        onChange={(e) => setField("candidate_id", e.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="">Aucun candidat sélectionné</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name}{c.status ? ` (${c.status})` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Notes de préparation</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      disabled={isPending}
                      rows={3}
                      placeholder="Points clés à aborder, ordre du jour..."
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 focus:ring-1 focus:ring-primary/50 resize-y outline-none"
                    />
                  </div>

                  <div className="border-t border-border/40" />

                  {/* Tâche préparatoire */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="mobile_create_task_chk"
                        checked={form.create_task}
                        onChange={(e) => setField("create_task", e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary/50 h-4 w-4 cursor-pointer"
                      />
                      <label
                        htmlFor="mobile_create_task_chk"
                        className="text-xs font-bold text-heading select-none cursor-pointer"
                      >
                        Activer une tâche préparatoire
                      </label>
                    </div>

                    {form.create_task && (
                      <div className="rounded-lg border border-border bg-canvas/30 p-3 flex flex-col gap-3">
                        <div data-error-field={errors.task_title ? "true" : "false"}>
                          <label className="block text-[11px] font-bold text-heading mb-1">
                            Intitulé&nbsp;<span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.task_title}
                            onChange={(e) => setField("task_title", e.target.value)}
                            disabled={isPending}
                            placeholder="ex. Relire le cahier des charges"
                            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                          />
                          {errors.task_title && <p className="mt-1 text-[10px] text-danger">{errors.task_title}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div data-error-field={errors.task_date ? "true" : "false"}>
                            <label className="block text-[11px] font-bold text-heading mb-1">
                              Échéance&nbsp;<span className="text-danger">*</span>
                            </label>
                            <input
                              type="date"
                              value={form.task_date}
                              onChange={(e) => setField("task_date", e.target.value)}
                              disabled={isPending}
                              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-heading mb-1">
                              Heure&nbsp;<span className="text-danger">*</span>
                            </label>
                            <AgendaQuarterHourTimeField
                              value={form.task_time}
                              onChange={(value) => setField("task_time", value)}
                              disabled={isPending}
                              hourAriaLabel="Heure de la tâche"
                              minuteAriaLabel="Minutes de la tâche"
                            />
                          </div>
                        </div>
                        {errors.task_date && <p className="text-[10px] text-danger -mt-1">{errors.task_date}</p>}

                        <div>
                          <label className="block text-[11px] font-bold text-heading mb-1.5">Priorité</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {PRIORITY_OPTIONS.map((p) => (
                              <button
                                key={p.value}
                                type="button"
                                disabled={isPending}
                                onClick={() => setField("task_priority", p.value)}
                                className={cn(
                                  "py-1.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer",
                                  form.task_priority === p.value
                                    ? "bg-primary text-primary-fg border-primary"
                                    : "bg-canvas text-muted border-border hover:border-primary/30"
                                )}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AppDrawer>
    </>
  )
}
