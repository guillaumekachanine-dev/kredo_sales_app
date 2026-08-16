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

function WorkflowHealth({ health }: { health: GlobalWatchWorkflowHealth }) {
  const href = health.runId ? `/automations?run=${health.runId}` : "/automations"
  const title = health.state === "succeeded"
    ? `Dernière exécution réussie : ${formatDateTime(health.lastSucceededAt)}`
    : health.errorMessage ?? `Dernier run : ${formatDateTime(health.lastRunAt)}`
  const running = health.state === "queued" || health.state === "running"

  if (health.state === "succeeded") {
    return (
      <span
        aria-live="polite"
        title={title}
        className="inline-flex h-10 items-center gap-2 border border-success/30 bg-success/[0.06] px-3 text-xs font-bold text-success"
      >
        <span className="size-2 rounded-full bg-success" aria-hidden="true" />
        OK
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-live="polite"
      title={title}
      className={cn(
        "inline-flex h-10 items-center gap-2 border px-3 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
        running
          ? "border-brand-brass/40 bg-brand-brass/[0.07] text-heading"
          : "border-danger/30 bg-danger/[0.05] text-danger",
      )}
    >
      {running ? (
        <span className="size-3 animate-spin rounded-full border-2 border-brand-brass/30 border-t-brand-brass motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <IntelligenceIcon name="detect_risks" preferVector className="size-4" />
      )}
      {health.label}
    </Link>
  )
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
        <Button variant="secondary" size="md" onClick={() => { setError(null); setRefreshOpen(true) }} leftIcon={<IntelligenceIcon name="search_news" preferVector />}>
          Actualiser
        </Button>
        <Button variant="secondary" size="md" onClick={() => { setDraft(settings); setError(null); setSettingsOpen(true) }}>
          Configurer la veille
        </Button>
        <SourceManagementLauncher variant="desktop" snapshot={sourceManagementSnapshot} />
        <WorkflowHealth health={health} />
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

      <VeilleActionDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Configurer la veille"
        description="Ces réglages sont enregistrés dans le workspace sans écraser les autres paramètres."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Annuler</Button>
            <Button variant="brass" onClick={saveSettings} loading={isPending} loadingLabel="Enregistrement">Enregistrer</Button>
          </>
        )}
      >
        <div className="space-y-5">
          <label className="flex min-h-10 items-center justify-between gap-4 border-b border-border pb-4">
            <span><span className="block font-bold text-heading">Veille active</span><span className="text-[11px] text-muted">Autorise la collecte planifiée et manuelle.</span></span>
            <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} className="size-4 accent-primary" />
          </label>
          <label className="block space-y-2">
            <span className="font-bold text-heading">Cadence</span>
            <select value={draft.cadence} disabled className="h-10 w-full border border-border bg-surface px-3 text-heading disabled:opacity-70">
              <option value="weekly">Hebdomadaire</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="font-bold text-heading">Volume maximum</span>
            <input type="number" min={5} max={100} value={draft.maxArticles} onChange={(event) => setDraft((current) => ({ ...current, maxArticles: Number(event.target.value) }))} className="h-10 w-32 border border-border bg-surface px-3 text-heading outline-none focus-visible:ring-2 focus-visible:ring-heading" />
          </label>
          {error ? <p role="alert" className="text-danger">{error}</p> : null}
        </div>
      </VeilleActionDialog>
    </>
  )
}
