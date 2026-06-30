import {
  createUtcDate,
  parseIsoDate,
  toIsoDate,
} from "./financial-model.constants"

export interface CalculateBusinessDaysOptions {
  excludedDates?: readonly string[]
}

function normalizeDateInput(value: string | Date): Date {
  if (value instanceof Date) {
    return createUtcDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate()
    )
  }

  const parsed = parseIsoDate(value)
  if (!parsed) {
    throw new RangeError(`Date invalide: ${value}`)
  }

  return parsed
}

export function calculateBusinessDays(
  startDate: string | Date,
  endDate: string | Date,
  options: CalculateBusinessDaysOptions = {}
): number {
  const start = normalizeDateInput(startDate)
  const end = normalizeDateInput(endDate)

  if (end.getTime() < start.getTime()) {
    throw new RangeError("La date de fin doit etre posterieure ou egale a la date de debut.")
  }

  const excludedDates = new Set(
    (options.excludedDates ?? [])
      .map((value) => parseIsoDate(value))
      .filter((value): value is Date => value !== null)
      .map((value) => toIsoDate(value))
  )

  const cursor = new Date(start.getTime())
  let total = 0

  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getUTCDay()
    const isoDate = toIsoDate(cursor)
    const isWeekday = day >= 1 && day <= 5

    if (isWeekday && !excludedDates.has(isoDate)) {
      total += 1
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return total
}
