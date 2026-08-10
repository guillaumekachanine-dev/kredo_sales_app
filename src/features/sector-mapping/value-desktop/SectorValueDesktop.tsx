"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import type {
  SectorMap,
  SectorMapEntity,
  SectorMapPlacement,
} from "../model"
import { SectorMapInspector } from "../components/SectorMapInspector"
import { CaptureProfile } from "./CaptureProfile"
import {
  buildSectorValueDesktopModel,
  getLayerIntensity,
  getSelectedActivityContext,
  type SectorValueColumn,
} from "./value-desktop-model"
import styles from "./sector-value-desktop.module.css"

interface SectorValueDesktopProps {
  sectorMap: SectorMap
}

const MAX_VISIBLE_ACTORS = 6

function formatDate(value?: string) {
  if (!value) return "Date non documentée"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function entityTone(entity: SectorMapEntity) {
  if (entity.status === "client") return styles.entityClient
  if (entity.status === "peer_partner") return styles.entityPeer
  if (entity.companyId) return styles.entityKredo
  return styles.entityExternal
}

function EntityChip({ entity }: { entity: SectorMapEntity }) {
  return (
    <span className={`${styles.entityChip} ${entityTone(entity)}`}>
      <span>{entity.name}</span>
      {entity.status === "client" ? <small>client</small> : null}
      {entity.status === "peer_partner" ? <small>pair-partenaire</small> : null}
    </span>
  )
}

function CoverageBar({ covered, total }: { covered: number; total: number | null }) {
  const percentage = total && total > 0 ? Math.min(100, (covered / total) * 100) : 0
  return (
    <div className={styles.coverageBar}>
      <div
        role="progressbar"
        aria-label={`Couverture Kredo : ${covered} sur ${total ?? "total non documenté"}`}
        aria-valuemin={0}
        aria-valuemax={total ?? undefined}
        aria-valuenow={total === null ? undefined : covered}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function MatrixRowLabel({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className={styles.rowLabel}>
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  )
}

function ActivityActorsCell({
  column,
  selected,
}: {
  column: SectorValueColumn
  selected: boolean
}) {
  if (column.kind === "empty") {
    return (
      <div className={styles.emptyActorsCell}>
        <span>Aucune activité documentée</span>
      </div>
    )
  }

  const { whiteSpace } = column.activity
  const entities = placementsToEntities(column.activity.placements, column.activity.entities)
  const visibleEntities = entities.slice(0, MAX_VISIBLE_ACTORS)
  const hiddenCount = Math.max(0, entities.length - visibleEntities.length)
  const estimatedUnlistedCount = column.activity.coverage.total === null
    ? 0
    : Math.max(0, column.activity.coverage.total - entities.length)
  return (
    <div className={`${styles.actorsCell} ${selected ? styles.selectedColumn : ""}`}>
      {visibleEntities.length > 0 ? (
        <div className={styles.entityList}>
          {visibleEntities.map((entity) => <EntityChip key={entity.id} entity={entity} />)}
        </div>
      ) : <span className={styles.emptyText}>Aucun acteur documenté</span>}
      {hiddenCount > 0 ? <span className={styles.moreActors}>+ {hiddenCount} autres acteurs documentés</span> : null}
      {estimatedUnlistedCount > 0 ? (
        <span className={styles.moreActors}>+ {estimatedUnlistedCount} autres acteurs estimés</span>
      ) : null}
      {whiteSpace.status === "priority" ? (
        <span className={styles.whiteSpaceMarker}>White space prioritaire</span>
      ) : null}
    </div>
  )
}

function ActivityCoverageCell({
  column,
  selected,
}: {
  column: SectorValueColumn
  selected: boolean
}) {
  if (column.kind === "empty") {
    return <div className={styles.emptyCoverageCell}><strong>n.d.</strong></div>
  }

  const { coverage } = column.activity
  return (
    <div className={`${styles.coverageCell} ${selected ? styles.selectedColumn : ""}`}>
      <strong>{coverage.covered} / {coverage.total ?? "n.d."}</strong>
      <CoverageBar covered={coverage.covered} total={coverage.total} />
    </div>
  )
}

function LayerIcon({ kind }: { kind: "regulation" | "funding" | "technology" }) {
  if (kind === "regulation") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16M6 9v8m4-8v8m4-8v8m4-8v8M3 20h18M12 3 3 8h18z" /></svg>
  }
  if (kind === "funding") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V8l8-5 8 5v12M8 20v-6h8v6M8 10h2m4 0h2" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M7 7h10v10H7zM10 10h4v4h-4z" /></svg>
}

function InfluenceMarks({ intensity }: { intensity: 1 | 2 | 3 | null }) {
  if (intensity === null) return <span className={styles.unknownIntensity}>n.d.</span>
  return (
    <span className={styles.influenceMarks} aria-label={`Intensité ${intensity} sur 3`}>
      {Array.from({ length: 3 }, (_, index) => (
        <i key={index} data-active={index < intensity} />
      ))}
    </span>
  )
}

function placementsToEntities(
  placements: SectorMapPlacement[],
  entities: SectorMapEntity[],
) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]))
  return placements
    .map((placement) => byId.get(placement.entityId))
    .filter((entity): entity is SectorMapEntity => Boolean(entity))
}

