import { describe, expect, it } from "vitest"
import { HEADER_TITLE_BY_VIEW, NAV_ENTRIES } from "../EngagementsDesktopView"
import { groupMissionsByClient } from "../CurrentMissionsList"
import { groupProjectsByClient } from "../CurrentProjectsList"
import { formatPeriod } from "../MissionOverview"
import { getMissionPlanningSubtitle } from "../../planning/mission-annual-planning-utils"
import type { EngagementMissionListItem } from "@/app/(app)/missions/_data/get-current-engagement-missions"
import type { MissionPlanningRow } from "../../planning/mission-planning-types"
import type { DBProjectResult } from "@/app/(app)/missions/_data/get-projects-list"

describe("EngagementsDesktopView — header dynamique & navigation", () => {
  it("associe le bon titre à chaque vue", () => {
    expect(HEADER_TITLE_BY_VIEW["missions-at"]).toBe("Missions en cours")
    expect(HEADER_TITLE_BY_VIEW["projets"]).toBe("Projets")
    expect(HEADER_TITLE_BY_VIEW["activite-conges"]).toBe("Activité & congés")
    expect(HEADER_TITLE_BY_VIEW["planning-at"]).toBe("Planning des engagements")
    expect(HEADER_TITLE_BY_VIEW["synthese"]).toBe("Engagements")
  })

  it("présente les 5 onglets dans l'ordre attendu", () => {
    expect(NAV_ENTRIES.map((entry) => ({ view: entry.view, label: entry.label }))).toEqual([
      { view: "synthese", label: "Synthèse" },
      { view: "missions-at", label: "Missions AT" },
      { view: "projets", label: "Projets" },
      { view: "activite-conges", label: "Activité & congés" },
      { view: "planning-at", label: "Planning des engagements" },
    ])
  })
})

describe("Planning des engagements — sous-titre selon le type d'engagement", () => {
  it("formate le sous-titre pour une mission AT (Collaborateur · Client)", () => {
    const row: Partial<MissionPlanningRow> = {
      engagementType: "mission_at",
      company: { id: "c1", name: "CEGEMA", sector: "Assurance", hqLocation: "Nice" },
      collaborator: {
        id: "col1",
        employeeRef: "REF-1",
        currentTitle: "Dev",
        practice: "Tech",
        seniority: "Senior",
        availability: "available",
        person: { id: "p1", fullName: "Sophie Martin", firstName: "Sophie", lastName: "Martin" },
      },
    }
    expect(getMissionPlanningSubtitle(row as MissionPlanningRow)).toBe("Sophie Martin · CEGEMA")
  })

  it("formate le sous-titre pour un projet (Client · Avancement)", () => {
    const row: Partial<MissionPlanningRow> = {
      engagementType: "project",
      company: { id: "c1", name: "CEGEMA", sector: "Assurance", hqLocation: "Nice" },
      progressPct: 65,
    }
    expect(getMissionPlanningSubtitle(row as MissionPlanningRow)).toBe("CEGEMA · 65% avancement")
  })
})

