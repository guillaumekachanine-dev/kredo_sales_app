"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { QuickActionDrawer, type QuickActionSubmitResult } from "./QuickActionDrawer"
import { cn } from "@/lib/utils"
import {
  isPageQuickActionGroup,
  pageQuickActionButtonClassName,
  pageQuickActionIconClassName,
  type PageQuickAction,
  type PageQuickActionGroup,
  type QuickActionOption,
} from "./page-quick-actions"

interface PageQuickActionsProps {
  actions: PageQuickAction[]
  maxVisible?: number
  className?: string
}

export function PageQuickActions({
  actions,
  maxVisible = 4,
  className,
}: PageQuickActionsProps) {
  const router = useRouter()
  const visibleActions = actions.slice(0, maxVisible)
  const [openDrawerActionId, setOpenDrawerActionId] = React.useState<string | null>(null)
  const [activeActionId, setActiveActionId] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const timeoutRef = React.useRef<number | null>(null)

  const runActivationFeedback = React.useCallback((actionId: string, message?: string) => {
    setActiveActionId(actionId)
    setFeedback(message ?? null)

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setActiveActionId(null)
      setFeedback(null)
      timeoutRef.current = null
    }, 1500)
  }, [])

  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    },
    [],
  )

  const executeAction = React.useCallback(
    (
      parentActionId: string,
      action: PageQuickAction | QuickActionOption,
    ): QuickActionSubmitResult => {
      if (action.disabled || action.loading) {
        return {
          status: "error",
          message: "Cette action est indisponible pour le moment.",
        }
      }

      if ("feedbackMessage" in action && action.feedbackMessage) {
        runActivationFeedback(parentActionId)
        return {
          status: "info",
          message: action.feedbackMessage,
        }
      }

      if ("href" in action && action.href) {
        runActivationFeedback(parentActionId)
        router.push(action.href)
        return {
          status: "success",
        }
      }

      if ("onClick" in action && action.onClick) {
        runActivationFeedback(parentActionId)
        action.onClick()
        return {
          status: "success",
        }
      }

      return {
        status: "error",
        message: "Cette action n’est pas configurée.",
      }
    },
    [router, runActivationFeedback],
  )

  const openDrawerAction =
    visibleActions.find(
      (action): action is PageQuickActionGroup =>
        isPageQuickActionGroup(action) && action.id === openDrawerActionId,
    ) ?? null

  if (visibleActions.length === 0) return null

  return (
    <div className={cn("relative flex flex-col items-end", className)}>
      <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
        {visibleActions.map((action) => {
          if (isPageQuickActionGroup(action)) {
            const resolvedVariant = action.variant ?? "primary"
            return (
              <Button
                key={action.id}
                variant={resolvedVariant}
                size="sm"
                disabled={action.disabled}
                aria-label={action.ariaLabel}
                aria-expanded={openDrawerActionId === action.id}
                aria-haspopup="dialog"
                className={pageQuickActionButtonClassName}
                onClick={() => {
                  if (action.disabled || action.loading) return
                  setOpenDrawerActionId(action.id)
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {action.icon ? (
                    <span className={pageQuickActionIconClassName}>
                      {action.icon}
                    </span>
                  ) : null}
                  {action.label}
                </span>
              </Button>
            )
          }

          const resolvedVariant = action.variant ?? "primary"
          return (
            <Button
              key={action.id}
              variant={resolvedVariant}
              size="sm"
              loading={action.loading}
              disabled={action.disabled}
              aria-label={action.ariaLabel}
              className={pageQuickActionButtonClassName}
              onClick={() => {
                executeAction(action.id, action)
              }}
            >
              <span className="inline-flex items-center gap-2">
                {action.icon ? (
                  <span className={pageQuickActionIconClassName}>
                    {action.icon}
                  </span>
                ) : null}
                {action.label}
              </span>
            </Button>
          )
        })}
      </div>

      <QuickActionDrawer
        key={openDrawerAction?.id ?? "quick-action-drawer"}
        action={openDrawerAction}
        open={Boolean(openDrawerAction)}
        onOpenChange={(open) => {
          if (!open) {
            setOpenDrawerActionId(null)
          }
        }}
        onSubmitOption={(
          action: PageQuickActionGroup,
          option: QuickActionOption,
        ) => executeAction(action.id, option)}
      />

      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute right-0 top-full mt-1 text-xs text-muted transition-opacity",
          feedback ? "opacity-100" : "opacity-0",
        )}
      >
        {feedback ?? " "}
      </div>
    </div>
  )
}
