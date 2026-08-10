import type {
  SectorMap,
  SectorMapRef,
} from "./sector-map"

export interface SectorMapValidationIssue {
  path: string
  message: string
}

export class SectorMapValidationError extends Error {
  readonly issues: SectorMapValidationIssue[]

  constructor(issues: SectorMapValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"))
    this.name = "SectorMapValidationError"
    this.issues = issues
  }
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase("fr")
}

function collectDuplicateIssues<T>(
  items: T[],
  path: string,
  keyOf: (item: T) => string,
) {
  const issues: SectorMapValidationIssue[] = []
  const seen = new Set<string>()

  items.forEach((item, index) => {
    const key = keyOf(item)
    if (seen.has(key)) {
      issues.push({ path: `${path}[${index}]`, message: `valeur dupliquée: ${key}` })
    }
    seen.add(key)
  })

  return issues
}

function refExists(model: SectorMap, ref: SectorMapRef) {
  if (ref.kind === "activity") return model.activities.some((item) => item.id === ref.id)
  if (ref.kind === "entity") return model.entities.some((item) => item.id === ref.id)
  return model.ecosystemLayers.some((item) => item.id === ref.id)
}

function sameRef(left: SectorMapRef, right: SectorMapRef) {
  return left.kind === right.kind && left.id === right.id
}

export function validateSectorMap(model: SectorMap): SectorMapValidationIssue[] {
  const issues: SectorMapValidationIssue[] = [
    ...collectDuplicateIssues(model.stages, "stages", (item) => item.id),
    ...collectDuplicateIssues(model.stages, "stages", (item) => String(item.order)),
    ...collectDuplicateIssues(model.activities, "activities", (item) => item.id),
    ...collectDuplicateIssues(model.entities, "entities", (item) => item.id),
    ...collectDuplicateIssues(model.entities, "entities", (item) => normalizedName(item.name)),
    ...collectDuplicateIssues(
      model.entities.filter((item) => item.companyId),
      "entities",
      (item) => item.companyId ?? "",
    ),
    ...collectDuplicateIssues(model.placements, "placements", (item) => item.id),
    ...collectDuplicateIssues(
      model.placements,
      "placements",
      (item) => `${item.entityId}:${item.target.kind}:${item.target.id}`,
    ),
    ...collectDuplicateIssues(model.relationships, "relationships", (item) => item.id),
    ...collectDuplicateIssues(model.ecosystemLayers, "ecosystemLayers", (item) => item.id),
    ...collectDuplicateIssues(model.ecosystemLayers, "ecosystemLayers", (item) => String(item.order)),
    ...collectDuplicateIssues(model.metrics, "metrics", (item) => item.id),
    ...collectDuplicateIssues(
      model.metrics,
      "metrics",
      (item) => `${item.subject.kind}:${item.subject.id}:${item.kind}`,
    ),
    ...collectDuplicateIssues(model.evidence, "evidence", (item) => item.id),
  ]

  if (!model.sector.id.trim()) {
    issues.push({ path: "sector.id", message: "ne peut pas être vide" })
  }
  if (!model.sector.slug.trim()) {
    issues.push({ path: "sector.slug", message: "ne peut pas être vide" })
  }
  if (!model.sector.name.trim()) {
    issues.push({ path: "sector.name", message: "ne peut pas être vide" })
  }

  if (!model.activities.some((activity) => activity.id === model.sector.defaultActivityId)) {
    issues.push({
      path: "sector.defaultActivityId",
      message: "doit référencer une activité existante",
    })
  }

  model.activities.forEach((activity, index) => {
    if (!model.stages.some((stage) => stage.id === activity.stageId)) {
      issues.push({
        path: `activities[${index}].stageId`,
        message: "doit référencer un stage existant",
      })
    }
    if (!activity.label.trim()) {
      issues.push({ path: `activities[${index}].label`, message: "ne peut pas être vide" })
    }
  })

  const activityOrders = new Set<string>()
  model.activities.forEach((activity, index) => {
    const key = `${activity.stageId}:${activity.order}`
    if (activityOrders.has(key)) {
      issues.push({
        path: `activities[${index}].order`,
        message: "doit être unique dans son stage",
      })
    }
    activityOrders.add(key)
  })

  model.placements.forEach((placement, index) => {
    if (!model.entities.some((entity) => entity.id === placement.entityId)) {
      issues.push({
        path: `placements[${index}].entityId`,
        message: "doit référencer une entity existante",
      })
    }
    if (!refExists(model, placement.target)) {
      issues.push({
        path: `placements[${index}].target`,
        message: "doit référencer une activity ou ecosystemLayer existante",
      })
    }
    if (placement.priorityOpportunity && placement.evidenceIds.length === 0) {
      issues.push({
        path: `placements[${index}].evidenceIds`,
        message: "une opportunité prioritaire doit être justifiée par une preuve",
      })
    }
  })

  model.relationships.forEach((relationship, index) => {
    if (!refExists(model, relationship.from)) {
      issues.push({ path: `relationships[${index}].from`, message: "référence inconnue" })
    }
    if (!refExists(model, relationship.to)) {
      issues.push({ path: `relationships[${index}].to`, message: "référence inconnue" })
    }
    if (sameRef(relationship.from, relationship.to)) {
      issues.push({ path: `relationships[${index}]`, message: "une relation ne peut pas se boucler sur elle-même" })
    }
    if (
      relationship.mode === "influence"
      && relationship.from.kind !== "ecosystemLayer"
      && relationship.to.kind !== "ecosystemLayer"
    ) {
      issues.push({
        path: `relationships[${index}].mode`,
        message: "une influence doit impliquer une ecosystemLayer",
      })
    }
  })

  const evidenceIds = new Set(model.evidence.map((item) => item.id))
  const evidenceOwners = [
    ...model.placements.map((item, index) => ({ path: `placements[${index}]`, ids: item.evidenceIds })),
    ...model.relationships.map((item, index) => ({ path: `relationships[${index}]`, ids: item.evidenceIds })),
    ...model.metrics.map((item, index) => ({ path: `metrics[${index}]`, ids: item.evidenceIds })),
  ]
  evidenceOwners.forEach((owner) => {
    owner.ids.forEach((evidenceId) => {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({ path: `${owner.path}.evidenceIds`, message: `preuve inconnue: ${evidenceId}` })
      }
    })
  })

  model.metrics.forEach((metric, index) => {
    if (!refExists(model, metric.subject)) {
      issues.push({ path: `metrics[${index}].subject`, message: "référence inconnue" })
    }
    if (metric.kind === "kredo_coverage" && metric.total !== null && metric.total < 0) {
      issues.push({ path: `metrics[${index}].total`, message: "doit être positif ou nul" })
    }
    if (metric.kind === "kredo_coverage" && metric.total !== null) {
      const coveredEntityIds = new Set(
        model.placements
          .filter((placement) => (
            placement.target.kind === metric.subject.kind
            && placement.target.id === metric.subject.id
          ))
          .map((placement) => model.entities.find((entity) => entity.id === placement.entityId))
          .filter((entity) => Boolean(entity?.companyId))
          .map((entity) => entity?.id),
      )
      if (coveredEntityIds.size > metric.total) {
        issues.push({
          path: `metrics[${index}].total`,
          message: "ne peut pas être inférieur au nombre d'entities Kredo uniques",
        })
      }
    }
  })

  return issues
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "fr"))
}

