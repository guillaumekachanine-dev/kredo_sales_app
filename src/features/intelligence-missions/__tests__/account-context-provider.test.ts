import { describe, expect, it } from "vitest"
import { accountContextProvider } from "../data/corpus/account-context-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const MY_WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"
const COMPANY_ID = "33333333-3333-3333-3333-333333333333"
const SIGNAL_ID = "44444444-4444-4444-4444-444444444444"
const CONTACT_ID = "55555555-5555-5555-5555-555555555555"
const PERSON_ID = "66666666-6666-6666-6666-666666666666"

function datasetForWorkspace(workspaceId: string): FakeDataset {
  return {
    companies: [
      {
        id: COMPANY_ID,
        workspace_id: workspaceId,
        name: "Concurrent SA",
        legal_name: "Concurrent Société Anonyme",
        description: "Équipementier de rang 1",
        sector: "Industrie",
        segment: "Aéronautique",
        website: "https://concurrent.example",
        lifecycle_status: "prospect",
        relation_type: "prospect",
        priority: "haute",
        employee_count: 1200,
        size_band: "1001-5000",
        hq_location: "Toulouse",
        siren: "123456789",
        naf_code: "3030Z",
        classification_note: "Classé en 2026",
        updated_at: "2026-08-01T10:00:00Z",
      },
    ],
    v_active_account_signals: [
      {
        id: SIGNAL_ID,
        workspace_id: workspaceId,
        company_id: COMPANY_ID,
        title: "Ouverture d'un site à Nantes",
        summary: "Annonce presse du 12 juillet",
        recommended_action: "Prendre contact avec la DSI",
        score_justification: "Source primaire confirmée",
        signal_category: "expansion",
        signal_type: "implantation",
        detected_at: "2026-07-12T00:00:00Z",
        global_score: 82,
      },
    ],
    contacts: [
      {
        id: CONTACT_ID,
        workspace_id: workspaceId,
        person_id: PERSON_ID,
        company_id: COMPANY_ID,
        job_title: "DSI",
        department: "Systèmes d'information",
        relationship_role: "decideur",
        decision_power: "fort",
        relationship_level: "etabli",
        is_priority: true,
        updated_at: "2026-06-01T10:00:00Z",
      },
    ],
    persons: [{ id: PERSON_ID, workspace_id: workspaceId, full_name: "Camille Duret" }],
  }
}

const selector = { kind: "account_context", companyId: COMPANY_ID } as const

describe("accountContextProvider — garde de workspace", () => {
  it("ne rend AUCUNE ligne quand le compte appartient à un autre workspace", async () => {
    // Le faux client applique réellement les filtres : ce test échoue si le
    // `.eq("workspace_id", ctx.workspaceId)` du verrou d'entrée est retiré, car la
    // ligne du workspace voisin remonterait alors et produirait un item.
    const fake = createFakeSupabase(datasetForWorkspace(OTHER_WORKSPACE))

    const result = await accountContextProvider.resolve(
      { workspaceId: MY_WORKSPACE, supabase: fake.supabase },
      selector,
    )

    expect(result.items).toEqual([])
    expect(result.exclusions).toHaveLength(1)
    expect(result.exclusions[0]).toMatchObject({
      reason: "not_found",
      ref: { kind: "account_context", table: "companies", id: COMPANY_ID },
    })
  })

  it("n'interroge AUCUNE autre table tant que le compte n'est pas validé", async () => {
    // Le verrou est un verrou d'entrée, pas un filtre a posteriori : ni les signaux
    // ni les contacts du compte étranger ne doivent être lus.
    const fake = createFakeSupabase(datasetForWorkspace(OTHER_WORKSPACE))

    await accountContextProvider.resolve(
      { workspaceId: MY_WORKSPACE, supabase: fake.supabase },
      selector,
    )

    expect(fake.tablesRead()).toEqual(["companies"])
  })

  it("pose un filtre de workspace explicite sur CHAQUE lecture", async () => {
    const fake = createFakeSupabase(datasetForWorkspace(MY_WORKSPACE))

    await accountContextProvider.resolve(
      { workspaceId: MY_WORKSPACE, supabase: fake.supabase },
      selector,
    )

    expect(fake.calls.length).toBeGreaterThan(1)
    for (const call of fake.calls) {
      expect(call.eq).toContainEqual(["workspace_id", MY_WORKSPACE])
    }
  })

  it("ne s'exécute jamais en service-role : il déclare `user_rls`", () => {
    expect(accountContextProvider.execution).toBe("user_rls")
  })
})

describe("accountContextProvider — hydratation", () => {
  it("rend l'identité, les signaux et les contacts du compte du workspace", async () => {
    const fake = createFakeSupabase(datasetForWorkspace(MY_WORKSPACE))

    const result = await accountContextProvider.resolve(
      { workspaceId: MY_WORKSPACE, supabase: fake.supabase },
      selector,
    )

    expect(result.exclusions).toEqual([])
    const tables = result.items.map((item) => item.ref.table)
    expect(tables).toEqual(["companies", "account_signals", "contacts"])

    const identity = result.items[0]
    expect(identity.title).toBe("Concurrent SA")
    expect(identity.content).toContain("Description : Équipementier de rang 1")
    expect(identity.chars).toBe(identity.content.length)

    const signal = result.items[1]
    // La référence pointe la table résolvable, pas la vue : L3 doit pouvoir la relire.
    expect(signal.ref).toEqual({
      kind: "account_context",
      table: "account_signals",
      id: SIGNAL_ID,
    })
    expect(signal.provenance).toBe("v_active_account_signals")
    expect(signal.content).toContain("Action recommandée : Prendre contact avec la DSI")

    const contact = result.items[2]
    expect(contact.title).toBe("Camille Duret")
    expect(contact.content).toContain("Rôle dans la relation : decideur")
  })

  it("remonte une erreur de lecture plutôt que de rendre un corpus amputé", async () => {
    const fake = createFakeSupabase(datasetForWorkspace(MY_WORKSPACE), {
      errors: { v_active_account_signals: "timeout" },
    })

    await expect(
      accountContextProvider.resolve(
        { workspaceId: MY_WORKSPACE, supabase: fake.supabase },
        selector,
      ),
    ).rejects.toThrow(/signaux du compte/i)
  })
})
