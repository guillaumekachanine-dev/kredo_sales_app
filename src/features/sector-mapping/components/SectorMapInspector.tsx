import type { SectorMapEvidence, SectorMapEntity } from "../model"
import type {
  SectorMapActivityProjection,
  SectorMapRelationshipSummary,
} from "../model"
import { evidenceLabel } from "../value-desktop/value-desktop-model"
import styles from "../value-desktop/sector-value-desktop.module.css"

interface SectorMapInspectorProps {
  activity: SectorMapActivityProjection
  summary: SectorMapRelationshipSummary
  evidence: SectorMapEvidence[]
  onClose?: () => void
}

const CONFIDENCE_LABELS = {
  high: "haute",
  medium: "moyenne",
  low: "faible",
  unknown: "non documentée",
} as const

function InspectorEntity({ entity, outlined = false }: { entity: SectorMapEntity; outlined?: boolean }) {
  return (
    <li className={outlined ? styles.inspectorEntityOutlined : styles.inspectorEntity}>
      <span>{entity.name}</span>
    </li>
  )
}

export function SectorMapInspector({
  activity,
  summary,
  evidence,
  onClose,
}: SectorMapInspectorProps) {
  const entitiesById = new Map(activity.entities.map((entity) => [entity.id, entity]))
  const placedEntities = activity.placements
    .map((placement) => entitiesById.get(placement.entityId))
    .filter((entity): entity is SectorMapEntity => Boolean(entity))
  const kredoActors = placedEntities.filter((entity) => Boolean(entity.companyId))
  const priorityActors = activity.placements
    .filter((placement) => placement.priorityOpportunity)
    .map((placement) => entitiesById.get(placement.entityId))
    .filter((entity): entity is SectorMapEntity => Boolean(entity))
  const captureLabel = activity.capture.value === null ? "n.d." : `${activity.capture.value} / 3`
  const coverageLabel = activity.coverage.total === null
    ? `${activity.coverage.covered} / n.d.`
    : `${activity.coverage.covered} / ${activity.coverage.total}`
  const whiteSpaceExplanation = activity.whiteSpace.status === "priority"
    ? `La couverture laisse ${activity.coverage.gap ?? "un nombre inconnu de"} acteur(s) hors portefeuille et ${priorityActors.length} opportunité(s) sont explicitement priorisées et sourcées.`
    : activity.whiteSpace.status === "unknown"
      ? "Le dénominateur de couverture n’est pas documenté : aucune priorité ne peut être conclue."
      : activity.coverage.gap && activity.coverage.gap > 0
        ? "Un écart de couverture existe, mais aucune opportunité n’est explicitement priorisée dans les données."
        : "La couverture documentée ne fait apparaître aucun white space prioritaire."

  return (
    <aside className={styles.inspector} aria-label={`Inspector de ${activity.activity.label}`}>
      <header className={styles.inspectorHeader}>
        <h2>{activity.activity.label}</h2>
        {onClose ? (
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fermer l’inspector">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </header>

      <dl className={styles.inspectorMetrics}>
        <div>
          <dt>Captation</dt>
          <dd className={styles.captureMetric}>{captureLabel}</dd>
        </div>
        <div>
          <dt>Confiance</dt>
          <dd>{CONFIDENCE_LABELS[activity.capture.confidence]}</dd>
        </div>
        <div>
          <dt>Couverture Kredo</dt>
          <dd>{coverageLabel}</dd>
        </div>
      </dl>

      <section className={styles.inspectorSection}>
        <h3>Acteurs Kredo <span>({kredoActors.length})</span></h3>
        {kredoActors.length > 0 ? (
          <ul>{kredoActors.map((entity) => <InspectorEntity key={entity.id} entity={entity} />)}</ul>
        ) : <p className={styles.emptyText}>Aucun acteur Kredo documenté.</p>}
      </section>

      <section className={styles.inspectorSection}>
        <h3>Opportunités prioritaires <span>({priorityActors.length})</span></h3>
        {priorityActors.length > 0 ? (
          <ul>{priorityActors.map((entity) => <InspectorEntity key={entity.id} entity={entity} outlined />)}</ul>
        ) : <p className={styles.emptyText}>Aucune opportunité explicitement priorisée.</p>}
      </section>

      <section className={styles.inspectorSection}>
        <h3>Pourquoi ce white space ?</h3>
        <p className={styles.whiteSpaceExplanation}>{whiteSpaceExplanation}</p>
        <ul className={styles.reasonList}>
          {activity.whiteSpace.reasons.map((reason) => <li key={reason}>{reason.replaceAll("_", " ")}</li>)}
        </ul>
      </section>

      <section className={styles.inspectorSection}>
        <h3>Résumé relationnel</h3>
        <dl className={styles.relationshipSummary}>
          <div><dt>Entrantes</dt><dd>{summary.incoming}</dd></div>
          <div><dt>Sortantes</dt><dd>{summary.outgoing}</dd></div>
          <div><dt>Influences</dt><dd>{summary.influences}</dd></div>
        </dl>
      </section>

      <details className={styles.sourcesDisclosure}>
        <summary>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6M10 16h6" />
          </svg>
          Justification & sources
        </summary>
        {evidence.length > 0 ? (
          <ul>
            {evidence.map((item) => (
              <li key={item.id}>
                {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{evidenceLabel(item)}</a> : evidenceLabel(item)}
                {item.excerpt ? <p>{item.excerpt}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className={styles.emptyText}>Aucune source structurée disponible.</p>}
      </details>
    </aside>
  )
}
