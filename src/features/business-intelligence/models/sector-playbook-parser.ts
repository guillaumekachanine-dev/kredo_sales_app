export type SectorPlaybookPersona = {
  role: string
  accountability: string | null
  trigger: string | null
}

export type SectorPlaybookObjection = {
  objection: string
  response: string | null
}

export type SectorPlaybookEntryPoint = {
  signal: string | null
  angle: string
  interlocuteur: string | null
  srcIds: number[]
}

export type SectorPlaybookRoiArgument = {
  argument: string
  srcIds: number[]
}

export type SectorPlaybookParsed = {
  personas: SectorPlaybookPersona[]
  objections: SectorPlaybookObjection[]
  entryPoints: SectorPlaybookEntryPoint[]
  roiArguments: SectorPlaybookRoiArgument[]
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function textFromRecord(value: unknown, keys: string[]): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of keys) {
      const candidate = record[key]
      if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim()
    }
  }
  return null
}

function parseSrcIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids: number[] = []
  for (const v of value) {
    if (typeof v === "number" && Number.isFinite(v)) {
      ids.push(v)
    } else if (typeof v === "string") {
      const parsed = parseInt(v, 10)
      if (Number.isFinite(parsed)) ids.push(parsed)
    }
  }
  return ids
}

export function parsePlaybookPersonas(playbook: unknown): SectorPlaybookPersona[] {
  const raw = asArray(asRecord(playbook).personas)
  const results: SectorPlaybookPersona[] = []

  for (const item of raw) {
    const rec = asRecord(item)
    const role = textFromRecord(rec.fonction, []) ?? textFromRecord(rec.role, [])
    if (!role) continue

    const accountability =
      textFromRecord(rec.repond_de, []) ??
      textFromRecord(rec.enjeu, []) ??
      textFromRecord(rec.accountability, [])
    const trigger =
      textFromRecord(rec.ce_qui_le_reveille, []) ??
      textFromRecord(rec.peur, []) ??
      textFromRecord(rec.trigger, [])

    results.push({
      role,
      accountability,
      trigger,
    })
  }

  return results
}

export function parsePlaybookObjections(playbook: unknown): SectorPlaybookObjection[] {
  const raw = asArray(asRecord(playbook).objections)
  const results: SectorPlaybookObjection[] = []

  for (const item of raw) {
    const rec = asRecord(item)
    const objection = textFromRecord(rec.objection, [])
    if (!objection) continue

    const response =
      textFromRecord(rec.reponse, []) ??
      textFromRecord(rec.argument, []) ??
      textFromRecord(rec.response, [])

    results.push({
      objection,
      response,
    })
  }

  return results
}

export function parsePlaybookEntryPoints(playbook: unknown): SectorPlaybookEntryPoint[] {
  const raw = asArray(asRecord(playbook).entry_points)
  const results: SectorPlaybookEntryPoint[] = []

  for (const item of raw) {
    if (typeof item === "string") {
      const text = item.trim()
      if (text.length > 0) {
        results.push({
          signal: null,
          angle: text,
          interlocuteur: null,
          srcIds: [],
        })
      }
      continue
    }

    const rec = asRecord(item)
    const signal = textFromRecord(rec.signal, [])
    const rawAngle = textFromRecord(rec.angle, [])
    const interlocuteur = textFromRecord(rec.interlocuteur, []) ?? textFromRecord(rec.target, [])
    const srcIds = parseSrcIds(rec.src_ids ?? rec.srcIds)

    if (!rawAngle && !signal) continue

    const angle = rawAngle ?? signal!

    results.push({
      signal: rawAngle ? signal : null,
      angle,
      interlocuteur,
      srcIds,
    })
  }

  return results
}

export function parsePlaybookRoiArguments(playbook: unknown): SectorPlaybookRoiArgument[] {
  const raw = asArray(asRecord(playbook).roi_arguments)
  const results: SectorPlaybookRoiArgument[] = []

  for (const item of raw) {
    if (typeof item === "string") {
      const text = item.trim()
      if (text.length > 0) {
        results.push({
          argument: text,
          srcIds: [],
        })
      }
      continue
    }

    const rec = asRecord(item)
    const argument =
      textFromRecord(rec.argument, []) ??
      textFromRecord(rec.titre, []) ??
      textFromRecord(rec.valeur, [])
    if (!argument) continue

    const srcIds = parseSrcIds(rec.src_ids ?? rec.srcIds)

    results.push({
      argument,
      srcIds,
    })
  }

  return results
}

export function parseSectorPlaybook(playbook: unknown): SectorPlaybookParsed {
  return {
    personas: parsePlaybookPersonas(playbook),
    objections: parsePlaybookObjections(playbook),
    entryPoints: parsePlaybookEntryPoints(playbook),
    roiArguments: parsePlaybookRoiArguments(playbook),
  }
}
