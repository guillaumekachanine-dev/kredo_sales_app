import { describe, expect, it } from "vitest"

import {
  buildSourceIndex,
  hasMarketPositioningContent,
  hasOrganisationContent,
  hasValueChainContent,
} from "./AccountKnowledgeV2Blocks"
import type { AccountKnowledgeContentV2 } from "@/lib/intelligence/account-intelligence-contracts"

const SOURCE_A = "11111111-1111-4111-8111-111111111111"

function claim(text = "Affirmation") {
  return { text, nature: "fact" as const, source_refs: [SOURCE_A], confidence: 0.8, verified_at: null }
}

function emptyV2(): AccountKnowledgeContentV2 {
  return {
    schema_version: 2,
    identity: { primary_activity: null, headquarters: null, revenue: null, employee_count: null, dynamic: null },
    account_summary: null,
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
    organisation: { departments: [], strategic_weight: null, key_contacts: [], process_observations: [] },
    open_questions: [],
    source_coverage: {
      displayed_claims: 0,
      sourced_claims: 0,
      coverage_rate: 1,
      missing_source_paths: [],
      stale_source_paths: [],
      contradiction_paths: [],
      passed: true,
    },
    generated_at: "2026-08-04T10:00:00.000Z",
  }
}

describe("détection de contenu V2 par section", () => {
  it("ne déclare aucune section sur un artefact entièrement vide", () => {
    const content = emptyV2()

    expect(hasMarketPositioningContent(content)).toBe(false)
    expect(hasValueChainContent(content)).toBe(false)
    expect(hasOrganisationContent(content)).toBe(false)
  })

  it("déclare une section dès qu'un seul champ la porte", () => {
    const positioning = emptyV2()
    positioning.market_positioning.threats = [claim("Gel budgétaire groupe")]
    expect(hasMarketPositioningContent(positioning)).toBe(true)

    const valueChain = emptyV2()
    valueChain.company_value_chain.description = claim("Banque de détail régionale")
    expect(hasValueChainContent(valueChain)).toBe(true)

    const organisation = emptyV2()
    organisation.organisation.key_contacts = [
      { contact_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", role_summary: claim("DSI") },
    ]
    expect(hasOrganisationContent(organisation)).toBe(true)
  })

  it("reflète l'artefact réel de Banque Populaire Méditerranée", () => {
    // Sections effectivement produites par le run du 2026-08-04 : positionnement
    // (menace + opportunité), chaîne de valeur (description) et organisation
    // (départements, poids stratégique, 4 interlocuteurs, process observés).
    const content = emptyV2()
    content.market_positioning.threats = [claim("Budget gelé au niveau groupe")]
    content.market_positioning.opportunities = [claim("Dynamique commerciale soutenue en 2024")]
    content.company_value_chain.description = claim("Maturité digitale intermédiaire à avancée")
    content.organisation.departments = [claim("DSI, Infrastructure, Réseaux, Data, SI RH")]

    expect(hasMarketPositioningContent(content)).toBe(true)
    expect(hasValueChainContent(content)).toBe(true)
    expect(hasOrganisationContent(content)).toBe(true)
  })
})

describe("buildSourceIndex", () => {
  it("indexe les sources par identifiant", () => {
    const index = buildSourceIndex([
      { id: SOURCE_A, name: "Registre public", type: "regulatory_filing", url: "https://example.org", publishedAt: null },
    ])

    expect(index.get(SOURCE_A)?.name).toBe("Registre public")
    // Une source citée mais non résolue reste absente : le rendu l'affiche
    // comme « source indisponible » plutôt que de masquer l'affirmation.
    expect(index.get("22222222-2222-4222-8222-222222222222")).toBeUndefined()
  })
})
