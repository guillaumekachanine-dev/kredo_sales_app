/**
 * Faux client Supabase pour les tests de providers.
 *
 * Il n'est PAS complaisant : il applique réellement `eq` / `in` / `gte` / `lte` / `limit`
 * sur son jeu de données, exactement comme le ferait Postgres. C'est la condition pour
 * que la garde de workspace soit testable — un faux qui rendrait ses lignes quels que
 * soient les filtres passerait avec ou sans la garde, et ne prouverait rien.
 *
 * Il enregistre aussi les tables lues et les `eq` posés : un test peut donc vérifier
 * qu'aucune requête n'a été émise après un refus, et que chaque lecture porte bien son
 * filtre de workspace.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export type FakeRow = Record<string, unknown>
export type FakeDataset = Record<string, FakeRow[]>

export type RecordedCall = { table: string; eq: Array<[string, unknown]> }

function compare(left: unknown, right: unknown): number {
  const a = String(left)
  const b = String(right)
  return a < b ? -1 : a > b ? 1 : 0
}

export function createFakeSupabase(
  dataset: FakeDataset,
  options: { errors?: Record<string, string> } = {},
) {
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
        gte: (column: string, value: unknown) => {
          rows = rows.filter((row) => compare(row[column], value) >= 0)
          return builder
        },
        lte: (column: string, value: unknown) => {
          rows = rows.filter((row) => compare(row[column], value) <= 0)
          return builder
        },
        is: (column: string, value: unknown) => {
          rows = rows.filter((row) => (value === null ? row[column] === null || row[column] === undefined : row[column] === value))
          return builder
        },
        order: () => builder,
        limit: (count: number) => {
          rows = rows.slice(0, count)
          return builder
        },
        maybeSingle: async () => ({
          data: failure ? null : (rows[0] ?? null),
          error: failure ? { message: failure } : null,
        }),
        then: (
          onOk: (value: ReturnType<typeof result>) => unknown,
          onErr?: (reason: unknown) => unknown,
        ) => Promise.resolve(result()).then(onOk, onErr),
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
