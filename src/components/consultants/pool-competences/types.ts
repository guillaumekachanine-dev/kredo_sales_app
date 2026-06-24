import type { SkillCategory } from "@/lib/consultants/pool-competences-data"

export type PracticeCollaborator = {
  id: string
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
  rect: DOMRect
} | null

export type SceneSource = {
  x: number
  y: number
}

export type SceneConnection = {
  key: string
  category: SkillCategory
  path: string
  targetX: number
  targetY: number
}
