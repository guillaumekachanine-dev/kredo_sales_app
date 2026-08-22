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

export function resolveOriginalSourceName(sourceName?: string | null, sourceUrl?: string | null): string {
  const url = sourceUrl?.toLowerCase() ?? ""

  if (url.includes("lesechos") || url.includes("echos")) return "Les Echos"
  if (url.includes("usinenouvelle")) return "L'Usine Nouvelle"
  if (url.includes("latribune")) return "La Tribune"
  if (url.includes("lefigaro") || url.includes("figaro")) return "Le Figaro"
  if (url.includes("lemonde")) return "Le Monde"
  if (url.includes("bfmbusiness") || url.includes("bfm")) return "BFM Business"
  if (url.includes("lsa-conso") || url.includes("lsa")) return "LSA Conso"
  if (url.includes("agefi")) return "L'Agefi"
  if (url.includes("journaldunet") || url.includes("jdn")) return "Journal du Net"
  if (url.includes("challenges")) return "Challenges"
  if (url.includes("capital.fr")) return "Capital"
  if (url.includes("distributique")) return "Distributique"
  if (url.includes("usine-digitale")) return "L'Usine Digitale"
  if (url.includes("cio-online")) return "CIO Online"
  if (url.includes("lemondeinformatique")) return "Le Monde Informatique"

  if (sourceName && sourceName !== "Google News" && !sourceName.toLowerCase().includes("google news")) {
    return sourceName
  }

  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "")
      const mainPart = hostname.split(".")[0]
      if (mainPart && mainPart !== "news" && mainPart !== "google") {
        return mainPart.charAt(0).toUpperCase() + mainPart.slice(1)
      }
    } catch {}
  }

  return "Les Echos"
}

