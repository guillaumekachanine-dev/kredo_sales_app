"use client"

import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  buildAgendaItemDrawerActions,
  formatAgendaDateLabel,
  formatAgendaTimeLabel,
  getAgendaBusinessStatusLabel,
  getAgendaPrimaryDeepLinks,
  getAgendaPriorityLabel,
  getAgendaSourceLabel,
  getAgendaTemporalStateLabel,
} from "./agenda-desktop-model"
import type { AgendaGroupedItem, AgendaItem } from "@/lib/agenda/agenda-types"

interface AgendaItemDrawerProps {
  open: boolean
  item: AgendaItem | null
  relatedGroup?: AgendaGroupedItem | null
  timezone: string
  onOpenChange: (open: boolean) => void
  onHideForSession: (itemId: string) => void
  onCompleteTask?: (taskId: string) => Promise<void>
  onReopenTask?: (taskId: string) => Promise<void>
  onCreateTaskClick?: (item: AgendaItem) => void
}

export function AgendaItemDrawer({
  open,
  item,
  relatedGroup,
  timezone,
  onOpenChange,
  onHideForSession,
  onCompleteTask,
  onReopenTask,
  onCreateTaskClick,
}: AgendaItemDrawerProps) {
  if (!item) {
    return (
      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Agenda"
      >
        <div />
      </AppDrawer>
    )
  }

  const actions = buildAgendaItemDrawerActions(item)
  const links = getAgendaPrimaryDeepLinks(item)
  const relatedItems = relatedGroup?.items.filter((related) => related.id !== item.id) ?? []

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={item.title}
      subtitle={item.subtitle ?? undefined}
      description={item.description ?? undefined}
      eyebrow={item.domain}
      width="default"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={item.temporalState === "overdue" ? "danger" : "brand"} size="sm">
            {getAgendaTemporalStateLabel(item)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getAgendaBusinessStatusLabel(item)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getAgendaPriorityLabel(item.priority)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getAgendaSourceLabel(item.sourceType)}
          </Badge>
        </div>

        <section className="rounded-lg border border-border bg-canvas/40 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Temporalité
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-heading">{formatAgendaDateLabel(item, timezone)}</p>
            <p className="text-body">{formatAgendaTimeLabel(item, timezone)}</p>
          </div>
        </section>

        {(item.companyLabel || item.ownerLabel || item.personLabel) ? (
          <section className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Contexte
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              {item.companyLabel ? <p><span className="text-muted">Compte :</span> <span className="text-heading">{item.companyLabel}</span></p> : null}
              {item.ownerLabel ? <p><span className="text-muted">Propriétaire :</span> <span className="text-heading">{item.ownerLabel}</span></p> : null}
              {item.personLabel ? <p><span className="text-muted">Personne :</span> <span className="text-heading">{item.personLabel}</span></p> : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Liens
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius-medium)] border border-border px-3 py-2 text-sm font-medium text-heading transition-colors hover:bg-surface-hover"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {relatedItems.length > 0 ? (
          <section className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Objets liés
            </h3>
            <div className="mt-3 space-y-2">
              {relatedItems.map((related) => (
                <div key={related.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-2">
                  <p className="text-sm font-medium text-heading">{related.title}</p>
                  <p className="mt-1 text-[12px] text-muted">{formatAgendaTimeLabel(related, timezone)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2">
          {item.type === "task" && (
            item.businessStatus === "completed" ? (
              <Button
                key="reopen-task"
                variant="secondary"
                size="sm"
                onClick={() => onReopenTask?.(item.sourceId)}
              >
                Rouvrir la tâche
              </Button>
            ) : (
              <Button
                key="complete-task"
                variant="primary"
                size="sm"
                onClick={() => onCompleteTask?.(item.sourceId)}
              >
                Marquer comme terminée
              </Button>
            )
          )}

          {(item.type === "deadline" || item.type === "alert") && (
            <Button
              key="create-task"
              variant="primary"
              size="sm"
              onClick={() => onCreateTaskClick?.(item)}
            >
              Créer une tâche
            </Button>
          )}

          {actions.map((action) => {
            if (action.key === "hide-session") {
              return (
                <Button
                  key={action.key}
                  variant="ghost"
                  size="sm"
                  onClick={() => onHideForSession(item.id)}
                >
                  {action.label}
                </Button>
              )
            }

            return action.href ? (
              <Button
                key={`${action.key}-${action.href}`}
                variant={action.key === "open-primary" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  window.location.assign(action.href!)
                }}
              >
                {action.label}
              </Button>
            ) : null
          })}
        </section>
      </div>
    </AppDrawer>
  )
}
