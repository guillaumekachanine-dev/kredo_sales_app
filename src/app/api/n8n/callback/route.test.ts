// ─── Callback n8n → persistance : portail account_knowledge (Lot 4) ─────────
// Ce que ces tests protègent, et qu'aucun test unitaire d'ingestion ne couvre :
// le CHAÎNAGE de la route. Un artefact refusé doit faire basculer le run en
// `failed` ET ne rien écrire ; un artefact accepté doit être persisté sous sa
// forme NORMALISÉE (pas celle reçue de n8n) ; rejouer le même callback doit
// rester sans danger.
//
// Le client Supabase est un faux qui échoue bruyamment sur toute table
// inattendue : une écriture dans `companies` ferait échouer le test au lieu de
// passer inaperçue.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/** Signatures réelles des dépendances de la route — typées pour que les
 *  assertions sur `mock.calls` portent sur des arguments nommés, pas sur `any`. */
type PersistedPayload = {
  phase: number
  contentJson: Record<string, unknown>
  resultType: string
  contentText?: string
  title?: string
}
type SaveResultArgs = [string, string | null, string, string, PersistedPayload]
type UpdateRunStatusArgs = [string, string, { phase?: number; errorMessage?: string }?]

const verifyHmac = vi.fn(() => true)
const saveResult = vi.fn<(...args: SaveResultArgs) => Promise<string>>(async () => "result-1")
const updateRunStatus = vi.fn<(...args: UpdateRunStatusArgs) => Promise<void>>(async () => undefined)
const updateRunN8nIds = vi.fn(async () => undefined)
const materializeAccountIssues = vi.fn(async () => ({ success: true as const }))
const saveResultAsDocumentWithSupabaseClient = vi.fn(async () => ({ success: true as const }))

vi.mock("@/lib/n8n/hmac", () => ({ verifyHmac: () => verifyHmac() }))
vi.mock("@/lib/n8n/runs", () => ({
  saveResult: (...args: SaveResultArgs) => saveResult(...args),
  updateRunStatus: (...args: UpdateRunStatusArgs) => updateRunStatus(...args),
  updateRunN8nIds: (...args: unknown[]) => updateRunN8nIds(...(args as [])),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/intelligence/materialize-account-issues", () => ({
  materializeAccountIssues: (...args: unknown[]) => materializeAccountIssues(...(args as [])),
}))
vi.mock("@/components/accounts-contacts/intelligence/save-as-document", () => ({
  saveResultAsDocumentWithSupabaseClient: (...args: unknown[]) =>
    saveResultAsDocumentWithSupabaseClient(...(args as [])),
}))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fakeSupabase }))

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const RUN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const OWNER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"
const SIGNAL_A = "a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1"
const SIGNAL_UNKNOWN = "a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4"

const KNOWN_SOURCES = [SOURCE_A, SOURCE_B]
const KNOWN_SIGNALS = [{ id: SIGNAL_A, workspace_id: WORKSPACE, company_id: COMPANY }]

/** Instant de référence des tests — l'horloge n'est jamais laissée au hasard. */
const NOW = new Date("2026-08-05T12:00:00.000Z")

/** Signal réel du compte : alimente le calcul déterministe de `identity.dynamic`. */
const DYNAMIC_SIGNALS = [
  {
    primary_source_id: SOURCE_A,
    detected_at: "2026-07-26T00:00:00.000Z",
    relevance_score: 0.8,
    urgency_score: 0.4,
    confidence_score: 1,
    status: "new",
    expires_at: null,
  },
]

/**
 * Colonnes `ai_intelligence_runs` supplémentaires, indexées par id de run.
 *
 * Le chemin mission a besoin de `run_type` et `input_snapshot`, que les tests
 * `account_knowledge` ne connaissent pas. L'index est vide pour `RUN` : la ligne rendue
 * y reste identique au caractère près, aucun test préexistant ne change de comportement.
 */
const EXTRA_RUN_COLUMNS: Record<string, Record<string, unknown>> = {}

