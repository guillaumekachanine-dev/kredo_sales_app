import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import {
  collectAccountKnowledgeV2Claims,
  collectAccountKnowledgeV2SourceIds,
  collectAccountKnowledgeV3SourceIds,
  ingestAccountKnowledgeArtifact,
} from "./account-knowledge-ingest"
import type {
  AccountKnowledgeContent,
  AccountKnowledgeContentV2,
  AccountKnowledgeContentV3,
} from "./account-intelligence-contracts"
import { ACCOUNT_DYNAMIC_METHOD_VERSION } from "./account-dynamic"

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER_WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const OTHER_COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-cccccccccccc"
const CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"
const SOURCE_C = "33333333-3333-4333-8333-333333333333"
const FOREIGN_SOURCE = "99999999-9999-4999-8999-999999999999"
const SIGNAL_A = "a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1"
const SIGNAL_OTHER_COMPANY = "a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2"
const SIGNAL_OTHER_WORKSPACE = "a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3"
const SIGNAL_UNKNOWN = "a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4"
const SOURCE_UNKNOWN = "88888888-8888-4888-8888-888888888888"

type SignalRow = {
  primary_source_id: string | null
  detected_at: string
  relevance_score: number | null
  urgency_score: number | null
  confidence_score: number | null
  status: string
  expires_at: string | null
}

/** Ligne `account_signals` telle que la voit le contrôle d'existence (Lot 4). */
type SignalIndexRow = { id: string; workspace_id: string; company_id: string }

const DEFAULT_SOURCE_ROWS = [
  { id: SOURCE_A, workspace_id: WORKSPACE },
  { id: SOURCE_B, workspace_id: WORKSPACE },
  { id: SOURCE_C, workspace_id: WORKSPACE },
  // Présente en base, mais chez un autre tenant : le filtre workspace doit la
  // rendre invisible, pas la laisser passer parce qu'elle « existe ».
  { id: FOREIGN_SOURCE, workspace_id: OTHER_WORKSPACE },
]

const DEFAULT_SIGNAL_ROWS: SignalIndexRow[] = [
  { id: SIGNAL_A, workspace_id: WORKSPACE, company_id: COMPANY },
  { id: SIGNAL_OTHER_COMPANY, workspace_id: WORKSPACE, company_id: OTHER_COMPANY },
  { id: SIGNAL_OTHER_WORKSPACE, workspace_id: OTHER_WORKSPACE, company_id: COMPANY },
]

/**
 * Faux client Supabase minimal. Volontairement pas un mock générique : il ne
 * répond qu'aux requêtes que le module émet réellement, applique pour de vrai
 * les filtres `workspace_id` / `company_id` posés par le code (sans quoi un test
 * de cloisonnement ne prouverait rien), et échoue bruyamment sur toute autre
 * table — si le module se met à interroger `companies` ou autre chose, le test
 * le signale au lieu de renvoyer silencieusement du vide.
 */
function fakeClient(options: {
  sourceRows?: Array<{ id: string; workspace_id: string }>
  signals?: SignalRow[]
  signalRows?: SignalIndexRow[]
  sourcesError?: string
  signalsError?: string
  /** Reçoit les lots d'UUID réellement soumis au contrôle des sources. */
  checkedSourceIds?: string[][]
  checkedSignalIds?: string[][]
}) {
  const sourceRows = options.sourceRows ?? DEFAULT_SOURCE_ROWS
  const signalRows = options.signalRows ?? DEFAULT_SIGNAL_ROWS
  const signals = options.signals ?? []

  const client = {
    from(table: string) {
      if (table === "intelligence_sources") {
        const filters: Record<string, string> = {}
        const builder = {
          select: () => builder,
          eq: (column: string, value: string) => {
            filters[column] = value
            return builder
          },
          in: (_column: string, values: string[]) => {
            options.checkedSourceIds?.push([...values])
            if (options.sourcesError) return { data: null, error: { message: options.sourcesError } }
            return {
              data: sourceRows
                .filter((row) => values.includes(row.id) && row.workspace_id === filters.workspace_id)
                .map((row) => ({ id: row.id })),
              error: null,
            }
          },
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
          // Terminal de la requête « dynamique » : signaux non écartés du compte.
          not: () => ({ data: signals, error: null }),
          // Terminal du contrôle d'existence des signaux cités (V3).
          in: (_column: string, values: string[]) => {
            options.checkedSignalIds?.push([...values])
            if (options.signalsError) return { data: null, error: { message: options.signalsError } }
            return {
              data: signalRows
                .filter(
                  (row) =>
                    values.includes(row.id) &&
                    row.workspace_id === filters.workspace_id &&
                    row.company_id === filters.company_id,
                )
                .map((row) => ({ id: row.id })),
              error: null,
            }
          },
        }
        return builder
      }

      throw new Error(`Table inattendue interrogée par le module : ${table}`)
    },
  }

  return client as unknown as SupabaseClient<Database>
}

