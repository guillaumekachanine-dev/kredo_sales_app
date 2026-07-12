"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { createClient } from "@/lib/supabase/client"
import type { AccountScanOutput, AccountScanResolutionCandidate } from "@/lib/n8n/types"
import { AccountScanSetup, type AccountScanSetupCompany } from "./AccountScanSetup"
import { AccountScanResolutionPicker } from "./AccountScanResolutionPicker"
import { AccountScanStatus } from "./AccountScanStatus"
import { AccountScanDesktopResults } from "./AccountScanDesktopResults"
import { AccountScanMobileResults } from "./AccountScanMobileResults"
import { applyAccountScanProposals, getLatestAccountScanRun } from "./account-scan-actions"
import {
  type AccountScanBilanCategory,
  type AccountScanProposalRow,
  type AccountScanSetupValues,
  bilanCategoryFromOperation,
  buildAccountScanInput,
  isAutoApplyEligible,
  mergeProposalRows,
} from "./account-scan-utils"

type Phase =
  | "loading"
  | "setup"
  | "queued"
  | "running"
  | "ambiguous"
  | "not_found"
  | "review"
  | "error"

interface AccountScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: AccountScanSetupCompany & {
    id: string
    legalName: string | null
    nafCode: string | null
    sectorId: string | null
  }
  isMobile: boolean
  onApplied: () => void
}

// Fallback de relecture ponctuelle si Realtime ne remonte pas (§6) — UNE seule
// relecture, jamais un polling en boucle.
const FALLBACK_RECHECK_DELAY_MS = 20000

