import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Invariants de câblage (Lot 10 / OPP-30) : les modules contextuels REUSE-only.
// Aucun composant copié, aucun loader forké, aucune deuxième modale / moteur / mission.

const root = resolve(__dirname, "../../../../..")
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8")

describe("Matching profil — moteur unique, aucun recalcul", () => {
  const src = read("src/features/opportunities/modules/MatchingProfilModule.tsx")

  it("monte MatchingDialog existant (besoin-centrique)", () => {
    expect(src).toContain('from "@/components/staffing/matching/MatchingDialog"')
    expect(src).toContain("<MatchingDialog")
  })

  it("ne réimplémente pas de moteur ni de requête (délègue à MatchingDialog)", () => {
    expect(src).not.toContain("runOpportunityMatching")
    expect(src).not.toContain("useOpportunityMatching")
    expect(src).not.toContain("supabase")
  })
})

describe("Simulation devis — une seule modale (OPP-13)", () => {
  const src = read("src/features/opportunities/modules/SimulationDevisModule.tsx")

  it("réutilise FinancialModelingDesktopDialog de @/features/financial-modeling", () => {
    expect(src).toContain('from "@/features/financial-modeling"')
    expect(src).toContain("<FinancialModelingDesktopDialog")
  })

  it("ne crée pas de deuxième dialog de simulation", () => {
    expect(src).not.toMatch(/function\s+\w*Simulation\w*Dialog/)
  })
})

describe("Post-Mortem — mission existante, aucun nouveau workflow (OPP-14)", () => {
  const src = read("src/features/opportunities/modules/PostMortemModule.tsx")

  it("monte MissionComposerDesktop avec la config post-mortem-commercial existante", () => {
    expect(src).toContain("MissionComposerDesktop")
    expect(src).toContain("POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG")
  })

  it("ne déclare aucune mission / webhook / trigger n8n", () => {
    expect(src).not.toContain("missionSlug:")
    expect(src).not.toContain("/api/n8n/")
    expect(src).not.toContain("webhook")
  })
})

describe("Host — dispatch des 3 modules, dialogs lazy", () => {
  const src = read("src/features/opportunities/modules/OpportunitiesModulesHost.tsx")

  it("charge les 3 wrappers en dynamic import (dialogs lazy)", () => {
    expect(src).toContain('import dynamic from "next/dynamic"')
    for (const wrapper of ["MatchingProfilModule", "SimulationDevisModule", "PostMortemModule"]) {
      expect(src).toMatch(new RegExp(`dynamic\\(\\s*\\(\\) => import\\("\\./${wrapper}"\\)`))
    }
  })

  it("gère l'absence de contexte pour le matching (aucun bouton mort)", () => {
    expect(src).toContain("if (!context)")
  })
})
