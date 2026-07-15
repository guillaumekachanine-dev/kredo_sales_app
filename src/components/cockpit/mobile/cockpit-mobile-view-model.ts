import type { AgendaEvent } from "@/lib/agenda/agenda-types"

export type AgendaItemVm = {
  id: string
  moment: string
  type: "RDV" | "Tache" | "Priorite" | "Echeance"
  title: string
  context: string
  route: string
}

export type AgendaDayVm = {
  key: string
  label: string
  dateNumber: string
  count: number
  items: AgendaItemVm[]
}

export type CockpitMobileViewModel = {
  agenda: {
    selectedDayKey: string
    days: AgendaDayVm[]
  }
}

export function buildCockpitMobileAgendaViewModel(
  calendarEvents: AgendaEvent[]
): CockpitMobileViewModel {
  const daysKeys = ["mon", "tue", "wed", "thu", "fri"]
  const daysLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven"]

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  // Get Monday of the current week
  const monday = new Date()
  const currentDay = monday.getDay()
  const diff = monday.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  // Build the 5 working days (Monday-Friday) of the current week
  const weekDays: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDays.push(d)
  }

  const days: AgendaDayVm[] = []

  for (let i = 0; i < 5; i++) {
    const wDay = weekDays[i]
    const key = daysKeys[i]
    const label = daysLabels[i]
    const dateNumber = String(wDay.getDate())

    const items: AgendaItemVm[] = []

    // Filter events for the current day
    const dayEvents = calendarEvents.filter((e) => {
      if (!e.starts_at) return false
      return isSameDay(new Date(e.starts_at), wDay)
    })

    dayEvents.forEach((e) => {
      const start = new Date(e.starts_at)
      const moment = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`

      let type: "RDV" | "Tache" | "Priorite" | "Echeance" = "Tache"
      if (e.event_type.includes("rdv") || e.event_type.includes("soutenance") || e.event_type.includes("atelier")) {
        type = "RDV"
      }

      let context = ""
      if (e.company) {
        context += e.company.name
      }
      if (e.contact) {
        context += (context ? " · " : "") + e.contact.full_name
      }
      if (e.opportunity) {
        context += (context ? " · " : "") + e.opportunity.title
      }
      if (!context && e.description) {
        context = e.description
      }
      if (!context) {
        context = "Événement de l'agenda"
      }

      items.push({
        id: e.id,
        moment,
        type,
        title: e.title,
        context,
        route: `/agenda?view=week`,
      })
    })

    // Sort items chronologically
    items.sort((a, b) => a.moment.localeCompare(b.moment))

    days.push({
      key,
      label,
      dateNumber,
      count: items.length,
      items,
    })
  }

  const currentDayOfWeek = new Date().getDay()
  const defaultDayKey = currentDayOfWeek >= 1 && currentDayOfWeek <= 5
    ? daysKeys[currentDayOfWeek - 1]
    : "mon"

  return {
    agenda: {
      selectedDayKey: defaultDayKey,
      days,
    },
  }
}
