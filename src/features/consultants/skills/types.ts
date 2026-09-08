export type PracticeCollaborator = {
  id: string
  person_id: string | null
  status: string
  current_title: string | null
  seniority: string | null
  practice: string | null
  person: {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  } | null
  missions: Array<{
    id: string
    title: string
    status: string
    company: { name: string } | null
  }>
}

export type SkillTooltipState = {
  id: string
  name: string
  description: string
  relatedClients?: string[]
  rect: DOMRect
} | null

export type SceneSource = {
  x: number
  y: number
}

export type SceneConnection = {
  key: string
  category: string
  path: string
  targetX: number
  targetY: number
}
