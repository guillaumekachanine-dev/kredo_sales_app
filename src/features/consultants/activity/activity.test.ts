import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { ActivityDashboardData } from "./activity.types"
import { ActivityDashboard } from "./ActivityDashboard"

const root = process.cwd()

function emptyData(overrides: Partial<ActivityDashboardData> = {}): ActivityDashboardData {
  return {
    year: 2026,
    generatedAt: "2026-09-08T00:00:00.000Z",
    summaries: [],
    ytd: [],
    alerts: [],
    absences: [],
    closures: [],
    compensations: [],
    sourceIssues: [],
    ...overrides,
  }
}

describe("ActivityDashboard", () => {
  it("ne rend plus de <h1> interne (le header du shell porte le titre)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActivityDashboard, { data: emptyData() }),
    )
    expect(markup).not.toContain("<h1")
    expect(markup).not.toContain("Activite &amp; conges")
    // le bandeau reste, avec son eyebrow et ses stats
    expect(markup).toContain("Cockpit annuel 2026")
    expect(markup).toContain("Activite globale")
  })

  it("surface les sources partielles", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActivityDashboard, {
        data: emptyData({ sourceIssues: ["Compensation: permission denied."] }),
      }),
    )
    expect(markup).toContain("Sources partielles")
    expect(markup).toContain("permission denied")
  })
})

describe("route historique /consultants/activite-conges", () => {
  it("redirige de façon permanente vers ?section=activite-conges", () => {
    const source = readFileSync(
      resolve(root, "src/app/(app)/consultants/activite-conges/page.tsx"),
      "utf8",
    )
    expect(source).toContain("permanentRedirect")
    expect(source).toContain('"/consultants?section=activite-conges"')
    expect(source).not.toContain("createClient")
  })
})
