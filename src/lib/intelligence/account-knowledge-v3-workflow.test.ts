import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createContext, Script } from "node:vm"
import { describe, expect, it } from "vitest"

import {
  ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER,
  collectAccountKnowledgeV3Claims,
  type AccountKnowledgeClaimV3,
  type AccountKnowledgeContentV3,
  type AccountKnowledgeVerificationResultV3,
} from "./account-intelligence-contracts"
import { validateAccountKnowledgeV3 } from "./intelligence-validators"

// Ce test vitest (suite `npm test`) verrouille deux choses que le harnais Node
// voisin (n8n/workflows/__tests__/…-v3.test.js) ne peut pas garantir dans le CI
// TypeScript :
//   1. le workflow V3 reste structurellement sain (ids uniques, connexions,
//      V2 preserve, discriminateur, zero secret reel) ;
//   2. l'artefact reellement produit par le nœud "V3 Assemble Artifact" satisfait
//      le validateur canonique gele au Lot 2 (`validateAccountKnowledgeV3`).

const root = process.cwd()
const workflow = JSON.parse(
  readFileSync(resolve(root, "n8n/workflows/intel-030-account-knowledge.json"), "utf8"),
) as {
  active: boolean
  nodes: Array<{ id: string; name: string; type: string; parameters: Record<string, unknown>; onError?: string }>
  connections: Record<string, { main: Array<Array<{ node: string }>> }>
}
const workflowText = JSON.stringify(workflow)
const nodesByName = new Map(workflow.nodes.map((n) => [n.name, n]))

const S1 = "11111111-1111-4111-8111-111111111111"
const S2 = "22222222-2222-4222-8222-222222222222"

// ─── Exécution d'un nœud Code du workflow (parité avec le harnais Node) ──────

function runCodeNode(name: string, registry: Record<string, unknown>, input: unknown): unknown {
  const node = nodesByName.get(name)
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const items = [{ json: input }]
  const sandbox = {
    $input: { first: () => items[0], all: () => items },
    $: (nodeName: string) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      return { first: () => ({ json: registry[nodeName] }) }
    },
    $execution: { id: "exec" },
    $workflow: { id: "wf" },
    console, Date, JSON, Math, URL, Array, Object, Set, Map, Number, String, RegExp, Error,
    isFinite, encodeURIComponent, Boolean, parseInt, parseFloat,
  }
  const context = createContext(sandbox)
  const script = new Script(`(() => {\n${(node.parameters as { jsCode: string }).jsCode}\n})()`)
  const result = script.runInContext(context) as Array<{ json: unknown }>
  const out = result[0].json
  registry[name] = out
  return out
}

// ─── Fixtures d'artefacts V3 ─────────────────────────────────────────────────

function v3Claim(over: Partial<AccountKnowledgeClaimV3> = {}): AccountKnowledgeClaimV3 {
  return { text: "Le groupe exploite un site a Grasse.", nature: "fact", source_refs: [S1], confidence: 0.8, verified_at: "2026-08-05T10:00:00Z", attribution: "independent", ...over }
}

function emptyV3(): AccountKnowledgeContentV3 {
  return {
    schema_version: 3,
    account_summary: null,
    identity: { company_name: null, legal_name: null, primary_activity: null, headquarters: null, sector: null, business_segment: null, revenue: null, employee_count: null, geographic_reach: [], dynamic: null },
    market_positioning: { account_positioning: null, competitive_environment: null, direct_competitors: [], competitive_advantages: [], opportunities: [], threats: [], policy_and_ambitions: { purpose: null, philosophy: null, culture: [], public_statements: [], ambitions: [], strategic_axes: [], leadership_posture: [], claimed_identity: null } },
    offers_and_customers: { core_business: null, offers: [], covered_domains: [], services: [], service_models: [], complementary_activities: [], uncovered_activities: [], customer_profile: null, customer_segments: [], segment_weights: [], behavioral_trends: [], unmet_needs: [] },
    value_chain: { description: null, value_proposition: null, key_links: [], critical_partners_or_suppliers: [], dependencies: [], vulnerabilities: [], end_customer_relationship: null },
    regulatory_environment: { current_regulations: [], required_certifications: [], compliance_risks: [] },
    trends_and_news: { analysis: null, significant_signal_ids: [] },
    verification_results: [],
    source_coverage: { displayed_claims: 0, sourced_claims: 0, coverage_rate: 1, missing_source_paths: [], stale_source_paths: [], contradiction_paths: [], passed: true },
    generated_at: "2026-08-05T10:00:00Z",
  }
}

