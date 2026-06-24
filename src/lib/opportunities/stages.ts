export type SalesStage =
  | "qualification"
  | "recherche_profil"
  | "cv_envoyes"
  | "entretien_client"
  | "contractualisation"
  | "gagne"
  | "perdu"
  | "abandonne"
  | "non_traitee"

type OpportunityStageDefinition = {
  value: SalesStage
  label: string
  order: number
  icon: string | null
  color: string
  isTerminal: boolean
}

export const OPPORTUNITY_STAGES = [
  {
    value: "qualification",
    label: "Qualification",
    order: 1,
    icon: "/icons_set/qualification.png",
    color: "var(--color-cat-success)",
    isTerminal: false,
  },
  {
    value: "recherche_profil",
    label: "Recherche profils",
    order: 2,
    icon: "/icons_set/sourcing_candidats_2.png",
    color: "var(--color-dataviz-3)",
    isTerminal: false,
  },
  {
    value: "cv_envoyes",
    label: "CV envoyés",
    order: 3,
    icon: "/icons_set/CV_envoyé.png",
    color: "var(--color-brand-primary)",
    isTerminal: false,
  },
  {
    value: "entretien_client",
    label: "Entretien client",
    order: 4,
    icon: "/icons_set/presentation_client_rt_2.png",
    color: "var(--color-dataviz-5)",
    isTerminal: false,
  },
  {
    value: "contractualisation",
    label: "Contractualisation",
    order: 5,
    icon: "/icons_set/contractualisation.png",
    color: "var(--color-brand-ember)",
    isTerminal: false,
  },
  {
    value: "gagne",
    label: "Gagné",
    order: 6,
    icon: "/icons_set/oppy_win.png",
    color: "var(--color-secondary)",
    isTerminal: true,
  },
  {
    value: "perdu",
    label: "Perdu",
    order: 7,
    icon: "/icons_set/oppy_perdu.png",
    color: "var(--color-danger)",
    isTerminal: true,
  },
  {
    value: "abandonne",
    label: "Abandonné",
    order: 8,
    icon: "/icons_set/oppy_abandon.png",
    color: "var(--color-warning)",
    isTerminal: true,
  },
  {
    value: "non_traitee",
    label: "Non traitée",
    order: 9,
    icon: null,
    color: "var(--color-muted)",
    isTerminal: true,
  },
] as const satisfies readonly OpportunityStageDefinition[]

const OPPORTUNITY_STAGE_BY_VALUE = Object.fromEntries(
  OPPORTUNITY_STAGES.map((stage) => [stage.value, stage]),
) as Record<SalesStage, (typeof OPPORTUNITY_STAGES)[number]>

const OPPORTUNITY_STAGE_LABEL_ALIASES: Record<string, string> = {
  detection: "Détection",
  besoin_confirme: "Besoin confirmé",
  en_cours: "En cours",
  cv_sent: "CV envoyés",
  rt: "Entretien client",
  negociation: "Contractualisation",
  nego: "Contractualisation",
  win: "Gagné",
  lost: "Perdu",
}

const OPPORTUNITY_STAGE_VALUE_ALIASES: Partial<Record<string, SalesStage>> = {
  cv_sent: "cv_envoyes",
  rt: "entretien_client",
  negociation: "contractualisation",
  nego: "contractualisation",
  win: "gagne",
  lost: "perdu",
}

export const OPPORTUNITY_STAGE_LABELS = Object.fromEntries(
  OPPORTUNITY_STAGES.map((stage) => [stage.value, stage.label]),
) as Record<SalesStage, string>

export const OPPORTUNITY_PIPELINE_STAGES = OPPORTUNITY_STAGES.filter(
  (stage) => !stage.isTerminal || stage.value === "gagne",
)

export const OPPORTUNITY_ACTIVE_STAGES = OPPORTUNITY_STAGES.filter(
  (stage) => !stage.isTerminal,
)

export const OPPORTUNITY_TERMINAL_STAGES = OPPORTUNITY_STAGES.filter(
  (stage) => stage.isTerminal,
)

export const OPPORTUNITY_KANBAN_STAGES = OPPORTUNITY_PIPELINE_STAGES

export function isOpportunityStage(value: string | null | undefined): value is SalesStage {
  if (!value) return false
  return value in OPPORTUNITY_STAGE_BY_VALUE
}

export function toCanonicalOpportunityStage(
  value: string | null | undefined,
): SalesStage | null {
  if (!value) return null
  if (isOpportunityStage(value)) return value
  return OPPORTUNITY_STAGE_VALUE_ALIASES[value] ?? null
}

export function getOpportunityStageDefinition(value: string | null | undefined) {
  const canonical = toCanonicalOpportunityStage(value)
  return canonical ? OPPORTUNITY_STAGE_BY_VALUE[canonical] : null
}

export function getOpportunityStageLabel(value: string | null | undefined): string {
  if (!value) return "—"
  const definition = getOpportunityStageDefinition(value)
  if (definition) return definition.label
  return OPPORTUNITY_STAGE_LABEL_ALIASES[value] ?? value.replaceAll("_", " ")
}

export function getOpportunityStageIcon(value: string | null | undefined): string | null {
  return getOpportunityStageDefinition(value)?.icon ?? null
}

export function getOpportunityStageColor(value: string | null | undefined): string {
  return getOpportunityStageDefinition(value)?.color ?? "var(--color-muted)"
}

export function isTerminalOpportunityStage(value: string | null | undefined): boolean {
  const definition = getOpportunityStageDefinition(value)
  if (definition) return definition.isTerminal
  return value === "win" || value === "lost"
}

export function isOpenOpportunityStage(value: string | null | undefined): boolean {
  const definition = getOpportunityStageDefinition(value)
  return definition ? !definition.isTerminal : false
}

export function getOpportunityPipelineIndex(value: string | null | undefined): number {
  const canonical = toCanonicalOpportunityStage(value)
  if (!canonical) return -1
  const activeIndex = OPPORTUNITY_ACTIVE_STAGES.findIndex((stage) => stage.value === canonical)
  if (activeIndex >= 0) return activeIndex
  return OPPORTUNITY_ACTIVE_STAGES.length - 1
}

export function getOpportunityPipelineProgress(value: string | null | undefined): number {
  const index = getOpportunityPipelineIndex(value)
  if (index < 0) return 0
  const denominator = Math.max(OPPORTUNITY_ACTIVE_STAGES.length - 1, 1)
  return index / denominator
}
