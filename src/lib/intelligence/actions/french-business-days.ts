const DAY_MS = 24 * 60 * 60 * 1000

export const FRENCH_BUSINESS_DAYS_TIMEZONE = "Europe/Paris"

export function dateKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.slice(0, 10).split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addCalendarDays(key: string, days: number): string {
  const date = dateFromKey(key)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKeyFromDate(date)
}

export function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b)
}

export function maxDateKey(...keys: string[]): string {
  return keys.reduce((max, key) => (compareDateKeys(key, max) > 0 ? key : max))
}

export function minDateKey(...keys: string[]): string {
  return keys.reduce((min, key) => (compareDateKeys(key, min) < 0 ? key : min))
}

function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return dateKeyFromDate(new Date(Date.UTC(year, month - 1, day)))
}

export function getFrenchPublicHolidays(year: number): string[] {
  const easter = easterSunday(year)
  return [
    `${year}-01-01`,
    addCalendarDays(easter, 1),
    `${year}-05-01`,
    `${year}-05-08`,
    addCalendarDays(easter, 39),
    addCalendarDays(easter, 50),
    `${year}-07-14`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
  ]
}

export function isFrenchBusinessDay(key: string): boolean {
  const date = dateFromKey(key)
  const weekday = date.getUTCDay()
  if (weekday === 0 || weekday === 6) return false
  return !getFrenchPublicHolidays(date.getUTCFullYear()).includes(key.slice(0, 10))
}

export function countFrenchBusinessDays(startKey: string, endKey: string): number {
  const start = dateFromKey(startKey)
  const end = dateFromKey(endKey)
  if (start.getTime() > end.getTime()) return 0

  let count = 0
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    if (isFrenchBusinessDay(dateKeyFromDate(new Date(t)))) count += 1
  }
  return count
}

export function monthStartKey(monthKey: string): string {
  return `${monthKey.slice(0, 7)}-01`
}

export function monthEndKey(monthKey: string): string {
  const [year, month] = monthKey.slice(0, 7).split("-").map(Number)
  return dateKeyFromDate(new Date(Date.UTC(year, month, 0)))
}

export function businessDaysForMonth(monthKey: string): number {
  return countFrenchBusinessDays(monthStartKey(monthKey), monthEndKey(monthKey))
}

function buildBusinessDaysByMonth() {
  const rows: Record<string, number> = {}
  for (const year of [2026, 2027]) {
    for (let month = 1; month <= 12; month += 1) {
      const key = `${year}-${String(month).padStart(2, "0")}`
      rows[key] = businessDaysForMonth(key)
    }
  }
  return rows
}

export const FRENCH_BUSINESS_DAYS_BY_MONTH_2026_2027 = buildBusinessDaysByMonth()