export function SectorValueDesktop({ sectorMap }: SectorValueDesktopProps) {
  const model = useMemo(() => buildSectorValueDesktopModel(sectorMap), [sectorMap])
  const [selectedActivityId, setSelectedActivityId] = useState(model.sector.defaultActivityId)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const context = useMemo(
    () => getSelectedActivityContext(model, selectedActivityId),
    [model, selectedActivityId],
  )
  const columnGridStyle = {
    gridTemplateColumns: `repeat(${model.columns.length}, minmax(8rem, 1fr))`,
  } satisfies CSSProperties
  const matrixStyle = {
    minWidth: `${112 + model.columns.length * 128}px`,
  } satisfies CSSProperties

  function selectActivity(activityId: string) {
    setSelectedActivityId(activityId)
    setInspectorOpen(true)
  }

  return (
    <main className={styles.page} data-sector-map-value data-column-count={model.columns.length}>
      <header className={styles.pageHeader}>
        <div>
          <h1>{model.sector.name}</h1>
          <p>Cartographie sectorielle <span aria-hidden="true">·</span> {formatDate(model.sector.asOf)}</p>
        </div>
        <div className={styles.viewTabs} role="tablist" aria-label="Projection sectorielle">
          <button type="button" role="tab" aria-selected="true">Valeur</button>
          <button type="button" role="tab" aria-selected="false" disabled>Écosystème</button>
        </div>
      </header>

      <div className={`${styles.workspace} ${inspectorOpen ? "" : styles.workspaceWithoutInspector}`}>
        <section className={styles.matrixScroll} aria-label="Projection analytique de la valeur">
          <div className={styles.matrix} style={matrixStyle}>
            <div className={styles.stageRow}>
              <div className={styles.stageCorner} />
              <div className={styles.stageGroups} style={columnGridStyle}>
                {model.stageGroups.map((group) => {
                  const selected = model.columns.some((column) => (
                    column.stage.id === group.stage.id
                    && column.kind === "activity"
                    && column.activity.activity.id === selectedActivityId
                  ))
                  return (
                    <div
                      key={group.stage.id}
                      className={`${styles.stageHeader} ${selected ? styles.selectedStage : ""}`}
                      style={{ gridColumn: `${group.columnStart} / span ${group.columnSpan}` }}
                    >
                      <strong>{String(group.stage.order).padStart(2, "0")}</strong>
                      <span>{group.stage.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={styles.matrixRow}>
              <MatrixRowLabel title="Profil de captation" detail="3 = élevé" />
              <CaptureProfile
                columns={model.columns}
                selectedActivityId={selectedActivityId}
                onSelectActivity={selectActivity}
              />
            </div>

            <div className={styles.matrixRow}>
              <MatrixRowLabel title="Acteurs" detail="positions & densité" />
              <div className={styles.dataCells} style={columnGridStyle}>
                {model.columns.map((column) => (
                  <ActivityActorsCell
                    key={column.id}
                    column={column}
                    selected={column.kind === "activity" && column.activity.activity.id === selectedActivityId}
                  />
                ))}
              </div>
            </div>

            <div className={styles.matrixRow}>
              <MatrixRowLabel title="Couverture Kredo" detail="entities uniques / total estimé" />
              <div className={styles.dataCells} style={columnGridStyle}>
                {model.columns.map((column) => (
                  <ActivityCoverageCell
                    key={column.id}
                    column={column}
                    selected={column.kind === "activity" && column.activity.activity.id === selectedActivityId}
                  />
                ))}
              </div>
            </div>

            <div className={styles.legendRow}>
              <div />
              <ul>
                <li><i className={styles.legendKredo} />Compte Kredo</li>
                <li><i className={styles.legendClient} />Client</li>
                <li><i className={styles.legendExternal} />Acteur externe</li>
                <li><i className={styles.legendPeer} />Pair-partenaire</li>
                <li><i className={styles.legendWhiteSpace} />White space prioritaire</li>
                <li><i className={styles.legendCapture} />Profil de captation</li>
                <li><strong>n.d.</strong> Non documenté</li>
              </ul>
            </div>

            <section className={styles.transverseSection} aria-labelledby="transverse-heading">
              <div className={styles.transverseTitle}>
                <h2 id="transverse-heading">Forces transverses</h2>
                <p>Influence sur la chaîne</p>
              </div>
              <div className={styles.transverseRows}>
                {model.ecosystemLayers.length > 0 ? model.ecosystemLayers.map((item) => {
                  const entities = placementsToEntities(item.placements, model.source.entities)
                  const intensity = getLayerIntensity(model, item.layer.id)
                  return (
                    <article key={item.layer.id} className={styles.transverseRow} data-layer-kind={item.layer.kind}>
                      <div className={styles.layerHeading}>
                        <span className={styles.layerIcon}><LayerIcon kind={item.layer.kind} /></span>
                        <div>
                          <h3>{item.layer.label}</h3>
                          <small>{entities.length} acteur{entities.length > 1 ? "s" : ""} documenté{entities.length > 1 ? "s" : ""}</small>
                        </div>
                      </div>
                      <div className={styles.layerEntities}>
                        {entities.length > 0
                          ? entities.map((entity) => <EntityChip key={entity.id} entity={entity} />)
                          : <span className={styles.emptyText}>Aucun acteur documenté</span>}
                      </div>
                      <div className={styles.layerIntensity}>
                        <span>Intensité</span>
                        <InfluenceMarks intensity={intensity} />
                      </div>
                      <div className={styles.layerCoverage}>
                        <strong>{item.coverage.covered} / {item.coverage.total ?? "n.d."}</strong>
                        <span>Kredo</span>
                        <CoverageBar covered={item.coverage.covered} total={item.coverage.total} />
                      </div>
                    </article>
                  )
                }) : <p className={styles.noLayers}>Aucune force transverse documentée.</p>}
                <div className={styles.intensityLegend}>
                  <span>Intensité d’influence :</span>
                  <span><b>I</b> faible</span>
                  <span><b>II</b> moyenne</span>
                  <span><b>III</b> forte</span>
                  <span><b>n.d.</b> non documentée</span>
                </div>
              </div>
            </section>
          </div>
        </section>

        {inspectorOpen ? (
          <SectorMapInspector
            activity={context.activity}
            summary={context.summary}
            evidence={context.evidence}
            onClose={() => setInspectorOpen(false)}
          />
        ) : null}
      </div>
    </main>
  )
}
