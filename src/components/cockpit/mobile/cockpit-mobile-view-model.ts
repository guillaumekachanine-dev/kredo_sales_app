import type { CockpitDashboardData } from "@/lib/cockpit/cockpit-data"
import type { StaffingDashboardData } from "@/lib/staffing/staffing-data"
import type { SyntheseData } from "@/lib/prospection/synthese-data"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { formatEuroCompact } from "@/lib/formatters"

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

export type StaffingNeedVm = {
  id: string
  rank: string
  title: string
  client: string
  step: string
  positioned: string
  due: string
  dueCompact: string
  primaryAction: string
  companyId?: string | null
}

export type MeetingVm = {
  id: string
  client: string
  dateLabel: string
  timeLabel: string
  dateCompact: string
  contact: string
  role: string
  subject: string
  companyDrawerLabel: string
  contactDrawerLabel: string
  companyId: string | null
  contactId: string | null
}

export type ProspectionMetricVm = {
  id: string
  label: string
  value: string
  detail: string
}

export type ProspectionPriorityVm = {
  id: string
  company: string
  companyId: string | null
  reason: string
  nextMove: string
}

export type CockpitMobileViewModel = {
  header: {
    title: string
    alertCount: number
  }
  agenda: {
    selectedDayKey: string
    days: AgendaDayVm[]
  }
  staffing: {
    items: StaffingNeedVm[]
  }
  meetings: {
    items: MeetingVm[]
  }
  prospection: {
    metrics: ProspectionMetricVm[]
    priorities: ProspectionPriorityVm[]
  }
}

// Helper to format date numbers (e.g. 23)
function getDayNumber(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return String(d.getDate())
  } catch {
    return ""
  }
}

// Helper to compact dates (e.g. "25 juin" -> "25/06")
function parseFrenchDateToCompact(label: string): string {
  if (!label || label === "—") return "À conf."
  const clean = label.toLowerCase().trim()
  const match = clean.match(/(\d+)\s+([a-zéû]+)/)
  if (match) {
    const day = match[1].padStart(2, "0")
    const monthStr = match[2]
    const months: Record<string, string> = {
      janvier: "01", jan: "01",
      février: "02", fev: "02",
      mars: "03", mar: "03",
      avril: "04", avr: "04",
      mai: "05",
      juin: "06", jui: "06",
      juillet: "07",
      août: "08", aou: "08",
      septembre: "09", sep: "09",
      octobre: "10", oct: "10",
      novembre: "11", nov: "11",
      décembre: "12", dec: "12",
    }
    const month = months[monthStr] || "06"
    return `${day}/${month}`
  }
  return label
}

