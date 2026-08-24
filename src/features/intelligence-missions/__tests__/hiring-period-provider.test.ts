import { describe, expect, it } from "vitest"
import {
  HIRING_PERIOD_WEIGHT,
  HIRING_PROCESSES_QUERY_LIMIT,
  hiringPeriodProvider,
} from "../data/corpus/hiring-period-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const SELECTOR = {
  kind: "hiring_period",
  periodStart: "2026-05-01",
  periodEnd: "2026-05-31",
} as const

const DATASET: FakeDataset = {
  candidate_hiring_processes: [
    {
      id: "proc-1-in-window",
      workspace_id: WORKSPACE,
      candidate_id: "cand-1",
      job_profile_id: "jp-dev-cloud",
      opportunity_candidate_id: "opp-cand-1",
      current_step: "entretien_client",
      status: "active",
      started_at: "2026-05-05T09:00:00Z",
      closed_at: null,
      close_reason: null,
      created_at: "2026-05-05T09:00:00Z",
      updated_at: "2026-05-20T10:00:00Z",
    },
    {
      id: "proc-2-closed-in-window",
      workspace_id: WORKSPACE,
      candidate_id: "cand-2",
      job_profile_id: "jp-data-eng",
      current_step: "refuse",
      status: "closed",
      started_at: "2026-04-10T14:00:00Z", // started out of window
      closed_at: "2026-05-18T16:00:00Z", // closed in window!
      close_reason: "Désaccord salarial",
      created_at: "2026-04-10T14:00:00Z",
      updated_at: "2026-05-18T16:00:00Z",
    },
    {
      id: "proc-out-of-window",
      workspace_id: WORKSPACE,
      candidate_id: "cand-1",
      job_profile_id: "jp-dev-cloud",
      current_step: "embauche",
      status: "hired",
      started_at: "2026-01-10T09:00:00Z",
      closed_at: "2026-02-15T18:00:00Z",
      close_reason: "Candidat embauché",
      created_at: "2026-01-10T09:00:00Z",
      updated_at: "2026-02-15T18:00:00Z",
    },
    {
      id: "proc-other-workspace",
      workspace_id: OTHER_WORKSPACE,
      candidate_id: "cand-3",
      job_profile_id: "jp-dev-cloud",
      current_step: "qualification",
      status: "active",
      started_at: "2026-05-10T09:00:00Z",
      closed_at: null,
      created_at: "2026-05-10T09:00:00Z",
      updated_at: "2026-05-10T09:00:00Z",
    },
  ],

  candidate_hiring_milestones: [
    {
      id: "m-1-1",
      workspace_id: WORKSPACE,
      hiring_process_id: "proc-1-in-window",
      step: "qualification",
      result: "valide",
      completed_at: "2026-05-05T10:00:00Z",
      scheduled_at: null,
      created_at: "2026-05-05T10:00:00Z",
      notes: "Premier contact RH très concluant.",
    },
    {
      id: "m-1-2",
      workspace_id: WORKSPACE,
      hiring_process_id: "proc-1-in-window",
      step: "entretien_technique",
      result: "valide",
      completed_at: "2026-05-15T10:00:00Z", // 10 days after m-1-1
      scheduled_at: null,
      created_at: "2026-05-15T10:00:00Z",
      notes: "Test technique réussi 95/100.",
    },
    {
      id: "m-2-1",
      workspace_id: WORKSPACE,
      hiring_process_id: "proc-2-closed-in-window",
      step: "entretien_rh",
      result: "refuse",
      completed_at: "2026-05-18T16:00:00Z",
      scheduled_at: null,
      created_at: "2026-05-18T16:00:00Z",
      notes: "Prétentions salariales hors grille.",
    },
  ],

  candidates: [
    {
      id: "cand-1",
      workspace_id: WORKSPACE,
      person_id: "person-1",
      job_profile_id: "jp-dev-cloud",
      practice_id: "cloud-engineering",
      status: "en_process",
      expected_daily_rate: 650,
      expected_salary: 65000, // Should be excluded from output
      last_salary: 58000, // Should be excluded from output
      experience_years: 6,
      created_at: "2026-05-01T08:00:00Z",
    },
    {
      id: "cand-2",
      workspace_id: WORKSPACE,
      person_id: "person-2",
      job_profile_id: "jp-data-eng",
      practice_id: "data-ai",
      status: "refuse",
      expected_daily_rate: 750,
      expected_salary: 80000,
      last_salary: 72000,
      experience_years: 8,
      created_at: "2026-04-01T08:00:00Z",
    },
  ],

  persons: [
    {
      id: "person-1",
      workspace_id: WORKSPACE,
      full_name: "Julie Martin",
    },
    {
      id: "person-2",
      workspace_id: WORKSPACE,
      full_name: "Marc Antoine",
    },
  ],

  job_profiles: [
    {
      id: "jp-dev-cloud",
      workspace_id: WORKSPACE,
      title: "Architecte Cloud Azure",
      family: "Cloud",
      seniority: "senior",
    },
    {
      id: "jp-data-eng",
      workspace_id: WORKSPACE,
      title: "Data Engineer Senior",
      family: "Data",
      seniority: "senior",
    },
  ],

  opportunity_candidates: [
    {
      id: "opp-cand-1",
      workspace_id: WORKSPACE,
      opportunity_id: "opp-100",
      candidate_id: "cand-1",
      status: "cv_transmis",
      sent_to_client_at: "2026-05-16T11:00:00Z",
      status_changed_at: "2026-05-16T11:00:00Z",
      client_feedback: "CV présélectionné par le client.",
      comment: "Attente confirmation date entretien.",
      updated_at: "2026-05-16T11:00:00Z",
    },
  ],
}

