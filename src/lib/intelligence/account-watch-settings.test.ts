import { describe, expect, it } from "vitest"
import {
  DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS,
  normalizeAccountWatchDetailedSettings,
  type AccountWatchDetailedRow,
} from "./account-watch-settings"

function row(overrides: Partial<AccountWatchDetailedRow> = {}): AccountWatchDetailedRow {
  return {
    is_enabled: true,
    watch_level: "priority",
    cadence: "twice_weekly",
    last_run_at: null,
    next_run_at: null,
    last_status: null,
    last_error: null,
    updated_at: "2026-08-13T12:00:00.000Z",
    include_official_site: true,
    include_news: true,
    include_public_records: false,
    include_tenders: true,
    include_social_manual: false,
    include_jobs: true,
    include_sector_corpus: true,
    query_aliases: ["KREDO", "Kredo Conseil"],
    metadata: {
      monitored_categories: ["strategie", "offres", "categorie_inconnue"],
      notes: "Surveiller les annonces produit.",
      depth: "deep",
      manual_source_urls: ["https://example.com/news", "not-a-url", 42],
    },
    ...overrides,
  }
}

describe("normalizeAccountWatchDetailedSettings", () => {
  it("returns the complete defaults when no account settings exist", () => {
    expect(normalizeAccountWatchDetailedSettings(null))
      .toEqual(DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS)
  })

  it("preserves sources and filters metadata categories to the supported catalogue", () => {
    const settings = normalizeAccountWatchDetailedSettings(row())

    expect(settings).toMatchObject({
      exists: true,
      isEnabled: true,
      watchLevel: "priority",
      cadence: "twice_weekly",
      includeTenders: true,
      includeJobs: true,
      includeSocialManual: false,
      queryAliases: ["KREDO", "Kredo Conseil"],
      monitoredCategories: ["strategie", "offres"],
      notes: "Surveiller les annonces produit.",
      depth: "deep",
      manualSourceUrls: ["https://example.com/news"],
    })
  })

  it("falls back to every category when legacy metadata has no valid selection", () => {
    const settings = normalizeAccountWatchDetailedSettings(row({ metadata: {} }))
    expect(settings.monitoredCategories).toEqual(
      DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS.monitoredCategories,
    )
  })
})