const fakeSupabase = {
  from(table: string) {
    if (table === "ai_intelligence_runs") {
      let requestedRunId = ""
      const builder = {
        select: () => builder,
        eq: (_column: string, value: string) => {
          requestedRunId = value
          return builder
        },
        single: async () => ({
          data: {
            company_id: COMPANY,
            workspace_id: WORKSPACE,
            owner_id: OWNER,
            trigger_source: "manual",
            ...(EXTRA_RUN_COLUMNS[requestedRunId] ?? {}),
          },
          error: null,
        }),
      }
      return builder
    }

    if (table === "intelligence_sources") {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: (_column: string, values: string[]) => ({
          data: values.filter((id) => KNOWN_SOURCES.includes(id)).map((id) => ({ id })),
          error: null,
        }),
      }
      return builder
    }

    if (table === "account_signals") {
      const filters: Record<string, string> = {}
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          filters[column] = value
          return builder
        },
        not: () => ({ data: DYNAMIC_SIGNALS, error: null }),
        in: (_column: string, values: string[]) => ({
          data: KNOWN_SIGNALS.filter(
            (row) =>
              values.includes(row.id) &&
              row.workspace_id === filters.workspace_id &&
              row.company_id === filters.company_id,
          ).map((row) => ({ id: row.id })),
          error: null,
        }),
      }
      return builder
    }

    throw new Error(`Table inattendue interrogée par le callback : ${table}`)
  },
}

const { POST } = await import("./route")

function v3Claim(overrides: Record<string, unknown> = {}) {
  return {
    text: "Le groupe exploite quatre sites industriels en France.",
    nature: "fact",
    source_refs: [SOURCE_A],
    confidence: 0.85,
    verified_at: null,
    attribution: "independent",
    ...overrides,
  }
}

function artifactV3(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 3,
    account_summary: null,
    identity: {
      company_name: null,
      legal_name: null,
      primary_activity: v3Claim(),
      headquarters: null,
      sector: null,
      business_segment: null,
      revenue: null,
      employee_count: null,
      geographic_reach: [],
      // Valeur inventée par le modèle : elle doit être écrasée avant persistance.
      dynamic: {
        label: "Croissance explosive",
        score: 100,
        period_start: "2020-01-01T00:00:00.000Z",
        period_end: "2026-08-05T00:00:00.000Z",
        evidence_count: 999,
        method_version: "invented-by-llm",
        source_refs: [SOURCE_B],
      },
    },
    market_positioning: {
      account_positioning: null,
      competitive_environment: null,
      direct_competitors: [],
      competitive_advantages: [],
      opportunities: [],
      threats: [],
      policy_and_ambitions: {
        purpose: null,
        philosophy: null,
        culture: [],
        public_statements: [],
        ambitions: [],
        strategic_axes: [],
        leadership_posture: [],
        claimed_identity: null,
      },
    },
    offers_and_customers: {
      core_business: null,
      offers: [],
      covered_domains: [],
      services: [],
      service_models: [],
      complementary_activities: [],
      uncovered_activities: [],
      customer_profile: null,
      customer_segments: [],
      segment_weights: [],
      behavioral_trends: [],
      unmet_needs: [],
    },
    value_chain: {
      description: null,
      value_proposition: null,
      key_links: [],
      critical_partners_or_suppliers: [],
      dependencies: [],
      vulnerabilities: [],
      end_customer_relationship: null,
    },
    regulatory_environment: {
      current_regulations: [],
      required_certifications: [],
      compliance_risks: [],
    },
    trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_A] },
    verification_results: [
      {
        claim_path: "$.identity.primary_activity",
        verdict: "confirmed",
        checked_at: "2026-08-05T10:00:00Z",
        supporting_source_refs: [SOURCE_B],
        contradicting_source_refs: [],
        rationale: null,
      },
    ],
    source_coverage: {
      displayed_claims: 42,
      sourced_claims: 42,
      coverage_rate: 0.1,
      missing_source_paths: [],
      stale_source_paths: [],
      contradiction_paths: [],
      passed: false,
    },
    generated_at: "2026-08-05T10:00:00Z",
    ...overrides,
  }
}

