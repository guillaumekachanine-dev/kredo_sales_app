import type { FinancialModelVersion } from "./financial-model.types"

export const FINANCIAL_MODEL_ENGINE_VERSION: FinancialModelVersion =
  "financial-model-v1"

export const DEFAULT_EMPLOYER_CHARGES_RATE = 0.45

export const WARNING_THRESHOLDS = {
  lowActivityRate: 0.7,
  lowMcoPercent: 15,
} as const

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function roundCurrency(value: number): number {
  return roundTo(value, 2)
}

export function roundPercent(value: number): number {
  return roundTo(value, 2)
}

export function roundDays(value: number): number {
  return roundTo(value, 2)
}

export function toIsoDate(date: Date): string {
  return [
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-")
}

export function createUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = createUtcDate(year, month, day)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

export function endOfYearUtc(date: Date): Date {
  return createUtcDate(date.getUTCFullYear(), 12, 31)
}

export function countInclusiveCalendarDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  return Math.floor(diffMs / 86_400_000) + 1
}
