export function getRelativeTimeFr(dateStr: string | Date | null) {
  if (!dateStr) return "il y a quelques heures"
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `il y a ${Math.max(1, diffMins)} min`
  } else if (diffHours < 24) {
    return `il y a ${diffHours} h`
  } else {
    return `il y a ${diffDays} j`
  }
}

export function extractMatchedCompany<T extends { id: string; name: string }>(
  title: string,
  summary: string,
  companies: T[]
): T | null {
  if (!companies || companies.length === 0) return null

  const textToSearch = `${title} ${summary}`.toLowerCase()

  // Find exact name matches, sorting by name length descending so longer matches have priority
  const sortedCompanies = [...companies].sort((a, b) => b.name.length - a.name.length)

  for (const company of sortedCompanies) {
    const compNameLower = company.name.toLowerCase()
    // Simple word boundary check or inclusion check
    if (textToSearch.includes(compNameLower)) {
      return company
    }
  }

  // Fallback check for tags or parts of title
  return null
}
