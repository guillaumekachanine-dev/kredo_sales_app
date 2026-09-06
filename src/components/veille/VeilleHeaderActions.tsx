"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import type { VeilleDigest } from "@/app/(app)/veille/_data/veille-data"
import type { SourceManagementSnapshot } from "@/features/source-management/domain/source-management-contracts"
import type { DigestLaunchOptions } from "@/features/veille/digest/data/get-digest-launch-options"
import { DigestLaunchDialogDesktop } from "@/features/veille/digest/components/DigestLaunchDialogDesktop"
import {
  type GlobalWatchSettings,
  type GlobalWatchWorkflowHealth,
} from "./veille-desktop-contracts"
import { GlobalWatchSettingsDialog } from "./GlobalWatchSettingsDialog"

export function VeilleHeaderActions({
  initialSettings,
  initialHealth,
  sourceManagementSnapshot,
  launchOptions,
}: {
  initialSettings: GlobalWatchSettings
  initialHealth: GlobalWatchWorkflowHealth
  latestDigest?: VeilleDigest | null
  sourceManagementSnapshot: SourceManagementSnapshot
  launchOptions: DigestLaunchOptions
}) {
  const router = useRouter()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings] = useState(initialSettings)
  const [health, setHealth] = useState(initialHealth)
  const [currentRunId, setCurrentRunId] = useState(
    initialHealth.state === "queued" || initialHealth.state === "running"
      ? initialHealth.runId
      : null,
  )

  // Suivi unifié (src/lib/n8n/use-run-tracker) : Realtime en accélérateur,
  // relance périodique en garantie.
  useRunTracker({
    runId: currentRunId,
    withResult: false,
    onSucceeded: () => {
      setHealth((current) => ({
        ...current,
        state: "succeeded",
        label: "OK",
        lastSucceededAt: new Date().toISOString(),
        errorMessage: null,
      }))
      setCurrentRunId(null)
      router.refresh()
    },
    onFailed: (message) => {
      setHealth((current) => ({
        ...current,
        state: "failed",
        label: "Erreur",
        errorMessage: message,
      }))
      setCurrentRunId(null)
      router.refresh()
    },
    onTimeout: () => {
      setCurrentRunId(null)
    },
    onRunning: () => {
      setHealth((current) => ({ ...current, state: "running", label: "En cours" }))
    },
  })

  const handleLaunched = (runId: string) => {
    setHealth((current) => ({
      ...current,
      state: "queued",
      label: "En cours",
      runId,
      lastRunAt: new Date().toISOString(),
      lastSucceededAt: null,
      errorMessage: null,
    }))
    setCurrentRunId(runId)
  }

  const isBlocked = health.state === "running" || health.state === "queued"

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
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
        >
          Configurer la veille
        </Button>
        <Button
          variant="brass"
          size="sm"
          onClick={() => setGenerateOpen(true)}
          disabled={isBlocked}
          leftIcon={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          }
        >
          Générer un digest
        </Button>
      </div>

      <DigestLaunchDialogDesktop
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        options={launchOptions}
        onLaunched={handleLaunched}
        disabled={isBlocked}
      />

      <GlobalWatchSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSettings={settings}
        sourceManagementSnapshot={sourceManagementSnapshot}
      />
    </>
  )
}
