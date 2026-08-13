"use client"

import { useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { dismissAccountSignal } from "./dismiss-account-signal"
import { createTask } from "@/lib/tasks/task-actions"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"

type AccountSignalDetailDrawerProps = {
  signal: ClientIntelligenceSignal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onDismiss: (signalId: string) => void
  onReturnToCockpit?: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AccountSignalDetailDrawer({
  signal,
  open,
  onOpenChange,
  companyId,
  companyName,
  onDismiss,
  onReturnToCockpit,
}: AccountSignalDetailDrawerProps) {
  const [isDismissing, startDismissingTransition] = useTransition()
  const [isCreatingTask, startCreatingTaskTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)

  if (!signal) return null

  const hasSourceUrl = !!signal.primarySource?.source_url

  function handleDismiss() {
    if (!signal) return
    const signalId = signal.id
    setFeedback(null)
    startDismissingTransition(async () => {
      const result = await dismissAccountSignal(signalId)
      if (result.error) {
        setFeedback({ tone: "error", message: result.error })
      } else {
        onDismiss(signalId)
        onOpenChange(false)
      }
    })
  }

  function handleCreateTask() {
    if (!signal) return
    const currentSignal = signal
    setFeedback(null)
    startCreatingTaskTransition(async () => {
      const priority = currentSignal.urgencyScore >= 0.8
        ? "urgent"
        : currentSignal.globalScore >= 0.7
          ? "high"
          : "normal"

      const description = [
        currentSignal.summary,
        currentSignal.primarySource ? `Source : ${currentSignal.primarySource.source_name}` : null,
        `Score global : ${currentSignal.globalScore}`
      ].filter(Boolean).join("\n")

      const result = await createTask({
        title: currentSignal.recommendedAction || currentSignal.title,
        description,
        priority,
        entity_type: "company",
        entity_id: companyId,
      })

      if (result.error) {
        setFeedback({ tone: "error", message: `Erreur : ${result.error}` })
      } else {
        setFeedback({ tone: "success", message: "Tâche créée avec succès et liée au compte." })
      }
    })
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={signal.title}
      eyebrow={signal.type ?? signal.category ?? "Signal de veille"}
      subtitle={`Veille client rattachée au compte ${companyName}`}
    >
      <div className="space-y-6">
        {onReturnToCockpit ? <CockpitReturnButton onClick={onReturnToCockpit} /> : null}
        {/* Résumé */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Résumé</h3>
          <p className="text-xs text-body bg-canvas/30 rounded-lg p-3.5 border border-border/40 leading-relaxed">
            {signal.summary || "Aucun résumé disponible."}
          </p>
        </div>

        {/* Action recommandée */}
        {signal.recommendedAction && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Action recommandée</h3>
            <p className="text-xs font-semibold text-heading bg-brand-brass/5 rounded-lg p-3.5 border border-brand-brass/25 leading-relaxed">
              {signal.recommendedAction}
            </p>
          </div>
        )}

        {/* Méta-scores */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Indicateurs clés</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/80 bg-canvas/20 p-3 text-center">
              <span className="block text-[9px] font-semibold text-muted uppercase">Score global</span>
              <span className="mt-1 block text-base font-bold text-heading">
                {signal.globalScore.toFixed(2)}
              </span>
            </div>
            <div className="rounded-lg border border-border/80 bg-canvas/20 p-3 text-center">
              <span className="block text-[9px] font-semibold text-muted uppercase">Urgence</span>
              <span className="mt-1 block text-base font-bold text-heading">
                {signal.urgencyScore.toFixed(2)}
              </span>
            </div>
            <div className="rounded-lg border border-border/80 bg-canvas/20 p-3 text-center">
              <span className="block text-[9px] font-semibold text-muted uppercase">Confiance</span>
              <span className="mt-1 block text-base font-bold text-heading">
                {signal.confidenceScore.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Date & Source */}
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Détecté le</span>
            <span className="font-semibold text-heading">{formatDate(signal.detectedAt)}</span>
          </div>
          {signal.expiresAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Expire le</span>
              <span className="font-semibold text-heading">{formatDate(signal.expiresAt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2.5">
            <span className="text-muted">Source principale</span>
            <span className="font-semibold text-heading truncate max-w-[200px]" title={signal.primarySource?.source_name ?? undefined}>
              {signal.primarySource?.source_name || "Non disponible"}
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <AlertBlock
            variant={feedback.tone === "success" ? "success" : "danger"}
            title={feedback.message}
          />
        )}

        {/* Actions de traitement */}
        <div className="space-y-2 border-t border-border pt-5">
          <div className="flex flex-col gap-2">
            <ContextualCommunicationButton
              entryPoint="signal_card"
              companyId={companyId}
              companyName={companyName}
              refs={{ signalRef: signal.id }}
              label="Générer un pitch"
              variant="primary"
              className="w-full justify-center py-2.5 text-xs font-bold leading-normal bg-primary text-primary-fg hover:bg-primary/90"
              stopPropagation={false}
            />

            <Button
              variant="secondary"
              size="md"
              onClick={handleCreateTask}
              loading={isCreatingTask}
              loadingLabel="Création de la tâche..."
              className="w-full justify-center py-2.5 text-xs font-bold"
            >
              Créer une tâche
            </Button>

            {hasSourceUrl && (
              <a
                href={signal.primarySource!.source_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded border border-border bg-surface px-3 py-2.5 text-xs font-bold text-body hover:bg-canvas transition-colors"
              >
                Ouvrir la source
              </a>
            )}

            <Button
              variant="ghost"
              size="md"
              onClick={handleDismiss}
              loading={isDismissing}
              loadingLabel="Ignorer le signal..."
              className="w-full justify-center py-2.5 text-xs font-bold text-muted hover:text-danger hover:bg-danger/5"
            >
              Ignorer le signal
            </Button>
          </div>
        </div>
      </div>
    </AppDrawer>
  )
}
