import { describe, expect, it } from "vitest"
import {
  PIPELINE_OPPORTUNITIES_QUERY_LIMIT,
  PIPELINE_PERIOD_WEIGHT,
  pipelinePeriodProvider,
} from "../data/corpus/pipeline-period-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const COMPANY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

const SELECTOR = {
  kind: "pipeline_period",
  periodStart: "2026-04-01",
  periodEnd: "2026-06-30",
} as const

const DATASET: FakeDataset = {
  opportunities: [
    {
      id: "opp-gagne-q2",
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      title: "Refonte Cloud Azure",
      stage: "gagne",
      opportunity_type: "regie",
      estimated_gain: 120000,
      weighted_gain: 120000,
      acv: 120000,
      target_daily_rate: 850,
      duration_days: 140,
      practice: "Cloud",
      seniority: "senior",
      closed_at: "2026-05-15T14:00:00Z",
      updated_at: "2026-05-15T14:00:00Z",
      win_reason: "Excellente adéquation technique et disponibilité immédiate.",
      loss_reason: null,
      need_summary: "Accompagnement migration Azure ESN.",
    },
    {
      id: "opp-perdu-q2",
      workspace_id: WORKSPACE,
      company_id: COMPANY_B,
      title: "Projet Data Platform",
      stage: "perdu",
      opportunity_type: "forfait",
      estimated_gain: 80000,
      weighted_gain: 0,
      acv: 80000,
      target_daily_rate: 750,
      duration_days: 100,
      practice: "Data",
      seniority: "confirmed",
      closed_at: "2026-06-10T10:30:00Z",
      updated_at: "2026-06-10T10:30:00Z",
      win_reason: null,
      loss_reason: "Concurrent moins cher sur le TJM.",
      need_summary: "Mise en place Databricks.",
    },
    {
      id: "opp-abandonne-fallback-q2",
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      title: "Audit Sécurité SI",
      stage: "abandonne",
      opportunity_type: "audit",
      estimated_gain: 30000,
      weighted_gain: 0,
      acv: 30000,
      target_daily_rate: 950,
      duration_days: 30,
      practice: "Cybersecurity",
      seniority: "expert",
      closed_at: null, // Test de repli sur updated_at
      updated_at: "2026-04-20T09:00:00Z",
      win_reason: null,
      loss_reason: "Projet gelé par le client.",
      need_summary: "Audit pentest global.",
    },
    {
      id: "opp-en-cours-q2",
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      title: "Tierce Maintenance Applicative",
      stage: "en_cours",
      opportunity_type: "centre_de_service",
      estimated_gain: 200000,
      weighted_gain: 140000,
      closed_at: null,
      updated_at: "2026-05-01T12:00:00Z",
    },
    {
      id: "opp-negociation-q2",
      workspace_id: WORKSPACE,
      company_id: COMPANY_B,
      title: "Socle DevOps Kubernetes",
      stage: "negociation",
      opportunity_type: "regie",
      estimated_gain: 90000,
      weighted_gain: 72000,
      closed_at: null,
      updated_at: "2026-05-20T16:00:00Z",
    },
    {
      id: "opp-gagne-q1",
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      title: "Ancienne Affaire Q1",
      stage: "gagne",
      closed_at: "2026-02-10T11:00:00Z",
      updated_at: "2026-02-10T11:00:00Z",
    },
    {
      id: "opp-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      company_id: COMPANY_A,
      title: "Affaire Autre Tenant",
      stage: "gagne",
      closed_at: "2026-05-10T11:00:00Z",
      updated_at: "2026-05-10T11:00:00Z",
    },
  ],

  interactions: [
    {
      id: "inter-1",
      workspace_id: WORKSPACE,
      opportunity_id: "opp-gagne-q2",
      company_id: COMPANY_A,
      type: "reunion",
      occurred_at: "2026-05-02T14:00:00Z",
      summary: "Soutenance orale très positive avec le DSI.",
      sentiment: "positif",
    },
    {
      id: "inter-2",
      workspace_id: WORKSPACE,
      opportunity_id: "opp-perdu-q2",
      company_id: COMPANY_B,
      type: "email",
      occurred_at: "2026-06-08T09:00:00Z",
      summary: "Annonce du choix du concurrent par l'acheteur.",
      sentiment: "negatif",
    },
  ],

  opportunity_candidates: [
    {
      id: "opp-cand-1",
      workspace_id: WORKSPACE,
      opportunity_id: "opp-gagne-q2",
      candidate_id: "cand-1",
      status: "valide",
      sent_to_client_at: "2026-04-25T10:00:00Z",
      status_changed_at: "2026-05-12T15:00:00Z",
      client_feedback: "Profil parfaitement retenu pour le rôle d'architecte Cloud.",
      comment: "Démarrage prévu le 1er juin.",
      next_action: "Contractualiser",
      updated_at: "2026-05-12T15:00:00Z",
    },
  ],

  candidates: [
    {
      id: "cand-1",
      workspace_id: WORKSPACE,
      person_id: "person-cand-1",
    },
  ],

  persons: [
    {
      id: "person-cand-1",
      workspace_id: WORKSPACE,
      full_name: "Thomas Dubois",
    },
  ],

  opportunity_skills: [
    {
      id: "opp-skill-1",
      workspace_id: WORKSPACE,
      opportunity_id: "opp-gagne-q2",
      skill_id: "skill-azure",
      importance: "indispensable",
      min_level: 4,
      min_years: 5,
      weight: 10,
      comment: "Expertise Terraform Azure exigée.",
      created_at: "2026-04-10T08:00:00Z",
    },
  ],

  skills: [
    {
      id: "skill-azure",
      workspace_id: WORKSPACE,
      name: "Microsoft Azure",
    },
  ],

  companies: [
    {
      id: COMPANY_A,
      workspace_id: WORKSPACE,
      name: "Robertet SA",
      segment_id: "seg-btp",
      relation_type: "client_actif",
      lifecycle_status: "client_actif",
      classification_confiance: "haute",
    },
    {
      id: COMPANY_B,
      workspace_id: WORKSPACE,
      name: "Voyage Privé",
      segment_id: "seg-tourisme",
      relation_type: "prospect",
      lifecycle_status: "prospect",
      classification_confiance: "moyenne",
    },
  ],
}

