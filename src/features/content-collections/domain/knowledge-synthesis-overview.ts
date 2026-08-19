import { DOCUMENT_OBJECT_LABELS } from "@/components/reports/document-display"

export interface RawDocumentRecord {
  id: string
  document_type: string | null
  created_at: string
}

export interface RawCollectionItemRecord {
  collection_id: string
  content_type: string
  content_id: string
}

export interface RawCollectionRecord {
  id: string
  name: string
  kind: string
  item_type: string | null
}

export interface KnowledgeSynthesisRawData {
  documents: RawDocumentRecord[]
  collectionItems: RawCollectionItemRecord[]
  collections: RawCollectionRecord[]
}

export interface DocumentTypePoint {
  typeKey: string
  label: string
  count: number
  percentage: number
  colorVar: string
}

export interface MonthlyProductionPoint {
  yearMonth: string
  label: string
  count: number
}

export interface WeeklyProductionPoint {
  weekKey: string  // "YYYY-Www"
  label: string    // "S23", "S24"…
  count: number
}

export interface TopListPoint {
  id: string
  name: string
  count: number
}

export interface KnowledgeSynthesisOverview {
  totalDocuments: number
  uniqueTypeCount: number
  recent30DaysCount: number
  typeDistribution: DocumentTypePoint[]
  monthlyHistory: MonthlyProductionPoint[]
  weeklyHistory: WeeklyProductionPoint[]
  classifiedDocCount: number
  unclassifiedDocCount: number
  classifiedPercentage: number
  topLists: TopListPoint[]
  insights: string[]
}

const DATAVIZ_COLORS = [
  "var(--color-dataviz-1)", // #2554B8
  "var(--color-brand-brass)", // #C89A2B
  "var(--color-dataviz-3)", // #63A6E8
  "var(--color-dataviz-4)", // #719A5A
  "var(--color-dataviz-5)", // #7B6BB2
  "var(--color-dataviz-6)", // #D4B26A
  "var(--color-dataviz-7)", // #B37D53
]

