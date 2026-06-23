"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { AGENDA_EVENT_TYPE_OPTIONS } from "@/lib/agenda/agenda-config"
import type { AgendaEvent, AgendaEventFormInput } from "@/lib/agenda/agenda-types"
import {
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  getContactsByCompany,
  getOpportunitiesForSelect,
} from "@/lib/agenda/agenda-actions"
import { cn } from "@/lib/utils"

interface AgendaMobileEventDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: AgendaEvent | null // null means creation mode
  onSaved: () => void
}

interface FormState {
  summary: string
  type: string
  date: string
  start_time: string
  end_time: string
  details: string
  company: AccountValue | null
  contact_id: string
  opportunity_id: string
  create_task: boolean
  task_title: string
  task_date: string
  task_time: string
  task_priority: string
}

const INITIAL_FORM: FormState = {
  summary: "",
  type: "client",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
  details: "",
  company: null,
  contact_id: "",
  opportunity_id: "",
  create_task: false,
  task_title: "",
  task_date: "",
  task_time: "08:30",
  task_priority: "normale",
}

export function AgendaMobileEventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
}: AgendaMobileEventDrawerProps) {
  const [mode, setMode] = useState<"create" | "view" | "edit">("create")
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [contacts, setContacts] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  
  const [isPending, startTransition] = useTransition()
  const initialFormRef = useRef<FormState>(INITIAL_FORM)

  // Sync form with active event
  useEffect(() => {
    if (!open) return

    setErrors({})
    setServerError(null)
    setStep(1)

    if (event) {
      setMode("view")

      // Parse dates to split date/time fields
      const start = new Date(event.occurred_at)
      const end = new Date(event.ends_at)

      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const formatTime = (d: Date) =>
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

      let taskState = {
        create_task: false,
        task_title: "",
        task_date: "",
        task_time: "08:30",
        task_priority: "normale",
      }

      if (event.preparatory_task) {
        const taskDue = event.preparatory_task.due_date ? new Date(event.preparatory_task.due_date) : null
        taskState = {
          create_task: true,
          task_title: event.preparatory_task.title,
          task_date: taskDue ? formatDate(taskDue) : "",
          task_time: taskDue ? formatTime(taskDue) : "08:30",
          task_priority: event.preparatory_task.priority || "normale",
        }
      }

      const loadedForm: FormState = {
        summary: event.summary,
        type: event.type,
        date: formatDate(start),
        start_time: formatTime(start),
        end_time: formatTime(end),
        details: event.details?.body || "",
        company: event.company ? { id: event.company.id, name: event.company.name, isNew: false } : null,
        contact_id: event.contact_id || "",
        opportunity_id: event.opportunity_id || "",
        ...taskState,
      }

      setForm(loadedForm)
      initialFormRef.current = loadedForm
    } else {
      setMode("create")
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, "0")
      const d = String(today.getDate()).padStart(2, "0")
      const todayStr = `${y}-${m}-${d}`

      const emptyForm: FormState = {
        ...INITIAL_FORM,
        date: todayStr,
        task_date: todayStr,
      }

      setForm(emptyForm)
      initialFormRef.current = emptyForm
    }
  }, [open, event])

  // Load lists on mount
  useEffect(() => {
    getOpportunitiesForSelect().then(setOpportunities)
  }, [])

  // Sync contacts when company changes
  const companyId = form.company?.id
  useEffect(() => {
    if (companyId) {
      setLoadingContacts(true)
      getContactsByCompany(companyId).then((data) => {
        setContacts(data)
        setLoadingContacts(false)
        if (form.contact_id && !data.some((c) => c.id === form.contact_id)) {
          setForm((prev) => ({ ...prev, contact_id: "" }))
        }
      })
    } else {
      setContacts([])
      setForm((prev) => ({ ...prev, contact_id: "" }))
    }
  }, [companyId])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // Smooth scroll to first invalid field helper
  const scrollToError = () => {
    setTimeout(() => {
      const firstErrorEl = document.querySelector("[data-error-field='true']")
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 50)
  }

  // Form step-by-step validations
  const validateStep1 = () => {
    const errs: Record<string, string> = {}
    if (!form.summary.trim()) errs.summary = "L'objet de l'événement est obligatoire."
    if (!form.type) errs.type = "La nature de l'événement est obligatoire."
    if (!form.date) errs.date = "La date est obligatoire."
    if (!form.start_time) errs.start_time = "L'heure de début est obligatoire."
    if (!form.end_time) errs.end_time = "L'heure de fin est obligatoire."

    if (form.date && form.start_time && form.end_time) {
      const start = new Date(`${form.date}T${form.start_time}`)
      const end = new Date(`${form.date}T${form.end_time}`)
      if (end <= start) {
        errs.end_time = "L'heure de fin doit être postérieure au début."
      }
    }

    setErrors(errs)
    const isValid = Object.keys(errs).length === 0
    if (!isValid) scrollToError()
    return isValid
  }

  const validateStep2 = () => {
    const errs: Record<string, string> = {}
    if (form.create_task) {
      if (!form.task_title.trim()) errs.task_title = "L'intitulé de la tâche est obligatoire."
      if (!form.task_date) errs.task_date = "La date est obligatoire."
      if (!form.task_time) errs.task_time = "L'heure est obligatoire."

      if (form.date && form.start_time && form.task_date && form.task_time) {
        const eventStart = new Date(`${form.date}T${form.start_time}`)
        const taskDue = new Date(`${form.task_date}T${form.task_time}`)
        if (taskDue >= eventStart) {
          errs.task_date = "La tâche doit expirer avant le début de l'événement."
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...errs }))
    const isValid = Object.keys(errs).length === 0
    if (!isValid) scrollToError()
    return isValid
  }

  // Handle step transitions & saves
  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleSave = () => {
    if (!validateStep1() || !validateStep2()) return
    setServerError(null)

    startTransition(async () => {
      const startIso = new Date(`${form.date}T${form.start_time}`).toISOString()
      const endIso = new Date(`${form.date}T${form.end_time}`).toISOString()
      const taskDueIso = form.create_task
        ? new Date(`${form.task_date}T${form.task_time}`).toISOString()
        : ""

      const payload: AgendaEventFormInput = {
        id: event?.id,
        summary: form.summary.trim(),
        type: form.type,
        occurred_at: startIso,
        ends_at: endIso,
        details: form.details.trim(),
        company_id: form.company?.id || null,
        contact_id: form.contact_id || null,
        opportunity_id: form.opportunity_id || null,
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

  const handleDelete = () => {
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

  // Intercept close request to check if form is dirty
  const isFormDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current)
  const handleRequestClose = () => {
    if (mode !== "view" && isFormDirty) {
      return window.confirm("Des modifications sont en cours. Fermer sans enregistrer ?")
    }
    return true
  }

  const isView = mode === "view"
  const typeConfig = AGENDA_EVENT_TYPE_OPTIONS.find((t) => t.id === form.type) || AGENDA_EVENT_TYPE_OPTIONS[0]
  const isTaskCompleted = event?.preparatory_task
    ? event.preparatory_task.status === "completed" ||
      event.preparatory_task.status === "fait" ||
      event.preparatory_task.status === "done"
    : false

  return (

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
          ? event?.summary
          : step === 1
            ? "Étape 1 : Informations de base"
            : "Étape 2 : Contexte & Tâches"
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3 pb-[var(--safe-area-bottom)]">
          {/* Action 1: Delete or Back/Cancel */}
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
              onClick={handleBack}
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

          {/* Action 2: Save or Next/Modify */}
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
                {isPending ? "Enregistrement..." : mode === "create" ? "Créer l'événement" : "Enregistrer"}
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

        {/* =====================================================================
            A. MODE CONSULTATION (VIEW)
            ===================================================================== */}
        {isView && event && (
          <div className="flex flex-col gap-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border w-fit",
                  typeConfig.colorClasses
                )}>
                  {typeConfig.label}
                </span>
                <h2 className="font-heading text-lg font-bold text-heading mt-1">
                  {event.summary}
                </h2>
              </div>
            </div>

            {/* Date & times */}
            <div className="bg-canvas/50 border border-border/60 rounded-xl p-3 flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-heading">
                  {new Date(event.occurred_at).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-[11px] text-body">
                  De {new Date(event.occurred_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} à{" "}
                  {new Date(event.ends_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Context: Company, Contact, Opportunity */}
            {(event.company || event.contact || event.opportunity) && (
              <div className="flex flex-col gap-2.5 bg-canvas/30 border border-border/40 rounded-xl p-3.5">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Relations client & opportunités</p>
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
                      {event.contact.full_name} {event.contact.job_title ? `(${event.contact.job_title})` : ""}
                    </span>
                  </div>
                )}
                {event.opportunity && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted font-normal shrink-0">Opportunité :</span>
                    <span className="font-semibold text-heading truncate">{event.opportunity.title}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes/Description */}
            {event.details?.body && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Notes de préparation</p>
                <div className="bg-canvas/30 border border-border/40 rounded-xl p-3 text-xs text-body leading-relaxed whitespace-pre-wrap">
                  {event.details.body}
                </div>
              </div>
            )}

            {/* Preparatory Task */}
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
                    "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                    isTaskCompleted ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  )}>
                    {event.preparatory_task.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            B. MODE ÉDITION / CRÉATION
            ===================================================================== */}
        {!isView && (
          <div className="flex flex-col gap-4">
            {/* ------------------ STEP 1 ------------------ */}
            {step === 1 && (
              <div className="flex flex-col gap-3.5">
                {/* Nature */}
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nature de l'événement&nbsp;<span className="text-danger">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setField("type", e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                  >
                    {AGENDA_EVENT_TYPE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary / Object */}
                <div data-error-field={errors.summary ? "true" : "false"}>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Objet&nbsp;<span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.summary}
                    onChange={(e) => setField("summary", e.target.value)}
                    disabled={isPending}
                    placeholder="ex. Point hebdomadaire"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 focus:ring-1 focus:ring-primary/50"
                  />
                  {errors.summary && <p className="mt-1 text-[10px] text-danger">{errors.summary}</p>}
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
                      if (!form.task_date) {
                        setField("task_date", e.target.value)
                      }
                    }}
                    disabled={isPending}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading focus:ring-1 focus:ring-primary/50"
                  />
                  {errors.date && <p className="mt-1 text-[10px] text-danger">{errors.date}</p>}
                </div>

                {/* Times grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Start time */}
                  <div data-error-field={errors.start_time ? "true" : "false"}>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Heure de début&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setField("start_time", e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                    />
                  </div>

                  {/* End time */}
                  <div data-error-field={errors.end_time ? "true" : "false"}>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Heure de fin&nbsp;<span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setField("end_time", e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                    />
                  </div>
                </div>
                {errors.end_time && <p className="text-[10px] text-danger -mt-1">{errors.end_time}</p>}
              </div>
            )}

            {/* ------------------ STEP 2 ------------------ */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                {/* Account Combobox (skipped for internal events) */}
                {form.type !== "interne" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">
                        Compte client
                      </label>
                      <AccountCombobox
                        value={form.company}
                        onChange={(val) => setField("company", val)}
                      />
                    </div>

                    {/* Contact select */}
                    {form.company && (
                      <div>
                        <label className="block text-xs font-bold text-heading mb-1">
                          Contact {loadingContacts && <span className="text-[10px] text-muted">(chargement...)</span>}
                        </label>
                        <select
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
                        </select>
                      </div>
                    )}

                    {/* Opportunity select */}
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">
                        Opportunité commerciale liée
                      </label>
                      <select
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
                      </select>
                    </div>
                  </>
                )}

                {/* Notes de préparation */}
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Notes de préparation
                  </label>
                  <textarea
                    value={form.details}
                    onChange={(e) => setField("details", e.target.value)}
                    disabled={isPending}
                    rows={3}
                    placeholder="Entrez vos remarques, points clés à aborder..."
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 focus:ring-1 focus:ring-primary/50 resize-y"
                  />
                </div>

                <div className="border-t border-border/40 my-1" />

                {/* Preparatory Task section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mobile_create_task_chk"
                      checked={form.create_task}
                      onChange={(e) => setField("create_task", e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/50 h-4.5 w-4.5 cursor-pointer"
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
                      {/* Task title */}
                      <div data-error-field={errors.task_title ? "true" : "false"}>
                        <label className="block text-[11px] font-bold text-heading mb-1">
                          Intitulé de la tâche&nbsp;<span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.task_title}
                          onChange={(e) => setField("task_title", e.target.value)}
                          disabled={isPending}
                          placeholder="ex. Relire le cahier des charges"
                          className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                        />
                        {errors.task_title && (
                          <p className="mt-1 text-[10px] text-danger">{errors.task_title}</p>
                        )}
                      </div>

                      {/* Task due date & time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div data-error-field={errors.task_date ? "true" : "false"}>
                          <label className="block text-[11px] font-bold text-heading mb-1">
                            Échéance date&nbsp;<span className="text-danger">*</span>
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
                          <input
                            type="time"
                            value={form.task_time}
                            onChange={(e) => setField("task_time", e.target.value)}
                            disabled={isPending}
                            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                          />
                        </div>
                      </div>
                      {errors.task_date && (
                        <p className="text-[10px] text-danger -mt-1">{errors.task_date}</p>
                      )}

                      {/* Task priority */}
                      <div>
                        <label className="block text-[11px] font-bold text-heading mb-1.5">
                          Priorité
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {["basse", "normale", "haute"].map((p) => (
                            <button
                              key={p}
                              type="button"
                              disabled={isPending}
                              onClick={() => setField("task_priority", p)}
                              className={cn(
                                "py-1.5 rounded-md text-[11px] font-bold border transition-all capitalize cursor-pointer",
                                form.task_priority === p
                                  ? "bg-primary text-primary-fg border-primary"
                                  : "bg-canvas text-muted border-border hover:border-primary/30"
                              )}
                            >
                              {p}
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
  )
}
