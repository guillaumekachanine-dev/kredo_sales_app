import { describe, expect, it } from "vitest"
import {
  ACCOUNT_DELIVERY_WEIGHT,
  accountDeliveryProvider,
  CRA_QUERY_LIMIT,
  deriveAccountDeliveryWindow,
  formatCurrency,
  formatMonth,
  formatPercent,
  getQuarterStart,
  MISSIONS_QUERY_LIMIT,
  PROFITABILITY_ALERTS_QUERY_LIMIT,
  QUARTERLY_REVENUE_QUERY_LIMIT,
} from "../data/corpus/account-delivery-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const COMPANY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

const SELECTOR = {
  kind: "account_delivery",
  companyId: COMPANY_A,
} as const

const DATASET: FakeDataset = {
  missions: [
    {
      id: "mission-a1",
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      collaborator_id: "collab-shared",
      title: "Transformation Digitale",
      status: "active",
      tjm: 850,
      cjm: 420,
      gross_margin_pct: 50.59,
      practice: "Cloud & DevOps",
      start_date: "2026-01-01",
      end_date: null,
    },
    {
      id: "mission-a2",
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      collaborator_id: "collab-2",
      title: "Audit Sécurité",
      status: "active",
      tjm: 950,
      cjm: 480,
      gross_margin_pct: 49.47,
      practice: "Cybersecurity",
      start_date: "2026-03-01",
      end_date: "2026-08-31",
    },
    {
      id: "mission-b1",
      workspace_id: WORKSPACE,
      company_id: COMPANY_B,
      collaborator_id: "collab-shared",
      title: "Projet Compte B",
      status: "active",
      tjm: 800,
      cjm: 400,
      gross_margin_pct: 50.0,
      practice: "Data & AI",
      start_date: "2026-01-01",
      end_date: null,
    },
    {
      id: "mission-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      company_id: COMPANY_A,
      collaborator_id: "collab-ext",
      title: "Mission Autre Workspace",
      status: "active",
      tjm: 1000,
      cjm: 500,
      gross_margin_pct: 50.0,
      practice: "Data",
      start_date: "2026-01-01",
      end_date: null,
    },
  ],
  mission_activity_reports: [
    {
      id: "cra-a1-june",
      workspace_id: WORKSPACE,
      mission_id: "mission-a1",
      collaborator_id: "collab-shared",
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      business_days: 22,
      billable_days: 20,
      non_billable_days: 0,
      pto_days: 2,
      sick_days: 0,
      activity_rate_percent: 90.91,
      tjm_snapshot: 850,
      cjm_snapshot: 420,
      status: "validated",
    },
    {
      id: "cra-a1-july",
      workspace_id: WORKSPACE,
      mission_id: "mission-a1",
      collaborator_id: "collab-shared",
      period_start: "2026-07-01",
      period_end: "2026-07-31",
      business_days: 22,
      billable_days: 12,
      non_billable_days: 2,
      pto_days: 0,
      sick_days: 8,
      activity_rate_percent: 54.55,
      tjm_snapshot: 850,
      cjm_snapshot: 420,
      status: "submitted",
    },
    // CRA sur le compte B pour le même collaborateur partagé en mai 2026
    {
      id: "cra-b1-may",
      workspace_id: WORKSPACE,
      mission_id: "mission-b1",
      collaborator_id: "collab-shared",
      period_start: "2026-05-01",
      period_end: "2026-05-31",
      business_days: 20,
      billable_days: 8,
      non_billable_days: 2,
      pto_days: 0,
      sick_days: 10,
      activity_rate_percent: 40.0,
      tjm_snapshot: 800,
      cjm_snapshot: 400,
      status: "submitted",
    },
    {
      id: "cra-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      mission_id: "mission-autre-workspace",
      collaborator_id: "collab-ext",
      period_start: "2026-07-01",
      period_end: "2026-07-31",
      billable_days: 20,
      business_days: 22,
      non_billable_days: 2,
      pto_days: 0,
      sick_days: 0,
      activity_rate_percent: 90.91,
      tjm_snapshot: 1000,
      cjm_snapshot: 500,
      status: "validated",
    },
  ],
  v_profitability_alerts: [
    {
      collaborator_id: "collab-shared",
      full_name: "Marc Dubreuil",
      period_start: "2026-07-01",
      cra_status: "submitted",
      activity_rate_percent: 54.55,
      real_margin_pct: 12.0,
      alert_negative_margin: false,
      alert_low_margin: true,
      alert_low_activity: true,
      alert_high_sick_days: true,
      alert_cra_not_validated: true,
    },
    // Alerte du même collaborateur en mai 2026, mais causée par sa mission sur le compte B !
    {
      collaborator_id: "collab-shared",
      full_name: "Marc Dubreuil",
      period_start: "2026-05-01",
      cra_status: "submitted",
      activity_rate_percent: 40.0,
      real_margin_pct: -5.0,
      alert_negative_margin: true,
      alert_low_margin: true,
      alert_low_activity: true,
      alert_high_sick_days: true,
      alert_cra_not_validated: true,
    },
    // Collaborateur sans alerte active
    {
      collaborator_id: "collab-2",
      full_name: "Claire Lemaire",
      period_start: "2026-07-01",
      cra_status: "validated",
      activity_rate_percent: 95.0,
      real_margin_pct: 49.47,
      alert_negative_margin: false,
      alert_low_margin: false,
      alert_low_activity: false,
      alert_high_sick_days: false,
      alert_cra_not_validated: false,
    },
  ],
  v_mission_quarterly_revenue: [
    {
      mission_id: "mission-a1",
      mission_title: "Transformation Digitale",
      mission_status: "active",
      company_id: COMPANY_A,
      company_name: "Société Générale de Banque",
      consultant_name: "Marc Dubreuil",
      practice: "Cloud & DevOps",
      quarter_label: "Q2 2026",
      quarter_start: "2026-04-01",
      revenue: 51000,
      cost: 25200,
      gross_margin: 25800,
      gross_margin_pct: 50.59,
      billable_days: 60,
      role_title: "Architecte Cloud",
      seniority: "Senior",
      workspace_id: WORKSPACE,
    },
    {
      mission_id: "mission-b1",
      mission_title: "Projet Compte B",
      mission_status: "active",
      company_id: COMPANY_B,
      company_name: "Autre Client SAS",
      consultant_name: "Marc Dubreuil",
      practice: "Data & AI",
      quarter_label: "Q2 2026",
      quarter_start: "2026-04-01",
      revenue: 48000,
      cost: 24000,
      gross_margin: 24000,
      gross_margin_pct: 50.0,
      billable_days: 60,
      workspace_id: WORKSPACE,
    },
  ],
}

