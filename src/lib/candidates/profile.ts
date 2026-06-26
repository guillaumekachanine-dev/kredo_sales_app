const CANDIDATE_SENIORITY_BY_KEY: Record<string, string> = {
  junior: "Junior",
  confirme: "Confirmé",
  "confirmé": "Confirmé",
  senior: "Senior",
  lead: "Lead",
  expert: "Expert",
}

export function normalizeCandidateSeniority(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  return CANDIDATE_SENIORITY_BY_KEY[trimmed.toLowerCase()] ?? trimmed
}

export function normalizeCurrentTitle(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