export function AccountScanDialog({ open, onOpenChange, company, isMobile, onApplied }: AccountScanDialogProps) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [runId, setRunId] = useState<string | null>(null)
  const [scanOutput, setScanOutput] = useState<AccountScanOutput | null>(null)
  const [candidates, setCandidates] = useState<AccountScanResolutionCandidate[]>([])
  const [proposalRows, setProposalRows] = useState<AccountScanProposalRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [bilanByProposalId, setBilanByProposalId] = useState<Map<string, AccountScanBilanCategory>>(new Map())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const lastSetupRef = useRef<AccountScanSetupValues>({
    informationMode: "find",
    autoApplyOfficialMissing: true,
    websiteHint: null,
    locationHint: null,
  })
  const autoAppliedRunIdRef = useRef<string | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedOnceRef = useRef(false)
  const removeChannelRef = useRef<(() => void) | null>(null)
  // Miroir de `phase` en ref : lu (pas souscrit) par l'effet Realtime pour
  // décider s'il faut souscrire, sans que phase soit une dépendance de cet
  // effet (cf. note sur la re-souscription queued→running plus bas).
  const phaseRef = useRef<Phase>("loading")
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  const teardownRealtimeChannel = useCallback(() => {
    if (removeChannelRef.current) {
      removeChannelRef.current()
      removeChannelRef.current = null
    }
  }, [])

  const applyProposalIds = useCallback(async (targetRunId: string, ids: string[]) => {
    if (ids.length === 0) return
    setApplying(true)
    const result = await applyAccountScanProposals({ runId: targetRunId, companyId: company.id, proposalIds: ids })
    setApplying(false)

    if (result.error) {
      setErrorMessage(result.error)
      return
    }

    setBilanByProposalId((prev) => {
      const next = new Map(prev)
      for (const r of result.results) {
        if (r.proposal_id) next.set(r.proposal_id, bilanCategoryFromOperation(r.operation ?? "unknown"))
      }
      return next
    })
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })

    onApplied()
  }, [company.id, onApplied])

  const loadProposalRows = useCallback(async (targetRunId: string, output: AccountScanOutput) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("enrichment_proposals")
      .select("id, attribute_name, status, confidence_score, old_value, proposed_value, normalized_value, justification")
      .eq("run_id", targetRunId)
      .eq("target_type", "company")
      .eq("target_id", company.id)

    if (error) {
      setErrorMessage(`Résultat introuvable : ${error.message}`)
      setPhase("error")
      return
    }

    const rows = mergeProposalRows(data ?? [], output)
    setProposalRows(rows)
    setPhase("review")

    // Auto-application (§11) — une seule fois par run.
    if (lastSetupRef.current.autoApplyOfficialMissing && autoAppliedRunIdRef.current !== targetRunId) {
      autoAppliedRunIdRef.current = targetRunId
      const eligibleIds = rows
        .filter((row) =>
          isAutoApplyEligible(
            { attributeName: row.attributeName, oldValue: row.oldValue, confidenceScore: row.confidenceScore, sourceKeys: row.sourceKeys },
            output.sources,
            output.resolution.status,
          )
        )
        .map((row) => row.id)

      if (eligibleIds.length > 0) {
        void applyProposalIds(targetRunId, eligibleIds)
      }
    }
  }, [company.id, applyProposalIds])

  const handleTerminalResult = useCallback((targetRunId: string, resultStatus: string | null, contentJson: Record<string, unknown> | null) => {
    clearFallbackTimer()
    teardownRealtimeChannel()

    if (resultStatus !== "succeeded" || !contentJson) {
      setErrorMessage("La génération a échoué. Vérifier les logs n8n et réessayer.")
      setPhase("error")
      return
    }

    const output = contentJson as unknown as AccountScanOutput
    if (output.schemaVersion !== 1) {
      setErrorMessage("Sortie incompatible (schemaVersion inattendu) — réessayer le scan.")
      setPhase("error")
      return
    }

    setScanOutput(output)

    if (output.resolution.status === "ambiguous") {
      setCandidates(output.resolution.candidates)
      setPhase("ambiguous")
      return
    }

    if (output.resolution.status === "not_found") {
      setPhase("not_found")
      return
    }

    void loadProposalRows(targetRunId, output)
  }, [clearFallbackTimer, teardownRealtimeChannel, loadProposalRows])

  const hydrateFromLatestRun = useCallback(async () => {
    const latest = await getLatestAccountScanRun(company.id)

    if (!latest) {
      setPhase("setup")
      return
    }

    setRunId(latest.runId)

    if (latest.status === "queued" || latest.status === "running") {
      setPhase(latest.status)
      return
    }

    if (latest.status === "failed" || latest.status === "cancelled") {
      setErrorMessage(latest.errorMessage)
      setPhase("error")
      return
    }

    handleTerminalResult(latest.runId, latest.resultStatus, latest.contentJson)
  }, [company.id, handleTerminalResult])

  // ── Restauration au montage / réouverture ────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (hydratedOnceRef.current && phase !== "queued" && phase !== "running") return
    hydratedOnceRef.current = true
    void hydrateFromLatestRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company.id])

  // ── Realtime : statut du run + résultat ──────────────────────────────────
  // Clé uniquement sur runId (pas sur phase) : la transition queued→running est
  // gérée à l'intérieur du callback, pas en recréant le canal — sinon la
  // transition elle-même (déclenchée PAR ce canal) provoquerait sa propre
  // destruction/recréation, avec une fenêtre où un événement pourrait être
  // manqué entre les deux.
  useEffect(() => {
    if (!runId) return
    if (phaseRef.current !== "queued" && phaseRef.current !== "running") return

    const supabase = createClient()
    const channel = supabase
      .channel(`account-scan-${runId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_intelligence_runs", filter: `id=eq.${runId}` },
        (payload) => {
          const row = payload.new as { status: string; error_message: string | null }
          if (row.status === "running") {
            setPhase((p) => (p === "queued" ? "running" : p))
          } else if (row.status === "failed" || row.status === "cancelled") {
            clearFallbackTimer()
            teardownRealtimeChannel()
            setErrorMessage(row.error_message)
            setPhase("error")
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_intelligence_results", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as { status: string; content_json: Record<string, unknown>; result_type: string }
          if (row.result_type !== "account_scan") return
          handleTerminalResult(runId, row.status, row.content_json)
        }
      )
      .subscribe()

    removeChannelRef.current = () => { void supabase.removeChannel(channel) }

    fallbackTimerRef.current = setTimeout(() => {
      void (async () => {
        const latest = await getLatestAccountScanRun(company.id)
        if (latest && latest.runId === runId && latest.resultStatus) {
          handleTerminalResult(runId, latest.resultStatus, latest.contentJson)
        }
      })()
    }, FALLBACK_RECHECK_DELAY_MS)

    return () => {
      clearFallbackTimer()
      teardownRealtimeChannel()
    }
  }, [runId, company.id, clearFallbackTimer, teardownRealtimeChannel, handleTerminalResult])

  async function triggerScan(setup: AccountScanSetupValues) {
    lastSetupRef.current = setup
    setErrorMessage(null)
    setScanOutput(null)
    setProposalRows([])
    setSelectedIds(new Set())
    setBilanByProposalId(new Map())
    setPhase("queued") // feedback immédiat, avant même la réponse HTTP (§5)

    try {
      const knownCompany = {
        name: company.name,
        legalName: company.legalName,
        website: company.website,
        siren: company.siren,
        nafCode: company.nafCode,
        sectorId: company.sectorId,
      }
      const input = buildAccountScanInput(setup, knownCompany)

      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-010-refresh",
          entityType: "company",
          entityId: company.id,
          companyId: company.id,
          input,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = (await res.json()) as { runId: string }
      setRunId(newRunId)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur inattendue lors du déclenchement")
      setPhase("error")
    }
  }

  function handleLaunch(setup: AccountScanSetupValues) {
    void triggerScan(setup)
  }

  function handleSelectSiren(siren: string) {
    void triggerScan({ ...lastSetupRef.current, selectedSiren: siren })
  }

  function handleBackToSetup() {
    setErrorMessage(null)
    setPhase("setup")
  }

  function handleApplySelected() {
    if (!runId) return
    void applyProposalIds(runId, Array.from(selectedIds))
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleToggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id))
      return allSelected ? new Set() : new Set(ids)
    })
  }

  let body: ReactNode
  if (phase === "loading") {
    body = <AccountScanStatus kind="running" message="Chargement…" isMobile={isMobile} />
  } else if (phase === "setup") {
    body = <AccountScanSetup company={company} isMobile={isMobile} launching={false} onLaunch={handleLaunch} />
  } else if (phase === "queued" || phase === "running") {
    body = <AccountScanStatus kind={phase} isMobile={isMobile} />
  } else if (phase === "ambiguous") {
    body = (
      <AccountScanResolutionPicker
        candidates={candidates}
        isMobile={isMobile}
        relaunching={false}
        onSelect={handleSelectSiren}
        onCancel={handleBackToSetup}
      />
    )
  } else if (phase === "not_found") {
    body = <AccountScanStatus kind="not_found" isMobile={isMobile} onRetry={handleBackToSetup} />
  } else if (phase === "error") {
    body = <AccountScanStatus kind="error" message={errorMessage} isMobile={isMobile} onRetry={handleBackToSetup} />
  } else if (scanOutput) {
    body = isMobile ? (
      <AccountScanMobileResults
        output={scanOutput}
        proposalRows={proposalRows}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onApplySelected={handleApplySelected}
        applying={applying}
        bilanByProposalId={bilanByProposalId}
      />
    ) : (
      <AccountScanDesktopResults
        output={scanOutput}
        proposalRows={proposalRows}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onApplySelected={handleApplySelected}
        applying={applying}
        bilanByProposalId={bilanByProposalId}
      />
    )
  } else {
    body = <AccountScanStatus kind="error" message="Résultat introuvable." isMobile={isMobile} onRetry={handleBackToSetup} />
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Scan rapide"
      className={phase === "review" && !isMobile ? "max-w-4xl" : "max-w-lg"}
      bodyClassName={phase === "review" ? "text-xs" : undefined}
    >
      {body}
    </AppDialog>
  )
}
