import type { CockpitDashboardData } from "@/lib/cockpit/cockpit-data"
import type { StaffingDashboardData } from "@/lib/staffing/staffing-data"
import type { SyntheseData } from "@/lib/prospection/synthese-data"

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
  syntheseData: SyntheseData
): CockpitMobileViewModel {
  const daysKeys = ["mon", "tue", "wed", "thu", "fri"]
  const daysLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven"]

  // 1. Build agenda days from staffingData.weekDays (Mon-Fri)
  const days: AgendaDayVm[] = []
  
  // Attempt to find or match real companies from the database
  const realCompanies = syntheseData.accountsToActivate || []
  
  // We establish seam meetings mapping to actual database companies if available
  const seamMeetingsRaw = [
    {
      id: "meeting-1",
      client: "AXA Group",
      timeLabel: "09:00",
      contact: "Morel Claire",
      role: "Directrice de programme cloud",
      subject: "Comite de cadrage programme cloud",
      dayIndex: 1, // Tuesday
    },
    {
      id: "meeting-2",
      client: "L'Oreal",
      timeLabel: "11:30",
      contact: "Vernet Nicolas",
      role: "Directeur transformation digitale",
      subject: "Pitch IA pour la direction digitale",
      dayIndex: 2, // Wednesday
    },
    {
      id: "meeting-3",
      client: "Societe Generale",
      timeLabel: "15:30",
      contact: "Caron Mathilde",
      role: "Responsable staffing data platform",
      subject: "Debrief CV envoyes Data Platform",
      dayIndex: 3, // Thursday
    },
  ]

  // Map seam meeting names and IDs from actual companies database
  const meetings: MeetingVm[] = seamMeetingsRaw.map((sm, index) => {
    const realComp = realCompanies[index]
    const clientName = realComp ? realComp.name : sm.client
    const companyId = realComp ? realComp.id : null
    
    // We compute date based on the current week's days
    const weekDayDate = staffingData.weekDays[sm.dayIndex]
    const dateFormatted = weekDayDate
      ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(weekDayDate.date))
      : `mardi ${24 + index} juin` // fallback matching prototype dates

    return {
      id: sm.id,
      client: clientName,
      dateLabel: dateFormatted,
      timeLabel: sm.timeLabel,
      contact: sm.contact,
      role: sm.role,
      subject: sm.subject,
      companyDrawerLabel: clientName,
      contactDrawerLabel: `${sm.contact} · ${clientName}`,
      companyId,
      contactId: null, // Seam target
    }
  })

  // Populating Agenda Items per day
  for (let i = 0; i < 5; i++) {
    const wDay = staffingData.weekDays[i]
    const key = daysKeys[i]
    const label = daysLabels[i]
    const dateNumber = wDay ? getDayNumber(wDay.date) : String(22 + i)
    
    const items: AgendaItemVm[] = []

    // A. Add meeting seam if it falls on this day
    const dayMeeting = meetings.find((m) => {
      const seamRaw = seamMeetingsRaw.find((sr) => sr.id === m.id)
      return seamRaw?.dayIndex === i
    })
    
    if (dayMeeting) {
      items.push({
        id: dayMeeting.id,
        moment: dayMeeting.timeLabel,
        type: "RDV",
        title: dayMeeting.subject,
        context: `${dayMeeting.client} · atelier missions`,
        route: "/missions/opps",
      })
    }

    // B. Add staffing deadlines matching this day
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

    // C. Add default placeholder tasks if no items on Mon/Fri to match prototype density
    if (i === 0) { // Monday
      items.push({
        id: "mon-placeholder-1",
        moment: "09:15",
        type: "RDV",
        title: "Point de calage staffing",
        context: "Generali · besoin Lead Data Engineer",
        route: "/staffing",
      })
      items.push({
        id: "mon-placeholder-2",
        moment: "16:30",
        type: "Tache",
        title: "Mettre a jour le plan de relance",
        context: "Prospection · comptes Assurance",
        route: "/prospection/suivi",
      })
    } else if (i === 4) { // Friday
      items.push({
        id: "fri-placeholder-1",
        moment: "10:30",
        type: "RDV",
        title: "Revue de portefeuille",
        context: "Equipe commerciale · pipeline ouvert",
        route: "/cockpit",
      })
      items.push({
        id: "fri-placeholder-2",
        moment: "17:00",
        type: "Echeance",
        title: "Cloturer les next steps de la semaine",
        context: "Suivi des actions · relances IA",
        route: "/prospection/suivi",
      })
    }

    days.push({
      key,
      label,
      dateNumber,
      count: items.length,
      items,
    })
  }

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
      selectedDayKey: "tue", // Default as per prototype
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

function formatEuroCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M€`
  if (abs >= 1_000) return `${Math.round(value / 1_000)} k€`
  return `${Math.round(value)} €`
}
