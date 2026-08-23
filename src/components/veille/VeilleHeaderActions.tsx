"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import type { VeilleDigest } from "@/app/(app)/veille/_data/veille-data"
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
  const [generateOpen, setGenerateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings] = useState(initialSettings)
  const [health, setHealth] = useState(initialHealth)
  const [currentRunId, setCurrentRunId] = useState(initialHealth.state === "queued" || initialHealth.state === "running" ? initialHealth.runId : null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

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

  const targetWorkflowId = health.workflowId ?? "veille-hebdomadaire-kredo"

  const triggerGenerateDigest = async () => {
    if (isGenerating || health.state === "running" || health.state === "queued") return
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workflowId: targetWorkflowId,
          entityType: "workspace",
          input: { schemaVersion: 1, triggerMode: "manual", settings },
        }),
      })
      const payload = (await response.json()) as { runId?: string; error?: string }
      if (!response.ok || !payload.runId) {
        setError(payload.error ?? "Le workflow n’a pas pu être déclenché.")
        setIsGenerating(false)
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
      setGenerateOpen(false)
    } catch {
      setError("Erreur réseau : la génération du digest n’a pas pu être lancée.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => { setError(null); setSettingsOpen(true) }} leftIcon={<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
          Configurer la veille
        </Button>
        <Button
          variant="brass"
          size="sm"
          onClick={() => { setError(null); setGenerateOpen(true) }}
          disabled={health.state === "running" || health.state === "queued"}
          leftIcon={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          }
        >
          Générer un digest
        </Button>
      </div>

      <VeilleActionDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title="Générer un digest"
        description="Cette action va lancer la génération d’un nouveau digest de veille à partir des sources actives configurées."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setGenerateOpen(false)} disabled={isGenerating}>
              Annuler
            </Button>
            <Button
              variant="brass"
              onClick={triggerGenerateDigest}
              loading={isGenerating}
              disabled={isGenerating || health.state === "running" || health.state === "queued"}
            >
              Générer le digest
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
