import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { buildProfileMatching } from "../data/build-profile-matching"
import type {
  RawMatchingCollaborator,
  RawMatchingOpportunity,
  RawMatchScoreRow,
} from "../data/profile-matching.types"

const moduleDir = path.resolve(__dirname, "..")

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList)
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

describe("Profile Matching — Sentinelles architecturales (Lot 13 / C-32)", () => {
  const sourceFiles = getAllFiles(moduleDir).filter(
    (file) => !file.includes("__tests__"),
  )
  const allSource = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n")

  it("sentinelle 1 : aucun second moteur de matching ni inversion de C1-C6", () => {
    // Le module ne doit pas recalculer de scores ou recréer une pondération C1-C6
    expect(allSource).not.toMatch(/computeProfileMatching/)
    expect(allSource).not.toMatch(/function\s+computeMatching/)
    expect(allSource).not.toMatch(/calculateScore/)
    expect(allSource).not.toMatch(/weights\s*[:=]/i)
  })

  it("sentinelle 2 : aucun LLM ni IA générative (100% déterministe et explicable)", () => {
    // Pas de SDK d'IA générative, pas d'appels OpenAI, Anthropic, Gemini, LangChain
    expect(allSource).not.toMatch(/openai/i)
    expect(allSource).not.toMatch(/anthropic/i)
    expect(allSource).not.toMatch(/gemini/i)
    expect(allSource).not.toMatch(/langchain/i)
    expect(allSource).not.toMatch(/from\s+["']ai["']/)
    expect(allSource).not.toMatch(/generateText/)
    expect(allSource).not.toMatch(/streamText/)
  })

  it("sentinelle 3 : aucun appel ou workflow n8n", () => {
    expect(allSource).not.toMatch(/n8n/i)
    expect(allSource).not.toMatch(/webhook/i)
  })

  it("sentinelle 4 : aucun batch automatique de runOpportunityMatching sur toutes les opportunités", () => {
    // Pas de boucle for (const opp of opportunities) await runOpportunityMatching(...)
    expect(allSource).not.toMatch(/for\s*\(.*allOpenOpportunities.*\)/)
    expect(allSource).not.toMatch(/opportunities\.map\(.*runOpportunityMatching/)
    expect(allSource).not.toMatch(/Promise\.all\(.*runOpportunityMatching/)
  })

  it("sentinelle 5 : aucun recalcul de marge financière", () => {
    // Les calculs financiers restent dans production-leave / TJM brut indicatif
    expect(allSource).not.toMatch(/calculateMargin/)
    expect(allSource).not.toMatch(/margeBrute/i)
    expect(allSource).not.toMatch(/tauxDeMarge/i)
  })

  it("sentinelle 6 : aucune bibliothèque tierce interdite (recharts, chart.js, tremor, radix)", () => {
    expect(allSource).not.toMatch(/from\s+["']recharts["']/)
    expect(allSource).not.toMatch(/from\s+["']chart\.js["']/)
    expect(allSource).not.toMatch(/from\s+["']@tremor\/react["']/)
    expect(allSource).not.toMatch(/from\s+["']@radix-ui/)
  })

  it("sentinelle 7 : absence de score ≠ score 0 ou incompatibilité", () => {
    // Vérifie le comportement invariant du builder :
    // Si un profil n'a aucun score pour une opportunité ouverte, aucun match n'est créé avec overallScore: 0.
    const collaborators: RawMatchingCollaborator[] = [
      {
        id: "collab-1",
        person_id: "p-unscored",
        current_title: "Consultant",
        seniority: "senior",
        practice: "Digital",
        job_profile_id: null,
        status: "actif",
        person: {
          id: "p-unscored",
          full_name: "Test Invariant",
          first_name: "Test",
          last_name: "Invariant",
        },
      },
    ]

    const opportunities: RawMatchingOpportunity[] = [
      {
        id: "opp-open-1",
        title: "Mission Open A",
        company_id: "comp-1",
        companies: { name: "Client A" },
        stage: "recherche_profil",
        start_date: "2026-10-01",
        target_daily_rate: 800,
        requires_staffing: true,
        updated_at: null,
      },
      {
        id: "opp-open-2",
        title: "Mission Open B",
        company_id: "comp-2",
        companies: { name: "Client B" },
        stage: "qualification",
        start_date: "2026-11-01",
        target_daily_rate: 700,
        requires_staffing: true,
        updated_at: null,
      },
    ]



    // Aucun score pour ce profil
    const scores: RawMatchScoreRow[] = []

    const vm = buildProfileMatching({
      collaborators,
      candidates: [],
      opportunities,
      scores,
    })


    const profile = vm.profiles[0]
    expect(profile).toBeDefined()
    // Les matches doivent être vides, JAMAIS remplis avec score: 0
    expect(profile.matches).toHaveLength(0)
    expect(profile.matches.some((m) => m.overallScore === 0)).toBe(false)

    // La couverture doit refléter la réalité : 0 évaluées, 2 ouvertes
    expect(vm.openOpportunityCount).toBe(2)
    expect(vm.evaluatedOpportunityCount).toBe(0)
    expect(profile.coverage.openOpportunityCount).toBe(2)
    expect(profile.coverage.evaluatedOpportunityCount).toBe(0)
    expect(profile.coverage.scoredOpportunityCountForProfile).toBe(0)
  })


  it("sentinelle 8 : le Desktop délègue à IntelligenceSplitModalShell sans primitive modale custom", () => {
    const desktopPath = path.join(moduleDir, "desktop", "ProfileMatchingDesktop.tsx")
    const desktopSource = fs.readFileSync(desktopPath, "utf8")

    expect(desktopSource).toContain("IntelligenceSplitModalShell")
    expect(desktopSource).not.toContain('role="dialog"')
    expect(desktopSource).not.toContain("fixed inset-0")
    expect(desktopSource).not.toContain("window.addEventListener")
  })
})
