"use client"

import { AppDrawer } from "@/components/ui/AppDrawer"

/**
 * Tiroir d'attente et d'erreur partagé par les modules autoportants : le module
 * s'ouvre immédiatement, avec son titre, pendant que sa donnée arrive.
 */
export function ModuleLoadingDrawer({
  open,
  onOpenChange,
  title,
  message,
  isError = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  isError?: boolean
}) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      side="right"
      width="wide"
      showMobileCloseButton
      headerClassName="border-b border-edito-brass/70 bg-edito-navy pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
      contentClassName="bg-edito-canvas p-4"
    >
      <p
        role={isError ? "alert" : "status"}
        aria-live="polite"
        className={
          isError
            ? "border-l-2 border-danger pl-4 text-xs leading-relaxed text-edito-body"
            : "flex items-center gap-3 text-xs font-semibold text-edito-muted"
        }
      >
        {!isError && (
          <span className="size-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" aria-hidden="true" />
        )}
        {message}
      </p>
    </AppDrawer>
  )
}
