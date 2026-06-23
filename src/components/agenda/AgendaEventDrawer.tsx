"use client"

import React, { useState, useEffect, useTransition } from "react"
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

interface AgendaEventDrawerProps {
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

export function AgendaEventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
}: AgendaEventDrawerProps) {
  const [mode, setMode] = useState<"create" | "view" | "edit">("create")
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [contacts, setContacts] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Set initial mode and values based on the event prop
  useEffect(() => {
    if (!open) return

    setErrors({})
    setServerError(null)

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

      setForm({
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
      })
    } else {
      setMode("create")
      // Initialize with default date set to today, or clean form
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, "0")
      const d = String(today.getDate()).padStart(2, "0")
      const todayStr = `${y}-${m}-${d}`

      setForm({
        ...INITIAL_FORM,
        date: todayStr,
        task_date: todayStr,
      })
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
        // Reset contact if not in the new company contacts list
        if (form.contact_id && !data.some((c) => c.id === form.contact_id)) {
          setForm((prev) => ({ ...prev, contact_id: "" }))
        }
      })
    } else {
      setContacts([])
      setForm((prev) => ({ ...prev, contact_id: "" }))
    }
  }, [companyId])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear field-specific error
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // Form validation
  function validate() {
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
        errs.end_time = "L'heure de fin doit être postérieure à l'heure de début."
      }
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
      // Re-create full ISO strings
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

  const isInternal = form.type === "interne"
  const isView = mode === "view"

  return (
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
          {/* Delete button (only in edit/view mode) */}
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

        {/* --- SECTION 1: NATURE ET IDENTITÉ --- */}
        <section className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
            Identité de l'événement
          </p>

          {/* Nature (Type) */}
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Nature de l'événement&nbsp;<span className="text-danger">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
              disabled={isView || isPending}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {AGENDA_EVENT_TYPE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-[11px] text-danger">{errors.type}</p>}
          </div>

          {/* Objet (Summary) */}
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Objet&nbsp;<span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setField("summary", e.target.value)}
              disabled={isView || isPending}
              placeholder="ex. Réunion de cadrage"
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
            />
            {errors.summary && <p className="mt-1 text-[11px] text-danger">{errors.summary}</p>}
          </div>
        </section>

        <div className="border-t border-border/40" />

        {/* --- SECTION 2: DATE ET HORAIRES --- */}
        <section className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
            Date &amp; Heures (Europe/Paris)
          </p>

          <div className="grid grid-cols-3 gap-2">
            {/* Date */}
            <div className="col-span-1">
              <label className="block text-xs font-medium text-heading mb-1.5">
                Date&nbsp;<span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => {
                  setField("date", e.target.value)
                  // Propose task date on same day by default
                  if (!form.task_date) {
                    setField("task_date", e.target.value)
                  }
                }}
                disabled={isView || isPending}
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
              />
              {errors.date && <p className="mt-1 text-[11px] text-danger">{errors.date}</p>}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Début&nbsp;<span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setField("start_time", e.target.value)}
                disabled={isView || isPending}
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
              />
              {errors.start_time && <p className="mt-1 text-[11px] text-danger">{errors.start_time}</p>}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">
                Fin&nbsp;<span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setField("end_time", e.target.value)}
                disabled={isView || isPending}
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
              />
              {errors.end_time && <p className="mt-1 text-[11px] text-danger">{errors.end_time}</p>}
            </div>
          </div>
        </section>

        <div className="border-t border-border/40" />

        {/* --- SECTION 3: LIENS CRM --- */}
        {!isInternal && (
          <>
            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
                Relations CRM
              </p>

              {/* Company Combobox */}
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Compte client
                </label>
                {isView ? (
                  <input
                    type="text"
                    value={event?.company?.name || "—"}
                    disabled
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-60"
                  />
                ) : (
                  <AccountCombobox
                    value={form.company}
                    onChange={(val) => setField("company", val)}
                  />
                )}
              </div>

              {/* Contact Select */}
              {form.company && (
                <div>
                  <label className="block text-xs font-medium text-heading mb-1.5">
                    Contact&nbsp;
                    {loadingContacts && <span className="text-[10px] text-muted">(chargement…)</span>}
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

              {/* Opportunity Link */}
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

        {/* --- SECTION 4: NOTES / DESCRIPTION --- */}
        <section className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
            Détails
          </p>
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Description / Notes de préparation
            </label>
            <textarea
              value={form.details}
              onChange={(e) => setField("details", e.target.value)}
              disabled={isView || isPending}
              rows={4}
              placeholder="Saisissez vos remarques ou l'ordre du jour..."
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 resize-y"
            />
          </div>
        </section>

        <div className="border-t border-border/40" />

        {/* --- SECTION 5: TÂCHE PRÉPARATOIRE --- */}
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
              {/* Task Title */}
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
                {errors.task_title && (
                  <p className="mt-1 text-[10px] text-danger">{errors.task_title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Due Date */}
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
                  {errors.task_date && (
                    <p className="mt-1 text-[10px] text-danger">{errors.task_date}</p>
                  )}
                </div>

                {/* Due Time */}
                <div>
                  <label className="block text-[11px] font-semibold text-heading mb-1">
                    Heure&nbsp;<span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.task_time}
                    onChange={(e) => setField("task_time", e.target.value)}
                    disabled={isView || isPending}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-semibold text-heading mb-1.5">
                  Priorité
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["basse", "normale", "haute"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={isView || isPending}
                      onClick={() => setField("task_priority", p)}
                      className={cn(
                        "py-1 rounded-md text-[11px] font-semibold border transition-all capitalize",
                        form.task_priority === p
                          ? "bg-primary text-primary-fg border-primary"
                          : "bg-canvas text-muted border-border hover:border-primary/30 hover:text-heading"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppDrawer>
  )
}