function callbackRequest(contentJson: Record<string, unknown>) {
  const body = JSON.stringify({
    runId: RUN,
    phase: 1,
    resultType: "account_knowledge",
    status: "succeeded",
    contentJson,
  })
  return new Request("https://kredo.example/api/n8n/callback", {
    method: "POST",
    headers: { "content-type": "application/json", "x-kredo-signature": "sha256=sig" },
    body,
  })
}

describe("POST /api/n8n/callback — account_knowledge V3", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyHmac.mockReturnValue(true)
    saveResult.mockResolvedValue("result-1")
    // `identity.dynamic` porte la fenêtre d'observation réellement calculée à
    // l'ingestion : sans horloge figée, deux appels successifs diffèrent d'une
    // milliseconde et l'égalité de l'artefact persisté n'est pas observable.
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("persiste un artefact V3 valide sous sa forme normalisée", async () => {
    const response = await POST(callbackRequest(artifactV3()))

    expect(response.status).toBe(200)
    expect(saveResult).toHaveBeenCalledTimes(1)

    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    const content = persisted.contentJson
    expect(content.schema_version).toBe(3)

    // La dynamique inventée par le modèle n'est jamais persistée.
    const identity = content.identity as { dynamic: { method_version: string; evidence_count: number } }
    expect(identity.dynamic.method_version).toBe("account-dynamic-v1")
    expect(identity.dynamic.evidence_count).toBe(1)

    // La couverture annoncée (42/42) est remplacée par le décompte réel.
    const coverage = content.source_coverage as { displayed_claims: number; passed: boolean }
    expect(coverage.displayed_claims).toBe(1)
    expect(coverage.passed).toBe(true)

    expect(updateRunStatus).toHaveBeenCalledWith(RUN, "succeeded", expect.objectContaining({ phase: 1 }))
  })

  it("bascule le run en échec et n'écrit rien quand l'artefact V3 est refusé", async () => {
    const response = await POST(
      callbackRequest(
        artifactV3({ trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_UNKNOWN] } }),
      ),
    )

    expect(response.status).toBe(400)
    // Aucune persistance partielle : le résultat n'est pas écrit du tout.
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).toHaveBeenCalledTimes(1)
    expect(updateRunStatus).toHaveBeenCalledWith(
      RUN,
      "failed",
      expect.objectContaining({ errorMessage: expect.stringContaining("Signaux cités inconnus") }),
    )

    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain("Signaux cités inconnus")
  })

  it("ne laisse jamais un run en cours après un refus de structure", async () => {
    const response = await POST(callbackRequest({ schema_version: 3 }))

    expect(response.status).toBe(400)
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).toHaveBeenCalledWith(RUN, "failed", expect.anything())
  })

  it("reste idempotent : rejouer le même callback produit la même écriture", async () => {
    const first = await POST(callbackRequest(artifactV3()))
    const second = await POST(callbackRequest(artifactV3()))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(saveResult).toHaveBeenCalledTimes(2)

    // Même run, même phase, même contenu normalisé : l'upsert (run_id, phase)
    // réécrit la même ligne au lieu d'en empiler une seconde.
    const [firstCall, secondCall] = saveResult.mock.calls
    if (!firstCall || !secondCall) throw new Error("deux appels à saveResult attendus")
    expect(firstCall[0]).toBe(RUN)
    expect(secondCall[0]).toBe(RUN)
    expect(secondCall[4].phase).toBe(firstCall[4].phase)
    expect(secondCall[4].contentJson).toEqual(firstCall[4].contentJson)
  })

  it("laisse le chemin V2 inchangé", async () => {
    const v2 = {
      schema_version: 2,
      identity: {
        primary_activity: { text: "Agence de voyage", nature: "fact", source_refs: [SOURCE_A], confidence: 0.9, verified_at: null },
        headquarters: null,
        revenue: null,
        employee_count: null,
        dynamic: null,
      },
      account_summary: null,
      market_positioning: {
        positioning: null, direct_competitors: [], customer_segments: [], differentiators: [],
        uncovered_scope: [], claimed_identity: null, threats: [], opportunities: [],
      },
      company_value_chain: {
        description: null, value_proposition: null, key_links: [], dependencies: [],
        vulnerabilities: [], customer_base: [],
      },
      organisation: { departments: [], strategic_weight: null, key_contacts: [], process_observations: [] },
      open_questions: [],
      source_coverage: {
        displayed_claims: 1, sourced_claims: 1, coverage_rate: 1,
        missing_source_paths: [], stale_source_paths: [], contradiction_paths: [], passed: true,
      },
      generated_at: "2026-08-04T10:00:00.000Z",
    }

    const response = await POST(callbackRequest(v2))

    expect(response.status).toBe(200)
    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    expect(persisted.contentJson.schema_version).toBe(2)
    // Aucune promotion silencieuse vers V3.
    expect("verification_results" in persisted.contentJson).toBe(false)
  })

  it("rejette une signature HMAC invalide avant toute lecture de run", async () => {
    verifyHmac.mockReturnValue(false)

    const response = await POST(callbackRequest(artifactV3()))

    expect(response.status).toBe(401)
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).not.toHaveBeenCalled()
  })
})

