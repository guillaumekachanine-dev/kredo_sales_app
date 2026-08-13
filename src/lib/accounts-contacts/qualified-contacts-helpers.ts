import {
  CONTACT_DEPARTMENTS,
  departmentLabel,
} from "./contact-constants"

export type DerivedContact = {
  id: string
  personId: string | null
  companyId: string | null
  fullName: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string | null
  relationshipRole: string | null
  relationshipLevel: string | null
  decisionPower: string | null
  isPriority: boolean
  phone: string | null
  email: string | null
  linkedinUrl: string | null
  hasPhone: boolean
  hasActivity: boolean
  lastActivityAt: string | null
  isDecisionMaker: boolean
}

export type QualifiedContactsFilterState = {
  decideurOnly: boolean
  phoneOnly: boolean
  activityOnly: boolean
}

export type QualifiedContactsSortMode = "decideurs" | "metier" | "activite" | "cibles"

export function filterQualifiedContacts(
  contacts: DerivedContact[],
  filters: QualifiedContactsFilterState
): DerivedContact[] {
  return contacts.filter((contact) => {
    if (filters.decideurOnly && !contact.isDecisionMaker) {
      return false
    }
    if (filters.phoneOnly && !contact.hasPhone) {
      return false
    }
    if (filters.activityOnly && !contact.hasActivity) {
      return false
    }
    return true
  })
}

function decisionPowerWeight(power: string | null | undefined): number {
  if (!power) return 0
  const normalized = power.trim().toLowerCase()
  if (normalized === "fort") return 3
  if (normalized === "moyen") return 2
  if (normalized === "faible") return 1
  return 0
}

export function sortQualifiedContacts(
  contacts: DerivedContact[],
  sortMode: QualifiedContactsSortMode
): DerivedContact[] {
  const copy = [...contacts]

  switch (sortMode) {
    case "decideurs":
      return copy.sort((a, b) => {
        if (a.isDecisionMaker !== b.isDecisionMaker) {
          return a.isDecisionMaker ? -1 : 1
        }
        const weightA = decisionPowerWeight(a.decisionPower)
        const weightB = decisionPowerWeight(b.decisionPower)
        if (weightA !== weightB) {
          return weightB - weightA
        }
        return a.fullName.localeCompare(b.fullName, "fr")
      })

    case "activite":
      return copy.sort((a, b) => {
        if (a.hasActivity !== b.hasActivity) {
          return a.hasActivity ? -1 : 1
        }
        if (a.lastActivityAt && b.lastActivityAt) {
          const timeA = new Date(a.lastActivityAt).getTime()
          const timeB = new Date(b.lastActivityAt).getTime()
          if (timeA !== timeB) return timeB - timeA
        }
        return a.fullName.localeCompare(b.fullName, "fr")
      })

    case "cibles":
      return copy.sort((a, b) => {
        if (a.isPriority !== b.isPriority) {
          return a.isPriority ? -1 : 1
        }
        if (a.isDecisionMaker !== b.isDecisionMaker) {
          return a.isDecisionMaker ? -1 : 1
        }
        return a.fullName.localeCompare(b.fullName, "fr")
      })

    case "metier":
      return copy.sort((a, b) => {
        const deptA = departmentLabel(a.department)
        const deptB = departmentLabel(b.department)
        const deptCompare = deptA.localeCompare(deptB, "fr")
        if (deptCompare !== 0) return deptCompare

        const titleCompare = (a.jobTitle || "").localeCompare(b.jobTitle || "", "fr")
        if (titleCompare !== 0) return titleCompare

        return a.fullName.localeCompare(b.fullName, "fr")
      })

    default:
      return copy
  }
}

export type GroupedDepartmentContacts = {
  departmentKey: string
  departmentLabel: string
  contacts: DerivedContact[]
}

export function groupContactsByDepartment(
  contacts: DerivedContact[]
): GroupedDepartmentContacts[] {
  const map = new Map<string, DerivedContact[]>()

  for (const contact of contacts) {
    const key = contact.department || "other"
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(contact)
  }

  const result: GroupedDepartmentContacts[] = []

  // Prescribed department order
  for (const deptOption of CONTACT_DEPARTMENTS) {
    const list = map.get(deptOption.value)
    if (list && list.length > 0) {
      result.push({
        departmentKey: deptOption.value,
        departmentLabel: deptOption.label,
        contacts: list,
      })
      map.delete(deptOption.value)
    }
  }

  // Any remaining departments not in constants
  for (const [key, list] of map.entries()) {
    if (list.length > 0) {
      result.push({
        departmentKey: key,
        departmentLabel: departmentLabel(key),
        contacts: list,
      })
    }
  }

  return result
}

