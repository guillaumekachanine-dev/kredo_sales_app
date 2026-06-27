"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { createTask } from "@/lib/tasks/task-actions"
import { createCompanyInteraction } from "@/app/(app)/prospection/_actions/company-interaction"
import type { MobilePriorityItem, MobileSecondaryAction } from "./mobile-priority-view-model"

type DrawerStep = "actions" | "log-interaction" | "create-task"

export function MobilePriorityActionDrawer({
  item,
  open,
  onOpenChange,
  onActionSuccess,
}: {
  item: MobilePriorityItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionSuccess: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<DrawerStep>("actions")
  const [isPending, startTransition] = useTransition()

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setTimeout(() => setStep("actions"), 300)
  }, [onOpenChange])

  const handleActionSelect = useCallback(
    (action: MobileSecondaryAction | { key: string }) => {
      if (!item) return

      switch (action.key) {
        case "log-interaction":
          setStep("log-interaction")
          break
        case "create-task":
        case "create-contact-task":
        case "create-qualification-task":
          setStep("create-task")
          break
        case "open-account":
        case "explore-contacts":
        case "consolidate-committee":
          handleClose()
          router.push(`/prospection/accounts/${item.accountId}`)
          break
        case "schedule-event":
        case "schedule-meeting":
        case "schedule-contact":
        case "prepare-next-meeting":
          handleClose()
          router.push(`/agenda`)
          break
        case "advance-opportunity":
        case "create-opportunity":
          handleClose()
          router.push(`/missions/opps`)
          break
        default:
          break
      }
    },
    [item, handleClose, router],
  )

  if (!item) return null

  const title =
    step === "log-interaction"
      ? "Logger une interaction"
      : step === "create-task"
        ? "Créer une tâche"
        : item.accountName

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={title}
      subtitle={step === "actions" ? item.recommendation.actionLabel : undefined}
    >
      <div className="px-4 pb-6">
        {step === "actions" ? (
          <ActionsStep
            item={item}
            onSelectAction={handleActionSelect}
            onClose={handleClose}
          />
        ) : step === "log-interaction" ? (
          <LogInteractionStep
            item={item}
            isPending={isPending}
            startTransition={startTransition}
            onSuccess={onActionSuccess}
            onBack={() => setStep("actions")}
          />
        ) : step === "create-task" ? (
          <CreateTaskStep
            item={item}
            isPending={isPending}
            startTransition={startTransition}
            onSuccess={onActionSuccess}
            onBack={() => setStep("actions")}
          />
        ) : null}
      </div>
    </AppDrawer>
  )
}

// ── Actions Step ─────────────────────────────────────────────────────────────

function ActionsStep({
  item,
  onSelectAction,
  onClose,
}: {
  item: MobilePriorityItem
  onSelectAction: (action: { key: string }) => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => onSelectAction(item.primaryAction)}
        disabled={item.primaryAction.disabled}
        className={cn(
          "flex items-center justify-center gap-2 rounded-[var(--radius-medium)] px-4 py-3 text-sm font-medium min-h-[48px] transition-colors",
          item.primaryAction.disabled
            ? "bg-border text-muted cursor-not-allowed"
            : "bg-primary text-primary-fg",
        )}
      >
        {item.primaryAction.label}
      </button>

      {/* Secondary actions */}
      {item.secondaryActions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted pt-1">
            Autres actions
          </p>
          {item.secondaryActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => onSelectAction(action)}
              disabled={!action.available}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-medium)] border border-border bg-surface px-3.5 py-3 text-left min-h-[48px] transition-colors",
                !action.available && "opacity-50 cursor-not-allowed",
              )}
            >
              <SecondaryActionIcon icon={action.icon} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-heading">{action.label}</p>
                <p className="text-xs text-muted mt-0.5">{action.description}</p>
                {!action.available && action.unavailableReason ? (
                  <p className="text-[11px] text-danger mt-0.5">{action.unavailableReason}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="mt-1 text-center text-sm font-medium text-muted min-h-[44px]"
      >
        Fermer
      </button>
    </div>
  )
}

// ── Log Interaction Step ─────────────────────────────────────────────────────