export function normalizeSectorMap(model: SectorMap): SectorMap {
  const issues = validateSectorMap(model)
  if (issues.length > 0) throw new SectorMapValidationError(issues)

  return {
    sector: {
      ...model.sector,
      slug: model.sector.slug.trim(),
      name: model.sector.name.trim(),
    },
    stages: model.stages
      .map((item) => ({ ...item, label: item.label.trim() }))
      .sort((left, right) => left.order - right.order),
    activities: model.activities
      .map((item) => ({ ...item, label: item.label.trim() }))
      .sort((left, right) => {
        const leftStage = model.stages.find((stage) => stage.id === left.stageId)?.order ?? 0
        const rightStage = model.stages.find((stage) => stage.id === right.stageId)?.order ?? 0
        return leftStage - rightStage || left.order - right.order
      }),
    entities: model.entities
      .map((item) => ({ ...item, name: item.name.trim() }))
      .sort((left, right) => left.name.localeCompare(right.name, "fr")),
    placements: model.placements
      .map((item) => ({ ...item, target: { ...item.target }, evidenceIds: uniqueSorted(item.evidenceIds) }))
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)),
    relationships: model.relationships
      .map((item) => ({
        ...item,
        label: item.label?.trim(),
        from: { ...item.from },
        to: { ...item.to },
        evidenceIds: uniqueSorted(item.evidenceIds),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    ecosystemLayers: model.ecosystemLayers
      .map((item) => ({ ...item, label: item.label.trim() }))
      .sort((left, right) => left.order - right.order),
    metrics: model.metrics
      .map((item) => item.kind === "value_capture"
        ? {
            ...item,
            subject: { kind: "activity" as const, id: item.subject.id },
            evidenceIds: uniqueSorted(item.evidenceIds),
          }
        : {
            ...item,
            subject: { ...item.subject },
            evidenceIds: uniqueSorted(item.evidenceIds),
          })
      .sort((left, right) => left.id.localeCompare(right.id)),
    evidence: model.evidence
      .map((item) => ({
        ...item,
        label: item.label.trim(),
        excerpt: item.excerpt?.trim(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
}