// ─── Callback n8n → persistance : portail mission d'intelligence (ADR-0020 L3) ─
// Ce que ces tests protègent, au-delà du validateur (testé isolément dans
// `src/features/intelligence-missions/__tests__/validate-mission-report.test.ts`) :
//   1. le DISPATCH se fait sur `run.run_type`, jamais sur `payload.resultType` ;
//   2. `resultType` et `phase` sont IMPOSÉS par la route (M-7 / M-4) ;
//   3. un rapport refusé ne laisse ni résultat, ni document, ni run `running`.

const MISSION_RUN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const MISSION_DIGEST = "f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1"
const MISSION_ABSENT = "f9f9f9f9-9999-4999-8999-f9f9f9f9f9f9"

const MISSION_TRACE = [
  {
    ref: { kind: "veille_period", table: "veille_digests", id: MISSION_DIGEST },
    title: "Digest juillet 2026",
    provenance: "veille_digests",
    kept: true,
  },
]

function missionReport(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    title: "Analyse mensuelle — juillet 2026",
    executiveSummary: "La pression réglementaire domine le mois.",
    findings: [
      {
        category: "tendance",
        statement: "Les budgets cyber industriels accélèrent.",
        evidence: [
          {
            ref: { kind: "veille_period", table: "veille_digests", id: MISSION_DIGEST },
            title: "TITRE INVENTÉ PAR LE MODÈLE",
            provenance: "provenance inventée",
          },
        ],
      },
    ],
    recommendations: [
      { action: "Cadrer une offre NIS2.", rationale: "Trois comptes concernés.", evidence: [] },
    ],
    sourceRefs: [],
    ...overrides,
  }
}

/** Enveloppe exacte de `mission-001-run` : `rawOutput` est une CHAÎNE, jamais un objet. */
function missionCallbackRequest(rawOutput: string, resultType = "mission_report", phase = 1) {
  const body = JSON.stringify({
    runId: MISSION_RUN,
    phase,
    resultType,
    status: "succeeded",
    contentJson: {
      schemaVersion: 1,
      missionSlug: "veille-analyse-mensuelle",
      rawOutput,
    },
    contentText: rawOutput,
    title: "Mission — veille-analyse-mensuelle",
  })
  return new Request("https://kredo.example/api/n8n/callback", {
    method: "POST",
    headers: { "content-type": "application/json", "x-kredo-signature": "sha256=sig" },
    body,
  })
}