function LogInteractionStep({
  item,
  isPending,
  startTransition,
  onSuccess,
  onBack,
}: {
  item: MobilePriorityItem
  isPending: boolean
  startTransition: React.TransitionStartFunction
  onSuccess: () => void
  onBack: () => void
}) {
  const [type, setType] = useState("email")
  const [summary, setSummary] = useState("")
  const [error, setError] = useState<string | null>(null)

  const INTERACTION_TYPES = [
    { value: "email", label: "Email" },
    { value: "appel", label: "Appel" },
    { value: "rdv", label: "Rendez-vous" },
    { value: "reunion", label: "Réunion" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "note", label: "Note" },
    { value: "relance", label: "Relance" },
  ]

  const handleSubmit = () => {
    if (!summary.trim()) {
      setError("Décrivez brièvement l'échange.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createCompanyInteraction({
        company_id: item.accountId,
        type,
        summary: summary.trim(),
        occurred_at: new Date().toISOString(),
      })
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-primary self-start min-h-[44px]"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <SurfaceCard padding="compact" radius="lg">
        <div className="flex flex-col gap-3 p-3">
          <div>
            <label htmlFor="interaction-type" className="text-xs font-medium text-heading mb-1 block">
              Type
            </label>
            <select
              id="interaction-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-[var(--radius-small)] border border-border bg-canvas px-3 py-2.5 text-sm text-heading min-h-[44px]"
            >
              {INTERACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="interaction-summary" className="text-xs font-medium text-heading mb-1 block">
              Résumé
            </label>
            <textarea
              id="interaction-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Décrivez brièvement l'échange..."
              rows={3}
              className="w-full rounded-[var(--radius-small)] border border-border bg-canvas px-3 py-2.5 text-sm text-heading resize-none"
            />
          </div>

          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </SurfaceCard>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !summary.trim()}
        className={cn(
          "rounded-[var(--radius-medium)] px-4 py-3 text-sm font-medium min-h-[48px] transition-colors",
          isPending || !summary.trim()
            ? "bg-border text-muted cursor-not-allowed"
            : "bg-primary text-primary-fg",
        )}
      >
        {isPending ? "Enregistrement..." : "Enregistrer l'interaction"}
      </button>
    </div>
  )
}

// ── Create Task Step ─────────────────────────────────────────────────────────

function CreateTaskStep({
  item,
  isPending,
  startTransition,
  onSuccess,
  onBack,
}: {
  item: MobilePriorityItem
  isPending: boolean
  startTransition: React.TransitionStartFunction
  onSuccess: () => void
  onBack: () => void
}) {
  const defaultTitle =
    item.primaryAction.key === "create-contact-task"
      ? `Identifier un contact chez ${item.accountName}`
      : `Suivi commercial – ${item.accountName}`

  const [title, setTitle] = useState(defaultTitle)
  const [priority, setPriority] = useState<"normal" | "high">("normal")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("Le titre de la tâche est requis.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createTask({
        title: title.trim(),
        priority,
        entity_type: "company",
        entity_id: item.accountId,
      })
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-primary self-start min-h-[44px]"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <SurfaceCard padding="compact" radius="lg">
        <div className="flex flex-col gap-3 p-3">
          <div>
            <label htmlFor="task-title" className="text-xs font-medium text-heading mb-1 block">
              Titre
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[var(--radius-small)] border border-border bg-canvas px-3 py-2.5 text-sm text-heading min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="task-priority" className="text-xs font-medium text-heading mb-1 block">
              Priorité
            </label>
            <div className="flex gap-2">
              {(["normal", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 rounded-[var(--radius-small)] border px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors",
                    priority === p
                      ? "border-primary/30 bg-primary/[0.06] text-primary"
                      : "border-border bg-surface text-body",
                  )}
                >
                  {p === "normal" ? "Normale" : "Haute"}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </SurfaceCard>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !title.trim()}
        className={cn(
          "rounded-[var(--radius-medium)] px-4 py-3 text-sm font-medium min-h-[48px] transition-colors",
          isPending || !title.trim()
            ? "bg-border text-muted cursor-not-allowed"
            : "bg-primary text-primary-fg",
        )}
      >
        {isPending ? "Création..." : "Créer la tâche"}
      </button>
    </div>
  )
}

// ── Icon ─────────────────────────────────────────────────────────────────────

function SecondaryActionIcon({ icon }: { icon: string }) {
  const cls = "size-5 shrink-0 text-muted mt-0.5"
  switch (icon) {
    case "task":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    case "contact":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case "interaction":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    case "opportunity":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "account":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    default:
      return null
  }
}
