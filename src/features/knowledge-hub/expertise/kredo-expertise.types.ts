export interface PracticeItem {
  id: string
  name: string
  slug: string
  description: string
  perimeter: string
  colorHex: string | null
  stackTags: string[]
  jobCount: number
}

export interface JobItem {
  id: string
  title: string
  practiceId: string
  practiceName: string
  mainMission: string
  techStack: string[]
  responsibilities: string[]
  kpis: string[]
}

export interface SkillItem {
  id: string
  name: string
  category: string
  description: string | null
  profileCount: number
}

export interface TechItem {
  name: string
  practices: string[]
  jobCount: number
}

export interface KredoExpertiseSnapshot {
  practices: PracticeItem[]
  jobs: JobItem[]
  skills: SkillItem[]
  technologies: TechItem[]
}
