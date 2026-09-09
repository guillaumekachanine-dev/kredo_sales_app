const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2,
})

export function formatNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : number.format(value)
}

export function formatEuros(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : euros.format(value)
}

export function formatCompactEuros(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  if (Math.abs(value) >= 1_000_000) return `${compact.format(value / 1_000_000)} M€`
  if (Math.abs(value) >= 1_000) return `${compact.format(value / 1_000)} k€`
  return formatEuros(value)
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Paris",
})
const calendarFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Paris",
})

function calendarDay(date: Date): number {
  const parts = calendarFormat.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000
}

/** Stable SSR output: reference = VM snapshot; calendar days in Paris, including DST. */
export function formatDeadline(dueAt: string, referenceAt: string) {
  const due = new Date(dueAt)
  const reference = new Date(referenceAt)
  if (!Number.isFinite(due.getTime())) return { absolute: "Date non renseignée", relative: "" }
  const absolute = dateFormat.format(due)
  if (!Number.isFinite(reference.getTime())) return { absolute, relative: "" }
  const days = calendarDay(due) - calendarDay(reference)
  const relative = days === 0 ? "Aujourd’hui" : days === 1 ? "Demain"
    : days > 1 ? `Dans ${days} j` : `Il y a ${Math.abs(days)} j`
  return { absolute, relative }
}
