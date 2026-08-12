import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("competitive map workspace loader", () => {
  it("reste server-only et ne charge que les détails du dernier snapshot sélectionné", () => {
    const source = readFileSync("src/features/competitive-map/data/get-competitive-map-workspace.ts", "utf8")

    expect(source).toContain('import "server-only"')
    expect(source).toContain("companies:companies!competitive_map_entries_company_id_fkey(id,name)")
    expect(source).toContain('.eq("segment_id", catalogItem.segmentId)')
    expect(source).toContain('.eq("study_snapshot_date", catalogItem.latestSnapshotDate)')
    expect(source).toContain('.eq("is_current", true)')
    expect(source).toContain('["revenue_estimate", "headcount_france"]')
    expect(source).not.toContain("profile_json,segment_id,study_snapshot_date")
  })
})
