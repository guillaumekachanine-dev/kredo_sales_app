"use client"

import React, { useEffect, useEffectEvent, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Select } from "@/components/ui/Select"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { AgendaEventTypePicker } from "./AgendaEventTypePicker"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import {
  buildContextPayloadFields,
  getContextRule,
  pruneContextValues,
  validateAgendaEventForm,
  type AgendaEventFormValues,
} from "@/lib/agenda/agenda-event-form"
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
  getCollaboratorsForSelect,
  getMissionsForSelect,
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
  collaborator_id: string
  mission_id: string
  create_task: boolean
  task_title: string
  task_date: string
  task_time: string
  task_priority: string
}

const INITIAL_FORM: FormState = {
  title: "",
  event_type: "",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
  description: "",
  company: null,
  contact_id: "",
  opportunity_id: "",
  candidate_id: "",
  collaborator_id: "",
  mission_id: "",
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

const CATEGORY_LABELS: Record<string, string> = {
  prospection: "Prospection",
  client_actif: "Client actif",
  recrutement: "Recrutement",
  management: "Management",
  interne: "Interne",
}

/** Sous-ensemble du state consommé par la validation pure. */
function toFormValues(form: FormState): AgendaEventFormValues {
  return {
    title: form.title,
    event_type: form.event_type,
    date: form.date,
    start_time: form.start_time,
    end_time: form.end_time,
    company: form.company ? { id: form.company.id } : null,
    contact_id: form.contact_id,
    opportunity_id: form.opportunity_id,
    candidate_id: form.candidate_id,
    collaborator_id: form.collaborator_id,
    mission_id: form.mission_id,
    create_task: form.create_task,
    task_title: form.task_title,
    task_date: form.task_date,
    task_time: form.task_time,
  }
}

export function AgendaMobileEventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
}: AgendaMobileEventDrawerProps) {
  const [mode, setMode] = useState<"create" | "view" | "edit">("create")
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contacts, setContacts] = useState<AgendaSelectContact[]>([])
  const [opportunities, setOpportunities] = useState<AgendaSelectOpportunity[]>([])
  const [candidates, setCandidates] = useState<AgendaSelectCandidate[]>([])
  const [collaborators, setCollaborators] = useState<{ id: string; full_name: string }[]>([])
  const [missions, setMissions] = useState<{ id: string; title: string; collaborator_id: string | null }[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<FormState>(INITIAL_FORM)

  const syncDrawerState = useEffectEvent(() => {
    setErrors({})
    setServerError(null)

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
        collaborator_id: event.collaborator_id || "",
        mission_id: event.mission_id || "",
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
    getCollaboratorsForSelect().then(setCollaborators)
    getMissionsForSelect().then(setMissions)
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

  const handleEndTimeChange = (value: string) => {
    setForm((prev) => ({ ...prev, end_time: value }))
    setErrors((prev) => {
      if (!prev.end_time) return prev
      const next = { ...prev }
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

  function validateForm() {
    const errs = validateAgendaEventForm(toFormValues(form))
    setErrors(errs)
    const ok = Object.keys(errs).length === 0
    if (!ok) scrollToError()
    return ok
  }

  function handleSave() {
    if (!validateForm()) return
    setServerError(null)

    startTransition(async () => {
      const startsAt = new Date(`${form.date}T${form.start_time}`).toISOString()
      const endsAt = new Date(`${form.date}T${form.end_time}`).toISOString()
      const taskDueIso = form.create_task
        ? new Date(`${form.task_date}T${form.task_time || "08:30"}`).toISOString()
        : ""

      const contextFields = buildContextPayloadFields(
        form.event_type,
        {
          company_id: form.company?.id || null,
          contact_id: form.contact_id,
          opportunity_id: form.opportunity_id,
          candidate_id: form.candidate_id,
          collaborator_id: form.collaborator_id,
          mission_id: form.mission_id,
        },
        opportunities,
      )

      const payload: AgendaEventFormInput = {
        id: event?.id,
        title: form.title.trim(),
        event_type: form.event_type,
        starts_at: startsAt,
        ends_at: endsAt,
        description: form.description.trim(),
        ...contextFields,
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
  const currentTypeConfig = form.event_type ? AGENDA_EVENT_TYPES[form.event_type] : undefined
  const contextRule = getContextRule(form.event_type)
  const showCompany = contextRule.fields.includes("company")
  const showContact = contextRule.fields.includes("contact")
  const showOpportunity = contextRule.fields.includes("opportunity")
  const showCandidate = contextRule.fields.includes("candidate")
  const showCollaborator = contextRule.fields.includes("collaborator")
  const showMission = contextRule.fields.includes("mission")
  const collaboratorRequired = contextRule.requiredFields.includes("collaborator")
  const showContextBlock = !!form.event_type && contextRule.fields.length > 0

  const isTaskCompleted = event?.preparatory_task
    ? ["completed", "done"].includes(event.preparatory_task.status)
    : false

  return (
    <>
      <AgendaEventTypePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={form.event_type}
        onChange={(nextType) => {
          setForm((prev) => {
            const pruned = pruneContextValues<AccountValue>(nextType, {
              company: prev.company,
              contact_id: prev.contact_id,
              opportunity_id: prev.opportunity_id,
              candidate_id: prev.candidate_id,
              collaborator_id: prev.collaborator_id,
              mission_id: prev.mission_id,
            })
            return { ...prev, ...pruned, event_type: nextType }
          })
          setErrors((prev) => {
            const next = { ...prev }
            delete next.event_type
            delete next.collaborator_id
            return next
          })
        }}
      />

      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        side="bottom"
        className="kredo-agenda-event-drawer"
        dirty={isFormDirty && !isView}
        onRequestClose={handleRequestClose}
        title={isView ? "Détails" : mode === "edit" ? "Modifier l'événement" : "Créer un événement"}
        subtitle={isView ? event?.title : undefined}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
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
                    {currentTypeConfig ? (
                      `${CATEGORY_LABELS[currentTypeConfig.category] || currentTypeConfig.category} - ${currentTypeConfig.label}`
                    ) : event.event_type}
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

              {(event.company || event.contact || event.opportunity || event.candidate || event.collaborator || event.mission) && (
                <div className="flex flex-col gap-2.5 bg-canvas/30 border border-border/40 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Relations</p>
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
                  {event.collaborator && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-normal shrink-0">Collaborateur :</span>
                      <span className="font-semibold text-heading truncate">{event.collaborator.full_name}</span>
                    </div>
                  )}
                  {event.mission && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-normal shrink-0">Mission :</span>
                      <span className="font-semibold text-heading truncate">{event.mission.title}</span>
                    </div>
                  )}
                </div>
              )}

              {event.description && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Notes de préparation</p>
                  <div className="bg-canvas/30 border border-border/40 rounded-xl p-3 text-xs text-body leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              )}

              {event.preparatory_task && (
                <div className="flex flex-col gap-2 border border-border/80 bg-canvas/30 rounded-xl p-3.5 mt-1">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Tâche préparatoire</p>
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

          {/* ── EDIT / CREATE MODE — page unique scrollable ───────────────── */}
          {!isView && (
            <div className="flex flex-col gap-5">
              {/* ── Bloc 1 · Identification ── */}
              <div className="flex flex-col gap-3.5">
                {/* Objet */}
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

                {/* Nature de l'événement */}
                <div data-error-field={errors.event_type ? "true" : "false"}>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nature de l&apos;événement&nbsp;<span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={isPending}
                    className={cn(
                      "w-full rounded-md border px-3 py-2.5 text-xs font-medium text-left flex items-center justify-between gap-2 cursor-pointer transition-all min-h-11",
                      currentTypeConfig
                        ? currentTypeConfig.colorClasses
                        : "bg-canvas border-border text-muted",
                      "hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={currentTypeConfig ? "font-semibold" : "text-muted"}>
                        {currentTypeConfig
                          ? `${CATEGORY_LABELS[currentTypeConfig.category] || currentTypeConfig.category} - ${currentTypeConfig.label}`
                          : "Choisir un scénario…"}
                      </span>
                    </span>
                    <svg className="size-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  {errors.event_type && <p className="mt-1 text-[10px] text-danger">{errors.event_type}</p>}
                </div>
              </div>

              {/* ── Bloc 2 · Date et horaire ── */}
              <div className="flex flex-col gap-3.5">
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

                <div className="grid grid-cols-2 gap-3">
                  <div data-error-field={errors.start_time ? "true" : "false"}>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Heure de début&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      disabled={isPending}
                      step="900"
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading focus:ring-1 focus:ring-primary/50 outline-none cursor-pointer"
                    />
                    {errors.start_time && <p className="mt-1 text-[10px] text-danger">{errors.start_time}</p>}
                  </div>

                  <div data-error-field={errors.end_time ? "true" : "false"}>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Heure de fin&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      disabled={isPending}
                      step="900"
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading focus:ring-1 focus:ring-primary/50 outline-none cursor-pointer"
                    />
                    {errors.end_time && <p className="mt-1 text-[10px] text-danger">{errors.end_time}</p>}
                  </div>
                </div>
              </div>

              {/* ── Bloc 3 · Contexte métier — piloté par la nature ── */}
              {showContextBlock && (
                <div className="flex flex-col gap-3.5 rounded-lg border border-border/70 bg-canvas/20 p-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Contexte
                    {currentTypeConfig ? ` · ${CATEGORY_LABELS[currentTypeConfig.category] || currentTypeConfig.category}` : ""}
                  </p>

                  {showCompany && (
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">Compte client</label>
                      <AccountCombobox value={form.company} onChange={(val) => setField("company", val)} />
                    </div>
                  )}

                  {showContact && form.company && (
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

                  {showOpportunity && (
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">Besoin associé</label>
                      <Select
                        value={form.opportunity_id}
                        onChange={(e) => setField("opportunity_id", e.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="">Aucun besoin sélectionné</option>
                        {opportunities.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {showCandidate && (
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

                  {showMission && (
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">Mission associée</label>
                      <Select
                        value={form.mission_id}
                        onChange={(e) => {
                          const missionId = e.target.value
                          setField("mission_id", missionId)
                          const selectedMission = missions.find((m) => m.id === missionId)
                          if (selectedMission?.collaborator_id) {
                            setField("collaborator_id", selectedMission.collaborator_id)
                          }
                        }}
                        disabled={isPending}
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="">Aucune mission sélectionnée</option>
                        {missions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {showCollaborator && (
                    <div data-error-field={errors.collaborator_id ? "true" : "false"}>
                      <label className="block text-xs font-bold text-heading mb-1">
                        Collaborateur{collaboratorRequired && <>&nbsp;<span className="text-danger">*</span></>}
                      </label>
                      <Select
                        value={form.collaborator_id}
                        onChange={(e) => setField("collaborator_id", e.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="">Sélectionner un collaborateur…</option>
                        {collaborators.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name}
                          </option>
                        ))}
                      </Select>
                      {errors.collaborator_id && <p className="mt-1 text-[10px] text-danger">{errors.collaborator_id}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Bloc 4 · Description ── */}
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Détails</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Points clés à aborder, ordre du jour..."
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 focus:ring-1 focus:ring-primary/50 resize-y outline-none"
                />
              </div>

              {/* ── Bloc 5 · Tâche préparatoire ── */}
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
                    Définir une tâche
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
                        <label className="block text-[11px] font-bold text-heading mb-1">Horaire</label>
                        <input
                          type="time"
                          value={form.task_time}
                          onChange={(e) => setField("task_time", e.target.value)}
                          disabled={isPending}
                          step="900"
                          className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-heading mb-1">Priorité</label>
                      <Select
                        value={form.task_priority}
                        onChange={(e) => setField("task_priority", e.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </Select>
                    </div>

                    {errors.task_date && <p className="text-[10px] text-danger -mt-1">{errors.task_date}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AppDrawer>
    </>
  )
}
