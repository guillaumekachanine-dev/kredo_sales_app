"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
import { StageTimeline } from "./StageTimeline"
import { NEED_TIMELINE_CONFIG, STAFFING_TIMELINE_CONFIG } from "./stage-timeline-config"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { updateStaffingStage } from "@/app/(app)/missions/_actions/update-staffing-stage"
import { cn } from "@/lib/utils"

interface StageQuickEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: "need" | "staffing"
  entityId: string
  entityTitle: string
  currentStage: string
  onSaved?: () => void
}

export function StageQuickEditorDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
  currentStage,
  onSaved,
}: StageQuickEditorDialogProps) {
  const router = useRouter()
  const [selectedStage, setSelectedStage] = useState(currentStage)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCheckbox, setConfirmCheckbox] = useState(false)

  // Réinitialiser la sélection à l'ouverture ou changement
  useEffect(() => {
    if (open) {
      setSelectedStage(currentStage)
      setError(null)
      setSaving(false)
      setConfirmCheckbox(false)
    }
  }, [open, currentStage])

  const config = entityType === "need" ? NEED_TIMELINE_CONFIG : STAFFING_TIMELINE_CONFIG
  const isNeed = entityType === "need"
  const color = isNeed ? "var(--color-case-need-border, #FFC107)" : "var(--color-case-candidate-border, #9C27B0)"

  // Trouver les libellés
  const allStages = [...config.nominal, ...config.terminal]
  const currentLabel = allStages.find((s) => s.value === currentStage)?.label ?? currentStage
  const selectedLabel = allStages.find((s) => s.value === selectedStage)?.label ?? selectedStage

  // Vérifier si c'est une étape terminale
  const isSelectedTerminal = config.terminal.some((s) => s.value === selectedStage)

  // Vérifier s'il y a un saut d'étapes dans le parcours nominal
  const currentIndex = config.nominal.findIndex((s) => s.value === currentStage)
  const selectedIndex = config.nominal.findIndex((s) => s.value === selectedStage)
  const isJump =
    currentIndex !== -1 &&
    selectedIndex !== -1 &&
    selectedIndex > currentIndex + 1

  const handleSave = async () => {
    if (selectedStage === currentStage) {
      onOpenChange(false)
      return
    }

    if (isSelectedTerminal && !confirmCheckbox) {
      setError(`Veuillez cocher la case de confirmation pour passer à l'étape "${selectedLabel}".`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      let result
      if (isNeed) {
        result = await updateOpportunity({
          id: entityId,
          stage: selectedStage as any,
        })
      } else {
        result = await updateStaffingStage({
          positioningId: entityId,
          status: selectedStage,
        })
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onSaved?.()
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur inattendue est survenue.")
    } finally {
      setSaving(false)
    }
  }

  // Header personnalisé avec badge
  const headerContent = (
    <div className="flex items-center justify-between gap-4 w-full pr-6">
      <div className="flex flex-col min-w-0">
        <h2 className="text-base font-bold text-heading truncate">Modifier l’étape</h2>
        <span className="text-xs text-muted truncate mt-0.5" title={entityTitle}>
          {entityTitle}
        </span>
      </div>
      <span
        className={cn(
          "px-2 py-0.5 rounded text-[9px] font-bold shrink-0 tracking-wider uppercase",
          isNeed
            ? "bg-[#FFC107]/15 text-[#D8A400] dark:bg-[#FFC107]/20"
            : "bg-[#9C27B0]/15 text-[#9C27B0] dark:bg-[#9C27B0]/20"
        )}
      >
        {isNeed ? "Besoin" : "Staffing"}
      </span>
    </div>
  )

  const footerContent = (
    <div className="flex items-center justify-end gap-2 w-full">
      <button
        type="button"
        disabled={saving}
        onClick={() => onOpenChange(false)}
        className="inline-flex h-9 items-center justify-center rounded-[var(--radius-small)] border border-border bg-surface px-4 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover active:scale-[0.98]"
      >
        Annuler
      </button>
      <button
        type="button"
        disabled={saving || (isSelectedTerminal && !confirmCheckbox)}
        onClick={handleSave}
        className="inline-flex h-9 items-center justify-center rounded-[var(--radius-small)] border text-white px-4 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: color,
          borderColor: color,
        }}
      >
        {saving ? "Mise à jour..." : "Mettre à jour l’étape"}
      </button>
    </div>
  )

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={headerContent}
      footer={footerContent}
      className="max-w-[620px] w-full"
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Résumé de l'étape courante */}
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-border/40">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Étape actuelle
          </span>
          <span className="text-sm font-semibold text-heading">
            {currentLabel}
          </span>
        </div>

        {/* Timeline interactive */}
        <div className="w-full">
          <StageTimeline
            nominalStages={config.nominal}
            terminalStages={config.terminal}
            currentStage={currentStage}
            selectedStage={selectedStage}
            onSelectStage={(stg) => {
              setSelectedStage(stg)
              setError(null)
            }}
            color={color}
            disabled={saving}
          />
        </div>

        {/* Feedback de transition */}
        {selectedStage !== currentStage && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-body">
              <span>Transition :</span>
              <span className="text-muted line-through">{currentLabel}</span>
              <span className="text-heading">→</span>
              <span className="font-bold text-heading">{selectedLabel}</span>
            </div>

            {/* Notification de saut d'étape (non bloquant) */}
            {isJump && (
              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-900/30">
                💡 Vous passez directement de <strong>{currentLabel}</strong> à <strong>{selectedLabel}</strong>.
              </div>
            )}

            {/* Confirmation de fermeture / étape terminale */}
            {isSelectedTerminal && (
              <div className="p-3 rounded-md bg-danger/5 text-danger text-xs border border-danger/20 flex flex-col gap-2.5">
                <span className="font-bold">
                  ⚠️ Confirmer le passage à &ldquo;{selectedLabel}&rdquo; ?
                </span>
                <label className="flex items-start gap-2.5 font-medium cursor-pointer select-none text-heading">
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => {
                      setConfirmCheckbox(e.target.checked)
                      setError(null)
                    }}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-border text-danger focus:ring-danger"
                  />
                  <span>
                    Je confirme que ce dossier doit être clôturé en étape terminale.
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 rounded-md bg-danger/10 text-danger text-xs font-semibold border border-danger/25">
            {error}
          </div>
        )}
      </div>
    </AppDialog>
  )
}
