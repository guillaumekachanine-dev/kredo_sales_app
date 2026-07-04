"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { StatusPill } from "@/components/ui/StatusPill"
import { Button } from "@/components/ui/Button"
import type {
  WeeklyManagerContent,
  WeeklyManagerPriorityItem,
  WeeklyManagerPriorityTier,
} from "@/app/(app)/reports/_data/reports-types"
import { createTask, type TaskPriority } from "@/lib/tasks/task-actions"
import { dismissWeeklyBriefItem } from "@/lib/reports/weekly-manager/dismiss-actions"
import { resolveWeeklyManagerEntityHref } from "@/lib/reports/weekly-manager/entity-links"

const TIER_TO_STATUS_VARIANT: Record<WeeklyManagerPriorityTier, "danger" | "warning" | "neutral"> = {
  critical: "danger",
  high: "warning",
  normal: "neutral",
}

const TIER_LABEL: Record<WeeklyManagerPriorityTier, string> = {
  critical: "Critique",
  high: "Élevé",
  normal: "Normal",
}

const TIER_TO_TASK_PRIORITY: Record<WeeklyManagerPriorityTier, TaskPriority> = {
  critical: "urgent",
  high: "high",
  normal: "normal",
}

function BlockHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
        {children}
      </h3>
      {count !== undefined && (
        <span className="rounded-full bg-canvas px-1.5 py-px text-[10px] font-bold text-muted">
          {count}
        </span>
      )}
    </div>
  )
}

type ItemActionState = "idle" | "creating" | "created" | "dismissing" | "dismissed" | "error"

// Bloc d'actions 1-clic réutilisé par les priorités notées et les listes
// business (comptes silencieux, missions à marge faible, offres en attente).
// N'exige pas que l'item soit dans facts.priorities — fonctionne sur
// n'importe quel item portant entityType/entityId + un titre.
function ItemActions({
  title,
  description,
  dueDate,
  taskPriority,
  entityType,
  entityId,
  sourceType,
  sourceId,
  weekIso,
  isMobile,
}: {
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
}) {
  const [state, setState] = useState<ItemActionState>("idle")
  const href = resolveWeeklyManagerEntityHref(entityType, entityId)

  async function handleCreateTask() {
    if (!entityType || !entityId) return
    setState("creating")
    const result = await createTask({
      title,
      description,
      due_date: dueDate,
      priority: taskPriority,
      entity_type: entityType,
      entity_id: entityId,
    })
    setState(result.error ? "error" : "created")
  }

  async function handleDismiss() {
    setState("dismissing")
    const result = await dismissWeeklyBriefItem({ itemSourceType: sourceType, itemSourceId: sourceId, weekIso })
    setState(result.error ? "error" : "dismissed")
  }

  if (state === "dismissed") {
    return <p className="text-[10px] italic text-muted">Ignoré pour cette semaine.</p>
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", isMobile && "gap-2")}>
      {entityType && entityId ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCreateTask}
          disabled={state === "creating" || state === "created"}
          className={cn("h-7 px-2.5 text-[11px]", isMobile && "h-9 px-3 text-xs")}
        >
          {state === "creating" ? "Création…" : state === "created" ? "Tâche créée ✓" : "Créer une tâche"}
        </Button>
      ) : null}

      {href ? (
        <a
          href={href}
          className={cn(
            "inline-flex h-7 items-center rounded-[var(--radius-small)] border border-border px-2.5 text-[11px] font-semibold text-body transition-colors hover:bg-surface-hover",
            isMobile && "h-9 px-3 text-xs",
          )}
        >
          Ouvrir la fiche
        </a>
      ) : null}

      <button
        type="button"
        onClick={handleDismiss}
        disabled={state === "dismissing"}
        className={cn(
          "inline-flex h-7 items-center rounded-[var(--radius-small)] px-2 text-[11px] font-semibold text-muted transition-colors hover:text-heading",
          isMobile && "h-9 px-3 text-xs",
        )}
      >
        {state === "dismissing" ? "…" : "Ignorer cette semaine"}
      </button>

      {state === "error" ? <span className="text-[10px] text-danger">Erreur, réessayer.</span> : null}
    </div>
  )
}

