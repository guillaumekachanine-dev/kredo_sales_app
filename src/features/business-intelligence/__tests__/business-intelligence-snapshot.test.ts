import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  createBusinessIntelligenceSnapshotError,
  mapAccountSignalRows,
} from "../data/get-business-intelligence-snapshot"
import { getDashboardDeviceFromUserAgent } from "@/lib/dashboard/dashboard-device"

describe("Business Intelligence snapshot", () => {
  it("sélectionne summary et recommended_action sur v_active_account_signals", () => {
    const source = readFileSync("src/features/business-intelligence/data/get-business-intelligence-snapshot.ts", "utf8")

    expect(source).toContain('supabase.from("v_active_account_signals").select<AccountSignalRow>("id,company_id,title,summary,signal_type,relevance_score,urgency_score,detected_at,recommended_action")')
    expect(source).not.toContain('supabase.from("account_signals")')
  })

  it("mappe summary et recommended_action sans les remplacer par des valeurs vides", () => {
    const [signal] = mapAccountSignalRows([{
      id: "signal-1",
      company_id: "account-1",
      title: "Échéance réglementaire",
      summary: "Un changement réglementaire est imminent.",
      signal_type: "regulation",
      relevance_score: "0.8",
      urgency_score: 91,
      detected_at: "2026-07-17T00:00:00.000Z",
      recommended_action: "Préparer un atelier.",
    }])

    expect(signal).toMatchObject({
      summary: "Un changement réglementaire est imminent.",
      recommendedAction: "Préparer un atelier.",
      relevanceScore: 0.8,
      urgencyScore: 91,
    })
    expect(mapAccountSignalRows([{
      id: "signal-2",
      company_id: "account-1",
      title: "Signal sans action",
      summary: null,
      signal_type: "regulation",
      relevance_score: 1,
      urgency_score: 1,
      detected_at: "2026-07-17T00:00:00.000Z",
      recommended_action: null,
    }]).at(0)?.recommendedAction).toBeNull()
  })

  it("retourne explicitement un snapshot error au lieu d'un ready vide", () => {
    const snapshot = createBusinessIntelligenceSnapshotError()

    expect(snapshot.state).toBe("error")
    expect(snapshot.accounts).toEqual([])
    expect(snapshot.signals).toEqual([])
    expect(snapshot.sectors).toEqual([])
  })

  it("conserve les catégories du snapshot réussi", () => {
    const source = readFileSync("src/features/business-intelligence/data/get-business-intelligence-snapshot.ts", "utf8")

    expect(source).toContain('state: "ready"')
    expect(source).toContain("accounts: portfolioSnapshot.accounts")
    expect(source).toContain("signals,")
    expect(source).toContain("sectors: activationModel.sectors")
    expect(source).toContain("getSectorKnowledgeReadModels")
  })

  it("rend les erreurs explicites sur Desktop et Mobile", () => {
    const state = readFileSync("src/features/business-intelligence/states/BusinessIntelligenceErrorState.tsx", "utf8")
    const page = readFileSync("src/app/(app)/intelligence/page.tsx", "utf8")

    expect(state).toContain("Workspace indisponible")
    expect(state).toContain("Réessayer")
    expect(state).toContain("Changer de segment")
    expect(page).toContain("<BusinessIntelligenceErrorState")
    expect(page).toContain("device={device}")
  })

  it("sélectionne la branche Mobile avec un User-Agent iPhone et Desktop sinon", () => {
    expect(getDashboardDeviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)")).toBe("mobile")
    expect(getDashboardDeviceFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("desktop")
  })

  it("ne retient pas de signal FOLIO archivé comme topSignal lorsque seuls les signaux actifs sont projetés", async () => {
    const { buildAccountPrioritizationModel } = await import("../models/build-account-prioritization-model")
    const { buildAccountAttackModel } = await import("../models/build-account-attack-model")
    const { makeBusinessIntelligenceSnapshot, makePortfolioAccount } = await import("./business-intelligence-test-fixtures")

    const mockSnapshot = makeBusinessIntelligenceSnapshot({
      accounts: [makePortfolioAccount("acc-1", {
        name: "Acme Corp",
        sectorId: "sec-1",
        segmentId: "seg-1",
        reachScore: 50,
      })],
      signals: [
        // Signal KREDO actif légitime
        {
          id: "sig-kredo",
          companyId: "acc-1",
          title: "Signal KREDO Récent",
          summary: "Expansion confirmée",
          category: "growth",
          relevanceScore: 0.9,
          urgencyScore: 85,
          detectedAt: "2026-08-20T10:00:00.000Z",
          recommendedAction: "Proposer un RDV",
        },
      ],
    })

    const prioritization = buildAccountPrioritizationModel(mockSnapshot)
    expect(prioritization[0].topSignal?.id).toBe("sig-kredo")

    const attack = buildAccountAttackModel(mockSnapshot, "acc-1")
    expect(attack?.topSignal?.id).toBe("sig-kredo")

    // Si aucun signal actif dans snapshot.signals, topSignal doit être null (pas de fallback FOLIO)
    const emptySignalSnapshot = makeBusinessIntelligenceSnapshot({
      accounts: [makePortfolioAccount("acc-1", {
        name: "Acme Corp",
        sectorId: "sec-1",
        segmentId: "seg-1",
        reachScore: 50,
      })],
      signals: [],
    })
    const prioritizationEmpty = buildAccountPrioritizationModel(emptySignalSnapshot)
    expect(prioritizationEmpty[0].topSignal).toBeNull()

    const attackEmpty = buildAccountAttackModel(emptySignalSnapshot, "acc-1")
    expect(attackEmpty?.topSignal).toBeNull()
  })
})
