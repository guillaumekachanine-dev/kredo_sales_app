type RawSearchParams = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(params: RawSearchParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key)
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export function parsePlanningSelection(params: RawSearchParams): string | null {
  const value = readParam(params, "opp")?.trim()
  return value ? value : null
}