describe("POST /api/n8n/callback — mission d'intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyHmac.mockReturnValue(true)
    saveResult.mockResolvedValue("result-mission-1")
    EXTRA_RUN_COLUMNS[MISSION_RUN] = {
      run_type: "mission:veille-analyse-mensuelle",
      input_snapshot: { schemaVersion: 1, missionSlug: "veille-analyse-mensuelle", trace: MISSION_TRACE },
    }
  })

  afterEach(() => {
    delete EXTRA_RUN_COLUMNS[MISSION_RUN]
  })

  it("persiste un rapport valide sous resultType/phase imposés et crée le document", async () => {
    const rawOutput = JSON.stringify(missionReport())
    const response = await POST(missionCallbackRequest(rawOutput))

    expect(response.status).toBe(200)
    expect(saveResult).toHaveBeenCalledTimes(1)

    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")

    // M-7 / M-4 : imposés par la route.
    expect(persisted.resultType).toBe("mission_report")
    expect(persisted.phase).toBe(1)

    // `content_json` porte le rapport STRUCTURÉ, pas l'enveloppe `{ rawOutput }`.
    expect(persisted.contentJson.schemaVersion).toBe(1)
    expect(persisted.contentJson.rawOutput).toBeUndefined()
    expect(Array.isArray(persisted.contentJson.findings)).toBe(true)

    // Citation reconstruite depuis la trace, jamais depuis le JSON du modèle.
    const findings = persisted.contentJson.findings as Array<{ evidence: Array<{ title: string }> }>
    expect(findings[0]?.evidence[0]?.title).toBe("Digest juillet 2026")

    // `content_text` lisible, et surtout PAS le JSON brut reçu.
    expect(persisted.contentText).toBeTruthy()
    expect(persisted.contentText).not.toBe(rawOutput)
    expect(persisted.contentText).toContain("## Synthèse")
    expect(persisted.title).toBe("Analyse mensuelle — juillet 2026")

    // Chemin 3 (document générique), déclenché SANS modification de son code — et sur le
    // résultat qui vient d'être écrit. `mock.calls` est lu en tableau large : le mock partagé
    // est déclaré sans paramètres typés, et son type n'est pas du périmètre de ce lot.
    expect(saveResultAsDocumentWithSupabaseClient).toHaveBeenCalledTimes(1)
    const documentCall: unknown[] | undefined = saveResultAsDocumentWithSupabaseClient.mock.calls[0]
    expect(documentCall?.[1]).toBe("result-mission-1")

    expect(updateRunStatus).toHaveBeenCalledWith(
      MISSION_RUN,
      "succeeded",
      expect.objectContaining({ phase: 1 }),
    )
  })

  it("bascule le run en échec sans rien écrire quand rawOutput n'est pas du JSON", async () => {
    const response = await POST(missionCallbackRequest('```json\n{"schemaVersion": 1}\n```'))

    expect(response.status).toBe(400)
    expect(saveResult).not.toHaveBeenCalled()
    expect(saveResultAsDocumentWithSupabaseClient).not.toHaveBeenCalled()
    expect(updateRunStatus).toHaveBeenCalledTimes(1)
    expect(updateRunStatus).toHaveBeenCalledWith(
      MISSION_RUN,
      "failed",
      expect.objectContaining({ errorMessage: expect.stringContaining("Sortie LLM non-JSON") }),
    )
  })

  it("refuse le rapport entier quand une citation est absente de la trace du corpus", async () => {
    const rawOutput = JSON.stringify(
      missionReport({
        findings: [
          {
            category: "risque",
            statement: "Constat adossé à une source fantôme.",
            evidence: [
              {
                ref: { kind: "veille_period", table: "veille_digests", id: MISSION_ABSENT },
                title: "Source inventée",
                provenance: "inventée",
              },
            ],
          },
        ],
      }),
    )

    const response = await POST(missionCallbackRequest(rawOutput))

    expect(response.status).toBe(400)
    expect(saveResult).not.toHaveBeenCalled()
    expect(saveResultAsDocumentWithSupabaseClient).not.toHaveBeenCalled()

    const errorMessage = updateRunStatus.mock.calls[0]?.[2]?.errorMessage ?? ""
    expect(errorMessage).toContain(MISSION_ABSENT)
    expect(errorMessage).toContain("absente du corpus du run")

    const payload = (await response.json()) as { error: string; issues: Array<{ path: string }> }
    expect(payload.error).toBe("Rapport de mission invalide")
    expect(payload.issues[0]?.path).toBe("$.findings[0].evidence[0].ref")
  })

  it("ne laisse jamais un run de mission en cours après un refus de structure", async () => {
    const response = await POST(
      missionCallbackRequest(JSON.stringify(missionReport({ findings: [] }))),
    )

    expect(response.status).toBe(400)
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).toHaveBeenCalledWith(MISSION_RUN, "failed", expect.anything())
  })

  it("dispatche sur run.run_type, pas sur payload.resultType — même en aval de la validation", async () => {
    // Scénario B : un workflow qui enverrait par erreur `resultType: "account_issues_map"`
    // sur un run de mission ne doit ni échapper à la validation, ni faire dériver le
    // rapport validé vers un chemin d'écriture qui ne lui correspond pas. Avant le correctif
    // de ce lot, `resultType`/`phase` n'étaient imposés que dans `persistedPayload` : les
    // blocs en aval continuaient de lire la `const` brute du payload et entraient quand même
    // dans `materializeAccountIssues`, qui refuse la forme `{schemaVersion, missionSlug,
    // rawOutput}` et répond 500 — après un succès déjà persisté.
    const response = await POST(
      missionCallbackRequest(JSON.stringify(missionReport()), "account_issues_map", 4),
    )

    expect(response.status).toBe(200)
    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    expect(persisted.resultType).toBe("mission_report")
    expect(persisted.phase).toBe(1)

    // `materializeAccountIssues` (chemin account_issues_map) ne doit JAMAIS être atteint :
    // l'aiguillage imposé exclut ce chemin, pas seulement le contenu écrit.
    expect(materializeAccountIssues).not.toHaveBeenCalled()

    // Le document est bien créé par le chemin générique — celui qui correspond à
    // `mission_report`, pas celui qu'aurait choisi le `resultType` envoyé par n8n.
    expect(saveResultAsDocumentWithSupabaseClient).toHaveBeenCalledTimes(1)

    // `current_phase` reçoit désormais la phase IMPOSÉE (1), pas la `phase: 4` du payload.
    expect(updateRunStatus).toHaveBeenCalledWith(
      MISSION_RUN,
      "succeeded",
      expect.objectContaining({ phase: 1 }),
    )
  })

  it("scénario A — un payload account_knowledge sur un run de mission n'échappe pas au validateur mission", async () => {
    // Avant le correctif de ce lot, le bloc `account_knowledge` (4 bis) ne testait pas
    // `run.run_type` : un `resultType: "account_knowledge"` envoyé par erreur sur un run de
    // mission y était rejeté (parseAccountKnowledgeArtifact échoue sur `schemaVersion`
    // camelCase, absent du contrat V1/V2/V3 qui attend `schema_version`) AVANT que le rapport
    // de mission, par ailleurs valide, soit seulement évalué par son propre validateur.
    const response = await POST(
      missionCallbackRequest(JSON.stringify(missionReport()), "account_knowledge"),
    )

    expect(response.status).toBe(200)
    expect(saveResult).toHaveBeenCalledTimes(1)

    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    expect(persisted.resultType).toBe("mission_report")
    expect(persisted.phase).toBe(1)
    // Le rapport de mission est bien celui validé, structuré — pas un artefact account_knowledge.
    expect(Array.isArray(persisted.contentJson.findings)).toBe(true)

    expect(updateRunStatus).toHaveBeenCalledWith(
      MISSION_RUN,
      "succeeded",
      expect.objectContaining({ phase: 1 }),
    )
  })

  it("laisse intact un run qui n'est pas une mission", async () => {
    // `run_type` sans le préfixe `mission:` : le portail mission ne s'ouvre pas, et le
    // `rawOutput` illisible pour lui n'est jamais examiné.
    EXTRA_RUN_COLUMNS[MISSION_RUN] = { run_type: "intel-020-communication", input_snapshot: null }

    const response = await POST(missionCallbackRequest("pas du JSON", "communication"))

    expect(response.status).toBe(200)
    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    expect(persisted.resultType).toBe("communication")
    expect(persisted.contentJson.rawOutput).toBe("pas du JSON")
    expect(updateRunStatus).toHaveBeenCalledWith(
      MISSION_RUN,
      "succeeded",
      expect.objectContaining({ phase: 1 }),
    )
  })
})
