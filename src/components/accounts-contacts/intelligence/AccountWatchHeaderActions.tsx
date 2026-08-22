"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/Button"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import { AccountWatchSettingsDialog } from "./AccountWatchSettingsDialog"

export function AccountWatchHeaderActions({
  companyId,
  companyName,
  companyLogoPath,
  companyWebsite,
  onFeedback,
}: {
  companyId: string
  companyName: string
  companyLogoPath?: string | null
  companyWebsite?: string | null
  onFeedback?: (message: string, tone: "info" | "success" | "error") => void
}) {
  const router = useRouter()
  const triggerRef = useRef(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  const tracker = useRunTracker({
    runId,
    resultType: "account_watch_refresh",
    withResult: false,
    onRunning: () => onFeedback?.("Mise à jour de la veille en cours…", "info"),
    onSucceeded: () => {
      triggerRef.current = false
      setRunId(null)
      onFeedback?.("Veille du compte mise à jour.", "success")
      router.refresh()
    },
    onFailed: (message) => {
      triggerRef.current = false
      setRunId(null)
      onFeedback?.(message, "error")
    },
    onTimeout: () => {
      triggerRef.current = false
      setRunId(null)
      onFeedback?.("La mise à jour continue côté serveur. Rechargez la vue dans quelques minutes.", "info")
    },
  })

  async function refreshWatch() {
    if (triggerRef.current || runId) return
    triggerRef.current = true
    setIsRequesting(true)
    onFeedback?.("Déclenchement de la mise à jour…", "info")

    try {
      const response = await fetch(`/api/intelligence/accounts/${companyId}/watch-refresh`, {
        method: "POST",
      })
      const payload = await response.json() as { runId?: string; error?: string }
      if (!response.ok || !payload.runId) {
        triggerRef.current = false
        onFeedback?.(payload.error ?? "La mise à jour n’a pas pu être déclenchée.", "error")
        return
      }
      setRunId(payload.runId)
      onFeedback?.("Mise à jour lancée. Les nouveaux signaux apparaîtront à la fin du workflow.", "info")
    } catch (error) {
      triggerRef.current = false
      onFeedback?.(error instanceof Error ? error.message : "La mise à jour n’a pas pu être déclenchée.", "error")
    } finally {
      setIsRequesting(false)
    }
  }

  const isUpdating = isRequesting || tracker.isTracking

  return (
    <>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          leftIcon={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          className="w-full justify-start"
        >
          Configurer la veille
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void refreshWatch()}
          loading={isUpdating}
          loadingLabel="Mise à jour…"
          leftIcon={<IntelligenceIcon name="search_news" preferVector />}
          className="w-full justify-start"
        >
          Mettre à jour
        </Button>
      </div>

      <AccountWatchSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        companyId={companyId}
        companyName={companyName}
        companyLogoPath={companyLogoPath}
        companyWebsite={companyWebsite}
        onBack={() => setSettingsOpen(false)}
        onReturnToCockpit={() => setSettingsOpen(false)}
      />
    </>
  )
}
