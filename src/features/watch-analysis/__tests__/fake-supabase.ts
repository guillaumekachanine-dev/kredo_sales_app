/**
 * Faux client Supabase pour les tests du résolveur watch-analysis.
 *
 * Applique réellement `eq` / `in` sur son jeu de données, pour que la garde
 * de workspace (`.eq("workspace_id", …)`) soit effectivement testable — un
 * faux complaisant rendrait ses lignes quels que soient les filtres et ne
 * prouverait rien. Miroir réduit de
 * `src/features/intelligence-missions/__tests__/fake-supabase.ts` (mêmes
 * principes), gardé local à ce lot pour ne pas coupler deux features de test.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export type FakeRow = Record<string, unknown>
export type FakeDataset = Record<string, FakeRow[]>

export type RecordedCall = { table: string; eq: Array<[string, unknown]> }

export function createFakeSupabase(dataset: FakeDataset, options: { errors?: Record<string, string> } = {}) {
  const calls: RecordedCall[] = []

  const client = {
    from(table: string) {
      const recorded: RecordedCall = { table, eq: [] }
      calls.push(recorded)

      let rows = [...(dataset[table] ?? [])]
      const failure = options.errors?.[table]
      const result = () => ({
        data: failure ? null : rows,
        error: failure ? { message: failure } : null,
      })

      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          recorded.eq.push([column, value])
          rows = rows.filter((row) => row[column] === value)
          return builder
        },
        in: (column: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[column]))
          return builder
        },
        maybeSingle: async () => ({
          data: failure ? null : (rows[0] ?? null),
          error: failure ? { message: failure } : null,
        }),
        then: (onOk: (value: ReturnType<typeof result>) => unknown, onErr?: (reason: unknown) => unknown) =>
          Promise.resolve(result()).then(onOk, onErr),
      }

      return builder
    },
  }

  return {
    calls,
    tablesRead: () => calls.map((call) => call.table),
    supabase: client as unknown as SupabaseClient<Database>,
  }
}
