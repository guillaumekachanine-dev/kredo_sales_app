import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

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

  it("vérifie que la migration SQL retire signaux de folioAnalysisData pour intel-031", () => {
    const migrationSql = readFileSync("supabase/migrations/20260824120000_neutralize_folio_signals_in_ai_contexts.sql", "utf8")

    expect(migrationSql).toContain("(c.metadata->'analysis_data') - 'signaux'")
    expect(migrationSql).toContain("create or replace function public.get_account_issues_context")
  })

  it("vérifie le contrat INTEL-031 n8n sur la neutralisation des signaux FOLIO", () => {
    const wfJson = JSON.parse(readFileSync("n8n/workflows/intel-031-issues-map.json", "utf8"))
    const assemblePromptNode = wfJson.nodes.find((n: { name: string }) => n.name === "Assemble Prompt")

    expect(assemblePromptNode.parameters.jsCode).toContain("FOLIO ne constitue JAMAIS une preuve suffisante d'un problème, événement, dynamique ou trigger actuellement actif")
    expect(assemblePromptNode.parameters.jsCode).toContain("Tout enjeu actuel nécessitant une temporalité récente ou une dynamique active DOIT être soutenu par une source KREDO actuelle")
  })
})