function withVerifications(content: AccountKnowledgeContentV3): AccountKnowledgeContentV3 {
  const entries = collectAccountKnowledgeV3Claims(content)
  const verification_results: AccountKnowledgeVerificationResultV3[] = entries.map((e) => ({
    claim_path: e.path,
    verdict: "confirmed",
    checked_at: "2026-08-05T11:00:00Z",
    supporting_source_refs: [e.claim.source_refs[0]],
    contradicting_source_refs: [],
    rationale: null,
  }))
  const displayed = entries.length
  return {
    ...content,
    verification_results,
    source_coverage: { displayed_claims: displayed, sourced_claims: displayed, coverage_rate: 1, missing_source_paths: [], stale_source_paths: [], contradiction_paths: [], passed: true },
  }
}

// ─── 1. Structure statique du workflow ───────────────────────────────────────

describe("intel-030 V3 — structure du workflow", () => {
  it("garde des identifiants et des noms de nœuds uniques", () => {
    const ids = workflow.nodes.map((n) => n.id)
    const names = workflow.nodes.map((n) => n.name)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it("ne référence aucune connexion orpheline", () => {
    const known = new Set(workflow.nodes.map((n) => n.name))
    for (const [src, val] of Object.entries(workflow.connections)) {
      expect(known.has(src)).toBe(true)
      for (const branch of val.main || []) for (const c of branch || []) expect(known.has(c.node)).toBe(true)
    }
  })

  it("reste inactif et n'expose que le secret placeholder (jamais un vrai secret)", () => {
    expect(workflow.active).toBe(false)
    const matches = workflowText.match(/REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET/g) || []
    // 3 crypto V2 + 1 crypto V3.
    expect(matches.length).toBe(4)
    expect(workflowText).not.toMatch(/sk-ant-[A-Za-z0-9]{8}/)
    expect(workflowText).not.toMatch(/eyJ[A-Za-z0-9_-]{20}/)
  })

  it("préserve le chemin V2 (nœuds d'ancrage intacts)", () => {
    for (const anchor of ["Prepare Deterministic Context", "Parse & Validate Output", "Quality Check", "Prepare Callback", "Prepare Failure Callback"]) {
      expect(nodesByName.has(anchor)).toBe(true)
    }
  })

  it("route vers V3 uniquement sur le discriminateur explicite", () => {
    const router = nodesByName.get("Route Account Knowledge Version")
    expect(router).toBeDefined()
    const cond = (router!.parameters as { conditions: { conditions: Array<{ leftValue: string; rightValue: number; operator: { operation: string } }> } }).conditions.conditions[0]
    expect(String(cond.leftValue)).toContain("accountKnowledgeSchemaVersion")
    expect(cond.rightValue).toBe(3)
    expect(cond.operator.operation).toBe("equals")
    const routes = workflow.connections["Route Account Knowledge Version"].main
    expect(routes[0][0].node).toBe("V3 Prepare Context & Research Plan") // TRUE = V3
    expect(routes[1][0].node).toBe("Prepare Deterministic Context") // FALSE = V2
  })

  it("n'écrit jamais directement dans la table companies", () => {
    const writers = workflow.nodes.filter(
      (n) =>
        n.type === "n8n-nodes-base.httpRequest" &&
        /\/rest\/v1\/companies(\?|"|\b)/.test(JSON.stringify(n.parameters)) &&
        ["POST", "PATCH", "PUT", "DELETE"].includes(String((n.parameters as { method?: string }).method || "GET").toUpperCase()),
    )
    expect(writers.map((n) => n.name)).toEqual([])
  })

  it("interdit dans le prompt de génération les snippets et sources non consultées", () => {
    const draft = nodesByName.get("V3 Assemble Draft Prompt")!
    const code = (draft.parameters as { jsCode: string }).jsCode
    expect(code).toMatch(/snippet de moteur de recherche/)
    expect(code).toMatch(/URL non consultee/)
    expect(code).toMatch(/aucune offre publique identifiee/)
    // Bloque explicitement la rubrique reglementations a venir + blocs relocalises.
    expect(code).toMatch(/reglementations a venir/)
    expect(code).toMatch(/organisation[\s\S]*commercial_relationship[\s\S]*operational_activities/)
  })

  it("sépare génération et vérification (deux prompts, deux appels LLM)", () => {
    const draft = (nodesByName.get("V3 Assemble Draft Prompt")!.parameters as { jsCode: string }).jsCode
    const verify = (nodesByName.get("V3 Assemble Verification Prompt")!.parameters as { jsCode: string }).jsCode
    expect(draft).toMatch(/draftSystemPrompt/)
    expect(verify).toMatch(/VERIFICATEUR INDEPENDANT/)
    expect(verify).toMatch(/AUCUN acces a son raisonnement/)
    // Deux nœuds d'appel LLM distincts.
    expect(nodesByName.has("V3 Call LLM (Draft)")).toBe(true)
    expect(nodesByName.has("V3 Call LLM (Verify)")).toBe(true)
  })

  it("liste les sept sections V3 dans l'ordre canonique dans le prompt", () => {
    const code = (nodesByName.get("V3 Assemble Draft Prompt")!.parameters as { jsCode: string }).jsCode
    const idx = ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER.map((s) => code.indexOf(`"${s}"`))
    // identity..trends_and_news apparaissent dans le FORMAT DE SORTIE, dans l'ordre.
    const detailed = idx.slice(1) // sans account_summary (rédigé après, cité séparément)
    for (let i = 1; i < detailed.length; i += 1) {
      expect(detailed[i]).toBeGreaterThan(detailed[i - 1])
    }
  })
})

// ─── 2. Fixtures validées contre le contrat gelé (Lot 2) ─────────────────────

describe("intel-030 V3 — artefacts conformes au validateur canonique", () => {
  it("accepte un artefact V3 dense (toutes sections, attributions, vérifications)", () => {
    const dense = withVerifications({
      ...emptyV3(),
      account_summary: v3Claim({ nature: "analysis" }),
      identity: { ...emptyV3().identity, company_name: v3Claim(), primary_activity: v3Claim(), geographic_reach: [v3Claim(), v3Claim()] },
      market_positioning: {
        ...emptyV3().market_positioning,
        account_positioning: v3Claim(),
        direct_competitors: [v3Claim()],
        policy_and_ambitions: { ...emptyV3().market_positioning.policy_and_ambitions, purpose: v3Claim({ attribution: "institutional" }), public_statements: [v3Claim({ attribution: "institutional" })] },
      },
      offers_and_customers: { ...emptyV3().offers_and_customers, core_business: v3Claim(), uncovered_activities: [v3Claim({ text: "aucune offre publique identifiée sur ce périmètre", nature: "analysis" })] },
      value_chain: { ...emptyV3().value_chain, value_proposition: v3Claim({ nature: "analysis" }) },
      regulatory_environment: { current_regulations: [v3Claim()], required_certifications: [], compliance_risks: [] },
      trends_and_news: { analysis: v3Claim({ nature: "analysis" }), significant_signal_ids: [S2] },
    })
    const result = validateAccountKnowledgeV3(dense)
    expect(result.valid).toBe(true)
  })

  it("accepte un artefact V3 partiel mais honnête (peu de claims, sections vides)", () => {
    const partial = withVerifications({ ...emptyV3(), identity: { ...emptyV3().identity, company_name: v3Claim() } })
    const result = validateAccountKnowledgeV3(partial)
    expect(result.valid).toBe(true)
  })

  it("rejette un artefact dont un résultat de vérification cite un chemin sans claim", () => {
    const artifact = withVerifications({ ...emptyV3(), identity: { ...emptyV3().identity, company_name: v3Claim() } })
    artifact.verification_results.push({ claim_path: "$.identity.revenue", verdict: "confirmed", checked_at: "2026-08-05T11:00:00Z", supporting_source_refs: [S1], contradicting_source_refs: [], rationale: null })
    expect(validateAccountKnowledgeV3(artifact).valid).toBe(false)
  })
})

// ─── 3. L'assemblage réel produit un artefact accepté par le validateur gelé ──

describe("intel-030 V3 — l'assemblage satisfait le contrat gelé", () => {
  it("produit un artefact que validateAccountKnowledgeV3 accepte", () => {
    // Entrée minimale du nœud d'assemblage : brouillon 2 claims + vérifications.
    const draftContent = {
      ...emptyV3(),
      account_summary: { text: "Synthèse du compte fondée sur des faits confirmés.", nature: "analysis", attribution: "independent", source_refs: [S1], confidence: 0.7, verified_at: null },
      identity: { ...emptyV3().identity, company_name: { text: "ACME Industries", nature: "fact", attribution: "independent", source_refs: [S1], confidence: 0.9, verified_at: null } },
    }
    const parseVerificationOutput = {
      runId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      draftContent,
      verifications: [
        { claim_path: "$.account_summary", verdict: "confirmed", supporting_source_refs: [S1], contradicting_source_refs: [], rationale: "corroboré", checked_at: "2026-08-05T12:00:00Z" },
        { claim_path: "$.identity.company_name", verdict: "confirmed", supporting_source_refs: [S2], contradicting_source_refs: [], rationale: null, checked_at: "2026-08-05T12:00:00Z" },
      ],
      relational: { signals: [] },
      dataCutoffAt: "2026-08-05T00:00:00Z",
      catalogue: [],
      externalEvidence: [],
    }

    const registry: Record<string, unknown> = { "V3 Parse Verification": parseVerificationOutput }
    const assembled = runCodeNode("V3 Assemble Artifact", registry, {}) as { accountKnowledge: unknown }
    const result = validateAccountKnowledgeV3(assembled.accountKnowledge)
    expect(result.valid).toBe(true)

    // Le vérificateur a ajouté S2 en source confirmante d'identity.company_name :
    // l'assemblage l'a fusionnée dans les source_refs du claim (supporting ⊆ refs).
    const content = (assembled as { accountKnowledge: AccountKnowledgeContentV3 }).accountKnowledge
    expect(content.identity.company_name?.source_refs).toContain(S2)
    expect(content.verification_results).toHaveLength(2)
  })

  it("exclut de l'assemblage un claim contredit ou insuffisamment prouvé", () => {
    const draftContent = {
      ...emptyV3(),
      identity: {
        ...emptyV3().identity,
        company_name: { text: "ACME", nature: "fact", attribution: "independent", source_refs: [S1], confidence: 0.9, verified_at: null },
        primary_activity: { text: "Rumeur non étayée", nature: "fact", attribution: "independent", source_refs: [S1], confidence: 0.4, verified_at: null },
      },
    }
    const parseVerificationOutput = {
      runId: "r", draftContent, relational: { signals: [] }, dataCutoffAt: "2026-08-05T00:00:00Z", catalogue: [], externalEvidence: [],
      verifications: [
        { claim_path: "$.identity.company_name", verdict: "confirmed", supporting_source_refs: [S1], contradicting_source_refs: [], rationale: null, checked_at: "2026-08-05T12:00:00Z" },
        { claim_path: "$.identity.primary_activity", verdict: "insufficient_evidence", supporting_source_refs: [], contradicting_source_refs: [], rationale: "aucune source", checked_at: "2026-08-05T12:00:00Z" },
      ],
    }
    const registry: Record<string, unknown> = { "V3 Parse Verification": parseVerificationOutput }
    const assembled = runCodeNode("V3 Assemble Artifact", registry, {}) as { accountKnowledge: AccountKnowledgeContentV3 }
    expect(assembled.accountKnowledge.identity.company_name).not.toBeNull()
    expect(assembled.accountKnowledge.identity.primary_activity).toBeNull()
    expect(validateAccountKnowledgeV3(assembled.accountKnowledge).valid).toBe(true)
  })
})
