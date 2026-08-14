"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import type { AccountSignalVerificationResult } from "@/lib/n8n/types"
import { dismissAccountSignal } from "./dismiss-account-signal"
import {
  promoteAccountSignal,
  type AccountSignalPromotionDestination,
} from "./account-signal-promotion-actions"

export type AccountSignalActionFeedback = {
  tone: "info" | "success" | "warning" | "error"
  message: string
}

export function useAccountSignalActions({
  signalId,
  companyId,
  onDismiss,
}: {
  signalId: string
  companyId: string
  onDismiss: (signalId: string) => void
}) {
  const router = useRouter()
  const verificationRequestRef = useRef(false)
  const [verificationRunId, setVerificationRunId] = useState<string | null>(null)
  const [isVerificationRequesting, setIsVerificationRequesting] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [promotionOpen, setPromotionOpen] = useState(false)
  const [feedback, setFeedback] = useState<AccountSignalActionFeedback | null>(null)

  const verificationTracker = useRunTracker<AccountSignalVerificationResult>({
    runId: verificationRunId,
    resultType: "account_signal_verification",
    withResult: true,
    onRunning: () => {
      setFeedback({ tone: "info", message: "Recherche secondaire en cours…" })
    },
    onSucceeded: (result) => {
      verificationRequestRef.current = false
      setVerificationRunId(null)
      if (!result?.contentJson) {
        setFeedback({ tone: "error", message: "Le workflow a terminé sans résultat de vérification exploitable." })
        return
      }

      const verification = result.contentJson
      const evidenceCount = verification.independentEvidence.length
      if (verification.verdict === "confirmed") {
        setFeedback({
          tone: "success",
          message: `Signal confirmé par ${evidenceCount} source${evidenceCount > 1 ? "s" : ""} indépendante${evidenceCount > 1 ? "s" : ""}. ${verification.rationale}`,
        })
      } else if (verification.verdict === "contradicted") {
        setFeedback({ tone: "warning", message: `Signal remis en cause. ${verification.rationale}` })
      } else {
        setFeedback({ tone: "info", message: `Vérification non concluante. ${verification.rationale}` })
      }
      router.refresh()
    },
    onFailed: (message) => {
      verificationRequestRef.current = false
      setVerificationRunId(null)
      setFeedback({ tone: "error", message })
    },
    onTimeout: () => {
      verificationRequestRef.current = false
      setVerificationRunId(null)
      setFeedback({
        tone: "info",
        message: "La vérification continue côté serveur. Rechargez la vue dans quelques minutes.",
      })
    },
  })

  async function verify() {
    if (verificationRequestRef.current || verificationRunId) return
    verificationRequestRef.current = true
    setIsVerificationRequesting(true)
    setFeedback({ tone: "info", message: "Lancement de la recherche secondaire…" })

    try {
      const response = await fetch(
        `/api/intelligence/accounts/${companyId}/signals/${signalId}/verify`,
        { method: "POST" },
      )
      const payload = await response.json() as { runId?: string; error?: string }
      if (!response.ok || !payload.runId) {
        verificationRequestRef.current = false
        setFeedback({ tone: "error", message: payload.error ?? "La vérification n’a pas pu être lancée." })
        return
      }
      setVerificationRunId(payload.runId)
      setFeedback({ tone: "info", message: "Recherche secondaire lancée. Aucun verdict n’est encore établi." })
    } catch (error) {
      verificationRequestRef.current = false
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "La vérification n’a pas pu être lancée.",
      })
    } finally {
      setIsVerificationRequesting(false)
    }
  }

  async function dismiss() {
    if (isDismissing) return
    setIsDismissing(true)
    setFeedback(null)
    try {
      const result = await dismissAccountSignal(signalId)
      if (result.error) {
        setFeedback({ tone: "error", message: result.error })
        return
      }
      onDismiss(signalId)
      router.refresh()
    } finally {
      setIsDismissing(false)
    }
  }

  async function promote(destination: AccountSignalPromotionDestination, sectorId: string) {
    if (isPromoting) return false
    setIsPromoting(true)
    setFeedback(null)
    try {
      const result = await promoteAccountSignal(signalId, destination, sectorId)
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Promotion impossible" })
        return false
      }
      setPromotionOpen(false)
      setFeedback({
        tone: "success",
        message: result.duplicate
          ? "Ce signal est déjà promu vers cette destination."
          : destination === "playbook"
            ? "Signal ajouté au playbook sélectionné."
            : "Signal ajouté aux signaux sectoriels.",
      })
      router.refresh()
      return true
    } finally {
      setIsPromoting(false)
    }
  }

  return {
    feedback,
    setFeedback,
    verify,
    isVerifying: isVerificationRequesting || verificationTracker.isTracking,
    dismiss,
    isDismissing,
    promote,
    isPromoting,
    promotionOpen,
    setPromotionOpen,
  }
}