describe("accountDeliveryProvider", () => {
  it("déclare une exécution sous RLS utilisateur et un poids de 92", () => {
    expect(accountDeliveryProvider.execution).toBe("user_rls")
    expect(accountDeliveryProvider.kind).toBe("account_delivery")
    expect(accountDeliveryProvider.weight).toBe(ACCOUNT_DELIVERY_WEIGHT)
    expect(ACCOUNT_DELIVERY_WEIGHT).toBe(92)
    expect(MISSIONS_QUERY_LIMIT).toBe(50)
    expect(CRA_QUERY_LIMIT).toBe(200)
    expect(QUARTERLY_REVENUE_QUERY_LIMIT).toBe(100)
    expect(PROFITABILITY_ALERTS_QUERY_LIMIT).toBe(200)
  })

  // Cas 1 : dérivation de la fenêtre glissante de 6 mois
  it("dérive la fenêtre d'hydratation sur 6 mois calendaires glissants à partir de la date serveur", () => {
    const refAug = new Date("2026-08-24T12:00:00Z")
    const { windowStart, windowEnd } = deriveAccountDeliveryWindow(refAug)
    expect(windowStart).toBe("2026-03-01")
    expect(windowEnd).toBe("2026-08-31")

    // Cas de passage d'année
    const refJan = new Date("2026-01-15T08:00:00Z")
    const janWindow = deriveAccountDeliveryWindow(refJan)
    expect(janWindow.windowStart).toBe("2025-08-01")
    expect(janWindow.windowEnd).toBe("2026-01-31")

    const refFeb = new Date("2026-02-10T08:00:00Z")
    const febWindow = deriveAccountDeliveryWindow(refFeb)
    expect(febWindow.windowStart).toBe("2025-09-01")
    expect(febWindow.windowEnd).toBe("2026-02-28")
  })

  // Cas 2 : exclusion prouvée des données salariales confidentielles
  it("ne sélectionne ni n'expose jamais gross_annual, charges_rate ou working_days_per_year dans aucun item", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await accountDeliveryProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const allContent = result.items.map((item) => item.content).join("\n")
    const serialized = JSON.stringify(result)

    expect(allContent.toLowerCase()).not.toContain("gross_annual")
    expect(allContent.toLowerCase()).not.toContain("charges_rate")
    expect(allContent.toLowerCase()).not.toContain("working_days_per_year")
    expect(allContent.toLowerCase()).not.toContain("salaire brut")
    expect(allContent.toLowerCase()).not.toContain("taux de charges")

    expect(serialized.toLowerCase()).not.toContain("gross_annual")
    expect(serialized.toLowerCase()).not.toContain("charges_rate")
    expect(serialized.toLowerCase()).not.toContain("working_days_per_year")
  })

  // Cas 3 : Point de vigilance n°2b — Filtrage strict en 2 étapes pour isoler les alertes d'un compte
  it("n'inclut dans le corpus du compte A que les alertes rattachées à une mission de A, jamais celles du compte B", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await accountDeliveryProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const alertItems = result.items.filter(
      (item) => item.ref.table === "v_profitability_alerts",
    )

    // Seule l'alerte de juillet 2026 (associée au CRA de mission-a1 sur le compte A) doit ressortir
    expect(alertItems).toHaveLength(1)
    expect(alertItems[0].ref.id).toBe("collab-shared:2026-07-01:alerts")
    expect(alertItems[0].content).toContain("Marge faible (< 15 %)")
    expect(alertItems[0].content).toContain("Activité basse (< 70 %)")
    expect(alertItems[0].content).toContain("Arrêt maladie élevé (> 5 j)")

    // L'alerte de mai 2026 (liée à la mission-b1 sur le compte B) NE DOIT PAS apparaître
    const mayAlert = alertItems.find((item) => item.date === "2026-05-01")
    expect(mayAlert).toBeUndefined()

    // Claire Lemaire n'a aucune alerte active -> zéro item émis pour elle
    const claireAlert = alertItems.find((item) => item.content.includes("Claire Lemaire"))
    expect(claireAlert).toBeUndefined()
  })

  // Cas 4 : Stabilité et déterminisme des ref.id composites
  it("génère des ref.id composites stables et conformes au contrat de citation", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await accountDeliveryProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const refs = result.items.map((item) => ({
      table: item.ref.table,
      id: item.ref.id,
      kind: item.ref.kind,
    }))

    expect(refs).toContainEqual({
      kind: "account_delivery",
      table: "missions",
      id: "mission-a1",
    })
    expect(refs).toContainEqual({
      kind: "account_delivery",
      table: "missions",
      id: "mission-a2",
    })
    expect(refs).toContainEqual({
      kind: "account_delivery",
      table: "mission_activity_reports",
      id: "cra-a1-june",
    })
    expect(refs).toContainEqual({
      kind: "account_delivery",
      table: "mission_activity_reports",
      id: "cra-a1-july",
    })
    expect(refs).toContainEqual({
      kind: "account_delivery",
      table: "v_profitability_alerts",
      id: "collab-shared:2026-07-01:alerts",
    })
    expect(refs).toContainEqual({
      kind: "account_delivery",
      table: "v_mission_quarterly_revenue",
      id: "mission-a1:2026-04-01",
    })
  })

  // Cas 5 : Saturation d'une borne dure tracée via exclusion provider_limit
  it("trace l'atteinte d'une borne de requête via une exclusion provider_limit", async () => {
    const saturated: FakeDataset = {
      missions: Array.from({ length: MISSIONS_QUERY_LIMIT }, (_, index) => ({
        id: `mission-${index}`,
        workspace_id: WORKSPACE,
        company_id: COMPANY_A,
        title: `Mission ${index}`,
        status: "active",
        tjm: 800,
        cjm: 400,
        gross_margin_pct: 50.0,
        practice: "Cloud",
        start_date: "2026-01-01",
        end_date: null,
      })),
      mission_activity_reports: [],
      v_profitability_alerts: [],
      v_mission_quarterly_revenue: [],
    }

    const fake = createFakeSupabase(saturated)
    const result = await accountDeliveryProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    expect(result.items).toHaveLength(MISSIONS_QUERY_LIMIT)
    expect(result.exclusions).toHaveLength(1)
    expect(result.exclusions[0]).toEqual({
      ref: { kind: "account_delivery", table: "missions", id: "__query_limit__" },
      title: `Missions du compte : borne de requête atteinte (${MISSIONS_QUERY_LIMIT})`,
      provenance: "missions",
      reason: "provider_limit",
    })
  })

  // Cas 6 : Isolation de workspace stricte
  it("ne remonte jamais de données d'un autre workspace ou d'un autre compte", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await accountDeliveryProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("Mission Autre Workspace")
    expect(serialized).not.toContain("mission-autre-workspace")
    expect(serialized).not.toContain("cra-autre-workspace")
    expect(serialized).not.toContain("Projet Compte B")
    expect(serialized).not.toContain("mission-b1")
  })

  // Cas 7 : Propagation des erreurs de lecture Supabase
  it("lève une exception explicite en cas d'erreur de lecture Supabase", async () => {
    const fake = createFakeSupabase(DATASET, { errors: { missions: "Erreur connexion DB" } })
    await expect(
      accountDeliveryProvider.resolve({ workspaceId: WORKSPACE, supabase: fake.supabase }, SELECTOR),
    ).rejects.toThrow(/Lecture des missions du compte impossible : Erreur connexion DB/i)
  })

  // Helpers unitaires de formatage
  describe("helpers de formatage et calcul", () => {
    it("calcule correctement le début de trimestre civil", () => {
      expect(getQuarterStart("2026-03-01")).toBe("2026-01-01")
      expect(getQuarterStart("2026-04-15")).toBe("2026-04-01")
      expect(getQuarterStart("2026-08-31")).toBe("2026-07-01")
    })

    it("formate les montants et pourcentages", () => {
      expect(formatCurrency(850)).toBe("850 €")
      expect(formatCurrency(1250.5)).toBe("1 250,50 €")
      expect(formatPercent(50.59)).toBe("50,59 %")
      expect(formatPercent(50)).toBe("50 %")
      expect(formatMonth("2026-06-01")).toBe("juin 2026")
    })
  })
})
