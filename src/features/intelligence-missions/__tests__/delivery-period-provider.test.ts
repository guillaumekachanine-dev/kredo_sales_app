import { describe, expect, it } from "vitest"
import {
  COLLABORATOR_ACTIVITY_QUERY_LIMIT,
  DELIVERY_PERIOD_WEIGHT,
  deliveryPeriodProvider,
  deriveHydrationWindow,
  formatCurrencyDiff,
  formatMonth,
  formatPtsDiff,
  getQuarterStart,
  MISSIONS_QUERY_LIMIT,
  PNL_MONTHLY_QUERY_LIMIT,
} from "../data/corpus/delivery-period-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const SELECTOR = {
  kind: "delivery_period",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
} as const

const DATASET: FakeDataset = {
  pnl_monthly: [
    {
      id: "pnl-2026-06",
      workspace_id: WORKSPACE,
      period_month: "2026-06-01",
      revenue_total: 262880,
      gross_margin_value: 126235,
      gross_margin_percent: 48.02,
      operating_profit_value: 52576,
      operating_profit_percent: 20.0,
      direct_costs_salaries: 110000,
      direct_costs_subcontractors: 26645,
      structural_costs_rent: 8000,
      structural_costs_it: 4000,
      structural_costs_mgmt: 12000,
      source: "cra_derived",
    },
    {
      id: "pnl-2026-07",
      workspace_id: WORKSPACE,
      period_month: "2026-07-01",
      revenue_total: 197430,
      gross_margin_value: 56780,
      gross_margin_percent: 28.76,
      operating_profit_value: 15794,
      operating_profit_percent: 8.0,
      direct_costs_salaries: 115000,
      direct_costs_subcontractors: 25650,
      structural_costs_rent: 8000,
      structural_costs_it: 4000,
      structural_costs_mgmt: 12000,
      source: "cra_derived",
    },
    {
      id: "pnl-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      period_month: "2026-07-01",
      revenue_total: 999999,
      gross_margin_value: 500000,
      gross_margin_percent: 50.0,
      operating_profit_value: 200000,
      operating_profit_percent: 20.0,
      source: "Ne doit jamais sortir",
    },
    {
      id: "pnl-hors-fenetre",
      workspace_id: WORKSPACE,
      period_month: "2025-12-01",
      revenue_total: 100000,
      gross_margin_value: 30000,
      gross_margin_percent: 30.0,
      operating_profit_value: 10000,
      operating_profit_percent: 10.0,
      source: "Hors période",
    },
  ],
  v_collaborator_activity_summary: [
    {
      collaborator_id: "collab-1",
      full_name: "Alice Dupont",
      period_start: "2026-07-01",
      business_days: 22,
      billable_days: 18,
      non_billable_days: 2,
      pto_days: 2,
      sick_days: 0,
      activity_rate_percent: 81.82,
      revenue: 14400,
      employer_cost: 8500,
      real_margin: 5900,
      real_margin_pct: 40.97,
      theoretical_margin_pct: 45.0,
      daily_employer_cost: 386.36,
      cra_status: "validated",
      collab_status: "active",
      tjm_snapshot: 800,
      cjm_snapshot: 400,
      // 🔴 Colonne présente en base mais JAMAIS sélectionnée ni exposée par le provider
      gross_annual: 95000,
    },
    {
      collaborator_id: "collab-2",
      full_name: "Bob Martin",
      period_start: "2026-07-01",
      business_days: 22,
      billable_days: 10,
      non_billable_days: 4,
      pto_days: 0,
      sick_days: 8,
      activity_rate_percent: 45.45,
      revenue: 7500,
      employer_cost: 8000,
      real_margin: -500,
      real_margin_pct: -6.67,
      theoretical_margin_pct: 35.0,
      daily_employer_cost: 363.64,
      cra_status: "submitted",
      collab_status: "active",
      tjm_snapshot: 750,
      cjm_snapshot: 400,
      gross_annual: 80000,
    },
  ],
  v_profitability_alerts: [
    {
      collaborator_id: "collab-2",
      full_name: "Bob Martin",
      period_start: "2026-07-01",
      cra_status: "submitted",
      activity_rate_percent: 45.45,
      real_margin_pct: -6.67,
      alert_negative_margin: true,
      alert_low_margin: false,
      alert_low_activity: true,
      alert_high_sick_days: true,
      alert_cra_not_validated: true,
    },
    {
      // Collaborateur sans aucune alerte active -> ne doit produire aucun item
      collaborator_id: "collab-1",
      full_name: "Alice Dupont",
      period_start: "2026-07-01",
      cra_status: "validated",
      activity_rate_percent: 81.82,
      real_margin_pct: 40.97,
      alert_negative_margin: false,
      alert_low_margin: false,
      alert_low_activity: false,
      alert_high_sick_days: false,
      alert_cra_not_validated: false,
    },
  ],
  v_mission_quarterly_revenue: [
    {
      mission_id: "mission-1",
      mission_title: "Refonte Cloud",
      mission_status: "active",
      company_id: "comp-1",
      company_name: "Acme Corp",
      consultant_name: "Alice Dupont",
      practice: "Cloud & DevOps",
      quarter_label: "Q3 2026",
      quarter_start: "2026-07-01",
      revenue: 43200,
      cost: 25500,
      gross_margin: 17700,
      gross_margin_pct: 40.97,
      billable_days: 54,
      role_title: "Lead DevOps",
      seniority: "Senior",
      workspace_id: WORKSPACE,
    },
    {
      mission_id: "mission-autre-workspace",
      mission_title: "Mission Voisine",
      mission_status: "active",
      company_name: "Autre Société",
      quarter_label: "Q3 2026",
      quarter_start: "2026-07-01",
      revenue: 100000,
      workspace_id: OTHER_WORKSPACE,
    },
  ],
  missions: [
    {
      id: "mission-1",
      workspace_id: WORKSPACE,
      title: "Refonte Cloud",
      status: "active",
      tjm: 800,
      cjm: 400,
      gross_margin_pct: 50.0,
      practice: "Cloud & DevOps",
      start_date: "2026-01-01",
      end_date: null,
    },
    {
      id: "mission-terminee-avant-fenetre",
      workspace_id: WORKSPACE,
      title: "Mission Ancienne",
      status: "completed",
      tjm: 600,
      cjm: 350,
      gross_margin_pct: 41.67,
      practice: "Data",
      start_date: "2025-01-01",
      end_date: "2026-03-31",
    },
    {
      id: "mission-future",
      workspace_id: WORKSPACE,
      title: "Mission Future",
      status: "draft",
      tjm: 900,
      cjm: 450,
      gross_margin_pct: 50.0,
      practice: "AI",
      start_date: "2026-08-15",
      end_date: "2026-12-31",
    },
    {
      id: "mission-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      title: "Mission Ne doit jamais sortir",
      status: "active",
      tjm: 1000,
      cjm: 500,
      gross_margin_pct: 50.0,
      practice: "Cyber",
      start_date: "2026-01-01",
      end_date: null,
    },
  ],
}