describe("pipelinePeriodProvider", () => {
  it("expose les constantes de contrat et de bornes", () => {
    expect(pipelinePeriodProvider.kind).toBe("pipeline_period")
    expect(pipelinePeriodProvider.execution).toBe("user_rls")
    expect(pipelinePeriodProvider.weight).toBe(PIPELINE_PERIOD_WEIGHT)
    expect(PIPELINE_PERIOD_WEIGHT).toBe(80)
  })

  it("filtre correctement les affaires par stage (seules gagne/perdu/abandonne remontent)", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await pipelinePeriodProvider.resolve(ctx, SELECTOR)

    const oppTitles = result.items
      .filter((item) => item.ref.table === "opportunities")
      .map((item) => item.title)

    expect(oppTitles).toContain("Affaire · Robertet SA · Refonte Cloud Azure")
    expect(oppTitles).toContain("Affaire · Voyage Privé · Projet Data Platform")
    expect(oppTitles).toContain("Affaire · Robertet SA · Audit Sécurité SI")

    // Exclusions strictes : affaires non closes
    expect(oppTitles).not.toContain("Affaire · Robertet SA · Tierce Maintenance Applicative")
    expect(oppTitles).not.toContain("Affaire · Voyage Privé · Socle DevOps Kubernetes")
  })

  it("respecte les bornes de la fenêtre temporelle du trimestre", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await pipelinePeriodProvider.resolve(ctx, SELECTOR)

    const oppTitles = result.items
      .filter((item) => item.ref.table === "opportunities")
      .map((item) => item.title)

    // L'affaire de Q1 est hors fenêtre
    expect(oppTitles).not.toContain("Affaire · Robertet SA · Ancienne Affaire Q1")
  })

  it("trace le repli sur updated_at lorsque closed_at est null", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await pipelinePeriodProvider.resolve(ctx, SELECTOR)

    const abandonneItem = result.items.find(
      (item) => item.ref.table === "opportunities" && item.ref.id === "opp-abandonne-fallback-q2",
    )
    expect(abandonneItem).toBeDefined()
    expect(abandonneItem?.content).toContain("repli sur updated_at, closed_at non renseigné")
  })

  it("garantit l'isolation workspace sur toutes les tables", async () => {
    const { supabase, calls } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await pipelinePeriodProvider.resolve(ctx, SELECTOR)

    // Vérifie qu'aucune ligne d'un autre workspace n'a fui
    const allContent = result.items.map((i) => i.content).join("\n")
    expect(allContent).not.toContain("Affaire Autre Tenant")

    // Chaque requête envoyée porte son filtre de workspace
    for (const call of calls) {
      const wsFilter = call.eq.find(([col]) => col === "workspace_id")
      expect(wsFilter).toBeDefined()
      expect(wsFilter?.[1]).toBe(WORKSPACE)
    }
  })

  it("construit des ref.id stables et cohérents entre les 5 sources", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await pipelinePeriodProvider.resolve(ctx, SELECTOR)

    const tables = Array.from(new Set(result.items.map((i) => i.ref.table)))
    expect(tables).toContain("opportunities")
    expect(tables).toContain("interactions")
    expect(tables).toContain("opportunity_candidates")
    expect(tables).toContain("opportunity_skills")
    expect(tables).toContain("companies")

    // Résolution du nom du candidat dans la présentation
    const candidateItem = result.items.find(
      (i) => i.ref.table === "opportunity_candidates" && i.ref.id === "opp-cand-1",
    )
    expect(candidateItem?.content).toContain("Thomas Dubois")

    // Résolution du libellé de la compétence
    const skillItem = result.items.find(
      (i) => i.ref.table === "opportunity_skills" && i.ref.id === "opp-skill-1",
    )
    expect(skillItem?.content).toContain("Microsoft Azure")
  })

  it("trace une exclusion provider_limit si une borne dure est atteinte", async () => {
    const saturatedOpps = Array.from({ length: PIPELINE_OPPORTUNITIES_QUERY_LIMIT }, (_, idx) => ({
      id: `opp-sat-${idx}`,
      workspace_id: WORKSPACE,
      company_id: COMPANY_A,
      title: `Affaire ${idx}`,
      stage: "gagne",
      closed_at: "2026-05-10T10:00:00Z",
      updated_at: "2026-05-10T10:00:00Z",
    }))

    const { supabase } = createFakeSupabase({
      ...DATASET,
      opportunities: saturatedOpps,
    })
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await pipelinePeriodProvider.resolve(ctx, SELECTOR)

    const exclusion = result.exclusions.find((e) => e.ref.table === "opportunities")
    expect(exclusion).toBeDefined()
    expect(exclusion?.reason).toBe("provider_limit")
  })
})