function claim(text: string, refs: string[] = [SOURCE_A], nature: "fact" | "analysis" = "fact") {
  return { text, nature, source_refs: refs, confidence: 0.8, verified_at: null }
}

function artifactV2(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 2,
    identity: {
      primary_activity: claim("Agence de voyage en ligne"),
      headquarters: claim("Aix-en-Provence", [SOURCE_B]),
      revenue: null,
      employee_count: null,
      dynamic: null,
    },
    account_summary: claim("Client actif.", [SOURCE_A], "analysis"),
    market_positioning: {
      positioning: null,
      direct_competitors: [],
      customer_segments: [],
      differentiators: [],
      uncovered_scope: [],
      claimed_identity: null,
      threats: [],
      opportunities: [],
    },
    company_value_chain: {
      description: null,
      value_proposition: null,
      key_links: [],
      dependencies: [],
      vulnerabilities: [],
      customer_base: [],
    },
    organisation: {
      departments: [],
      strategic_weight: null,
      key_contacts: [{ contact_id: CONTACT, role_summary: claim("DSI") }],
      process_observations: [],
    },
    open_questions: [{ question: "Qui arbitre le budget ?" }],
    source_coverage: {
      displayed_claims: 0,
      sourced_claims: 0,
      coverage_rate: 1,
      missing_source_paths: [],
      stale_source_paths: ["identity.headquarters"],
      contradiction_paths: [],
      passed: true,
    },
    generated_at: "2026-08-04T10:00:00.000Z",
    ...overrides,
  }
}

function artifactV1(): AccountKnowledgeContent {
  return {
    schema_version: 1,
    identity_positioning: [{ text: "ETI du tourisme", provenance: "folio_legacy" }],
    commercial_relationship: [],
    key_contacts: [{ contact_id: CONTACT, role_summary: "DSI", provenance: "relational" }],
    organisation_observed: [],
    frictions_and_signals: [],
    open_questions: [],
    generated_at: "2026-07-07T10:00:00.000Z",
  }
}

function signal(overrides: Partial<SignalRow> = {}): SignalRow {
  return {
    primary_source_id: SOURCE_A,
    detected_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    relevance_score: 0.8,
    urgency_score: 0.4,
    confidence_score: 1,
    status: "new",
    expires_at: null,
    ...overrides,
  }
}

