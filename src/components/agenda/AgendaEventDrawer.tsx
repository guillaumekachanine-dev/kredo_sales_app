"use client"

import React, { useEffect, useEffectEvent, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Select } from "@/components/ui/Select"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { AgendaEventTypePicker } from "./AgendaEventTypePicker"
import {
  AGENDA_EVENT_TYPES,
  COMMERCE_TYPES,
  getCategoryForType,
  PROSPECTION_TYPES,
  CLIENT_ACTIF_TYPES,
  RECRUTEMENT_TYPES,
  MANAGEMENT_TYPES,
  INTERNE_TYPES,
} from "@/lib/agenda/agenda-config"
import { addOneHourToTime, normalizeTimeToQuarterHour } from "@/lib/agenda/agenda-time-utils"
import type {
  AgendaContextOption,
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
  getAgendaContextOptions,
  getCollaboratorsForSelect,
  getMissionsForSelect,
} from "@/lib/agenda/agenda-actions"
import { cn } from "@/lib/utils"

interface AgendaEventDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: AgendaEvent | null
  onSaved: () => void
  initialValues?: AgendaEventDrawerInitialValues
  allowPreparatoryTask?: boolean
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
  contact_ids?: string[]
  external_contact_name?: string
  opportunity_id?: string
  candidate_id?: string
  collaborator_id?: string
  mission_id?: string
}

type ContextLinkType = "opportunity" | "contract" | "mail" | "signal" | "campaign" | "offer"

interface FormState {
  title: string
  event_type: string
  date: string
  start_time: string
  end_time: string
  description: string
  company: AccountValue | null
  contact_id: string
  contact_ids: string[]
  external_contact_name: string
  opportunity_id: string
  candidate_id: string
  collaborator_id: string
  mission_id: string
  link_context: boolean
  context_type: ContextLinkType
  context_id: string
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
  contact_ids: [],
  external_contact_name: "",
  opportunity_id: "",
  candidate_id: "",
  collaborator_id: "",
  mission_id: "",
  link_context: false,
  context_type: "opportunity",
  context_id: "",
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

const CONTEXT_LINK_TYPES: Array<{ value: ContextLinkType; label: string; emptyLabel: string }> = [
  { value: "opportunity", label: "Opportunité", emptyLabel: "Aucune opportunité disponible" },
  { value: "contract", label: "Contrat", emptyLabel: "Aucun contrat disponible" },
  { value: "mail", label: "Mail", emptyLabel: "Aucun mail disponible" },
  { value: "signal", label: "Signal", emptyLabel: "Aucun signal disponible" },
  { value: "campaign", label: "Campagne", emptyLabel: "Aucune campagne disponible" },
  { value: "offer", label: "Offre", emptyLabel: "Aucune offre disponible" },
]

function readEventMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      contactIds: [] as string[],
      externalContactName: "",
      linkedContext: null as { type: ContextLinkType; id: string } | null,
    }
  }

  const record = metadata as Record<string, unknown>
  const rawContactIds = Array.isArray(record.contact_ids) ? record.contact_ids : []
  const contactIds = rawContactIds.filter((id): id is string => typeof id === "string")
  const externalContactName =
    typeof record.external_contact_name === "string" ? record.external_contact_name : ""

  const linkedContext =
    record.linked_context && typeof record.linked_context === "object" && !Array.isArray(record.linked_context)
      ? record.linked_context as Record<string, unknown>
      : null
  const contextType = linkedContext?.type
  const contextId = linkedContext?.id

  return {
    contactIds,
    externalContactName,
    linkedContext:
      typeof contextType === "string" &&
      CONTEXT_LINK_TYPES.some((type) => type.value === contextType) &&
      typeof contextId === "string"
        ? { type: contextType as ContextLinkType, id: contextId }
        : null,
  }
}