export function buildKnowledgeSynthesisOverview(
  rawData: KnowledgeSynthesisRawData,
  now: Date = new Date(),
): KnowledgeSynthesisOverview {
  const { documents, collectionItems, collections } = rawData
  const totalDocuments = documents.length

  // 1. Documents créés sur les 30 derniers jours
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recent30DaysCount = documents.filter((doc) => new Date(doc.created_at) >= thirtyDaysAgo).length

  // 2. Répartition par type documentaire
  const countByType = new Map<string, number>()
  for (const doc of documents) {
    const typeKey = doc.document_type || "unspecified"
    countByType.set(typeKey, (countByType.get(typeKey) ?? 0) + 1)
  }

  const uniqueTypeCount = countByType.size

  const sortedTypes = Array.from(countByType.entries()).sort((a, b) => b[1] - a[1])

  const typeDistribution: DocumentTypePoint[] = sortedTypes.map(([typeKey, count], index) => {
    const label =
      typeKey === "unspecified"
        ? "Non spécifié"
        : (DOCUMENT_OBJECT_LABELS as Record<string, string>)[typeKey] ?? typeKey
    const percentage = totalDocuments > 0 ? Math.round((count / totalDocuments) * 100) : 0
    const colorVar = DATAVIZ_COLORS[index % DATAVIZ_COLORS.length]!

    return {
      typeKey,
      label,
      count,
      percentage,
      colorVar,
    }
  })

  // 3. Évolution mensuelle (sur les 6 derniers mois)
  const monthlyCounts = new Map<string, number>()
  const monthLabels = new Map<string, string>()

  // Initialiser les 6 derniers mois
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
    monthlyCounts.set(yearMonth, 0)
    monthLabels.set(yearMonth, label)
  }

  for (const doc of documents) {
    const d = new Date(doc.created_at)
    if (isNaN(d.getTime())) continue
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthlyCounts.has(yearMonth)) {
      monthlyCounts.set(yearMonth, (monthlyCounts.get(yearMonth) ?? 0) + 1)
    }
  }

  const monthlyHistory: MonthlyProductionPoint[] = Array.from(monthlyCounts.entries()).map(
    ([yearMonth, count]) => ({
      yearMonth,
      label: monthLabels.get(yearMonth) ?? yearMonth,
      count,
    }),
  )

  // 3b. Évolution hebdomadaire (8 dernières semaines)
  function getISOWeekKey(d: Date): string {
    // ISO week: Monday = day 1
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayOfWeek = tmp.getUTCDay() || 7 // Sunday = 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek) // Thursday of this week
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const weekNumber = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${tmp.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`
  }

  const weeklyCounts = new Map<string, number>()
  const weekLabels = new Map<string, string>()

  // Initialiser les 8 dernières semaines (lundi de chaque semaine)
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    // Reculer au lundi de cette semaine
    const dayOfWeek = d.getDay() || 7
    const monday = new Date(d.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
    const weekKey = getISOWeekKey(monday)
    if (!weeklyCounts.has(weekKey)) {
      weeklyCounts.set(weekKey, 0)
      const weekNum = weekKey.split("-W")[1]
      weekLabels.set(weekKey, `S${weekNum}`)
    }
  }

  for (const doc of documents) {
    const d = new Date(doc.created_at)
    if (isNaN(d.getTime())) continue
    const weekKey = getISOWeekKey(d)
    if (weeklyCounts.has(weekKey)) {
      weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) ?? 0) + 1)
    }
  }

  const weeklyHistory: WeeklyProductionPoint[] = Array.from(weeklyCounts.entries()).map(
    ([weekKey, count]) => ({
      weekKey,
      label: weekLabels.get(weekKey) ?? weekKey,
      count,
    }),
  )

  // 4. Classement des documents dans les listes
  const classifiedDocIds = new Set<string>()
  const itemsByCollection = new Map<string, number>()

  for (const item of collectionItems) {
    classifiedDocIds.add(item.content_id)
    itemsByCollection.set(item.collection_id, (itemsByCollection.get(item.collection_id) ?? 0) + 1)
  }

  const classifiedDocCount = Math.min(classifiedDocIds.size, totalDocuments)
  const unclassifiedDocCount = Math.max(0, totalDocuments - classifiedDocCount)
  const classifiedPercentage = totalDocuments > 0 ? Math.round((classifiedDocCount / totalDocuments) * 100) : 0

  // 5. Top 5 des listes par volume
  const listCollections = collections.filter((c) => c.kind === "list")
  const topLists: TopListPoint[] = listCollections
    .map((col) => ({
      id: col.id,
      name: col.name,
      count: itemsByCollection.get(col.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 6. Insights déterministes (3 max)
  const insights: string[] = []

  if (typeDistribution.length > 0) {
    const topType = typeDistribution[0]!
    insights.push(
      `Le type « ${topType.label} » est le plus représenté, constituant ${topType.percentage}% du patrimoine documentaire.`,
    )
  }

  if (monthlyHistory.length > 0) {
    const maxMonth = [...monthlyHistory].sort((a, b) => b.count - a.count)[0]!
    if (maxMonth.count > 0) {
      insights.push(
        `Le mois le plus productif sur la période récente est ${maxMonth.label} avec ${maxMonth.count} documents générés.`,
      )
    } else {
      insights.push(`Aucun document généré sur les 6 derniers mois.`)
    }
  }

  insights.push(
    `${classifiedPercentage}% des documents du patrimoine sont structurés dans au moins une liste personnelle.`,
  )

  return {
    totalDocuments,
    uniqueTypeCount,
    recent30DaysCount,
    typeDistribution,
    monthlyHistory,
    weeklyHistory,
    classifiedDocCount,
    unclassifiedDocCount,
    classifiedPercentage,
    topLists,
    insights: insights.slice(0, 3),
  }
}