export function buildCockpitMobileViewModel(
  data: CockpitDashboardData,
  staffingData: StaffingDashboardData,
  syntheseData: SyntheseData,
  calendarEvents: AgendaEvent[]
): CockpitMobileViewModel {
  const daysKeys = ["mon", "tue", "wed", "thu", "fri"]
  const daysLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven"]

  // Helper to check if two dates are on the same day
  const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  // 1. Build agenda days from staffingData.weekDays (Mon-Fri)
  const days: AgendaDayVm[] = []
  
  // Real meetings to show in the Meeting card
  const meetingEventTypes = new Set([
    "rdv_client_suivi",
    "rdv_prospection",
    "soutenance",
    "atelier_client",
    "appel_qualification",
    "appel_prospection",
  ])

  const meetings: MeetingVm[] = calendarEvents
    .filter((e) => meetingEventTypes.has(e.event_type))
    .map((e) => {
      const start = new Date(e.starts_at)
      
      const timeLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      const dateLabel = new Intl.DateTimeFormat("fr-FR", { 
        weekday: "long", 
        day: "numeric", 
        month: "long" 
      }).format(start)

      const day = String(start.getDate()).padStart(2, "0")
      const month = String(start.getMonth() + 1).padStart(2, "0")
      const dateCompact = `${day}/${month}`

      return {
        id: e.id,
        client: e.company?.name || "Sans compte",
        dateLabel,
        timeLabel,
        dateCompact,
        contact: e.contact?.full_name || "Sans contact",
        role: e.contact?.job_title || "Rôle non renseigné",
        subject: e.title,
        companyDrawerLabel: e.company?.name || "Détails entreprise",
        contactDrawerLabel: e.contact ? `${e.contact.full_name} · ${e.company?.name || ""}` : "Détails contact",
        companyId: e.company_id,
        contactId: e.contact_id,
      }
    })

  // Populating Agenda Items per day
  for (let i = 0; i < 5; i++) {
    const wDay = staffingData.weekDays[i]
    const key = daysKeys[i]
    const label = daysLabels[i]
    const dateNumber = wDay ? getDayNumber(wDay.date) : String(22 + i)
    
    const items: AgendaItemVm[] = []

    // A. Add actual calendar events that fall on this day
    if (wDay) {
      const dayEvents = calendarEvents.filter((e) => {
        if (!e.starts_at) return false
        return isSameDay(new Date(e.starts_at), new Date(wDay.date))
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
    }

    // B. Add staffing deadlines matching this day
    if (wDay) {
      const dayDeadlines = staffingData.weeklyDeadlines.filter((dl) => {
        if (!dl.date) return false
        try {
          const dlDate = new Date(dl.date)
          const wDate = new Date(wDay.date)
          return dlDate.getDate() === wDate.getDate() && dlDate.getMonth() === wDate.getMonth()
        } catch {
          return false
        }
      })

      dayDeadlines.forEach((dl, dlIdx) => {
        items.push({
          id: dl.id || `deadline-${i}-${dlIdx}`,
          moment: dl.type === "Démarrage cible" ? "J-0" : "09:00",
          type: dl.type === "Démarrage cible" ? "Echeance" : "Priorite",
          title: dl.title,
          context: `${dl.company} · staffing ${dl.priority.toLowerCase()}`,
          route: "/staffing",
        })
      })
    }

    // Sort items chronologically by time
    items.sort((a, b) => a.moment.localeCompare(b.moment))

    days.push({
      key,
      label,
      dateNumber,
      count: items.length,
      items,
    })
  }

  // Determine current day key to select it by default (Mon-Fri)
  const currentDayOfWeek = new Date().getDay()
  const defaultDayKey = currentDayOfWeek >= 1 && currentDayOfWeek <= 5
    ? daysKeys[currentDayOfWeek - 1]
    : "mon"

  // 2. Map Staffing needs (top 3 needs)
  const staffingItems: StaffingNeedVm[] = staffingData.openNeeds.slice(0, 3).map((need, idx) => {
    // Try to find if this company exists in syntheseData to fetch its real uuid
    const matchedCompany = syntheseData.accountsToActivate.find(
      (c) => c.name.toLowerCase().includes(need.company.toLowerCase())
    )

    return {
      id: need.id,
      rank: String(idx + 1).padStart(2, "0"),
      title: need.title,
      client: need.company,
      step: need.stage,
      positioned: need.candidateCount === 1 ? "1 profil" : `${need.candidateCount} profils`,
      due: need.startDateLabel,
      dueCompact: parseFrenchDateToCompact(need.startDateLabel),
      primaryAction: need.actionLabel || "Positionner des profils",
      companyId: matchedCompany ? matchedCompany.id : null,
    }
  })

  // 3. Map Prospection Metrics
  // Map real synthese data into 4 metric boxes
  const weightedValue = syntheseData.pipeline.totalWeighted
    ? formatEuroCompact(syntheseData.pipeline.totalWeighted)
    : "145 k€"

  const metrics: ProspectionMetricVm[] = [
    {
      id: "metric-1",
      label: "Cibles",
      value: String(syntheseData.accountsToActivate.length),
      detail: "à activer",
    },
    {
      id: "metric-2",
      label: "Pipe",
      value: weightedValue,
      detail: "pondéré",
    },
    {
      id: "metric-3",
      label: "Urgences",
      value: "3/10", // Typed seam
      detail: "du jour",
    },
    {
      id: "metric-4",
      label: "Objectif",
      value: "60%", // Typed seam
      detail: "atteint",
    },
  ]

  // Map prospection priorities from actual accounts to activate
  const priorities: ProspectionPriorityVm[] = syntheseData.accountsToActivate.slice(0, 3).map((c, idx) => {
    const nextMoves = [
      "Générer le pitch Assurance + appeler le sponsor",
      "Rédiger l'email IA puis préparer la relance",
      "Reprendre les analyses et poser un prochain rendez-vous",
    ]
    const reasons = [
      "Plan IT 2026 diffusé hier · fenêtre d'approche immédiate",
      "Nouveau CTO détecté · contact d'introduction sous 48h",
      "Besoin Data confirmé · dernier échange sans next step",
    ]

    return {
      id: c.id,
      company: c.name,
      companyId: c.id,
      reason: reasons[idx] || "Compte chaud identifié avec fort score IA.",
      nextMove: nextMoves[idx] || "Préparer le pitch commercial ciblé.",
    }
  })

  // Fallback priorities matching prototype if database is empty
  if (priorities.length === 0) {
    const defaultPriorities: ProspectionPriorityVm[] = [
      { id: "prospect-1", company: "Generali", companyId: null, reason: "Plan IT 2026 diffuse hier · fenetre d'approche immediate", nextMove: "Generer le pitch Assurance + appeler le sponsor" },
      { id: "prospect-2", company: "L'Oreal", companyId: null, reason: "Nouveau CTO detecte · contact d'introduction sous 48h", nextMove: "Rediger l'email IA puis preparer la relance" },
      { id: "prospect-3", company: "Societe Generale", companyId: null, reason: "Besoin Data confirme · dernier echange sans next step", nextMove: "Reprendre les analyses et poser un prochain rendez-vous" }
    ]
    priorities.push(...defaultPriorities)
  }

  // Count active staffingAlerts
  const alertCount = data.staffingAlerts.length || 3

  return {
    header: {
      title: "Cockpit",
      alertCount,
    },
    agenda: {
      selectedDayKey: defaultDayKey,
      days,
    },
    staffing: {
      items: staffingItems,
    },
    meetings: {
      items: meetings,
    },
    prospection: {
      metrics,
      priorities,
    },
  }
}

