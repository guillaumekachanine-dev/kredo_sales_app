"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { createTask, type TaskPriority } from "@/lib/tasks/task-actions"
import { dismissWeeklyBriefItem } from "@/lib/reports/weekly-manager/dismiss-actions"
import { resolveWeeklyManagerEntityHref } from "@/lib/reports/weekly-manager/entity-links"

type ItemActionState = "idle" | "creating" | "created" | "dismissing" | "dismissed" | "error"

export interface WeeklyManagerItemActionsProps {
  title: string
  description?: string
  dueDate: string | null
  taskPriority: TaskPriority
  entityType?: string
  entityId?: string
  sourceType: string
  sourceId: string
  weekIso: string
  isMobile?: boolean
  onDismissed?: () => void
}

export function getWeeklyManagerActionAvailability(entityType?: string, entityId?: string) {
  return {
    canCreateTask: Boolean(entityType && entityId),
    href: resolveWeeklyManagerEntityHref(entityType, entityId),
  }
}

export function WeeklyManagerItemActions({
  title,
  description,
  dueDate,
  taskPriority,
  entityType,
  entityId,
  sourceType,
  sourceId,
  weekIso,
  isMobile = false,
  onDismissed,
}: WeeklyManagerItemActionsProps) {
  const [state, setState] = useState<ItemActionState>("idle")
  const availability = getWeeklyManagerActionAvailability(entityType, entityId)

  async function handleCreateTask() {
    if (!entityType || !entityId) return
    setState("creating")
    const result = await createTask({ title, description, due_date: dueDate, priority: taskPriority, entity_type: entityType, entity_id: entityId })
    setState(result.error ? "error" : "created")
  }

  async function handleDismiss() {
    setState("dismissing")
    const result = await dismissWeeklyBriefItem({ itemSourceType: sourceType, itemSourceId: sourceId, weekIso })
    if (result.error) {
      setState("error")
      return
    }
    setState("dismissed")
    onDismissed?.()
  }

  if (state === "dismissed") return <p className="text-[10px] italic text-muted">Ignoré pour cette semaine.</p>

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", isMobile && "gap-2")}>
      {availability.canCreateTask ? <Button variant="secondary" size="sm" onClick={handleCreateTask} disabled={state === "creating" || state === "created"} className={cn("h-7 px-2.5 text-[11px]", isMobile && "h-11 px-3 text-xs")}>{state === "creating" ? "Création…" : state === "created" ? "Tâche créée ✓" : "Créer une tâche"}</Button> : null}
      {availability.href ? <a href={availability.href} className={cn("inline-flex h-7 items-center rounded-[var(--radius-small)] border border-border px-2.5 text-[11px] font-semibold text-body", isMobile && "h-11 px-3 text-xs")}>Ouvrir la fiche</a> : null}
      <button type="button" onClick={handleDismiss} disabled={state === "dismissing"} className={cn("inline-flex h-7 items-center rounded-[var(--radius-small)] px-2 text-[11px] font-semibold text-muted", isMobile && "h-11 px-3 text-xs")}>{state === "dismissing" ? "…" : "Ignorer cette semaine"}</button>
      {state === "error" ? <span className="text-[10px] text-danger">Erreur, réessayer.</span> : null}
    </div>
  )
}
