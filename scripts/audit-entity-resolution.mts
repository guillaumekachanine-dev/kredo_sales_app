// ─── Audit du stock d'identités légales ─────────────────────────────────────
//
// Rejoue `src/lib/intelligence/entity-resolution.ts` sur les données réelles :
//   1. les comptes qui portent déjà un SIREN — le module contrôle sa cohérence ;
//   2. les comptes qui portent une proposition d'enrichissement d'identité en
//      attente — le module dit s'il aurait produit la même entité.
//
// Lecture seule. Aucune écriture, aucune décision automatique : le script rend un
// verdict par compte, à instruire ensuite.
//
//   npx tsx --env-file=.env.local scripts/audit-entity-resolution.mts
//   npx tsx --env-file=.env.local scripts/audit-entity-resolution.mts --json rapport.json
//
// Motif : run `intel-030` du 2026-09-04 sur « Tournaire » — étude et propositions
// d'enrichissement construites sur le SIREN d'une entreprise de BTP lyonnaise.

import { writeFileSync } from "node:fs"

import { createClient } from "@supabase/supabase-js"

import {
  REGISTRY_SEARCH_PER_PAGE,
  buildRegistrySearchQueries,
  normalizeRegistryResult,
  normalizeSiren,
  resolveEntity,
  verifyKnownSiren,
  type AccountIdentityInput,
  type RegistryCandidate,
} from "../src/lib/intelligence/entity-resolution"

const REGISTRY_ENDPOINT = "https://recherche-entreprises.api.gouv.fr/search"
/** L'API publique tolère mal les rafales : une requête à la fois, espacées. */
const REQUEST_SPACING_MS = 250

const IDENTITY_ATTRIBUTES = new Set([
  "siren",
  "naf_code",
  "legal_name",
  "hq_location",
  "employee_count",
  "description",
])

type PendingProposal = {
  id: string
  attribute_name: string
  proposed_value: string | null
  confidence_score: number | null
  run_id: string | null
}

type AuditedAccount = AccountIdentityInput & {
  companyId: string
  displayName: string
  pendingProposals: PendingProposal[]
}

type Verdict =
  | "siren_coherent"
  | "siren_suspect"
  | "proposition_confirmee"
  | "proposition_a_rejeter"
  | "proposition_a_arbitrer"
  | "sans_objet"

