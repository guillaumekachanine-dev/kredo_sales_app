import { parseDateOnly } from "@/lib/agenda/agenda-temporal"

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

// Semaine ISO-8601 (lundi = premier jour, la semaine 1 contient le premier
// jeudi de l'année) — algorithme standard, indépendant du fuseau (opère sur
// la date calendaire, pas un instant).
export function getIsoWeekLabel(dateKey: string): string {
  const { year, month, day } = parseDateOnly(dateKey)
  const date = new Date(Date.UTC(year, month - 1, day))

  const dayNum = (date.getUTCDay() + 6) % 7 // lundi=0 .. dimanche=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // jeudi de la semaine ISO courante
  const isoYear = date.getUTCFullYear()

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)

  const isoWeek = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000))

  return `${isoYear}-W${pad2(isoWeek)}`
}