describe("ingestAccountKnowledgeArtifact", () => {
  it("accepte un V2 valide et le renvoie normalisé", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({ signals: [signal()] }), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV2(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.version).toBe(2)
    const content = result.content as AccountKnowledgeContentV2
    expect(content.identity.primary_activity?.text).toBe("Agence de voyage en ligne")
  })

  it("reste compatible en lecture avec un artefact V1", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV1(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.version).toBe(1)
    // Aucune conversion vers V2 : le contenu ressort tel quel.
    expect(result.content).toEqual(artifactV1())
  })

  it("injecte l'indicateur de dynamique calculé, en écrasant celui du modèle", async () => {
    const forged = artifactV2({
      identity: {
        ...(artifactV2().identity as Record<string, unknown>),
        dynamic: {
          label: "Croissance explosive",
          score: 100,
          period_start: "2020-01-01T00:00:00.000Z",
          period_end: "2026-08-04T00:00:00.000Z",
          evidence_count: 999,
          method_version: "invented-by-llm",
          source_refs: [SOURCE_A],
        },
      },
    })

    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal(), signal({ primary_source_id: SOURCE_B })] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: forged },
    )

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 2) return
    const dynamic = result.content.identity.dynamic
    expect(dynamic?.method_version).toBe(ACCOUNT_DYNAMIC_METHOD_VERSION)
    expect(dynamic?.evidence_count).toBe(2)
    expect(dynamic?.label).not.toBe("Croissance explosive")
  })

  it("laisse la dynamique non mesurable quand aucun signal n'est sourcé", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal({ primary_source_id: null })] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: artifactV2() },
    )

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 2) return
    expect(result.content.identity.dynamic?.score).toBeNull()
    expect(result.content.identity.dynamic?.evidence_count).toBe(0)
  })

  it("refuse une affirmation non sourcée", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV2({
        account_summary: { text: "Compte stratégique", nature: "analysis", source_refs: [], confidence: 0.5, verified_at: null },
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.path.includes("account_summary.source_refs"))).toBe(true)
  })

  it("refuse une source inconnue ou appartenant à un autre workspace", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({}),
      {
        workspaceId: WORKSPACE,
        companyId: COMPANY,
        contentJson: artifactV2({
          account_summary: claim("Compte suivi", [FOREIGN_SOURCE], "analysis"),
        }),
      },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Sources citées inconnues")
    expect(result.issues[0]?.message).toContain(FOREIGN_SOURCE)
  })

  it("refuse un placeholder « Non trouvé » comme contenu métier", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV2({ account_summary: claim("Non trouvé") }),
    })

    expect(result.ok).toBe(false)
  })

  it("refuse un artefact entreprise sans company_id", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: null,
      contentJson: artifactV2(),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("company_id")
  })

  it("refuse un artefact de version inconnue plutôt que de le réparer", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: { schema_version: 7 },
    })

    expect(result.ok).toBe(false)
  })

  it("refuse une coquille V3 vide plutôt que de compléter ses sections", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: { schema_version: 3 },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("invalide")
  })

  it("recalcule la couverture depuis le contenu réellement stocké", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV2(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 2) return
    const coverage = result.content.source_coverage
    // 4 Claims réels dans la fixture — le 0/0 annoncé par le workflow est ignoré.
    expect(coverage.displayed_claims).toBe(4)
    expect(coverage.sourced_claims).toBe(4)
    expect(coverage.passed).toBe(true)
    // Les listes que seul le moteur peut établir sont conservées.
    expect(coverage.stale_source_paths).toEqual(["identity.headquarters"])
  })

  it("n'avale pas silencieusement une erreur de vérification des sources", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ sourcesError: "connexion perdue" }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: artifactV2() },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("connexion perdue")
  })

  it("supporte un compte peu documenté : toutes sections vides, zéro affirmation", async () => {
    const sparse = artifactV2({
      identity: { primary_activity: null, headquarters: null, revenue: null, employee_count: null, dynamic: null },
      account_summary: null,
      organisation: {
        departments: [],
        strategic_weight: null,
        key_contacts: [],
        process_observations: [],
      },
      open_questions: [],
    })

    const result = await ingestAccountKnowledgeArtifact(fakeClient({ signals: [] }), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: sparse,
    })

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 2) return
    expect(result.content.source_coverage.displayed_claims).toBe(0)
    // 0/0 est « couvert » par convention : il n'y a rien à sourcer.
    expect(result.content.source_coverage.coverage_rate).toBe(1)
    expect(result.content.identity.dynamic?.score).toBeNull()
  })
})

// ─── V3 (Lot 4) ─────────────────────────────────────────────────────────────

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

function v3Verification(claimPath: string, overrides: Record<string, unknown> = {}) {
  return {
    claim_path: claimPath,
    verdict: "confirmed",
    checked_at: "2026-08-05T10:00:00Z",
    supporting_source_refs: [SOURCE_B],
    contradicting_source_refs: [],
    rationale: null,
    ...overrides,
  }
}