type AccountReport = {
  companyId: string
  name: string
  verdict: Verdict
  detail: string
  resolvedSiren: string | null
  proposedSiren: string | null
  signals: { key: string; value: number; detail: string }[]
  proposalIdsToReject: string[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function searchRegistry(query: string): Promise<RegistryCandidate[]> {
  const url = `${REGISTRY_ENDPOINT}?q=${encodeURIComponent(query)}&per_page=${REGISTRY_SEARCH_PER_PAGE}&page=1`
  const response = await fetch(url, { headers: { accept: "application/json" } })
  if (!response.ok) {
    process.stderr.write(`  ⚠ registre ${response.status} sur « ${query} »\n`)
    return []
  }
  const body = (await response.json()) as { results?: unknown[] }
  return (body.results ?? [])
    .map((raw) => normalizeRegistryResult(raw as Record<string, unknown>))
    .filter((c): c is RegistryCandidate => c !== null)
}

async function collectCandidates(account: AuditedAccount): Promise<RegistryCandidate[]> {
  const bySiren = new Map<string, RegistryCandidate>()
  const queries = account.knownSiren
    ? [account.knownSiren]
    : buildRegistrySearchQueries(account).slice(0, 3)

  for (const query of queries) {
    for (const candidate of await searchRegistry(query)) {
      if (!bySiren.has(candidate.siren)) bySiren.set(candidate.siren, candidate)
    }
    await sleep(REQUEST_SPACING_MS)
  }
  return [...bySiren.values()]
}

function auditAccount(account: AuditedAccount, candidates: RegistryCandidate[]): AccountReport {
  const base = {
    companyId: account.companyId,
    name: account.displayName,
    proposedSiren: null as string | null,
    proposalIdsToReject: [] as string[],
  }

  // ── Cas 1 : le compte porte déjà un SIREN. On le contrôle, on ne le remplace pas.
  if (account.knownSiren) {
    const exact = candidates.find((c) => normalizeSiren(c.siren) === normalizeSiren(account.knownSiren))
    if (!exact) {
      return {
        ...base,
        verdict: "siren_suspect",
        detail: `SIREN ${account.knownSiren} introuvable au registre public.`,
        resolvedSiren: account.knownSiren,
        signals: [],
      }
    }
    const report = verifyKnownSiren(account, exact)
    return {
      ...base,
      verdict: report.coherent ? "siren_coherent" : "siren_suspect",
      detail: report.coherent
        ? `${exact.legalName} — ${exact.hqCommune ?? "?"} — NAF ${exact.nafCode ?? "?"}`
        : report.signals
            .filter((s) => s.value < 0)
            .map((s) => s.detail)
            .join(" · ") || `Nom trop éloigné (${report.nameScore.toFixed(2)}).`,
      resolvedSiren: exact.siren,
      signals: report.signals.map((s) => ({ key: s.key, value: s.value, detail: s.detail })),
    }
  }

  // ── Cas 2 : pas de SIREN en base, mais une proposition en attente.
  const sirenProposal = account.pendingProposals.find((p) => p.attribute_name === "siren")
  if (!sirenProposal) {
    return {
      ...base,
      verdict: "sans_objet",
      detail: "Ni SIREN enregistré ni proposition d'identité en attente.",
      resolvedSiren: null,
      signals: [],
    }
  }

  const proposedSiren = normalizeSiren(sirenProposal.proposed_value)
  const resolution = resolveEntity(account, candidates)
  const identityProposalIds = account.pendingProposals
    .filter((p) => IDENTITY_ATTRIBUTES.has(p.attribute_name))
    .map((p) => p.id)

  const signals = resolution.signals.map((s) => ({ key: s.key, value: s.value, detail: s.detail }))

  if (resolution.decision === "resolved" && resolution.chosen?.siren === proposedSiren) {
    return {
      ...base,
      proposedSiren,
      verdict: "proposition_confirmee",
      detail: `Le module retient le même SIREN (score ${resolution.score}).`,
      resolvedSiren: resolution.chosen.siren,
      signals,
    }
  }

  if (resolution.decision === "resolved" && resolution.chosen?.siren !== proposedSiren) {
    return {
      ...base,
      proposedSiren,
      verdict: "proposition_a_rejeter",
      detail: `Entité proposée ${proposedSiren} ≠ entité résolue ${resolution.chosen?.siren} (${resolution.chosen?.legalName}, ${resolution.chosen?.hqCommune}).`,
      resolvedSiren: resolution.chosen?.siren ?? null,
      signals,
      proposalIdsToReject: identityProposalIds,
    }
  }

  if (resolution.decision === "unresolved") {
    return {
      ...base,
      proposedSiren,
      verdict: "proposition_a_rejeter",
      detail: `Aucune entité résoluble — ${resolution.reasons.join(" ")}`,
      resolvedSiren: null,
      signals,
      proposalIdsToReject: identityProposalIds,
    }
  }

  return {
    ...base,
    proposedSiren,
    verdict: "proposition_a_arbitrer",
    detail: `${resolution.chosen?.siren ?? "?"} plausible mais non concluant — ${resolution.reasons.join(" ")}`,
    resolvedSiren: resolution.chosen?.siren ?? null,
    signals,
    proposalIdsToReject: identityProposalIds,
  }
}

async function loadAccounts(): Promise<AuditedAccount[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis — lancer avec --env-file=.env.local",
    )
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, legal_name, hq_location, sector, employee_count, siren, naf_code")
    .order("name")
  if (companiesError) throw new Error(`Lecture companies : ${companiesError.message}`)

  const { data: proposals, error: proposalsError } = await supabase
    .from("enrichment_proposals")
    .select("id, target_id, attribute_name, proposed_value, confidence_score, run_id, status")
    .eq("target_type", "company")
    .in("status", ["proposed", "needs_review"])
  if (proposalsError) throw new Error(`Lecture enrichment_proposals : ${proposalsError.message}`)

  const byCompany = new Map<string, PendingProposal[]>()
  for (const proposal of proposals ?? []) {
    if (!IDENTITY_ATTRIBUTES.has(proposal.attribute_name)) continue
    const list = byCompany.get(proposal.target_id) ?? []
    list.push({
      id: proposal.id,
      attribute_name: proposal.attribute_name,
      proposed_value:
        proposal.proposed_value === null ? null : String(proposal.proposed_value),
      confidence_score: proposal.confidence_score as number | null,
      run_id: proposal.run_id,
    })
    byCompany.set(proposal.target_id, list)
  }

  return (companies ?? [])
    .map((company) => ({
      companyId: company.id,
      displayName: company.name ?? "(sans nom)",
      name: company.name,
      legalName: company.legal_name,
      hqLocation: company.hq_location,
      sector: company.sector,
      segment: null,
      employeeCount: company.employee_count,
      knownSiren: company.siren,
      knownNafCode: company.naf_code,
      pendingProposals: byCompany.get(company.id) ?? [],
    }))
    .filter(
      (account) =>
        account.knownSiren !== null ||
        account.pendingProposals.some((p) => p.attribute_name === "siren"),
    )
}

const VERDICT_ICON: Record<Verdict, string> = {
  siren_coherent: "✓",
  siren_suspect: "⚠",
  proposition_confirmee: "✓",
  proposition_a_rejeter: "✗",
  proposition_a_arbitrer: "?",
  sans_objet: "·",
}

async function main(): Promise<void> {
  const jsonFlagIndex = process.argv.indexOf("--json")
  const jsonPath = jsonFlagIndex !== -1 ? process.argv[jsonFlagIndex + 1] : null

  const accounts = await loadAccounts()
  process.stderr.write(`${accounts.length} compte(s) à auditer.\n`)

  const reports: AccountReport[] = []
  for (const account of accounts) {
    process.stderr.write(`· ${account.displayName}\n`)
    reports.push(auditAccount(account, await collectCandidates(account)))
  }

  const order: Verdict[] = [
    "proposition_a_rejeter",
    "siren_suspect",
    "proposition_a_arbitrer",
    "proposition_confirmee",
    "siren_coherent",
    "sans_objet",
  ]
  reports.sort((a, b) => order.indexOf(a.verdict) - order.indexOf(b.verdict) || a.name.localeCompare(b.name))

  console.log("\n| | Compte | Verdict | Détail |")
  console.log("|---|---|---|---|")
  for (const report of reports) {
    console.log(
      `| ${VERDICT_ICON[report.verdict]} | ${report.name} | ${report.verdict} | ${report.detail.replace(/\|/g, "/")} |`,
    )
  }

  const counts = new Map<Verdict, number>()
  for (const report of reports) counts.set(report.verdict, (counts.get(report.verdict) ?? 0) + 1)
  console.log("")
  for (const verdict of order) {
    if (counts.has(verdict)) console.log(`${verdict} : ${counts.get(verdict)}`)
  }

  const toReject = reports.flatMap((r) => r.proposalIdsToReject)
  if (toReject.length > 0) {
    console.log(`\n${toReject.length} proposition(s) d'identité à instruire :`)
    console.log(toReject.map((id) => `  ${id}`).join("\n"))
  }

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2))
    process.stderr.write(`Rapport écrit dans ${jsonPath}\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
