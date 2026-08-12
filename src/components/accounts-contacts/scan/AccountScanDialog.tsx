"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { createClient } from "@/lib/supabase/client"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import type { AccountScanOutput, AccountScanResolutionCandidate } from "@/lib/n8n/types"
import { cn } from "@/lib/utils"
import { AccountScanSetup, type AccountScanSetupCompany, type AccountScanSetupSummary } from "./AccountScanSetup"
import { AccountScanConsoleChrome } from "./AccountScanConsoleChrome"
import { AccountScanContactsSetup } from "./AccountScanContactsSetup"
import { AccountScanResolutionPicker } from "./AccountScanResolutionPicker"
import { AccountScanClassificationPanel } from "./AccountScanClassificationPanel"
import { AccountScanIdentityConfirm } from "./AccountScanIdentityConfirm"
import { applyAccountClassification } from "@/features/account-lifecycle/actions/apply-account-classification"
import type {
  ClassificationAxis,
  CurrentClassificationState,
} from "@/features/account-lifecycle/domain/account-classification"
import { AccountScanStatus } from "./AccountScanStatus"
import { AccountScanDesktopResults } from "./AccountScanDesktopResults"
import { AccountScanMobileResults } from "./AccountScanMobileResults"
import { AccountScanContactsDesktopResults } from "./AccountScanContactsDesktopResults"
import { AccountScanContactsMobileResults } from "./AccountScanContactsMobileResults"
import {
  applyAccountScanProposals,
  getLatestAccountScanRun,
  importAccountScanContacts,
  type ImportAccountScanContactsResult,
} from "./account-scan-actions"
import {
  type AccountScanBilanCategory,
  type AccountScanContactsSetupValues,
  type AccountScanProposalRow,
  type AccountScanSetupValues,
  bilanCategoryFromOperation,
  buildAccountScanContactsInput,
  buildAccountScanInput,
  candidateCanBeSelected,
  candidateShouldBeDefaultSelected,
  mergeProposalRows,
} from "./account-scan-utils"

type Phase =
  | "loading"
  | "information_setup"
  | "identity_confirm"
  | "information_queued"
  | "information_running"
  | "information_ambiguous"
  | "information_review"
  | "contacts_setup"
  | "contacts_queued"
  | "contacts_running"
  | "contacts_review"
  | "not_found"
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
  onOpenContact?: (contactId: string) => void
}