describe("hiringPeriodProvider", () => {
  it("expose les constantes de contrat et de bornes", () => {
    expect(hiringPeriodProvider.kind).toBe("hiring_period")
    expect(hiringPeriodProvider.execution).toBe("user_rls")
    expect(hiringPeriodProvider.weight).toBe(HIRING_PERIOD_WEIGHT)
    expect(HIRING_PERIOD_WEIGHT).toBe(75)
  })

  it("filtre correctement la fenêtre temporelle côté requête SQL", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await hiringPeriodProvider.resolve(ctx, SELECTOR)

    const processTitles = result.items
      .filter((item) => item.ref.table === "candidate_hiring_processes")
      .map((item) => item.title)

    // Processus démarré dans la fenêtre
    expect(processTitles).toContain("Processus recrutement · Julie Martin · Architecte Cloud Azure")

    // Processus fermé dans la fenêtre (même si démarré hors fenêtre)
    expect(processTitles).toContain("Processus recrutement · Marc Antoine · Data Engineer Senior")

    // Processus totalement hors fenêtre (démarré et fermé en Q1) non présent
    const allTitles = result.items.map((item) => item.title)
    expect(allTitles.some((t) => t.includes("proc-out-of-window"))).toBe(false)
  })

  it("calcule le délai entre jalons consécutifs et omet le délai pour le 1er jalon", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await hiringPeriodProvider.resolve(ctx, SELECTOR)

    const firstMilestone = result.items.find(
      (i) => i.ref.table === "candidate_hiring_milestones" && i.ref.id === "m-1-1",
    )
    expect(firstMilestone).toBeDefined()
    // 1er jalon : pas de mention de délai entre étapes
    expect(firstMilestone?.content).not.toContain("Délai pré-calculé entre étapes")

    const secondMilestone = result.items.find(
      (i) => i.ref.table === "candidate_hiring_milestones" && i.ref.id === "m-1-2",
    )
    expect(secondMilestone).toBeDefined()
    // 2d jalon : 10 jours calculés entre 2026-05-05 et 2026-05-15
    expect(secondMilestone?.content).toContain("10 jour(s) depuis l'étape précédente (qualification)")
  })

  it("construit des ref.id stables et n'expose aucun chiffre salarial brut confidentiel", async () => {
    const { supabase } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await hiringPeriodProvider.resolve(ctx, SELECTOR)

    const tables = Array.from(new Set(result.items.map((i) => i.ref.table)))
    expect(tables).toContain("candidate_hiring_processes")
    expect(tables).toContain("candidate_hiring_milestones")
    expect(tables).toContain("candidates")
    expect(tables).toContain("opportunity_candidates")

    // Candidat : TJM attendu inclus (650 €/j), mais expected_salary (65000) et last_salary (58000) EXCLUS
    const candidateItem = result.items.find(
      (i) => i.ref.table === "candidates" && i.ref.id === "cand-1",
    )
    expect(candidateItem?.content).toContain("TJM attendu : 650 €/j")
    expect(candidateItem?.content).not.toContain("65000")
    expect(candidateItem?.content).not.toContain("58000")
    expect(candidateItem?.content).not.toContain("expected_salary")
  })

  it("garantit l'isolation workspace sur toutes les requêtes", async () => {
    const { supabase, calls } = createFakeSupabase(DATASET)
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await hiringPeriodProvider.resolve(ctx, SELECTOR)

    const allContent = result.items.map((i) => i.content).join("\n")
    expect(allContent).not.toContain("proc-other-workspace")

    for (const call of calls) {
      const wsFilter = call.eq.find(([col]) => col === "workspace_id")
      expect(wsFilter).toBeDefined()
      expect(wsFilter?.[1]).toBe(WORKSPACE)
    }
  })

  it("trace une exclusion provider_limit si la borne dure est atteinte", async () => {
    const saturatedProcesses = Array.from({ length: HIRING_PROCESSES_QUERY_LIMIT }, (_, idx) => ({
      id: `proc-sat-${idx}`,
      workspace_id: WORKSPACE,
      candidate_id: "cand-1",
      job_profile_id: "jp-dev-cloud",
      current_step: "qualification",
      status: "active",
      started_at: "2026-05-10T10:00:00Z",
      closed_at: null,
      created_at: "2026-05-10T10:00:00Z",
      updated_at: "2026-05-10T10:00:00Z",
    }))

    const { supabase } = createFakeSupabase({
      ...DATASET,
      candidate_hiring_processes: saturatedProcesses,
    })
    const ctx = { supabase, workspaceId: WORKSPACE }

    const result = await hiringPeriodProvider.resolve(ctx, SELECTOR)

    const exclusion = result.exclusions.find((e) => e.ref.table === "candidate_hiring_processes")
    expect(exclusion).toBeDefined()
    expect(exclusion?.reason).toBe("provider_limit")
  })
})
