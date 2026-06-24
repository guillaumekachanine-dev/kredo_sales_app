"use client"

import { useState, useTransition, useCallback } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { AgendaQuarterHourTimeField } from "@/components/agenda/AgendaQuarterHourTimeField"
import {
  createTask,
  getEntityOptions,
  type TaskPriority,
  type TaskRow,
  type EntityOption,
} from "@/lib/tasks/task-actions"
import {
  controlBaseClasses,
  controlStateClasses,
  fieldLabelClasses,
} from "@/components/ui/form-controls"
import { cn } from "@/lib/utils"

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
]

const LINK_ENTITY_TYPES = [
  { value: "collaborator", label: "Collaborateur" },
  { value: "candidate", label: "Candidat" },
  { value: "contact", label: "Contact" },
  { value: "opportunity", label: "Opportunité" },
  { value: "mission", label: "Mission" },
]

type FormState = {
  title: string
  dueDate: string
  dueTime: string
  priority: TaskPriority
  withLink: boolean
  linkedEntityType: string
  linkedEntityId: string
}

const INITIAL_FORM: FormState = {
  title: "",
  dueDate: "",
  dueTime: "",
  priority: "normal",
  withLink: false,
  linkedEntityType: "",
  linkedEntityId: "",
}

interface TaskCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: string
  entityId: string
  onCreated: (task: TaskRow) => void
}

function inputClass(invalid?: boolean) {
  return cn(
    controlBaseClasses,
    invalid ? controlStateClasses.invalid : controlStateClasses.default,
    "h-9 px-3 text-sm"
  )
}

export function TaskCreateModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  onCreated,
}: TaskCreateModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [submitting, startSubmit] = useTransition()

  const handleClose = useCallback(() => {
    setForm(INITIAL_FORM)
    setError(null)
    setEntityOptions([])
    onOpenChange(false)
  }, [onOpenChange])

  const handleEntityTypeChange = useCallback(async (type: string) => {
    setForm((prev) => ({ ...prev, linkedEntityType: type, linkedEntityId: "" }))
    if (!type) {
      setEntityOptions([])
      return
    }
    setLoadingOptions(true)
    const result = await getEntityOptions(type)
    setEntityOptions(result.data)
    setLoadingOptions(false)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!form.title.trim()) {
      setError("L'objet de la tâche est requis.")
      return
    }
    if (form.withLink && form.linkedEntityType && !form.linkedEntityId) {
      setError("Sélectionnez un élément à lier.")
      return
    }

    let dueDate: string | null = null
    if (form.dueDate) {
      const time = form.dueTime || "09:00"
      dueDate = new Date(`${form.dueDate}T${time}`).toISOString()
    }

    startSubmit(async () => {
      setError(null)
      const result = await createTask({
        title: form.title,
        due_date: dueDate,
        priority: form.priority,
        entity_type: entityType,
        entity_id: entityId,
        linked_entity_type: form.withLink && form.linkedEntityType ? form.linkedEntityType : null,
        linked_entity_id: form.withLink && form.linkedEntityId ? form.linkedEntityId : null,
      })

      if (result.error || !result.data) {
        setError(result.error ?? "Erreur lors de la création de la tâche.")
        return
      }

      onCreated(result.data)
      handleClose()
    })
  }, [form, entityType, entityId, onCreated, handleClose])

  return (
    <AppDialog
      open={open}
      onOpenChange={handleClose}
      title="Nouvelle tâche"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-muted hover:text-heading border border-border rounded-[var(--radius-medium)] transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold bg-primary text-primary-fg rounded-[var(--radius-medium)] hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
          >
            {submitting ? "Enregistrement…" : "Créer la tâche"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Objet */}
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClasses} htmlFor="task-title">
            Objet <span className="text-danger">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            placeholder="Ex. : Relancer après réunion de lancement…"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className={inputClass(!form.title && !!error)}
            autoFocus
          />
        </div>

        {/* Date + Heure */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={fieldLabelClasses} htmlFor="task-due-date">
              Échéance
            </label>
            <input
              id="task-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              className={inputClass()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={fieldLabelClasses}>Heure</label>
            <AgendaQuarterHourTimeField
              value={form.dueTime || "09:00"}
              onChange={(v) => setForm((p) => ({ ...p, dueTime: v }))}
              disabled={!form.dueDate}
              hourAriaLabel="Heure de la tâche"
              minuteAriaLabel="Minutes de la tâche"
            />
          </div>
        </div>

        {/* Priorité */}
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClasses}>Priorité</label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                className={cn(
                  "py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer",
                  form.priority === p.value
                    ? "bg-primary text-primary-fg border-primary"
                    : "bg-canvas text-muted border-border hover:border-primary/30 hover:text-heading"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lien optionnel */}
        <div className="border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() =>
              setForm((p) => ({
                ...p,
                withLink: !p.withLink,
                linkedEntityType: "",
                linkedEntityId: "",
              }))
            }
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold transition-colors",
              form.withLink ? "text-primary" : "text-muted hover:text-heading"
            )}
          >
            <svg
              className={cn("w-4 h-4 transition-transform", form.withLink && "rotate-45")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {form.withLink ? "Retirer le lien" : "+ Lier à une entité"}
          </button>

          {form.withLink && (
            <div className="mt-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex flex-col gap-1.5">
                <label className={fieldLabelClasses} htmlFor="task-linked-type">
                  Type d&apos;entité
                </label>
                <select
                  id="task-linked-type"
                  value={form.linkedEntityType}
                  onChange={(e) => handleEntityTypeChange(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">Choisir…</option>
                  {LINK_ENTITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.linkedEntityType && (
                <div className="flex flex-col gap-1.5">
                  <label className={fieldLabelClasses} htmlFor="task-linked-id">
                    {LINK_ENTITY_TYPES.find((t) => t.value === form.linkedEntityType)?.label ?? "Entité"}
                  </label>
                  {loadingOptions ? (
                    <div className="h-9 flex items-center px-3 text-xs text-muted animate-pulse">
                      Chargement…
                    </div>
                  ) : (
                    <select
                      id="task-linked-id"
                      value={form.linkedEntityId}
                      onChange={(e) => setForm((p) => ({ ...p, linkedEntityId: e.target.value }))}
                      className={inputClass(form.withLink && !!form.linkedEntityType && !form.linkedEntityId && !!error)}
                    >
                      <option value="">Sélectionner…</option>
                      {entityOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}
      </div>
    </AppDialog>
  )
}
