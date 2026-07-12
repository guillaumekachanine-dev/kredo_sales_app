import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/reports/_data/reports-actions", () => ({
  saveAsDocumentWithClient: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { saveAsDocumentWithClient } from "@/app/(app)/reports/_data/reports-actions"
import { saveResultAsDocumentWithSupabaseClient } from "./save-as-document"

const mockedSaveAsDocumentWithClient = vi.mocked(saveAsDocumentWithClient)

function buildRaceSupabase() {
  let documentLookupCount = 0
  const result = {
    id: "result-1",
    company_id: null,
    content_json: { kind: "spoken_pitch", hook: "Bonjour" },
    content_text: null,
    owner_id: "owner-1",
    qa_flags: [],
    result_type: "prise_de_parole",
    run_id: "run-1",
    source_refs: [],
    status: "succeeded",
    title: "Pitch interne",
    workspace_id: "workspace-1",
  }
  const run = {
    company_id: null,
    id: "run-1",
    input_snapshot: {
      what: {
        scenario: "resource_arbitrage_pitch",
        outputKind: "spoken_pitch",
        activityCategory: "internal_staff",
        scope: "internal",
        length: "standard",
      },
      who: { recipient: { type: "internal" } },
      context: {},
    },
    owner_id: "owner-1",
    primary_entity_id: null,
    primary_entity_type: "workspace",
    workspace_id: "workspace-1",
  }

  return {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => {
                  if (table === "intelligence_documents") {
                    documentLookupCount += 1
                    return documentLookupCount === 1
                      ? { data: null, error: null }
                      : { data: { id: "document-winner" }, error: null }
                  }
                  if (table === "ai_intelligence_results") return { data: result, error: null }
                  if (table === "ai_intelligence_runs") return { data: run, error: null }
                  throw new Error(`Unexpected table ${table}`)
                },
              }
            },
          }
        },
      }
    },
  }
}

describe("saveResultAsDocumentWithSupabaseClient idempotency", () => {
  it("returns the concurrent winner when a duplicate source_result_id is rejected", async () => {
    mockedSaveAsDocumentWithClient.mockResolvedValueOnce({ error: "duplicate key value" })

    const result = await saveResultAsDocumentWithSupabaseClient(
      buildRaceSupabase() as never,
      "result-1",
    )

    expect(result).toEqual({
      success: true,
      documentId: "document-winner",
      alreadyExists: true,
    })
  })

  it("ships a partial unique index for generated document provenance", () => {
    const migrationsDirectory = join(process.cwd(), "supabase", "migrations")
    const migrationSql = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(join(migrationsDirectory, file), "utf8"))
      .join("\n")

    expect(migrationSql).toMatch(
      /create unique index[\s\S]*intelligence_documents[\s\S]*source_result_id[\s\S]*where source_result_id is not null/i,
    )
  })
})
