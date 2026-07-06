import { linkVertical } from "d3-shape"
import type {
  PracticeTerritory,
  PracticeTone,
  SkillCategory,
  SkillNode,
} from "@/lib/consultants/pool-competences-data"
import { resolvePracticeSlug } from "@/lib/consultants/pool-competences-data"
import type { PracticeCollaborator, SceneConnection, SceneSource } from "./types"

export type SkillGroup = {
  category: SkillCategory
  skills: SkillNode[]
}

type TreeLinkDatum = {
  source: [number, number]
  target: [number, number]
}

export const toneClasses: Record<
  PracticeTone,
  {
    fill: string
    border: string
    text: string
    soft: string
    line: string
    svgFill: string
    svgStroke: string
    iconFilter: string
    iconFilterFocused: string
  }
> = {
  primary: {
    fill: "bg-primary text-primary-fg",
    border: "border-primary/30",
    text: "text-primary",
    soft: "bg-primary/10",
    line: "border-primary/30",
    svgFill: "fill-primary/10",
    svgStroke: "stroke-primary/35",
    // cobalt #2554B8
    iconFilter: "brightness(0) saturate(100%) invert(19%) sepia(89%) saturate(855%) hue-rotate(211deg) brightness(96%) contrast(98%)",
    // gold #FFB812 on cobalt bg
    iconFilterFocused: "brightness(0) saturate(100%) invert(77%) sepia(85%) saturate(806%) hue-rotate(335deg) brightness(103%) contrast(100%)",
  },
  success: {
    fill: "bg-success text-primary-fg",
    border: "border-success/30",
    text: "text-success",
    soft: "bg-success/10",
    line: "border-success/30",
    svgFill: "fill-success/10",
    svgStroke: "stroke-success/35",
    // green #2C7D5C
    iconFilter: "brightness(0) saturate(100%) invert(36%) sepia(24%) saturate(1082%) hue-rotate(110deg) brightness(93%) contrast(93%)",
    // white on green bg
    iconFilterFocused: "brightness(0) invert(1)",
  },
  warning: {
    fill: "bg-secondary text-secondary-fg",
    border: "border-secondary/40",
    text: "text-secondary-fg",
    soft: "bg-secondary/20",
    line: "border-secondary/40",
    svgFill: "fill-secondary/15",
    svgStroke: "stroke-secondary/45",
    // gold #FFB812
    iconFilter: "brightness(0) saturate(100%) invert(77%) sepia(85%) saturate(806%) hue-rotate(335deg) brightness(103%) contrast(100%)",
    // cobalt #2554B8 on gold bg (complementaire)
    iconFilterFocused: "brightness(0) saturate(100%) invert(19%) sepia(89%) saturate(855%) hue-rotate(211deg) brightness(96%) contrast(98%)",
  },
  danger: {
    fill: "bg-danger text-primary-fg",
    border: "border-danger/30",
    text: "text-danger",
    soft: "bg-danger/10",
    line: "border-danger/30",
    svgFill: "fill-danger/10",
    svgStroke: "stroke-danger/35",
    // red #BE3E3E
    iconFilter: "brightness(0) saturate(100%) invert(25%) sepia(97%) saturate(596%) hue-rotate(329deg) brightness(95%) contrast(93%)",
    // white on red bg
    iconFilterFocused: "brightness(0) invert(1)",
  },
  accent: {
    fill: "bg-accent text-primary-fg",
    border: "border-accent/30",
    text: "text-accent",
    soft: "bg-accent/10",
    line: "border-accent/30",
    svgFill: "fill-accent/10",
    svgStroke: "stroke-accent/35",
    // orange #D97020
    iconFilter: "brightness(0) saturate(100%) invert(53%) sepia(96%) saturate(523%) hue-rotate(0deg) brightness(97%) contrast(100%)",
    // white on orange bg
    iconFilterFocused: "brightness(0) invert(1)",
  },
  info: {
    fill: "bg-info text-primary-fg",
    border: "border-info/30",
    text: "text-info",
    soft: "bg-info/10",
    line: "border-info/30",
    svgFill: "fill-info/10",
    svgStroke: "stroke-info/35",
    iconFilter: "brightness(0) saturate(100%) invert(38%) sepia(41%) saturate(653%) hue-rotate(143deg) brightness(88%) contrast(90%)",
    iconFilterFocused: "brightness(0) invert(1)",
  },
  idea: {
    fill: "bg-cat-idea text-cat-idea-fg",
    border: "border-cat-idea/30",
    text: "text-cat-idea",
    soft: "bg-cat-idea/10",
    line: "border-cat-idea/30",
    svgFill: "fill-cat-idea/10",
    svgStroke: "stroke-cat-idea/35",
    iconFilter: "brightness(0) saturate(100%) invert(23%) sepia(77%) saturate(1973%) hue-rotate(276deg) brightness(89%) contrast(90%)",
    iconFilterFocused: "brightness(0) invert(1)",
  },
  neutral: {
    fill: "bg-status-neutral text-primary-fg",
    border: "border-status-neutral/30",
    text: "text-status-neutral",
    soft: "bg-status-neutral/10",
    line: "border-status-neutral/30",
    svgFill: "fill-status-neutral/10",
    svgStroke: "stroke-status-neutral/35",
    iconFilter: "brightness(0) saturate(100%) invert(46%) sepia(10%) saturate(549%) hue-rotate(175deg) brightness(94%) contrast(83%)",
    iconFilterFocused: "brightness(0) invert(1)",
  },
}