export function AgendaEventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
  initialValues,
  allowPreparatoryTask = true,
}: AgendaEventDrawerProps) {
  const [mode, setMode] = useState<"create" | "view" | "edit">("create")
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contacts, setContacts] = useState<AgendaSelectContact[]>([])
  const [opportunities, setOpportunities] = useState<AgendaSelectOpportunity[]>([])
  const [candidates, setCandidates] = useState<AgendaSelectCandidate[]>([])
  const [contextOptions, setContextOptions] = useState<AgendaContextOption[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingContextOptions, setLoadingContextOptions] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [collaborators, setCollaborators] = useState<{ id: string; full_name: string }[]>([])
  const [missions, setMissions] = useState<{ id: string; title: string; collaborator_id: string | null }[]>([])

  const loadContactsForCompany = useEffectEvent(async (nextCompanyId?: string | null) => {
    if (!nextCompanyId) {
      setContacts([])
      return
    }
    setLoadingContacts(true)
    const data = await getContactsByCompany(nextCompanyId)
    setContacts(data)
    setLoadingContacts(false)
  })

  const syncDrawerState = useEffectEvent(() => {
    setErrors({})
    setServerError(null)

    if (event) {
      setMode("view")
      const metadata = readEventMetadata(event.metadata)

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

      if (allowPreparatoryTask && event.preparatory_task) {
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
        contact_ids: metadata.contactIds.length > 0
          ? metadata.contactIds
          : event.contact_id
            ? [event.contact_id]
            : [],
        external_contact_name: metadata.externalContactName,
        opportunity_id: event.opportunity_id || "",
        candidate_id: event.candidate_id || "",
        collaborator_id: event.collaborator_id || "",
        mission_id: event.mission_id || "",
        link_context: Boolean(metadata.linkedContext),
        context_type: metadata.linkedContext?.type || "opportunity",
        context_id: metadata.linkedContext?.id || "",
        ...taskState,
      })
      void loadContactsForCompany(event.company?.id ?? null)
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
        contact_ids: initialValues?.contact_id
          ? [initialValues.contact_id]
          : initialValues?.contact_ids || [],
        ...initialValues,
      })
      void loadContactsForCompany(initialValues?.company?.id ?? null)
    }
  })

  useEffect(() => {
    if (!open) return
    queueMicrotask(syncDrawerState)
  }, [open, event, initialValues])

  useEffect(() => {
    getOpportunitiesForSelect().then(setOpportunities)
    getCandidatesForSelect().then(setCandidates)
    getCollaboratorsForSelect().then(setCollaborators)
    getMissionsForSelect().then(setMissions)
  }, [])

  const companyId = form.company?.id

  const syncContextOptions = useEffectEvent(async (kind: ContextLinkType, nextCompanyId?: string | null) => {
    setLoadingContextOptions(true)
    const { getAgendaContextOptions } = await import("@/lib/agenda/agenda-actions")
    const data = await getAgendaContextOptions(kind, nextCompanyId)
    setContextOptions(data)
    setLoadingContextOptions(false)
    setForm((prev) =>
      prev.context_id && !data.some((option) => option.id === prev.context_id)
        ? { ...prev, context_id: "" }
        : prev
    )
  })

  useEffect(() => {
    if (!form.link_context) {
      return
    }

    queueMicrotask(() => {
      void syncContextOptions(form.context_type, companyId)
    })
  }, [form.link_context, form.context_type, companyId])

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

  function toggleContact(contactId: string) {
    setForm((prev) => {
      const exists = prev.contact_ids.includes(contactId)
      const contact_ids = exists
        ? prev.contact_ids.filter((id) => id !== contactId)
        : [...prev.contact_ids, contactId]
      return {
        ...prev,
        contact_ids,
        contact_id: contact_ids[0] || "",
      }
    })
  }

  function removeExternalContact() {
    setField("external_contact_name", "")
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

    const currentCategory = getCategoryForType(form.event_type)
    if (currentCategory === "management" && !form.collaborator_id) {
      errs.collaborator_id = "Le collaborateur est obligatoire."
    }

    if (allowPreparatoryTask && form.create_task) {
      if (!form.task_title.trim()) errs.task_title = "Le titre de la tâche est obligatoire."
      if (!form.task_date) errs.task_date = "La date d'échéance est obligatoire."

      if (form.date && form.start_time && form.task_date) {
        const eventStart = new Date(`${form.date}T${form.start_time}`)
        const taskDue = new Date(`${form.task_date}T${form.task_time || "08:30"}`)
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
      const shouldCreateTask = allowPreparatoryTask && form.create_task
      const taskDueIso = shouldCreateTask
        ? new Date(`${form.task_date}T${form.task_time || "08:30"}`).toISOString()
        : ""

      const currentCategory = getCategoryForType(form.event_type)
      const isProspection = currentCategory === "prospection"
      const isClientActif = currentCategory === "client_actif"
      const isRecrutement = currentCategory === "recrutement"
      const isManagement = currentCategory === "management"

      const selectedContactIds = (isProspection || isClientActif) ? form.contact_ids.filter(Boolean) : []
      const metadata = {
        contact_ids: selectedContactIds,
        external_contact_name: (isProspection || isClientActif) ? (form.external_contact_name.trim() || null) : null,
        linked_context: form.link_context && form.context_id
          ? { type: form.context_type, id: form.context_id }
          : null,
      }

      const payload: AgendaEventFormInput = {
        id: event?.id,
        title: form.title.trim(),
        event_type: form.event_type,
        starts_at: startsAt,
        ends_at: endsAt,
        description: form.description.trim(),
        company_id: isRecrutement
          ? (opportunities.find((o) => o.id === form.opportunity_id)?.company_id || null)
          : (isProspection || isClientActif)
            ? (form.company?.id || null)
            : null,
        contact_id: (isProspection || isClientActif) ? (selectedContactIds[0] || form.contact_id || null) : null,
        opportunity_id: isRecrutement ? (form.opportunity_id || null) : null,
        candidate_id: isRecrutement ? (form.candidate_id || null) : null,
        collaborator_id: isManagement ? (form.collaborator_id || null) : null,
        mission_id: isManagement ? (form.mission_id || null) : null,
        create_task: shouldCreateTask,
        task_title: shouldCreateTask ? form.task_title.trim() : "",
        task_due_date: taskDueIso,
        task_priority: shouldCreateTask ? form.task_priority : "normal",
        metadata,
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
  const category = getCategoryForType(form.event_type)
  const isProspection = category === "prospection"
  const isClientActif = category === "client_actif"
  const isRecrutement = category === "recrutement"
  const isManagement = category === "management"
  const isInterne = category === "interne"
  const currentTypeConfig = AGENDA_EVENT_TYPES[form.event_type]

  return (
    <>
      <AgendaEventTypePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={form.event_type}
        onChange={(v) => {
          const oldCat = getCategoryForType(form.event_type)
          const newCat = getCategoryForType(v)

          setForm((prev) => {
            const next = { ...prev, event_type: v }
            if (oldCat !== newCat) {
              // Purge fields from other categories to avoid saving trailing state
              next.company = null
              next.contact_id = ""
              next.contact_ids = []
              next.external_contact_name = ""
              next.opportunity_id = ""
              next.candidate_id = ""
              next.collaborator_id = ""
              next.mission_id = ""
            }
            return next
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
        title={
          isView
            ? "Détails de l'événement"
            : mode === "edit"
              ? "Modifier l'événement"
              : "Créer un événement"
        }
        subtitle={undefined}
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
                  {currentTypeConfig ? (
                    `${CATEGORY_LABELS[currentTypeConfig.category] || currentTypeConfig.category} - ${currentTypeConfig.label}`
                  ) : form.event_type}
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
                    <span className={currentTypeConfig ? "font-semibold" : "text-muted"}>
                      {currentTypeConfig ? (
                        `${CATEGORY_LABELS[currentTypeConfig.category] || currentTypeConfig.category} - ${currentTypeConfig.label}`
                      ) : "Sélectionner le type…"}
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

            {(isProspection || isClientActif) && (
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">Compte associé</label>
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
                    onChange={(val) => {
                      setField("company", val)
                      setField("contact_id", "")
                      setField("contact_ids", [])
                      const nextCompanyId = val?.id ?? null
                      if (nextCompanyId) {
                        setLoadingContacts(true)
                        getContactsByCompany(nextCompanyId).then((data) => {
                          setContacts(data)
                          setLoadingContacts(false)
                        })
                      } else {
                        setContacts([])
                      }
                    }}
                    allowCreate={false}
                    openOnFocus
                    minSearchLength={0}
                  />
                )}
              </div>
            )}

            {(isProspection || isClientActif) && (
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Contact associé
                  {loadingContacts && <span className="text-[10px] text-muted ml-1">(chargement…)</span>}
                </label>
                {isView ? (
                  <div className="min-h-9 rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-70">
                    {[
                      ...contacts
                        .filter((contact) => form.contact_ids.includes(contact.id))
                        .map((contact) => contact.full_name),
                      form.external_contact_name,
                    ].filter(Boolean).join(", ") || "—"}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return
                        if (e.target.value === "__other__") {
                          setField("external_contact_name", form.external_contact_name || "Contact externe")
                          return
                        }
                        toggleContact(e.target.value)
                      }}
                      disabled={isPending || loadingContacts || !form.company}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <option value="">
                        {form.company ? "Ajouter un contact présent…" : "Sélectionnez d'abord un compte"}
                      </option>
                      {contacts
                        .filter((contact) => !form.contact_ids.includes(contact.id))
                        .map((contact) => (
                          <option key={contact.id} value={contact.id}>
                             {contact.full_name} {contact.job_title ? `— ${contact.job_title}` : ""}
                          </option>
                        ))}
                      <option value="__other__">Autre contact…</option>
                    </select>

                    {form.contact_ids.length > 0 || form.external_contact_name ? (
                      <div className="flex flex-wrap gap-1.5">
                        {form.contact_ids.map((contactId) => {
                          const contact = contacts.find((candidate) => candidate.id === contactId)
                          return (
                            <button
                              key={contactId}
                              type="button"
                              onClick={() => toggleContact(contactId)}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-1 text-[11px] font-semibold text-primary"
                              title="Retirer ce contact"
                            >
                              {contact?.full_name || "Contact"}
                              <span aria-hidden="true">×</span>
                            </button>
                          )
                        })}
                        {form.external_contact_name ? (
                          <button
                            type="button"
                            onClick={removeExternalContact}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2 py-1 text-[11px] font-semibold text-heading"
                            title="Retirer ce contact"
                          >
                            {form.external_contact_name}
                            <span aria-hidden="true">×</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {form.external_contact_name ? (
                      <input
                        type="text"
                        value={form.external_contact_name}
                        onChange={(e) => setField("external_contact_name", e.target.value)}
                        disabled={isPending}
                        placeholder="Nom du contact non répertorié"
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── SECTION 2: DATE & HEURES ── */}
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
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
                  Horaire&nbsp;<span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  disabled={isView || isPending}
                  step="900"
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 cursor-pointer"
                />
                {errors.start_time && <p className="mt-1 text-[11px] text-danger">{errors.start_time}</p>}
              </div>
            </div>
          </section>

          {/* ── SECTION: RECRUTEMENT ── */}
          {isRecrutement && (
            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
                Candidat & Besoin
              </p>
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Besoin associé
                </label>
                {isView ? (
                  <input
                    type="text"
                    value={opportunities.find((o) => o.id === form.opportunity_id)?.title || "—"}
                    disabled
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-60"
                  />
                ) : (
                  <Select
                    value={form.opportunity_id}
                    onChange={(e) => setField("opportunity_id", e.target.value)}
                    disabled={isPending}
                    size="sm"
                  >
                    <option value="">Aucun besoin sélectionné</option>
                    {opportunities.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Candidat lié
                </label>
                {isView ? (
                  <input
                    type="text"
                    value={candidates.find((c) => c.id === form.candidate_id)?.full_name || "—"}
                    disabled
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-60"
                  />
                ) : (
                  <Select
                    value={form.candidate_id}
                    onChange={(e) => setField("candidate_id", e.target.value)}
                    disabled={isPending}
                    size="sm"
                  >
                    <option value="">Aucun candidat sélectionné</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {c.status ? ` (${c.status})` : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </section>
          )}

          {/* ── SECTION: MANAGEMENT ── */}
          {isManagement && (
            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
                Suivi collaborateur
              </p>
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Mission associée
                </label>
                {isView ? (
                  <input
                    type="text"
                    value={missions.find((m) => m.id === form.mission_id)?.title || "—"}
                    disabled
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-60"
                  />
                ) : (
                  <Select
                    value={form.mission_id}
                    onChange={(e) => {
                      const missionId = e.target.value
                      setField("mission_id", missionId)
                      const selectedMission = missions.find(m => m.id === missionId)
                      if (selectedMission?.collaborator_id) {
                        setField("collaborator_id", selectedMission.collaborator_id)
                      }
                    }}
                    disabled={isPending}
                    size="sm"
                  >
                    <option value="">Aucune mission sélectionnée</option>
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">
                  Collaborateur&nbsp;<span className="text-danger">*</span>
                </label>
                {isView ? (
                  <input
                    type="text"
                    value={collaborators.find((c) => c.id === form.collaborator_id)?.full_name || "—"}
                    disabled
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading opacity-60"
                  />
                ) : (
                  <Select
                    value={form.collaborator_id}
                    onChange={(e) => setField("collaborator_id", e.target.value)}
                    disabled={isPending}
                    size="sm"
                  >
                    <option value="">Sélectionner un collaborateur…</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </Select>
                )}
                {errors.collaborator_id && <p className="mt-1 text-[11px] text-danger">{errors.collaborator_id}</p>}
              </div>
            </section>
          )}

          {/* ── SECTION 5: NOTES ── */}
          <section className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">Détails</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={isView || isPending}
                rows={2}
                placeholder="Saisissez vos remarques ou l'ordre du jour..."
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-60 resize-y"
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="link_context_chk"
                checked={form.link_context}
                onChange={(e) => {
                  setField("link_context", e.target.checked)
                  if (!e.target.checked) {
                    setContextOptions([])
                    setField("context_id", "")
                  }
                }}
                disabled={isView || isPending}
                className="rounded border-border text-primary focus:ring-primary/50 h-4 w-4 cursor-pointer"
              />
              <label
                htmlFor="link_context_chk"
                className="text-xs font-medium text-heading select-none cursor-pointer"
              >
                Lier du contexte
              </label>
            </div>

            {form.link_context && (
              <div className="rounded-md border border-border/80 bg-canvas/30 p-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-heading mb-1.5">Type de contexte</label>
                  <Select
                    value={form.context_type}
                    onChange={(e) => {
                      setField("context_type", e.target.value as ContextLinkType)
                      setField("context_id", "")
                    }}
                    disabled={isView || isPending}
                    size="sm"
                  >
                    {CONTEXT_LINK_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-heading mb-1.5">Élément lié</label>
                  <Select
                    value={form.context_id}
                    onChange={(e) => setField("context_id", e.target.value)}
                    disabled={isView || isPending || loadingContextOptions}
                    size="sm"
                  >
                    <option value="">
                      {loadingContextOptions
                        ? "Chargement…"
                        : CONTEXT_LINK_TYPES.find((type) => type.value === form.context_type)?.emptyLabel || "Aucun élément disponible"}
                    </option>
                    {contextOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}{option.description ? ` — ${option.description}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </section>

          {allowPreparatoryTask ? (
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
                  className="text-xs font-medium text-heading select-none cursor-pointer"
                >
                  Définir une tâche
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
                        Échéance&nbsp;<span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.task_date}
                        onChange={(e) => setField("task_date", e.target.value)}
                        disabled={isView || isPending}
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      {errors.task_date && <p className="mt-1 text-[10px] text-danger">{errors.task_date}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-heading mb-1.5">Priorité</label>
                      <Select
                        value={form.task_priority}
                        onChange={(e) => setField("task_priority", e.target.value)}
                        disabled={isView || isPending}
                        size="sm"
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </AppDrawer>
    </>
  )
}