export type SimpleOffer = {
  id: string
  name: string
  short_description: string | null
  keywords?: string[] | null
  typical_profiles?: string[] | null
  use_cases?: string[] | null
}

export type SimpleJobProfile = {
  id: string
  title: string
  category?: string | null
}

export type InterestTopic = {
  offerId: string
  topicTitle: string
  reason: string
  score: number
}

function foldText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function extractTokens(str: string): string[] {
  const folded = foldText(str)
  const words = folded.split(/[^a-z0-9]+/i).filter(Boolean)
  const tokens: string[] = []

  for (const w of words) {
    if (w.length >= 3 || ["it", "ai", "bi", "rh", "si", "qa", "dev"].includes(w)) {
      let stem = w
      if (stem.startsWith("direct")) stem = "direct"
      else if (stem.startsWith("ingenier") || stem.startsWith("engineer")) stem = "ing"
      else if (stem.startsWith("responsab")) stem = "resp"
      tokens.push(stem)
    }
  }
  return tokens
}

export function deriveContactInterestTopics(
  contact: {
    jobTitle?: string | null
    department?: string | null
    relationshipRole?: string | null
  },
  offers: SimpleOffer[]
): InterestTopic[] {
  const normalizedJobTitle = foldText(contact.jobTitle || "")
  const normalizedDept = foldText(contact.department || "")

  if (!normalizedJobTitle && !normalizedDept) {
    return []
  }

  const jobTokens = extractTokens(contact.jobTitle || "")
  const deptTokens = extractTokens(`${contact.department || ""} ${departmentLabel(contact.department)}`)

  const scored: InterestTopic[] = []

  for (const offer of offers) {
    let score = 0
    const matchedReasons: string[] = []

    const offerKeywords = (offer.keywords || []).map(foldText)
    const typicalProfiles = (offer.typical_profiles || []).map(foldText)
    const useCases = (offer.use_cases || []).map(foldText)
    const offerNameFolded = foldText(offer.name)

    const offerAllText = `${offerNameFolded} ${offerKeywords.join(" ")} ${typicalProfiles.join(" ")} ${useCases.join(" ")}`
    const offerTokens = extractTokens(offerAllText)

    // 1. Check direct token overlap between job title & offer typical profiles/keywords/name
    for (const token of jobTokens) {
      if (offerTokens.includes(token)) {
        score += 2
      }
    }

    // 2. Department match
    for (const dToken of deptTokens) {
      if (offerTokens.includes(dToken)) {
        score += 2
        if (!matchedReasons.includes(`Aligné avec le domaine ${departmentLabel(contact.department)}`)) {
          matchedReasons.push(`Aligné avec le domaine ${departmentLabel(contact.department)}`)
        }
      }
    }

    // 3. Special matching for IT / Cyber / Data / Cloud / Sales / General Management
    if (normalizedDept.includes("cyber") && (offerNameFolded.includes("cyber") || offerKeywords.some(k => k.includes("cyber") || k.includes("secu")))) {
      score += 4
      matchedReasons.unshift("Offre cible pour la Cybersécurité")
    } else if ((normalizedDept.includes("data") || normalizedDept.includes("bi")) && (offerNameFolded.includes("data") || offerNameFolded.includes("bi") || offerKeywords.some(k => k.includes("data")))) {
      score += 4
      matchedReasons.unshift("Offre cible Data & BI")
    } else if (normalizedDept.includes("cloud") && (offerNameFolded.includes("cloud") || offerKeywords.some(k => k.includes("cloud")))) {
      score += 4
      matchedReasons.unshift("Offre cible Cloud & DevOps")
    } else if (normalizedDept.includes("it") && (offerNameFolded.includes("it") || offerNameFolded.includes("cloud") || offerNameFolded.includes("digit"))) {
      score += 3
      matchedReasons.unshift("Enjeu de transformation et gouvernance IT")
    }

    if (score > 0) {
      const reason = matchedReasons.length > 0
        ? matchedReasons[0]
        : `En lien avec les enjeux du poste ${contact.jobTitle || "occupé"}.`

      scored.push({
        offerId: offer.id,
        topicTitle: offer.name,
        reason,
        score,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 5)
}