describe("deliveryPeriodProvider", () => {
  it("déclare une exécution sous RLS utilisateur et un poids de 95", () => {
    expect(deliveryPeriodProvider.execution).toBe("user_rls")
    expect(deliveryPeriodProvider.kind).toBe("delivery_period")
    expect(deliveryPeriodProvider.weight).toBe(DELIVERY_PERIOD_WEIGHT)
    expect(DELIVERY_PERIOD_WEIGHT).toBe(95)
    expect(PNL_MONTHLY_QUERY_LIMIT).toBe(50)
    expect(COLLABORATOR_ACTIVITY_QUERY_LIMIT).toBe(500)
    expect(MISSIONS_QUERY_LIMIT).toBe(100)
  })

  // Cas obligatoire 1 : dérivation de fenêtre sur 4 mois calendaires
  it("dérive la fenêtre d'hydratation sur 4 mois calendaires à partir du mois analysé", async () => {
    const { windowStart, windowEnd } = deriveHydrationWindow("2026-07-01", "2026-07-31")
    expect(windowStart).toBe("2026-04-01")
    expect(windowEnd).toBe("2026-07-31")

    // Cas de passage d'année
    const janWindow = deriveHydrationWindow("2026-01-01", "2026-01-31")
    expect(janWindow.windowStart).toBe("2025-10-01")
    expect(janWindow.windowEnd).toBe("2026-01-31")

    const fake = createFakeSupabase(DATASET)
    await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    // Vérifie que les requêtes portent les bonnes bornes de dates
    const pnlCall = fake.calls.find((c) => c.table === "pnl_monthly")
    expect(pnlCall).toBeDefined()
    expect(pnlCall?.eq).toContainEqual(["workspace_id", WORKSPACE])

    const activityCall = fake.calls.find((c) => c.table === "v_collaborator_activity_summary")
    expect(activityCall).toBeDefined()

    const alertsCall = fake.calls.find((c) => c.table === "v_profitability_alerts")
    expect(alertsCall).toBeDefined()

    const quarterlyCall = fake.calls.find((c) => c.table === "v_mission_quarterly_revenue")
    expect(quarterlyCall).toBeDefined()
    expect(quarterlyCall?.eq).toContainEqual(["workspace_id", WORKSPACE])

    const missionsCall = fake.calls.find((c) => c.table === "missions")
    expect(missionsCall).toBeDefined()
    expect(missionsCall?.eq).toContainEqual(["workspace_id", WORKSPACE])
  })

  // Cas obligatoire 2 : saturation d'une borne de requête
  it("trace l'atteinte d'une borne de requête via une exclusion provider_limit", async () => {
    const saturated: FakeDataset = {
      pnl_monthly: Array.from({ length: PNL_MONTHLY_QUERY_LIMIT }, (_, index) => ({
        id: `pnl-${index}`,
        workspace_id: WORKSPACE,
        period_month: "2026-07-01",
        revenue_total: 100000,
        gross_margin_value: 30000,
        gross_margin_percent: 30.0,
        operating_profit_value: 10000,
        operating_profit_percent: 10.0,
        source: "cra_derived",
      })),
      v_collaborator_activity_summary: [],
      v_profitability_alerts: [],
      v_mission_quarterly_revenue: [],
      missions: [],
    }

    const fake = createFakeSupabase(saturated)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    expect(result.items).toHaveLength(PNL_MONTHLY_QUERY_LIMIT)
    expect(result.exclusions).toHaveLength(1)
    expect(result.exclusions[0]).toEqual({
      ref: { kind: "delivery_period", table: "pnl_monthly", id: "__query_limit__" },
      title: `P&L mensuel : borne de requête atteinte (${PNL_MONTHLY_QUERY_LIMIT})`,
      provenance: "pnl_monthly",
      reason: "provider_limit",
    })
  })

  // Cas obligatoire 3 : 🔴 RÈGLE DE CONFIDENTIALITÉ — gross_annual absent de tout content
  it("ne sélectionne ni n'expose jamais gross_annual dans aucun content rendu", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const allContent = result.items.map((item) => item.content).join("\n")
    const serialized = JSON.stringify(result)

    // Aucun montant brut nominatif n'apparaît
    expect(allContent).not.toContain("95000")
    expect(allContent).not.toContain("95 000")
    expect(allContent).not.toContain("80000")
    expect(allContent).not.toContain("80 000")
    expect(allContent.toLowerCase()).not.toContain("gross_annual")
    expect(allContent.toLowerCase()).not.toContain("salaire annuel")

    expect(serialized).not.toContain("95000")
    expect(serialized).not.toContain("95 000")
    expect(serialized).not.toContain("80000")
    expect(serialized).not.toContain("80 000")
  })

  // Cas obligatoire 4 : v_profitability_alerts sans alerte active ne produit aucun item
  it("n'émet aucun item pour une ligne v_profitability_alerts sans aucune alerte active", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const alertItems = result.items.filter(
      (item) => item.ref.table === "v_profitability_alerts",
    )

    // Seul Bob Martin a des alertes actives
    expect(alertItems).toHaveLength(1)
    expect(alertItems[0].ref.id).toBe("collab-2:2026-07-01:alerts")
    expect(alertItems[0].content).toContain("Marge négative")
    expect(alertItems[0].content).toContain("Activité basse (< 70 %)")
    expect(alertItems[0].content).toContain("Arrêt maladie élevé (> 5 j)")
    expect(alertItems[0].content).toContain("CRA non validé")

    // Alice Dupont n'a aucune alerte active : zéro item émis pour elle
    const aliceAlert = alertItems.find((item) => item.content.includes("Alice Dupont"))
    expect(aliceAlert).toBeUndefined()
  })

  // Cas obligatoire 5 : stabilité et déterminisme des ref.id composites
  it("génère des ref.id composites stables et déterministes", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const refs = result.items.map((item) => ({
      table: item.ref.table,
      id: item.ref.id,
    }))

    expect(refs).toContainEqual({
      table: "pnl_monthly",
      id: "pnl-2026-06",
    })
    expect(refs).toContainEqual({
      table: "pnl_monthly",
      id: "pnl-2026-07",
    })
    expect(refs).toContainEqual({
      table: "v_collaborator_activity_summary",
      id: "collab-1:2026-07-01",
    })
    expect(refs).toContainEqual({
      table: "v_profitability_alerts",
      id: "collab-2:2026-07-01:alerts",
    })
    expect(refs).toContainEqual({
      table: "v_mission_quarterly_revenue",
      id: "mission-1:2026-07-01",
    })
    expect(refs).toContainEqual({
      table: "missions",
      id: "mission-1",
    })
  })

  // Cas obligatoire 6 : isolation de workspace stricte
  it("ne remonte jamais de données d'un autre workspace", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("Ne doit jamais sortir")
    expect(serialized).not.toContain("Autre Société")
    expect(serialized).not.toContain("pnl-autre-workspace")
    expect(serialized).not.toContain("mission-autre-workspace")
  })

  // Cas complémentaire 7 : pré-calcul des écarts signés vs mois précédent
  it("pré-calcule les montants, marges et écarts signés vs mois précédent sur pnl_monthly", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const pnlJuly = result.items.find((item) => item.ref.id === "pnl-2026-07")
    expect(pnlJuly).toBeDefined()
    expect(pnlJuly?.content).toContain("Marge brute : 28,76 % (−19,26 pts vs juin 2026)")
    expect(pnlJuly?.content).toContain("Chiffre d'affaires : 197 430 € (−65 450 € (−24,90 %) vs juin 2026)")
    expect(pnlJuly?.content).toContain("Résultat d'exploitation : 8 % (−12 pts vs juin 2026)")
  })

  // Cas complémentaire 8 : filtrage des missions actives sur la fenêtre
  it("filtre les missions pour ne conserver que celles actives sur la fenêtre", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await deliveryPeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const missionIds = result.items
      .filter((item) => item.ref.table === "missions")
      .map((item) => item.ref.id)

    expect(missionIds).toContain("mission-1")
    expect(missionIds).not.toContain("mission-terminee-avant-fenetre")
    expect(missionIds).not.toContain("mission-future")
  })

  // Cas complémentaire 9 : propagation des erreurs de lecture
  it("lève une exception explicite en cas d'erreur de lecture Supabase", async () => {
    const fake = createFakeSupabase(DATASET, { errors: { pnl_monthly: "Erreur réseau DB" } })
    await expect(
      deliveryPeriodProvider.resolve({ workspaceId: WORKSPACE, supabase: fake.supabase }, SELECTOR),
    ).rejects.toThrow(/Lecture du P&L mensuel impossible : Erreur réseau DB/i)
  })

  // Helpers unitaires de formatage
  describe("helpers de calcul et formatage", () => {
    it("calcule correctement le début de trimestre civil", () => {
      expect(getQuarterStart("2026-01-15")).toBe("2026-01-01")
      expect(getQuarterStart("2026-03-31")).toBe("2026-01-01")
      expect(getQuarterStart("2026-04-01")).toBe("2026-04-01")
      expect(getQuarterStart("2026-07-31")).toBe("2026-07-01")
      expect(getQuarterStart("2026-11-20")).toBe("2026-10-01")
    })

    it("formate les mois en français", () => {
      expect(formatMonth("2026-06-01")).toBe("juin 2026")
      expect(formatMonth("2026-07")).toBe("juillet 2026")
    })

    it("formate les écarts de points avec signe explicite", () => {
      expect(formatPtsDiff(28.76, 48.02, "juin 2026")).toBe("−19,26 pts vs juin 2026")
      expect(formatPtsDiff(50, 48, "juin 2026")).toBe("+2 pts vs juin 2026")
      expect(formatPtsDiff(48, 48, "juin 2026")).toBe("0 pt vs juin 2026")
    })

    it("formate les écarts financiers en devise et pourcentage", () => {
      expect(formatCurrencyDiff(197430, 262880, "juin 2026")).toBe("−65 450 € (−24,90 %) vs juin 2026")
      expect(formatCurrencyDiff(110000, 100000, "juin 2026")).toBe("+10 000 € (+10 %) vs juin 2026")
    })
  })
})