function PriorityCard({
  priority,
  narrativeBlurb,
  weekIso,
  isMobile,
}: {
  priority: WeeklyManagerPriorityItem
  narrativeBlurb?: { whyNow: string; recommendedAction: string; expectedImpact: string }
  weekIso: string
  isMobile?: boolean
}) {
  return (
    <li className="rounded-[var(--radius-medium)] border border-border bg-canvas/30 p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-heading leading-tight">{priority.title}</span>
        <StatusPill
          label={TIER_LABEL[priority.tier]}
          variant={TIER_TO_STATUS_VARIANT[priority.tier]}
          className="shrink-0"
        />
      </div>
      <p className="text-[11px] text-body leading-relaxed mb-1">
        {narrativeBlurb?.whyNow ?? priority.reason}
      </p>
      <p className="text-[11px] font-semibold text-primary-deep mb-2">
        ▸ {narrativeBlurb?.recommendedAction ?? priority.recommendedAction}
      </p>
      <ItemActions
        title={priority.title}
        description={narrativeBlurb?.expectedImpact}
        dueDate={null}
        taskPriority={TIER_TO_TASK_PRIORITY[priority.tier]}
        entityType={priority.entityType}
        entityId={priority.entityId}
        sourceType={priority.sourceType}
        sourceId={priority.sourceId}
        weekIso={weekIso}
        isMobile={isMobile}
      />
    </li>
  )
}

