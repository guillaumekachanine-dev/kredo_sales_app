// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Collaborateurs (Lot 4)
//
//  Forme de ligne renvoyée par `get-consultants-team.ts` et consommée par
//  `CollaboratorsDesktop` / `CollaboratorsMobile`.
// ─────────────────────────────────────────────────────────────────────────────

export interface CollaborateurRow {
  id: string
  /** `en_mission` · `intercontrat` · `sorti` — champ d'autorité (C-16). Les sortis sont exclus par le loader. */
  status: string
  current_title: string | null
  seniority: string | null
  practice: string | null
  exit_date: string | null
  person: {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  } | null
  missions: Array<{
    id: string
    title: string
    status: string
    start_date: string | null
    end_date: string | null
    tjm: number
    cjm: number
    gross_margin_pct: number | null
    company: { name: string } | null
  }>
}

/** Un collaborateur est « en mission » selon son statut, pas selon la présence d'une ligne mission active (LEGACY-4). */
export function isCollaboratorStaffed(row: Pick<CollaborateurRow, "status">): boolean {
  return row.status === "en_mission"
}
