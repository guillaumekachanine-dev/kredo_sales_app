import { describe, expect, it } from "vitest"
import { HEADER_TITLE_BY_VIEW } from "../EngagementsDesktopView"
import { groupMissionsByClient } from "../CurrentMissionsList"
import { formatPeriod } from "../MissionOverview"
import type { EngagementMissionListItem } from "@/app/(app)/missions/_data/get-current-engagement-missions"

describe("EngagementsDesktopView — header dynamique", () => {
  it("associe le bon titre à chaque vue", () => {
    expect(HEADER_TITLE_BY_VIEW["missions-at"]).toBe("Missions en cours")
    expect(HEADER_TITLE_BY_VIEW["activite-conges"]).toBe("Activité & congés")
    expect(HEADER_TITLE_BY_VIEW["planning-at"]).toBe("Planning des missions")
    expect(HEADER_TITLE_BY_VIEW["synthese"]).toBe("Engagements")
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

