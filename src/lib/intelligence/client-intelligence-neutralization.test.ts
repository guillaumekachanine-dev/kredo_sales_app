import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { resolveAccountKnowledge } from "./account-knowledge-state"
import type { AccountKnowledgeContent } from "./account-intelligence-contracts"

describe("Client Intelligence Read Model - neutralisation FOLIO", () => {
  it("neutralise les signaux dans parseAnalyseClient et lit v_active_account_signals", () => {
    const source = readFileSync("src/lib/intelligence/intelligence-data.ts", "utf8")

    // Vérifie que parseAnalyseClient renvoie des signaux vides
    expect(source).toContain("signaux: {\n      actualitesRecentes: [],\n      tendanceCroissance: \"\",\n      recrutementsRecents: \"\",\n      maturiteDigitale: \"\",\n    }")

    // Vérifie que getClientIntelligence lit v_active_account_signals
    expect(source).toContain('.from("v_active_account_signals")')
  })

  it("garantit que CompanyIdentityDrawer ne consomme plus analysis_data.signaux", () => {
    const source = readFileSync("src/components/accounts-contacts/CompanyIdentityDrawer.tsx", "utf8")

    expect(source).not.toContain("signaux.actualites_recentes")
    expect(source).not.toContain("signaux.tendance_croissance")
    expect(source).not.toContain("signaux.recrutements_recents")
    expect(source).not.toContain("signaux.indices_maturite_digitale")
    expect(source).not.toContain("analysisData.signaux")
  })

  it("filtre les faits frictions_and_signals portant la provenance folio_legacy dans resolveAccountKnowledge", () => {
    const legacyV1Artifact: AccountKnowledgeContent = {
      schema_version: 1,
      identity_positioning: [
        { text: "Entreprise familiale créée en 1923", provenance: "folio_legacy" },
        { text: "Leader régional en BTP", provenance: "relational" },
      ],
      commercial_relationship: [
        { text: "Client historique", provenance: "folio_legacy" },
      ],
      organisation_observed: [
        { text: "Direction générale à Aix", provenance: "folio_legacy" },
      ],
      frictions_and_signals: [
        { text: "Maturité digitale faible observée en 2024", provenance: "folio_legacy" },
        { text: "Recrutements récents annoncés sur radio", provenance: "folio_legacy" },
        { text: "Nouveau DSI arrivé en 2026", provenance: "relational" },
        { text: "Tension supposée sur les délais de livraison", provenance: "inferred" },
      ],
      open_questions: [
        { text: "Quel est le budget IT 2026 ?", provenance: "inferred" },
      ],
      key_contacts: [],
      generated_at: "2026-07-07T12:00:00.000Z",
    }

    const { state } = resolveAccountKnowledge([
      {
        id: "result-1",
        created_at: "2026-07-07T12:00:00Z",
        content_json: legacyV1Artifact,
      },
    ])

    expect(state).not.toBeNull()
    expect(state?.version).toBe(1)
    if (state && state.version === 1) {
      // frictions_and_signals : les 2 éléments folio_legacy sont filtrés
      expect(state.data.frictions_and_signals).toHaveLength(2)
      expect(state.data.frictions_and_signals).toEqual([
        { text: "Nouveau DSI arrivé en 2026", provenance: "relational" },
        { text: "Tension supposée sur les délais de livraison", provenance: "inferred" },
      ])

      // Les autres sections conservent leurs données historiques folio_legacy
      expect(state.data.identity_positioning).toHaveLength(2)
      expect(state.data.identity_positioning[0].provenance).toBe("folio_legacy")
      expect(state.data.commercial_relationship).toHaveLength(1)
      expect(state.data.commercial_relationship[0].provenance).toBe("folio_legacy")
      expect(state.data.organisation_observed).toHaveLength(1)
      expect(state.data.organisation_observed[0].provenance).toBe("folio_legacy")
    }
  })

  it("vérifie que la migration SQL retire signaux de folioAnalysisData pour intel-030 et intel-031", () => {
    const migrationSql = readFileSync("supabase/migrations/20260824120000_neutralize_folio_signals_in_ai_contexts.sql", "utf8")

    expect(migrationSql).toContain("(c.metadata->'analysis_data') - 'signaux'")
    expect(migrationSql).toContain("create or replace function public.get_account_knowledge_context")
    expect(migrationSql).toContain("create or replace function public.get_account_issues_context")
  })

  it("vérifie le contrat INTEL-030 n8n sur frictions_and_signals", () => {
    const wfJson = JSON.parse(readFileSync("n8n/workflows/intel-030-account-knowledge.json", "utf8"))
    const assemblePromptNode = wfJson.nodes.find((n: { name: string }) => n.name === "Assemble Prompt")

    expect(assemblePromptNode.parameters.jsCode).toContain('"frictions_and_signals" ne peut JAMAIS être dérivé de FOLIO_LEGACY')
    expect(assemblePromptNode.parameters.jsCode).toContain('porter la provenance "folio_legacy"')
  })

  it("vérifie le contrat INTEL-031 n8n sur la neutralisation des signaux FOLIO", () => {
    const wfJson = JSON.parse(readFileSync("n8n/workflows/intel-031-issues-map.json", "utf8"))
    const assemblePromptNode = wfJson.nodes.find((n: { name: string }) => n.name === "Assemble Prompt")

    expect(assemblePromptNode.parameters.jsCode).toContain("FOLIO ne constitue JAMAIS une preuve suffisante d'un problème, événement, dynamique ou trigger actuellement actif")
    expect(assemblePromptNode.parameters.jsCode).toContain("Tout enjeu actuel nécessitant une temporalité récente ou une dynamique active DOIT être soutenu par une source KREDO actuelle")
  })
})