export function AccountScanDialog({
  open,
  onOpenChange,
  company,
  isMobile,
  onApplied,
  onOpenContact,
}: AccountScanDialogProps) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [runId, setRunId] = useState<string | null>(null)
  const [informationRunId, setInformationRunId] = useState<string | null>(null)
  const [informationOutput, setInformationOutput] = useState<AccountScanOutput | null>(null)
  const [contactsOutput, setContactsOutput] = useState<AccountScanOutput | null>(null)
  const [contactsResultId, setContactsResultId] = useState<string | null>(null)
  // ADR-0019 Lot 4 — la classification s'applique depuis l'id du RÉSULTAT (la
  // RPC y relit le contenu), là où les propositions s'appliquent depuis le run.
  const [informationResultId, setInformationResultId] = useState<string | null>(null)
  const [classificationApplying, setClassificationApplying] = useState(false)
  const [classificationApplied, setClassificationApplied] = useState<ClassificationAxis[]>([])
  const [classificationSkipped, setClassificationSkipped] = useState<{ axis: string; reason: string }[]>([])
  const [classificationError, setClassificationError] = useState<string | null>(null)
  // §10 contrôle 3 — l'axe normatif doit être renseigné À L'ARRIVÉE. Sans cet
  // état, l'UI traiterait un compte déjà classé comme un compte neuf et
  // interdirait d'écarter un axe que la base accepterait. Chargé ici plutôt que
  // remonté aux deux appelants : ni `IdentityData` ni `ClientIntelligenceData`
  // ne portent ces colonnes, et les élargir pour un panneau optionnel coûterait
  // plus que cette requête de 4 colonnes.
  const [currentClassification, setCurrentClassification] = useState<CurrentClassificationState>({
    segmentId: null,
    regimeAchat: null,
    modeleEco: null,
    relationType: null,
  })
  const [candidates, setCandidates] = useState<AccountScanResolutionCandidate[]>([])
  const [proposalRows, setProposalRows] = useState<AccountScanProposalRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedContactKeys, setSelectedContactKeys] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [importingContacts, setImportingContacts] = useState(false)
  const [importResult, setImportResult] = useState<ImportAccountScanContactsResult | null>(null)
  const [bilanByProposalId, setBilanByProposalId] = useState<Map<string, AccountScanBilanCategory>>(new Map())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [setupSummary, setSetupSummary] = useState<AccountScanSetupSummary>({ elementCount: 24, sourceCount: 4, mode: "find" })

  const lastSetupRef = useRef<AccountScanSetupValues>({
    informationMode: "find",
    requestedFields: ["legal_name", "siren", "naf_code", "hq_location", "employee_count", "website", "description"],
    requestedFacts: ["business_model", "primary_activity", "technology", "competitor", "partner", "market", "strategic_priority", "transformation_program", "establishment_count", "growth_trend", "geographic_reach", "value_proposition", "differentiators", "market_position", "marketing_position", "target_customers"],
    requestClassification: true,
    customSources: [],
    websiteHint: company.website,
    locationHint: company.hqLocation,
  })
  const hydratedOnceRef = useRef(false)
  const phaseRef = useRef<Phase>("loading")

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Rechargé à chaque ouverture : une classification appliquée entre deux
  // ouvertures rendrait l'état obsolète, et le panneau réclamerait un axe que
  // la fiche porte déjà.
  useEffect(() => {
    if (!open || !company.id) return
    let cancelled = false

    void (async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("companies")
        .select("segment_id, regime_achat, modele_eco, relation_type")
        .eq("id", company.id)
        .maybeSingle()

      if (cancelled || !data) return
      setCurrentClassification({
        segmentId: data.segment_id ?? null,
        regimeAchat: data.regime_achat ?? null,
        modeleEco: data.modele_eco ?? null,
        relationType: data.relation_type ?? null,
      })
    })()

    return () => { cancelled = true }
  }, [open, company.id])

  const knownCompany = {
    name: company.name,
    legalName: company.legalName,
    website: company.website,
    siren: informationOutput?.resolution.siren ?? company.siren,
    nafCode: company.nafCode,
    sectorId: company.sectorId,
  }

  /**
   * Les 38 segments du référentiel, transmis au workflow (ADR-0019 Lot 4).
   * Sans cette liste le LLM inventerait un slug, ce que le §9 interdit — et la
   * RPC le rejetterait de toute façon (`unknown_segment`). En cas d'échec de
   * lecture, on renvoie `undefined` : le scan tourne alors sans classification
   * plutôt que d'en produire une non vérifiable.
   */
  const loadClassificationReferential = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sector_intelligence")
      .select("slug, name, parent:parent_id(slug)")
      .eq("level", "segment")

    if (error || !data) return undefined

    const segments = data.flatMap((row) => {
      const parent = row.parent as { slug: string } | { slug: string }[] | null
      const macroSlug = Array.isArray(parent) ? parent[0]?.slug : parent?.slug
      // Un segment sans macro parent ne satisfait pas le contrôle 2 : l'exposer
      // reviendrait à proposer une cible que la RPC refusera.
      return macroSlug ? [{ slug: row.slug, name: row.name, macroSlug }] : []
    })

    return segments.length > 0 ? { segments } : undefined
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
    setPhase("information_review")
  }, [company.id])

  const handleTerminalResult = useCallback((
    targetRunId: string,
    runPhase: "information" | "contacts",
    resultStatus: string | null,
    resultId: string | null,
    contentJson: Record<string, unknown> | null,
  ) => {
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

    if (runPhase === "contacts") {
      setContactsOutput(output)
      setContactsResultId(resultId)
      setSelectedContactKeys(new Set(output.contactCandidates.filter(candidateShouldBeDefaultSelected).map((candidate) => candidate.candidateKey)))
      setImportResult(null)
      setPhase("contacts_review")
      return
    }

    setInformationRunId(targetRunId)
    setInformationResultId(resultId)
    setInformationOutput(output)

    if (output.resolution.status === "ambiguous") {
      setCandidates(output.resolution.candidates)
      setPhase("information_ambiguous")
      return
    }

    if (output.resolution.status === "not_found") {
      setPhase("not_found")
      return
    }

    void loadProposalRows(targetRunId, output)
  }, [loadProposalRows])

  const hydrateFromLatestRun = useCallback(async () => {
    const latest = await getLatestAccountScanRun(company.id)

    if (!latest) {
      setPhase("information_setup")
      return
    }

    setRunId(latest.runId)

    if (latest.status === "queued" || latest.status === "running") {
      setPhase(`${latest.runPhase}_${latest.status}` as Phase)
      return
    }

    if (latest.status === "failed" || latest.status === "cancelled") {
      setErrorMessage(latest.errorMessage)
      setPhase("error")
      return
    }

    handleTerminalResult(latest.runId, latest.runPhase, latest.resultStatus, latest.resultId, latest.contentJson)
  }, [company.id, handleTerminalResult])

  useEffect(() => {
    if (!open) return
    if (
      hydratedOnceRef.current &&
      phase !== "information_queued" &&
      phase !== "information_running" &&
      phase !== "contacts_queued" &&
      phase !== "contacts_running"
    ) return
    hydratedOnceRef.current = true
    void hydrateFromLatestRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company.id])

  // Suivi unifié (src/lib/n8n/use-run-tracker) : Realtime en accélérateur,
  // relance périodique en garantie. Remplace l'abonnement local ET le repli
  // ponctuel à 20 s, qui n'était qu'un pansement sur un Realtime peu fiable.
  const trackedPhase = phase === "information_queued" || phase === "information_running"
    ? "information"
    : phase === "contacts_queued" || phase === "contacts_running"
      ? "contacts"
      : null

  useRunTracker<Record<string, unknown>>({
    runId: trackedPhase ? runId : null,
    resultType: "account_scan",
    onSucceeded: (result) => {
      const runPhase = phaseRef.current.startsWith("contacts") ? "contacts" : "information"
      if (!runId) return
      handleTerminalResult(runId, runPhase, result?.status ?? null, result?.id ?? null, result?.contentJson ?? null)
    },
    onFailed: (message) => {
      setErrorMessage(message)
      setPhase("error")
    },
    onTimeout: () => {
      setErrorMessage("Le scan dépasse le délai habituel. Il continue côté serveur : rouvre cette fenêtre dans quelques minutes.")
      setPhase("error")
    },
    // Transition « en file » → « en cours », lisible par l'utilisateur.
    onRunning: () => {
      setPhase((current) =>
        current === "information_queued"
          ? "information_running"
          : current === "contacts_queued"
            ? "contacts_running"
            : current,
      )
    },
  })

  function prepareInformationScan(setup: AccountScanSetupValues) {
    lastSetupRef.current = setup
    setErrorMessage(null)
    void triggerInformationScan(setup)
  }

  async function triggerInformationScan(setup: AccountScanSetupValues, confirmedSiren?: string) {
    lastSetupRef.current = setup
    setErrorMessage(null)
    setInformationOutput(null)
    setProposalRows([])
    setSelectedIds(new Set())
    setBilanByProposalId(new Map())
    // Le runId précédent est effacé AVANT le déclenchement : sans cela, le
    // suivi repartirait sur l'ancien run (restauré à l'ouverture) pendant tout
    // le temps de l'appel, et pourrait aboutir sur son résultat périmé.
    setRunId(null)
    setPhase("information_queued")

    try {
      const input = buildAccountScanInput(setup, knownCompany, await loadClassificationReferential())
      
      const finalInput = confirmedSiren !== undefined 
        ? { ...input, selectedSiren: confirmedSiren, identityConfirmed: true } 
        : input

      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-010-refresh",
          entityType: "company",
          entityId: company.id,
          companyId: company.id,
          input: finalInput,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = (await res.json()) as { runId: string }
      setRunId(newRunId)
      setInformationRunId(newRunId)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur inattendue lors du déclenchement")
      setPhase("error")
    }
  }

  async function triggerContactsScan(setup: AccountScanContactsSetupValues) {
    if (phase === "contacts_queued" || phase === "contacts_running") return
    setErrorMessage(null)
    setContactsOutput(null)
    setContactsResultId(null)
    setSelectedContactKeys(new Set())
    setImportResult(null)
    // Le runId précédent est effacé AVANT le déclenchement : sans cela, le
    // suivi repartirait sur l'ancien run (restauré à l'ouverture) pendant tout
    // le temps de l'appel, et pourrait aboutir sur son résultat périmé.
    setRunId(null)
    setPhase("contacts_queued")

    try {
      const input = buildAccountScanContactsInput(setup, knownCompany, {
        selectedSiren: informationOutput?.resolution.siren ?? company.siren,
        websiteHint: company.website,
        locationHint: company.hqLocation,
      })
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

  function handleBackToInformationSetup() {
    setErrorMessage(null)
    setPhase("information_setup")
  }

  function handleGoToContactsSetup() {
    setErrorMessage(null)
    setPhase("contacts_setup")
  }

  function handleGoToInformationReview() {
    setErrorMessage(null)
    if (informationOutput) {
      setPhase("information_review")
    } else {
      setPhase("information_setup")
    }
  }

  async function handleCancelRun() {
    if (!runId) return
    try {
      const res = await fetch("/api/n8n/cancel-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!res.ok) {
        throw new Error("Erreur lors de l'annulation")
      }
      setErrorMessage("Annulé par l'utilisateur")
      setPhase("error")
    } catch (err) {
      console.error(err)
    }
  }

  async function handleApplyClassification(axes: ClassificationAxis[]) {
    if (!informationResultId) return
    setClassificationApplying(true)
    setClassificationError(null)

    const result = await applyAccountClassification({
      resultId: informationResultId,
      companyId: company.id,
      acceptedAxes: axes,
    })

    setClassificationApplying(false)

    if (result.error) {
      setClassificationError(result.error)
      return
    }

    setClassificationApplied(result.appliedAxes)
    setClassificationSkipped(result.skippedAxes)
    onApplied()
  }

  function handleApplySelected() {
    if (!informationRunId) return
    void applyProposalIds(informationRunId, Array.from(selectedIds))
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

  function handleToggleContactKey(candidateKey: string) {
    const candidate = contactsOutput?.contactCandidates.find((item) => item.candidateKey === candidateKey)
    if (candidate && !candidateCanBeSelected(candidate)) return
    setSelectedContactKeys((prev) => {
      const next = new Set(prev)
      if (next.has(candidateKey)) next.delete(candidateKey)
      else next.add(candidateKey)
      return next
    })
  }

  function handleToggleAllContactKeys(candidateKeys: string[]) {
    setSelectedContactKeys((prev) => {
      const allSelected = candidateKeys.length > 0 && candidateKeys.every((key) => prev.has(key))
      return allSelected ? new Set() : new Set(candidateKeys)
    })
  }

  async function handleImportContacts() {
    if (!contactsResultId || selectedContactKeys.size === 0) return
    setImportingContacts(true)
    const result = await importAccountScanContacts({
      resultId: contactsResultId,
      companyId: company.id,
      candidateKeys: Array.from(selectedContactKeys),
      allowExistingUpdates: false,
    })
    setImportingContacts(false)
    setImportResult(result)
    if (!result.error) {
      setSelectedContactKeys(new Set())
      onApplied()
    }
  }

  function handleSelectSiren(siren: string) {
    void triggerInformationScan({ ...lastSetupRef.current, selectedSiren: siren }, siren)
  }

  let body: ReactNode
  if (phase === "loading") {
    body = <AccountScanStatus kind="running" message="Chargement…" isMobile={isMobile} />
  } else if (phase === "information_setup") {
    body = <AccountScanSetup company={company} isMobile={isMobile} launching={false} onLaunch={prepareInformationScan} onSummaryChange={setSetupSummary} />
  } else if (phase === "identity_confirm") {
    body = (
      <AccountScanIdentityConfirm
        companyId={company.id}
        selectedSirenHint={lastSetupRef.current.selectedSiren || company.siren}
        isMobile={isMobile}
        onConfirm={(siren) => void triggerInformationScan(lastSetupRef.current, siren)}
        onCancel={handleBackToInformationSetup}
      />
    )
  } else if (phase === "contacts_setup") {
    body = (
      <AccountScanContactsSetup
        companyName={company.name}
        isMobile={isMobile}
        launching={false}
        onLaunch={(setup) => {
          void triggerContactsScan(setup)
        }}
        onBackToInformation={handleGoToInformationReview}
      />
    )
  } else if (phase === "information_queued" || phase === "information_running") {
    body = <AccountScanStatus kind={phase === "information_queued" ? "queued" : "running"} isMobile={isMobile} onCancel={() => void handleCancelRun()} />
  } else if (phase === "contacts_queued" || phase === "contacts_running") {
    body = <AccountScanStatus kind={phase === "contacts_queued" ? "queued" : "running"} message="Recherche et vérification des contacts publics en cours…" isMobile={isMobile} onCancel={() => void handleCancelRun()} />
  } else if (phase === "information_ambiguous") {
    body = (
      <AccountScanResolutionPicker
        candidates={candidates}
        isMobile={isMobile}
        relaunching={false}
        onSelect={handleSelectSiren}
        onCancel={handleBackToInformationSetup}
      />
    )
  } else if (phase === "not_found") {
    body = <AccountScanStatus kind="not_found" isMobile={isMobile} onRetry={handleBackToInformationSetup} />
  } else if (phase === "error") {
    body = <AccountScanStatus kind="error" message={errorMessage} isMobile={isMobile} onRetry={handleBackToInformationSetup} />
  } else if (phase === "contacts_review" && contactsOutput) {
    body = isMobile ? (
      <AccountScanContactsMobileResults
        output={contactsOutput}
        selectedKeys={selectedContactKeys}
        importing={importingContacts}
        importResult={importResult}
        onToggleSelect={handleToggleContactKey}
        onImportSelected={() => void handleImportContacts()}
        onBackToInformation={handleGoToInformationReview}
        onRelaunchContacts={handleGoToContactsSetup}
        onClose={() => onOpenChange(false)}
      />
    ) : (
      <AccountScanContactsDesktopResults
        output={contactsOutput}
        resultId={contactsResultId}
        selectedKeys={selectedContactKeys}
        importing={importingContacts}
        importResult={importResult}
        onToggleSelect={handleToggleContactKey}
        onToggleSelectAll={handleToggleAllContactKeys}
        onImportSelected={() => void handleImportContacts()}
        onBackToInformation={handleGoToInformationReview}
        onRelaunchContacts={handleGoToContactsSetup}
        onClose={() => onOpenChange(false)}
        onOpenContact={onOpenContact}
      />
    )
  } else if (informationOutput) {
    const results = isMobile ? (
      <AccountScanMobileResults
        output={informationOutput}
        proposalRows={proposalRows}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onApplySelected={handleApplySelected}
        applying={applying}
        bilanByProposalId={bilanByProposalId}
        onNewScan={handleBackToInformationSetup}
        onContacts={handleGoToContactsSetup}
      />
    ) : (
      <AccountScanDesktopResults
        output={informationOutput}
        proposalRows={proposalRows}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onApplySelected={handleApplySelected}
        applying={applying}
        bilanByProposalId={bilanByProposalId}
        onNewScan={handleBackToInformationSetup}
        onContacts={handleGoToContactsSetup}
        setupMode={setupSummary.mode}
      />
    )
    body = (
      <>
        {results}
        {/* ADR-0019 Lot 4 — absent des résultats produits avant ce lot : le bloc
            n'apparaît que si le workflow a été relancé avec requestClassification. */}
        {informationOutput.classification && informationResultId ? (
          <div className="mt-5 border-t border-border pt-5">
            <AccountScanClassificationPanel
              classification={informationOutput.classification}
              current={currentClassification}
              applying={classificationApplying}
              appliedAxes={classificationApplied}
              skippedAxes={classificationSkipped}
              errorMessage={classificationError}
              onApply={(axes) => void handleApplyClassification(axes)}
            />
          </div>
        ) : null}
      </>
    )
  } else {
    body = <AccountScanStatus kind="error" message="Résultat introuvable." isMobile={isMobile} onRetry={handleBackToInformationSetup} />
  }

  const stage = phase === "information_review" || phase === "contacts_review"
    ? "decide"
    : phase.endsWith("queued") || phase.endsWith("running")
      ? "scan"
      : "scope"
  const mode = phase.startsWith("contacts") ? "contacts" : "information"

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<div className="flex items-center"><span className="text-sm font-black">{company.name.toUpperCase()} - Scan rapide</span></div>}
      className={cn(
        "border border-edito-border bg-edito-canvas transition-all duration-300",
        isMobile
          ? "!inset-0 !m-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !rounded-none !border-0"
          : "w-full rounded-xl sm:!h-[min(82vh,760px)] sm:!w-[90vw] sm:!max-w-[1200px]",
      )}
      fillHeight={true}
      maxHeightClassName={isMobile ? "max-h-[100dvh]" : undefined}
      dataTheme="edito"
      headerClassName={cn(
        "-mx-4 -mt-4 shrink-0 border-b border-edito-border bg-white px-4 text-edito-navy sm:-mx-6 sm:-mt-6 sm:px-6",
        isMobile
          ? "rounded-none border-b-edito-brass/70 bg-edito-navy pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
          : "rounded-t-xl py-2.5",
      )}
      closeButtonClassName={isMobile ? "-mr-2 h-11 w-11 rounded-full text-white/75 hover:bg-white/10 hover:text-white" : "size-10 rounded-md text-edito-muted hover:bg-edito-chip hover:text-edito-navy"}
      bodyClassName={cn(
        "-mx-4 -mb-4 -mt-4 min-h-0 flex-1 overflow-hidden bg-edito-canvas sm:-mx-6 sm:-mb-6 sm:-mt-4",
      )}
    >
      <AccountScanConsoleChrome
        company={company}
        isMobile={isMobile}
        stage={stage}
        mode={mode}
        setupSummary={setupSummary}
        proposalCount={proposalRows.length}
        resultSourceCount={informationOutput?.sources.length ?? contactsOutput?.sources.length ?? 0}
        onNewScan={handleBackToInformationSetup}
        onContacts={handleGoToContactsSetup}
      >
        <div key={phase} className={cn("h-full min-h-0", !isMobile && "overflow-y-auto")}>{body}</div>
      </AccountScanConsoleChrome>
    </AppDialog>
  )
}