/**
 * Artefact V3 valide, avec deux affirmations publiées et leurs vérifications.
 * `source_coverage` est volontairement FAUX en entrée : l'ingestion doit le
 * recalculer, jamais le recopier.
 */
function artifactV3(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 3,
    account_summary: v3Claim({ nature: "analysis", text: "Compte industriel en consolidation." }),
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
      dynamic: null,
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
      v3Verification("$.account_summary"),
      v3Verification("$.identity.primary_activity", { supporting_source_refs: [SOURCE_C] }),
    ],
    // Chiffres fantaisistes : ils doivent être écrasés par le recalcul.
    source_coverage: {
      displayed_claims: 99,
      sourced_claims: 99,
      coverage_rate: 0.1,
      missing_source_paths: ["$.inexistant"],
      stale_source_paths: ["$.identity.primary_activity"],
      contradiction_paths: [],
      passed: false,
    },
    generated_at: "2026-08-05T10:00:00Z",
    ...overrides,
  }
}

describe("ingestAccountKnowledgeArtifact — V3", () => {
  it("accepte un artefact V3 valide et le renvoie discriminé", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal()] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: artifactV3() },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.version).toBe(3)
    if (result.version !== 3) return
    const content: AccountKnowledgeContentV3 = result.content
    expect(content.schema_version).toBe(3)
    expect(content.identity.primary_activity?.text).toContain("quatre sites industriels")
    // Aucune section V2 fabriquée au passage.
    expect("organisation" in content).toBe(false)
  })

  it("refuse une source de claim inconnue", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        account_summary: v3Claim({ nature: "analysis", source_refs: [SOURCE_A, SOURCE_UNKNOWN] }),
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Sources citées inconnues")
    expect(result.issues.some((issue) => issue.message.includes(SOURCE_UNKNOWN))).toBe(true)
  })

  it("refuse une source citée par un résultat de vérification et inconnue", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        verification_results: [
          v3Verification("$.account_summary", { supporting_source_refs: [SOURCE_UNKNOWN] }),
          v3Verification("$.identity.primary_activity"),
        ],
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.message.includes(SOURCE_UNKNOWN))).toBe(true)
  })

  it("refuse une source qui existe mais appartient à un autre workspace", async () => {
    // FOREIGN_SOURCE est bien présente dans `sourceRows`, sous OTHER_WORKSPACE :
    // seul le filtre workspace de la requête la rend invisible.
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        account_summary: v3Claim({ nature: "analysis", source_refs: [FOREIGN_SOURCE] }),
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Sources citées inconnues")
    // Le message ne dit pas si elle existe ailleurs : pas d'oracle cross-tenant.
    expect(result.issues[0]?.message).toContain("inexistante ou hors workspace")
  })

  it("refuse un signal significatif inconnu", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_UNKNOWN] },
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Signaux cités inconnus")
    expect(result.issues[0]?.path).toBe("$.trends_and_news.significant_signal_ids")
  })

  it("refuse un signal appartenant à un autre workspace", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_OTHER_WORKSPACE] },
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Signaux cités inconnus")
  })

  it("refuse un signal du bon workspace mais rattaché à un autre compte", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_A, SIGNAL_OTHER_COMPANY] },
      }),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.message).toContain(SIGNAL_OTHER_COMPANY)
  })

  it("refuse l'artefact en bloc dès qu'un seul signal est invalide", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: COMPANY,
      contentJson: artifactV3({
        trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_A, SIGNAL_UNKNOWN] },
      }),
    })

    // Aucun contenu partiel : pas de version « amputée du signal fautif ».
    expect(result.ok).toBe(false)
  })

  it("déduplique les UUID soumis aux contrôles", async () => {
    const checkedSourceIds: string[][] = []
    const checkedSignalIds: string[][] = []

    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal()], checkedSourceIds, checkedSignalIds }),
      {
        workspaceId: WORKSPACE,
        companyId: COMPANY,
        contentJson: artifactV3({
          // SOURCE_A est citée par les deux claims ET par l'indicateur injecté
          // (le signal de la fixture porte primary_source_id = SOURCE_A).
          account_summary: v3Claim({ nature: "analysis", source_refs: [SOURCE_A, SOURCE_A, SOURCE_B] }),
          trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_A] },
        }),
      },
    )

    expect(result.ok).toBe(true)
    expect(checkedSourceIds).toHaveLength(1)
    const submitted = checkedSourceIds[0] ?? []
    expect(new Set(submitted).size).toBe(submitted.length)
    expect(submitted.sort()).toEqual([SOURCE_A, SOURCE_B, SOURCE_C].sort())
    expect(checkedSignalIds).toEqual([[SIGNAL_A]])
  })

  it("injecte l'indicateur de dynamique calculé côté application", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal(), signal({ primary_source_id: SOURCE_B })] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: artifactV3() },
    )

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 3) return
    const dynamic = result.content.identity.dynamic
    expect(dynamic?.method_version).toBe(ACCOUNT_DYNAMIC_METHOD_VERSION)
    expect(dynamic?.evidence_count).toBe(2)
    expect(dynamic?.source_refs.sort()).toEqual([SOURCE_A, SOURCE_B].sort())
  })

  it("écrase toute dynamique reçue du workflow", async () => {
    const forged = artifactV3({
      identity: {
        ...(artifactV3().identity as Record<string, unknown>),
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
    })

    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal()] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: forged },
    )

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 3) return
    const dynamic = result.content.identity.dynamic
    expect(dynamic?.label).not.toBe("Croissance explosive")
    expect(dynamic?.method_version).toBe(ACCOUNT_DYNAMIC_METHOD_VERSION)
    expect(dynamic?.evidence_count).toBe(1)
  })

  it("recalcule source_coverage depuis les claims réellement publiés", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal()] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: artifactV3() },
    )

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 3) return
    const coverage = result.content.source_coverage
    // Deux claims réels dans la fixture — le 99/99 annoncé est ignoré.
    expect(coverage.displayed_claims).toBe(2)
    expect(coverage.sourced_claims).toBe(2)
    expect(coverage.coverage_rate).toBe(1)
    expect(coverage.missing_source_paths).toEqual([])
    expect(coverage.passed).toBe(true)
    // Les deux listes que seul le moteur peut établir sont conservées.
    expect(coverage.stale_source_paths).toEqual(["$.identity.primary_activity"])
  })

  it("conserve les résultats de vérification à l'identique", async () => {
    const input = artifactV3()
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signals: [signal()] }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: input },
    )

    expect(result.ok).toBe(true)
    if (!result.ok || result.version !== 3) return
    expect(result.content.verification_results).toEqual(input.verification_results)
    expect(result.content.trends_and_news.significant_signal_ids).toEqual([SIGNAL_A])
  })

  it("n'avale pas silencieusement une erreur de vérification des signaux", async () => {
    const result = await ingestAccountKnowledgeArtifact(
      fakeClient({ signalsError: "connexion perdue" }),
      { workspaceId: WORKSPACE, companyId: COMPANY, contentJson: artifactV3() },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("connexion perdue")
  })

  it("n'interroge jamais la table companies", async () => {
    // Le faux client lève sur toute table inattendue : si l'ingestion se mettait
    // à lire ou écrire `companies`, ce test échouerait au lieu de passer.
    await expect(
      ingestAccountKnowledgeArtifact(fakeClient({ signals: [signal()] }), {
        workspaceId: WORKSPACE,
        companyId: COMPANY,
        contentJson: artifactV3(),
      }),
    ).resolves.toMatchObject({ ok: true })
  })

  it("refuse un artefact V3 sans company_id", async () => {
    const result = await ingestAccountKnowledgeArtifact(fakeClient({}), {
      workspaceId: WORKSPACE,
      companyId: null,
      contentJson: artifactV3(),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("company_id")
  })
})

describe("collectAccountKnowledgeV3SourceIds", () => {
  it("couvre claims, vérifications et indicateur déterministe, sans doublon", () => {
    const content = artifactV3({
      identity: {
        ...(artifactV3().identity as Record<string, unknown>),
        dynamic: {
          label: "Activité détectée modérée",
          score: 40,
          period_start: "2026-01-01T00:00:00.000Z",
          period_end: "2026-08-05T00:00:00.000Z",
          evidence_count: 2,
          method_version: ACCOUNT_DYNAMIC_METHOD_VERSION,
          source_refs: [SOURCE_B],
        },
      },
      verification_results: [
        v3Verification("$.account_summary", {
          verdict: "confirmed",
          supporting_source_refs: [SOURCE_B],
          contradicting_source_refs: [],
        }),
        v3Verification("$.identity.primary_activity", { supporting_source_refs: [SOURCE_C] }),
      ],
    }) as unknown as AccountKnowledgeContentV3

    expect(collectAccountKnowledgeV3SourceIds(content).sort()).toEqual(
      [SOURCE_A, SOURCE_B, SOURCE_C].sort(),
    )
  })

  it("inclut les sources de contradiction citées par une vérification", () => {
    const content = artifactV3({
      verification_results: [
        v3Verification("$.account_summary", { contradicting_source_refs: [FOREIGN_SOURCE] }),
        v3Verification("$.identity.primary_activity"),
      ],
    }) as unknown as AccountKnowledgeContentV3

    expect(collectAccountKnowledgeV3SourceIds(content)).toContain(FOREIGN_SOURCE)
  })
})

describe("collectAccountKnowledgeV2Claims", () => {
  it("couvre toutes les sections porteuses de Claims", () => {
    const full = artifactV2({
      market_positioning: {
        positioning: claim("p"),
        direct_competitors: [claim("c1"), claim("c2")],
        customer_segments: [claim("s")],
        differentiators: [claim("d")],
        uncovered_scope: [claim("u")],
        claimed_identity: claim("ci"),
        threats: [claim("t")],
        opportunities: [claim("o")],
      },
      company_value_chain: {
        description: claim("vd"),
        value_proposition: claim("vp"),
        key_links: [claim("k")],
        dependencies: [claim("dep")],
        vulnerabilities: [claim("v")],
        customer_base: [claim("cb")],
      },
      organisation: {
        departments: [claim("dept")],
        strategic_weight: claim("sw"),
        key_contacts: [{ contact_id: CONTACT, role_summary: claim("DSI") }],
        process_observations: [claim("po")],
      },
    }) as unknown as AccountKnowledgeContentV2

    const paths = collectAccountKnowledgeV2Claims(full).map((entry) => entry.path)

    expect(paths).toContain("identity.primary_activity")
    expect(paths).toContain("market_positioning.direct_competitors[1]")
    expect(paths).toContain("company_value_chain.customer_base[0]")
    expect(paths).toContain("organisation.key_contacts[0].role_summary")
    // identity.dynamic n'est pas un Claim : il ne relève pas de la couverture.
    expect(paths).not.toContain("identity.dynamic")
    expect(paths).toHaveLength(22)
  })

  it("déduplique les sources citées et inclut celles de l'indicateur", () => {
    const withDynamic = artifactV2({
      identity: {
        primary_activity: claim("a", [SOURCE_A]),
        headquarters: claim("b", [SOURCE_A]),
        revenue: null,
        employee_count: null,
        dynamic: {
          label: "Activité détectée modérée",
          score: 40,
          period_start: "2026-01-01T00:00:00.000Z",
          period_end: "2026-08-04T00:00:00.000Z",
          evidence_count: 2,
          method_version: ACCOUNT_DYNAMIC_METHOD_VERSION,
          source_refs: [SOURCE_B],
        },
      },
    }) as unknown as AccountKnowledgeContentV2

    expect(collectAccountKnowledgeV2SourceIds(withDynamic).sort()).toEqual([SOURCE_A, SOURCE_B].sort())
  })
})
