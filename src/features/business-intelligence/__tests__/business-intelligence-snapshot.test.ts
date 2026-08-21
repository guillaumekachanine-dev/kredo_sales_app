import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  createBusinessIntelligenceSnapshotError,
  mapAccountSignalRows,
} from "../data/get-business-intelligence-snapshot"
import { getDashboardDeviceFromUserAgent } from "@/lib/dashboard/dashboard-device"

describe("Business Intelligence snapshot", () => {
  it("sélectionne summary et recommended_action sur account_signals", () => {
    const source = readFileSync("src/features/business-intelligence/data/get-business-intelligence-snapshot.ts", "utf8")

    expect(source).toContain("id,company_id,title,summary,signal_type,relevance_score,urgency_score,detected_at,recommended_action")
    expect(source).not.toContain('select<any>("id,company_id,title,description,signal_type')
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
})