export const practiceImages: Record<string, string> = {
  "data-ia": "/images/practices/data-ia.jpg",
  "data-ai": "/images/practices/data-ia.jpg",
  "digital-cloud": "/images/practices/digital-cloud.jpg",
  "cloud-engineering": "/images/practices/digital-cloud.jpg",
  "digital-business-solutions": "/images/practices/digital-cloud.jpg",
  "digital-experience": "/images/practices/agile-pm.jpg",
  "agile-pm": "/images/practices/agile-pm.jpg",
  "project-agile-delivery": "/images/practices/agile-pm.jpg",
  cybersecurity: "/images/practices/cybersecurity.jpg",
  "qa-testing": "/images/practices/qa-testing.jpg",
  "quality-engineering-testing": "/images/practices/qa-testing.jpg",
}

export const categoryLabels: Record<SkillCategory, string> = {
  certification: "Certifications",
  cloud: "Cloud",
  data: "Data",
  devops: "DevOps",
  fonctionnel: "Fonctionnel",
  framework: "Frameworks",
  langage: "Langages",
  methode: "Methodes",
  secteur: "Secteurs",
  soft_skill: "Soft skills",
  autre: "Autres",
}

export const categoryGlyphs: Record<SkillCategory, string> = {
  certification: "CE",
  cloud: "CL",
  data: "DA",
  devops: "DO",
  fonctionnel: "FX",
  framework: "FW",
  langage: "LG",
  methode: "MT",
  secteur: "SE",
  soft_skill: "SS",
  autre: "AU",
}

export const categoryIcons: Partial<Record<SkillCategory, string>> = {
  cloud: "/icons_set/cloud-computing.png",
  data: "/icons_set/Data_&_IA.png",
  devops: "/icons_set/devops.png",
  fonctionnel: "/icons_set/fonctionnel.png",
  framework: "/icons_set/framework.png",
  langage: "/icons_set/dev_langages.png",
  methode: "/icons_set/methodes_&_process.png",
  soft_skill: "/icons_set/soft_skills.png",
}

const categoryOrder: SkillCategory[] = [
  "data",
  "cloud",
  "framework",
  "langage",
  "devops",
  "fonctionnel",
  "methode",
  "certification",
  "secteur",
  "soft_skill",
  "autre",
]

const verticalLink = linkVertical<TreeLinkDatum, [number, number]>()
  .x((point) => point[0])
  .y((point) => point[1])
  .source((datum) => datum.source)
  .target((datum) => datum.target)

export function groupPracticeSkills(
  practice: PracticeTerritory,
  skills: readonly SkillNode[]
): SkillGroup[] {
  const byName = new Map(skills.map((skill) => [skill.name, skill]))
  const groups = new Map<SkillCategory, SkillNode[]>()

  for (const skillName of practice.skillNames) {
    const skill = byName.get(skillName)
    if (!skill) continue

    const current = groups.get(skill.category) ?? []
    current.push(skill)
    groups.set(skill.category, current)
  }

  return categoryOrder
    .map((category) => ({
      category,
      skills: groups.get(category) ?? [],
    }))
    .filter((group) => group.skills.length > 0)
}

export function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function getCollaboratorName(collaborator: PracticeCollaborator): string {
  const composed = `${collaborator.person?.first_name ?? ""} ${collaborator.person?.last_name ?? ""}`.trim()
  return collaborator.person?.full_name ?? (composed || "Consultant non renseigne")
}

export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "KR"
  )
}

export function getActiveMission(collaborator: PracticeCollaborator) {
  return collaborator.missions.find((mission) => mission.status === "active") ?? null
}

export function isAttachedToPractice(
  collaborator: PracticeCollaborator,
  practice: PracticeTerritory
): boolean {
  const haystack = normalize(
    [
      collaborator.practice,
      collaborator.current_title,
      collaborator.seniority,
      getCollaboratorName(collaborator),
    ]
      .filter(Boolean)
      .join(" ")
  )

  return resolvePracticeSlug(haystack, [practice]) === practice.slug
}

export function buildPracticeConnections(
  source: SceneSource,
  targets: Array<SceneSource & { key: string; category: SkillCategory }>
): SceneConnection[] {
  return targets.map((target) => ({
    key: target.key,
    category: target.category,
    path:
      verticalLink({
        source: [source.x, source.y],
        target: [target.x, target.y],
      }) ?? "",
    targetX: target.x,
    targetY: target.y,
  }))
}
