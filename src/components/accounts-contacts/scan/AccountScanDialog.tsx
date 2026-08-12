"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { createClient } from "@/lib/supabase/client"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import type { AccountScanOutput, AccountScanResolutionCandidate } from "@/lib/n8n/types"
import { cn } from "@/lib/utils"
import { AccountScanSetup, type AccountScanSetupCompany } from "./AccountScanSetup"
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
  isAutoApplyEligible,
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


function StepIndicator({
  phase,
  companyName,
  isMobile,
  onInformation,
  onContacts,
}: {
  phase: Phase
  companyName: string
  isMobile: boolean
  onInformation: () => void
  onContacts: () => void
}) {
  const active = phase.startsWith("contacts") ? "contacts" : "information"

  return (
    <div className={cn("flex w-full min-w-0", isMobile ? "flex-col gap-3" : "flex-row items-center justify-between gap-4 pr-8")}>
      {/* Left: Badge & Company Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0 rounded-md bg-edito-brass px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-edito-ink shadow-sm">
          SCAN RAPIDE
        </span>
        <h2 className={cn("truncate text-sm font-extrabold tracking-wide text-white", isMobile ? "max-w-[calc(100vw-9.5rem)]" : "max-w-[180px] sm:max-w-[280px]")}>
          {companyName}
        </h2>
      </div>

      {/* Right: Distinctive Mode Switcher Pill Container */}
      <div className={cn("flex items-center rounded-full bg-heading/70 p-1 border border-white/10 shadow-inner backdrop-blur-md", isMobile ? "w-full" : "shrink-0")}>
        <button
          type="button"
          onClick={onInformation}
          aria-pressed={active === "information"}
          className={cn(
            "relative flex min-h-9 items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 ease-out select-none",
            isMobile && "flex-1",
            active === "information"
              ? "bg-edito-brass text-edito-ink shadow-md font-extrabold scale-[1.02]"
              : "text-slate-300 hover:text-white hover:bg-white/10 font-semibold"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons_set/scan_infos_drawer.png"
            alt=""
            width={14}
            height={14}
            className={cn("h-3.5 w-3.5 object-contain transition-all", active === "information" ? "brightness-0" : "brightness-200 opacity-80")}
          />
          Informations
        </button>

        <button
          type="button"
          onClick={onContacts}
          aria-pressed={active === "contacts"}
          className={cn(
            "relative flex min-h-9 items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 ease-out select-none",
            isMobile && "flex-1",
            active === "contacts"
              ? "bg-edito-brass text-edito-ink shadow-md font-extrabold scale-[1.02]"
              : "text-slate-300 hover:text-white hover:bg-white/10 font-semibold"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons_set/AI_scan_contact.png"
            alt=""
            width={14}
            height={14}
            className={cn("h-3.5 w-3.5 object-contain transition-all", active === "contacts" ? "brightness-0" : "brightness-200 opacity-80")}
          />
          Contacts
        </button>
      </div>
    </div>
  )
}

function InformationActions({
  isMobile,
  onContacts,
  onNewScan,
  onClose,
}: {
  isMobile: boolean
  onContacts: () => void
  onNewScan: () => void
  onClose: () => void
}) {
  return (
    <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onNewScan}
        className={cn("rounded border border-border bg-surface px-3 text-xs font-bold text-body hover:bg-canvas/40", isMobile ? "min-h-[44px]" : "min-h-[36px]")}
      >
        Nouveau scan des informations
      </button>
      <button
        type="button"
        onClick={onClose}
        className={cn("rounded border border-border bg-surface px-3 text-xs font-bold text-body hover:bg-canvas/40", isMobile ? "min-h-[44px]" : "min-h-[36px]")}
      >
        Fermer
      </button>
      <button
        type="button"
        onClick={onContacts}
        className={cn("rounded border border-primary bg-primary px-3 text-xs font-bold text-primary-fg hover:bg-primary/90", isMobile ? "min-h-[44px]" : "min-h-[36px]")}
      >
        Rechercher des contacts
      </button>
    </div>
  )
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

  const lastSetupRef = useRef<AccountScanSetupValues>({
    informationMode: "find",
    requestedFields: ["legal_name", "siren", "naf_code", "hq_location", "employee_count", "website", "description"],
    requestedFacts: ["business_model", "primary_activity", "technology", "competitor", "partner", "market", "strategic_priority", "transformation_program", "establishment_count", "growth_trend", "geographic_reach", "value_proposition", "differentiators", "market_position", "marketing_position", "target_customers"],
    requestClassification: true,
    customSources: [],
    websiteHint: company.website,
    locationHint: company.hqLocation,
  })
  const autoAppliedRunIdRef = useRef<string | null>(null)
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
    body = <AccountScanSetup company={company} isMobile={isMobile} launching={false} onLaunch={prepareInformationScan} />
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
        <InformationActions
          isMobile={isMobile}
          onContacts={handleGoToContactsSetup}
          onNewScan={handleBackToInformationSetup}
          onClose={() => onOpenChange(false)}
        />
        <button
          type="button"
          onClick={handleBackToInformationSetup}
          className="mt-2 text-[11px] font-semibold text-muted hover:text-heading"
        >
          Retour au choix du scan
        </button>
      </>
    )
  } else {
    body = <AccountScanStatus kind="error" message="Résultat introuvable." isMobile={isMobile} onRetry={handleBackToInformationSetup} />
  }

  const wide = phase === "information_review" || phase === "contacts_review"

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <StepIndicator
          phase={phase}
          companyName={company.name}
          isMobile={isMobile}
          onInformation={handleGoToInformationReview}
          onContacts={handleGoToContactsSetup}
        />
      }
      className={cn(
        wide && !isMobile ? "sm:!max-w-[1380px] sm:!w-[94vw]" : "sm:!max-w-4xl sm:!w-[88vw]",
        "border border-edito-border bg-edito-canvas shadow-2xl transition-all duration-300",
        isMobile
          ? "!inset-0 !m-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !rounded-none !border-0"
          : "w-full rounded-2xl",
      )}
      fillHeight={true}
      maxHeightClassName={isMobile ? "max-h-[100dvh]" : undefined}
      dataTheme="edito"
      headerClassName={cn(
        "-mx-4 -mt-4 shrink-0 border-b-0 bg-edito-navy px-4 text-white sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4",
        isMobile
          ? "rounded-none pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]"
          : "rounded-t-[var(--radius-medium)] py-3.5",
      )}
      closeButtonClassName={isMobile ? "-mr-2 -mt-1 h-11 w-11 self-start rounded-full text-white/75 hover:bg-white/10 hover:text-white" : undefined}
      bodyClassName={cn(
        wide ? "text-xs" : undefined,
        "min-h-0 flex-1 overflow-y-auto bg-edito-canvas p-4 sm:p-5",
        !isMobile && "max-h-[82vh]",
      )}
    >
      {body}
    </AppDialog>
  )
}
