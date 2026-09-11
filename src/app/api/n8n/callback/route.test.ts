// ─── Callback n8n → persistance ─────────────────────────────────────────────
// Ces tests protègent les aiguillages applicatifs qui entourent la persistance :
// conversion d'étude compte et missions d'intelligence.
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
  qaFlags?: Array<{ check: string; passed: boolean; detail: string }>
}
type SaveResultArgs = [string, string | null, string, string, PersistedPayload]
type UpdateRunStatusArgs = [string, string, { phase?: number; errorMessage?: string }?]

const verifyHmac = vi.fn(() => true)
const saveResult = vi.fn<(...args: SaveResultArgs) => Promise<string>>(async () => "result-1")
const updateRunStatus = vi.fn<(...args: UpdateRunStatusArgs) => Promise<void>>(async () => undefined)
const updateRunN8nIds = vi.fn(async () => undefined)
const materializeAccountIssues = vi.fn(async () => ({ success: true as const }))
const saveResultAsDocumentWithSupabaseClient = vi.fn(async () => ({ success: true as const }))
const handleStudyConversionCallback = vi.fn(async () => ({
  status: 202,
  body: { ok: true, conversion: "accepted" },
}))

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
vi.mock("@/features/account-research-studies/data/study-conversion", () => ({
  isStudyConversionRunType: (runType: string | null | undefined) => runType === "mission:study-conversion",
  handleStudyConversionCallback: (...args: unknown[]) => handleStudyConversionCallback(...(args as [])),
}))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fakeSupabase }))

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const RUN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const OWNER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
/**
 * Colonnes `ai_intelligence_runs` supplémentaires, indexées par id de run.
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

    throw new Error(`Table inattendue interrogée par le callback : ${table}`)
  },
}

const { POST } = await import("./route")

describe("POST /api/n8n/callback — conversion d'étude compte", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyHmac.mockReturnValue(true)
    EXTRA_RUN_COLUMNS[RUN] = {
      run_type: "mission:study-conversion",
      input_snapshot: { study_id: "study-1", attempt: 1, part_key: "block-1", kind: "blocks" },
    }
  })

  afterEach(() => {
    delete EXTRA_RUN_COLUMNS[RUN]
  })

  it("aiguille la passe avant le validateur mission et retourne son résultat", async () => {
    const payload = {
      runId: RUN,
      phase: 1,
      resultType: "mission_report",
      status: "succeeded",
      contentJson: { rawOutput: "{}" },
    }
    const response = await POST(new Request("https://kredo.example/api/n8n/callback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-kredo-signature": "sha256=sig" },
      body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ ok: true, conversion: "accepted" })
    expect(handleStudyConversionCallback).toHaveBeenCalledWith(expect.objectContaining({ runId: RUN }))
    expect(saveResult).not.toHaveBeenCalled()
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