export function WeeklyManagerReportView({
  content,
  isMobile = false,
}: {
  content: WeeklyManagerContent
  isMobile?: boolean
}) {
  const { facts, narrative, qaFlags } = content
  const failedFlags = qaFlags.filter((f) => !f.passed)
  const allPassed = failedFlags.length === 0
  const narrativeWarnings = Array.isArray(narrative.warnings)
    ? narrative.warnings.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    : []

  const narrativeByTitle = new Map(narrative.topPriorities.map((p) => [p.title, p]))
  const topPriorities = facts.priorities.slice(0, 5)

  const maxDayCount = Math.max(
    1,
    ...facts.agendaByDay.map((d) => d.eventsCount + d.tasksCount + d.deadlinesCount),
  )

  return (
    <div className="space-y-5">
      {/* Statut qualité */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider w-fit",
          allPassed
            ? "border-success/20 bg-success/10 text-success"
            : "border-warning/25 bg-warning/10 text-[var(--color-status-warning-ink)]"
        )}
      >
        <span className={cn("size-1.5 rounded-full", allPassed ? "bg-success" : "bg-warning")} />
        {allPassed ? "Qualité OK" : "À vérifier"}
      </div>
      {!allPassed && (
        <ul className="space-y-1 text-[11px] text-[var(--color-status-warning-ink)]">
          {failedFlags.map((flag, i) => (
            <li key={i}>• {flag.detail || flag.check}</li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-muted">
        Semaine {facts.period.weekIso} · {formatDate(facts.period.startDate)} → {formatDate(facts.period.endDate)}
        {" · "}
        {facts.scope.isWorkspaceWide ? "Périmètre workspace" : "Périmètre personnel"}
      </p>

      {/* Synthèse */}
      <section>
        <BlockHeading>Essentiel de la semaine</BlockHeading>
        <p className="text-xs text-body leading-relaxed">{narrative.executiveSummary}</p>
        {narrative.weeklyFocus.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {narrative.weeklyFocus.map((focus, i) => (
              <span
                key={i}
                className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-semibold text-primary-deep"
              >
                {focus}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Charge de la semaine */}
      <section>
        <BlockHeading>Charge de la semaine</BlockHeading>
        <div className="grid grid-cols-7 gap-1.5">
          {facts.agendaByDay.map((day) => {
            const total = day.eventsCount + day.tasksCount + day.deadlinesCount
            const intensity = total === 0 ? 0 : Math.max(0.15, total / maxDayCount)
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 2)}
                </span>
                <div
                  className="w-full rounded-[var(--radius-small)] bg-primary"
                  style={{ height: "2.25rem", opacity: intensity }}
                  title={`${total} élément(s)`}
                />
                <span className="text-[9px] font-mono text-muted">{total}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted">
          {facts.workload.overdueOpenTasksCount} tâche(s) en retard · {facts.workload.denseDaysCount} jour(s) dense(s) · {facts.workload.conflictCount} conflit(s)
        </p>
      </section>

      {/* Priorités */}
      {topPriorities.length > 0 && (
        <section>
          <BlockHeading count={topPriorities.length}>Priorités</BlockHeading>
          <ul className="space-y-2">
            {topPriorities.map((priority) => (
              <PriorityCard
                key={`${priority.sourceType}:${priority.sourceId}`}
                priority={priority}
                narrativeBlurb={narrativeByTitle.get(priority.title)}
                weekIso={facts.period.weekIso}
                isMobile={isMobile}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Risques */}
      {narrative.risks.length > 0 && (
        <section className="rounded border border-warning/20 bg-warning/5 px-3 py-2.5">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--color-status-warning-ink)] mb-1">
            Risques
          </span>
          <ul className="space-y-1 text-xs text-body">
            {narrative.risks.map((r, i) => (
              <li key={i}>▸ {r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Comptes cibles silencieux */}
      {facts.commercial.quietTargetAccounts.length > 0 && (
        <section>
          <BlockHeading count={facts.commercial.quietTargetAccountsCount}>Comptes cibles silencieux</BlockHeading>
          <ul className="space-y-2">
            {facts.commercial.quietTargetAccounts.map((account) => (
              <li key={account.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/30 p-3">
                <p className="text-xs font-semibold text-heading mb-1">{account.name}</p>
                <p className="text-[11px] text-muted mb-2">
                  {account.lastContactAt ? `Dernier contact : ${formatDate(account.lastContactAt)}` : "Aucun contact loggé"}
                </p>
                <ItemActions
                  title={`Reprendre contact — ${account.name}`}
                  dueDate={facts.period.endDate}
                  taskPriority="normal"
                  entityType="company"
                  entityId={account.id}
                  sourceType="business_fact"
                  sourceId={account.id}
                  weekIso={facts.period.weekIso}
                  isMobile={isMobile}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Missions à marge faible */}
      {facts.delivery.lowMarginMissions.length > 0 && (
        <section>
          <BlockHeading count={facts.delivery.lowMarginMissionsCount}>Missions à marge faible</BlockHeading>
          <ul className="space-y-2">
            {facts.delivery.lowMarginMissions.map((mission) => (
              <li key={mission.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-heading">{mission.title}</span>
                  <span className="text-[11px] font-mono font-bold text-danger">
                    {mission.grossMarginPct === null ? "—" : `${mission.grossMarginPct}%`}
                  </span>
                </div>
                {mission.companyName && <p className="text-[11px] text-muted mb-2">{mission.companyName}</p>}
                <ItemActions
                  title={`Vérifier la marge — ${mission.title}`}
                  dueDate={facts.period.endDate}
                  taskPriority="high"
                  entityType="mission"
                  entityId={mission.id}
                  sourceType="business_fact"
                  sourceId={mission.id}
                  weekIso={facts.period.weekIso}
                  isMobile={isMobile}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Offres candidats en attente */}
      {facts.recruitment.pendingOffers.length > 0 && (
        <section>
          <BlockHeading count={facts.recruitment.pendingOffersCount}>Offres candidats en attente</BlockHeading>
          <ul className="space-y-2">
            {facts.recruitment.pendingOffers.map((offer) => (
              <li key={offer.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-heading">{offer.candidateName ?? "Candidat"}</span>
                  {offer.deadline && (
                    <span className="text-[10px] font-mono text-danger">{formatDate(offer.deadline)}</span>
                  )}
                </div>
                {offer.offerStatus && <p className="text-[11px] text-muted mb-2">{offer.offerStatus}</p>}
                <ItemActions
                  title={`Relancer l'offre — ${offer.candidateName ?? "candidat"}`}
                  dueDate={offer.deadline}
                  taskPriority="urgent"
                  entityType="candidate"
                  entityId={offer.id}
                  sourceType="business_fact"
                  sourceId={offer.id}
                  weekIso={facts.period.weekIso}
                  isMobile={isMobile}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tâches suggérées */}
      {narrative.suggestedTasks.length > 0 && (
        <section>
          <BlockHeading count={narrative.suggestedTasks.length}>Tâches suggérées</BlockHeading>
          <ul className="space-y-2">
            {narrative.suggestedTasks.map((task, i) => (
              <li key={i} className="rounded-[var(--radius-medium)] border border-border bg-canvas/30 p-3">
                <p className="text-xs font-semibold text-heading mb-1">{task.title}</p>
                <p className="text-[11px] text-muted mb-2">{task.description}</p>
                <ItemActions
                  title={task.title}
                  description={task.description}
                  dueDate={task.dueAt}
                  taskPriority={task.priority}
                  entityType={task.entityType}
                  entityId={task.entityId}
                  sourceType="suggested_task"
                  sourceId={`${i}`}
                  weekIso={facts.period.weekIso}
                  isMobile={isMobile}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {facts.caveats.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {facts.caveats.map((caveat, i) => (
            <p key={i}>⚠ {caveat}</p>
          ))}
        </div>
      )}

      {narrativeWarnings.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {narrativeWarnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <p className={cn("text-[10px] text-muted", isMobile ? "pb-2" : "")}>
        Données à jour au {formatDate(facts.dataCutoffAt)}
      </p>
    </div>
  )
}
