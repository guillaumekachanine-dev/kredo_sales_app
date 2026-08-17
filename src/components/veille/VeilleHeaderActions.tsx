"use client"

import {useMemo, useState, useTransition} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import { cn } from "@/lib/utils"
import { saveGlobalWatchSettingsAction } from "@/app/(app)/veille/_actions/veille-actions"
import type { VeilleDigest } from "@/app/(app)/veille/_data/veille-data"
import { SourceManagementLauncher } from "@/features/source-management/components/SourceManagementLauncher"
import type { SourceManagementSnapshot } from "@/features/source-management/domain/source-management-contracts"
import type {
  GlobalWatchSettings,
  GlobalWatchWorkflowHealth,
} from "./veille-desktop-contracts"
import { GlobalWatchSettingsDialog } from "./GlobalWatchSettingsDialog"

function VeilleActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      dataTheme="edito-bright-veille"
      className="sm:max-w-[38rem]"
      headerClassName="border-b border-border pb-4"
      bodyClassName="pr-0"
    >
      {children}
    </AppDialog>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return "Jamais"
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

// Removed WorkflowHealth

export function VeilleHeaderActions({
  initialSettings,
  initialHealth,
  latestDigest,
  sourceManagementSnapshot,
}: {
  initialSettings: GlobalWatchSettings
  initialHealth: GlobalWatchWorkflowHealth
  latestDigest: VeilleDigest | null
  sourceManagementSnapshot: SourceManagementSnapshot
}) {
  const router = useRouter()
  const [refreshOpen, setRefreshOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(initialSettings)
  const [draft, setDraft] = useState(initialSettings)
  const [health, setHealth] = useState(initialHealth)
  const [currentRunId, setCurrentRunId] = useState(initialHealth.state === "queued" || initialHealth.state === "running" ? initialHealth.runId : null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      setHealth((current) => ({ ...current, state: "failed", label: "Erreur", errorMessage: message }))
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


  const activeParameters = useMemo(() => {
    return [
      settings.enabled ? "veille active" : "veille suspendue",
      "cadence hebdomadaire",
      `${settings.maxArticles} articles maximum`,
    ]
  }, [settings])

  const triggerRefresh = async () => {
    if (!health.workflowId) return
    setError(null)
    const response = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workflowId: health.workflowId,
        entityType: "workspace",
        input: { schemaVersion: 1, triggerMode: "manual", settings },
      }),
    })
    const payload = await response.json() as { runId?: string; error?: string }
    if (!response.ok || !payload.runId) {
      setError(payload.error ?? "Le workflow n’a pas pu être déclenché.")
      return
    }
    setHealth((current) => ({
      ...current,
      state: "queued",
      label: "En cours",
      runId: payload.runId!,
      lastRunAt: new Date().toISOString(),
      lastSucceededAt: null,
      errorMessage: null,
    }))
    setCurrentRunId(payload.runId)
    setRefreshOpen(false)
  }

  const saveSettings = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveGlobalWatchSettingsAction(draft)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSettings(result.settings)
      setSettingsOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => { setError(null); setRefreshOpen(true) }} leftIcon={<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}>
          Actualiser
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { setDraft(settings); setError(null); setSettingsOpen(true) }} leftIcon={<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
          Configurer la veille
        </Button>
        <SourceManagementLauncher variant="desktop" snapshot={sourceManagementSnapshot} />
      </div>

      <VeilleActionDialog
        open={refreshOpen}
        onOpenChange={setRefreshOpen}
        title="Actualiser la veille"
        description="Vérifiez les paramètres réellement transmis avant de lancer la collecte."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRefreshOpen(false)}>Annuler</Button>
            <Button variant="brass" onClick={triggerRefresh} disabled={!health.workflowId || health.state === "running" || health.state === "queued"}>
              Lancer l’actualisation
            </Button>
          </>
        )}
      >
        <dl className="divide-y divide-border border-y border-border">
          <div className="grid grid-cols-[10rem_1fr] gap-4 py-3"><dt className="font-bold text-heading">Période</dt><dd>Cadence hebdomadaire active</dd></div>
          <div className="grid grid-cols-[10rem_1fr] gap-4 py-3"><dt className="font-bold text-heading">Paramètres</dt><dd>{activeParameters.join(" · ")}</dd></div>
          <div className="grid grid-cols-[10rem_1fr] gap-4 py-3"><dt className="font-bold text-heading">Sources actives</dt><dd>{latestDigest?.nb_sources_actives ?? "Indisponible"}</dd></div>
          <div className="grid grid-cols-[10rem_1fr] gap-4 py-3"><dt className="font-bold text-heading">Dernier digest</dt><dd>{latestDigest ? formatDateTime(latestDigest.created_at) : "Aucun digest"}</dd></div>
        </dl>
        {!health.workflowId ? (
          <p className="mt-4 border border-danger/25 bg-danger/[0.04] p-3 text-danger">
            Le workflow global n’a pas encore d’identifiant stable vérifié. L’exécution reste désactivée pour éviter un faux succès.
          </p>
        ) : null}
        {health.state === "queued" || health.state === "running" ? (
          <p className="mt-4 border border-brand-brass/30 bg-brand-brass/[0.06] p-3 text-heading">Une exécution est déjà en cours.</p>
        ) : null}
        {error ? <p role="alert" className="mt-4 text-danger">{error}</p> : null}
      </VeilleActionDialog>

      <GlobalWatchSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSettings={settings}
        sourceManagementSnapshot={sourceManagementSnapshot}
      />
    </>
  )
}
