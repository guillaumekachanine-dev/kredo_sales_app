import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import {
  collectAccountKnowledgeV2Claims,
  collectAccountKnowledgeV2SourceIds,
  ingestAccountKnowledgeArtifact,
} from "./account-knowledge-ingest"
import type {
  AccountKnowledgeContent,
  AccountKnowledgeContentV2,
} from "./account-intelligence-contracts"
import { ACCOUNT_DYNAMIC_METHOD_VERSION } from "./account-dynamic"

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"
const FOREIGN_SOURCE = "99999999-9999-4999-8999-999999999999"

type SignalRow = {
  primary_source_id: string | null
  detected_at: string
  relevance_score: number | null
  urgency_score: number | null
  confidence_score: number | null
  status: string
  expires_at: string | null
}

/**
 * Faux client Supabase minimal. Volontairement pas un mock générique : il ne
 * répond qu'aux deux requêtes que le module émet réellement, et échoue bruyamment
 * sur toute autre table — si le module se met à interroger autre chose, le test
 * le signale au lieu de renvoyer silencieusement du vide.
 */
function fakeClient(options: {
  workspaceSourceIds?: string[]
  signals?: SignalRow[]
  sourcesError?: string
}) {
  const workspaceSourceIds = options.workspaceSourceIds ?? [SOURCE_A, SOURCE_B]
  const signals = options.signals ?? []

  const client = {
    from(table: string) {
      if (table === "intelligence_sources") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          in: (_column: string, values: string[]) =>
            options.sourcesError
              ? { data: null, error: { message: options.sourcesError } }
              : {
                  data: values
                    .filter((id) => workspaceSourceIds.includes(id))
                    .map((id) => ({ id })),
                  error: null,
                },
        }
        return builder
      }

      if (table === "account_signals") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          not: () => ({ data: signals, error: null }),
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
      fakeClient({ workspaceSourceIds: [SOURCE_A, SOURCE_B] }),
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
      contentJson: { schema_version: 3 },
    })

    expect(result.ok).toBe(false)
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
