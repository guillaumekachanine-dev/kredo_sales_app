"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { cn } from "@/lib/utils"
import type { PageQuickAction } from "./page-quick-actions"

interface MobileQuickActionsProps {
  actions: PageQuickAction[]
  className?: string
}

export function MobileQuickActions({
  actions,
  className,
}: MobileQuickActionsProps) {
  const router = useRouter()
  const visibleActions = actions.slice(0, 3)

  if (visibleActions.length === 0) return null

  return (
    <div
      className={cn(
        "grid gap-2",
        visibleActions.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        className,
      )}
    >
      {visibleActions.map((action) => {
        const handleClick = () => {
          if (action.disabled || action.loading) return
          if (action.href) {
            router.push(action.href)
            return
          }
          if (action.onClick) {
            action.onClick()
          }
        }

        if (!action.label.trim() && action.icon) {
          return (
            <IconButton
              key={action.id}
              aria-label={action.ariaLabel ?? action.id}
              variant={action.variant ?? "secondary"}
              size="md"
              loading={action.loading}
              disabled={action.disabled}
              className="h-11 w-11 justify-self-start sm:h-11 sm:w-11"
              onClick={handleClick}
            >
              {action.icon}
            </IconButton>
          )
        }

        return (
          <Button
            key={action.id}
            variant={action.variant ?? "secondary"}
            size="md"
            loading={action.loading}
            disabled={action.disabled}
            leftIcon={action.icon}
            aria-label={action.ariaLabel}
            fullWidth
            className="min-h-11"
            onClick={handleClick}
          >
            {action.label}
          </Button>
        )
      })}
    </div>
  )
}