describe("CurrentMissionsList — groupement par client", () => {
  it("regroupe les missions par client et les place consécutivement", () => {
    const rawMissions: EngagementMissionListItem[] = [
      {
        id: "m1",
        title: "Mission 1",
        status: "active",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        roleTitle: "Dev Front",
        practice: "Digital Experience",
        seniority: "Confirmé",
        tjm: 650,
        grossMarginPct: 25,
        clientName: "Client A",
        clientWebsite: "https://a.com",
        clientLogoPath: "/logos/a.png",
      },
      {
        id: "m2",
        title: "Mission 2",
        status: "active",
        startDate: "2026-02-01",
        endDate: "2026-07-31",
        roleTitle: "Dev Back",
        practice: "Cloud Engineering",
        seniority: "Senior",
        tjm: 750,
        grossMarginPct: 30,
        clientName: "Client B",
        clientWebsite: "https://b.com",
        clientLogoPath: "/logos/b.png",
      },
      {
        id: "m3",
        title: "Mission 3",
        status: "active",
        startDate: "2026-03-01",
        endDate: "2026-08-31",
        roleTitle: "Dev Ops",
        practice: "Cloud Engineering",
        seniority: "Expert",
        tjm: 850,
        grossMarginPct: 35,
        clientName: "Client A",
        clientWebsite: "https://a.com",
        clientLogoPath: "/logos/a.png",
      },
    ]

    const groups = groupMissionsByClient(rawMissions)
    expect(groups).toHaveLength(2)

    // Premier groupe : Client A avec les 2 missions m1 et m3 consécutives
    expect(groups[0].clientName).toBe("Client A")
    expect(groups[0].missions.map((m) => m.id)).toEqual(["m1", "m3"])

    // Deuxième groupe : Client B avec m2
    expect(groups[1].clientName).toBe("Client B")
    expect(groups[1].missions.map((m) => m.id)).toEqual(["m2"])
  })
})

describe("CurrentProjectsList — groupement par client", () => {
  it("regroupe les projets par client et gère l'anonymisation", () => {
    const rawProjects: Partial<DBProjectResult>[] = [
      {
        id: "p1",
        title: "Projet 1",
        ref_visibility: "public",
        progress_pct: 50,
        companies: { name: "Client Alpha", website: "https://alpha.fr", metadata: null },
      },
      {
        id: "p2",
        title: "Projet 2",
        ref_visibility: "public",
        progress_pct: 80,
        companies: { name: "Client Beta", website: "https://beta.fr", metadata: null },
      },
      {
        id: "p3",
        title: "Projet 3",
        ref_visibility: "anonymized",
        ref_anonymized_label: "Acteur Mutualiste",
        progress_pct: 20,
        companies: { name: "Secret Company", website: "https://secret.fr", metadata: null },
      },
      {
        id: "p4",
        title: "Projet 4",
        ref_visibility: "public",
        progress_pct: 100,
        companies: { name: "Client Alpha", website: "https://alpha.fr", metadata: null },
      },
    ]

    const groups = groupProjectsByClient(rawProjects as DBProjectResult[])
    expect(groups).toHaveLength(3)

    // Premier groupe : Client Alpha avec p1 et p4
    expect(groups[0].clientName).toBe("Client Alpha")
    expect(groups[0].projects.map((p) => p.id)).toEqual(["p1", "p4"])

    // Deuxième groupe : Client Beta avec p2
    expect(groups[1].clientName).toBe("Client Beta")
    expect(groups[1].projects.map((p) => p.id)).toEqual(["p2"])

    // Troisième groupe : Acteur Mutualiste (anonymisé) avec p3
    expect(groups[2].clientName).toBe("Acteur Mutualiste")
    expect(groups[2].clientWebsite).toBeNull()
    expect(groups[2].projects.map((p) => p.id)).toEqual(["p3"])
  })
})

describe("MissionOverview — formatage période", () => {
  it("formate la période au format JJ/MM - JJ/MM/AAAA", () => {
    expect(formatPeriod("2026-01-01", "2026-06-30")).toBe("01/01 - 30/06/2026")
    expect(formatPeriod("2026-03-15", "2026-12-31")).toBe("15/03 - 31/12/2026")
  })

  it("gère les dates ouvertes ou sans fin", () => {
    expect(formatPeriod("2026-02-01", null)).toBe("01/02/2026 - En cours")
    expect(formatPeriod(null, null)).toBe("—")
  })
})

describe("MissionDetailsRail — rôles de contact mission", () => {
  it("propose exactement les 5 rôles spécifiés dans le cahier des charges", async () => {
    const { MISSION_CONTACT_ROLES } = await import("../mission-contact-constants")
    expect(MISSION_CONTACT_ROLES).toEqual([
      "Manager opérationnel",
      "Direction métier",
      "Décideur",
      "Valideur CRA",
      "Facturation",
    ])
  })
})

