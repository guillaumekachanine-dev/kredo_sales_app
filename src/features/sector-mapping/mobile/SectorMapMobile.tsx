"use client"

import { useMemo, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { SectorMapInspector } from "../components/SectorMapInspector"
import type { SectorMap, SectorMapActivityProjection, SectorMapEntity } from "../model"
import type { EcosystemGraphMode } from "../ecosystem-desktop/ecosystem-layout"
import {
  buildSectorValueDesktopModel,
  getLayerIntensity,
  getSelectedActivityContext,
} from "../value-desktop/value-desktop-model"
import {
  buildMobileEcosystemLayout,
  type MobileEcosystemRelation,
} from "./mobile-sector-map-model"
import styles from "./sector-map-mobile.module.css"

interface SectorMapMobileProps {
  sectorMap: SectorMap
  initialView?: "value" | "ecosystem"
  initialEcosystemMode?: EcosystemGraphMode
  initialActivityId?: string
  focusedCompanyId?: string
  embedded?: boolean
}

const CONFIDENCE_LABELS = {
  high: "Haute",
  medium: "Moyenne",
  low: "Faible",
  unknown: "Non documentée",
} as const

function formatDate(value?: string) {
  if (!value) return "Date non documentée"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function captureLabel(activity: SectorMapActivityProjection) {
  return activity.capture.value === null ? "n.d." : `${activity.capture.value} / 3`
}

function whiteSpaceLabel(activity: SectorMapActivityProjection) {
  if (activity.whiteSpace.status === "priority") return "Prioritaire"
  if (activity.whiteSpace.status === "unknown") return "Non conclu"
  return "Non prioritaire"
}

function placedEntities(activity: SectorMapActivityProjection) {
  const entitiesById = new Map(activity.entities.map((entity) => [entity.id, entity]))
  return activity.placements
    .map((placement) => entitiesById.get(placement.entityId))
    .filter((entity): entity is SectorMapEntity => Boolean(entity))
}

function MobileCoverageBar({ activity }: { activity: SectorMapActivityProjection }) {
  const { covered, total } = activity.coverage
  const percentage = total && total > 0 ? Math.min(100, (covered / total) * 100) : 0

  return (
    <div
      className={styles.coverageTrack}
      role="progressbar"
      aria-label={`Couverture Kredo : ${covered} sur ${total ?? "total non documenté"}`}
      aria-valuemin={0}
      aria-valuemax={total ?? undefined}
      aria-valuenow={total === null ? undefined : covered}
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  )
}

function EntityPill({ entity, opportunity = false, focused = false }: { entity: SectorMapEntity; opportunity?: boolean; focused?: boolean }) {
  return (
    <li className={`${opportunity ? styles.entityOpportunity : styles.entityPill} ${focused ? styles.entityFocused : ""}`}>
      <span>{entity.name}</span>
      {focused ? <small>sélectionné</small> : null}
      {entity.status === "client" ? <small>client</small> : null}
    </li>
  )
}

function ValueProjection({
  model,
  context,
  onOpenInspector,
  focusedCompanyId,
}: {
  model: ReturnType<typeof buildSectorValueDesktopModel>
  context: ReturnType<typeof getSelectedActivityContext>
  onOpenInspector: () => void
  focusedCompanyId?: string
}) {
  const actors = placedEntities(context.activity)
  const kredoActors = actors.filter((entity) => Boolean(entity.companyId))
  const entitiesById = new Map(context.activity.entities.map((entity) => [entity.id, entity]))
  const opportunities = context.activity.placements
    .filter((placement) => placement.priorityOpportunity)
    .map((placement) => entitiesById.get(placement.entityId))
    .filter((entity): entity is SectorMapEntity => Boolean(entity))
  const coverage = context.activity.coverage

  return (
    <section className={styles.projection} aria-label="Projection analytique de la valeur">
      <article className={styles.focalValueCard}>
        <div className={styles.activityHeading}>
          <div>
            <span>Activité sélectionnée</span>
            <h2>{context.activity.activity.label}</h2>
          </div>
          <button type="button" onClick={onOpenInspector}>Détail</button>
        </div>

        <dl className={styles.keyMetrics}>
          <div>
            <dt>Captation</dt>
            <dd data-unknown={context.activity.capture.value === null}>{captureLabel(context.activity)}</dd>
          </div>
          <div>
            <dt>Confiance</dt>
            <dd>{CONFIDENCE_LABELS[context.activity.capture.confidence]}</dd>
          </div>
          <div>
            <dt>Couverture</dt>
            <dd>{coverage.covered} / {coverage.total ?? "n.d."}</dd>
          </div>
        </dl>

        <MobileCoverageBar activity={context.activity} />

        <div className={styles.whiteSpaceSummary} data-status={context.activity.whiteSpace.status}>
          <span>White space</span>
          <strong>{whiteSpaceLabel(context.activity)}</strong>
          <small>
            {coverage.gap === null
              ? "Dénominateur de couverture absent"
              : `${coverage.gap} acteur${coverage.gap > 1 ? "s" : ""} hors portefeuille`}
          </small>
        </div>
      </article>

      <div className={styles.mobileSectionGrid}>
        <section className={styles.dataSection} aria-labelledby="mobile-kredo-actors">
          <header>
            <h3 id="mobile-kredo-actors">Acteurs Kredo</h3>
            <span>{kredoActors.length}</span>
          </header>
          {kredoActors.length > 0 ? (
            <ul>{kredoActors.map((entity) => <EntityPill key={entity.id} entity={entity} focused={Boolean(focusedCompanyId && entity.companyId === focusedCompanyId)} />)}</ul>
          ) : <p>Aucun acteur Kredo documenté.</p>}
        </section>

        <section className={styles.dataSection} aria-labelledby="mobile-opportunities">
          <header>
            <h3 id="mobile-opportunities">Opportunités</h3>
            <span>{opportunities.length}</span>
          </header>
          {opportunities.length > 0 ? (
            <ul>{opportunities.map((entity) => <EntityPill key={entity.id} entity={entity} opportunity focused={Boolean(focusedCompanyId && entity.companyId === focusedCompanyId)} />)}</ul>
          ) : <p>Aucune opportunité explicitement priorisée.</p>}
        </section>
      </div>

      <section className={styles.transverseMobile} aria-labelledby="mobile-transverse-heading">
        <header>
          <div>
            <span>Influences structurelles</span>
            <h3 id="mobile-transverse-heading">Forces transverses</h3>
          </div>
          <strong>{model.ecosystemLayers.length}</strong>
        </header>
        {model.ecosystemLayers.length > 0 ? (
          <ul>
            {model.ecosystemLayers.map((item) => {
              const intensity = getLayerIntensity(model, item.layer.id)
              return (
                <li key={item.layer.id} data-kind={item.layer.kind}>
                  <span>{item.layer.label}</span>
                  <small>Intensité {intensity ?? "n.d."} / 3</small>
                </li>
              )
            })}
          </ul>
        ) : <p>Aucune force transverse documentée.</p>}
      </section>

      <button type="button" className={styles.sourceButton} onClick={onOpenInspector}>
        <span>Justification & sources</span>
        <strong>{context.evidence.length}</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>
    </section>
  )
}

function relationTone(relation: MobileEcosystemRelation) {
  if (relation.node.layerKind === "regulation") return "regulation"
  if (relation.node.layerKind === "funding") return "funding"
  if (relation.node.layerKind === "technology") return "technology"
  return "main"
}

function RelationNode({
  relation,
  direction,
  onSelectActivity,
}: {
  relation: MobileEcosystemRelation
  direction: "incoming" | "outgoing"
  onSelectActivity: (activityId: string) => void
}) {
  const content = (
    <>
      <span>{relation.label}</span>
      <strong>{relation.node.label}</strong>
      <small>Intensité {relation.intensity ?? "n.d."} / 3</small>
    </>
  )

  if (relation.node.ref.kind === "activity") {
    return (
      <button
        type="button"
        className={styles.relationNode}
        data-tone={relationTone(relation)}
        data-direction={direction}
        onClick={() => onSelectActivity(relation.node.ref.id)}
        aria-label={`Sélectionner ${relation.node.label}`}
      >
        {content}
      </button>
    )
  }

  return (
    <article className={styles.relationNode} data-tone={relationTone(relation)} data-direction={direction}>
      {content}
    </article>
  )
}

function EcosystemProjection({
  sectorMap,
  selectedActivityId,
  mode,
  onModeChange,
  onSelectActivity,
  onOpenInspector,
  focusedCompanyId,
}: {
  sectorMap: SectorMap
  selectedActivityId: string
  mode: EcosystemGraphMode
  onModeChange: (mode: EcosystemGraphMode) => void
  onSelectActivity: (activityId: string) => void
  onOpenInspector: () => void
  focusedCompanyId?: string
}) {
  const layout = useMemo(
    () => buildMobileEcosystemLayout(sectorMap, selectedActivityId, mode),
    [sectorMap, selectedActivityId, mode],
  )
  const hiddenCount = layout.hiddenIncoming + layout.hiddenOutgoing
  const stage = sectorMap.stages.find((item) => item.id === (
    sectorMap.activities.find((activity) => activity.id === selectedActivityId)?.stageId
  ))
  const focusedEntity = focusedCompanyId
    ? sectorMap.entities.find((entity) => entity.companyId === focusedCompanyId)
    : undefined
  const focusedOnActivity = focusedEntity && sectorMap.placements.some((placement) => (
    placement.entityId === focusedEntity.id
    && placement.target.kind === "activity"
    && placement.target.id === selectedActivityId
  ))

  return (
    <section
      className={styles.ecosystemProjection}
      aria-label={`Écosystème de ${layout.focal.label}`}
      data-ecosystem-mode={mode}
      data-ecosystem-mobile="true"
    >
      <div className={styles.modeTabs} role="tablist" aria-label="Mode de l’écosystème">
        <button type="button" role="tab" aria-selected={mode === "main"} onClick={() => onModeChange("main")}>
          Flux principal
        </button>
        <button type="button" role="tab" aria-selected={mode === "influences"} onClick={() => onModeChange("influences")}>
          Influences
        </button>
      </div>

      <div className={styles.incomingSummary}>
        <span>{mode === "main" ? "Entrants majeurs" : "Influences majeures"}</span>
        <strong>{mode === "main" ? layout.summary.incoming : layout.summary.influences}</strong>
        <small>2 relations maximum dans la vue</small>
      </div>

      <div className={styles.egoCanvas} data-visible-incoming={layout.incoming.length} data-visible-outgoing={layout.outgoing.length}>
        <svg className={styles.egoEdges} viewBox="0 0 358 360" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="mobile-ego-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {layout.incoming.length === 1 ? <path d="M179 64 L179 118" markerEnd="url(#mobile-ego-arrow)" /> : null}
          {layout.incoming.length > 1 ? (
            <>
              <path d="M88 64 C88 94 144 92 164 119" markerEnd="url(#mobile-ego-arrow)" />
              <path d="M270 64 C270 94 214 92 194 119" markerEnd="url(#mobile-ego-arrow)" />
            </>
          ) : null}
          {layout.outgoing.length === 1 ? <path d="M179 232 L179 286" markerEnd="url(#mobile-ego-arrow)" /> : null}
          {layout.outgoing.length > 1 ? (
            <>
              <path d="M164 232 C144 258 88 258 88 286" markerEnd="url(#mobile-ego-arrow)" />
              <path d="M194 232 C214 258 270 258 270 286" markerEnd="url(#mobile-ego-arrow)" />
            </>
          ) : null}
        </svg>

        <div className={styles.incomingNodes}>
          {layout.incoming.length > 0
            ? layout.incoming.map((relation) => (
                <RelationNode key={relation.id} relation={relation} direction="incoming" onSelectActivity={onSelectActivity} />
              ))
            : <span className={styles.noRelation}>Aucune relation entrante documentée</span>}
        </div>

        <article className={styles.mobileFocalNode}>
          <span>Maillon focal · {stage?.label ?? "Étape non documentée"}</span>
          <h2>{layout.focal.label}</h2>
          {focusedOnActivity ? <strong className={styles.focusedAccountBadge}>{focusedEntity.name}</strong> : null}
          <button type="button" onClick={onOpenInspector}>Ouvrir l’inspector</button>
        </article>

        <div className={styles.outgoingNodes}>
          {layout.outgoing.length > 0
            ? layout.outgoing.map((relation) => (
                <RelationNode key={relation.id} relation={relation} direction="outgoing" onSelectActivity={onSelectActivity} />
              ))
            : <span className={styles.noRelation}>Aucune relation sortante documentée</span>}
        </div>
      </div>

      <dl className={styles.flowSummary}>
        <div><dt>Entrantes</dt><dd>{layout.summary.incoming}</dd></div>
        <div><dt>Sortantes</dt><dd>{layout.summary.outgoing}</dd></div>
        <div><dt>Influences</dt><dd>{layout.summary.influences}</dd></div>
      </dl>

      {hiddenCount > 0 ? (
        <button type="button" className={styles.expandRelations} onClick={onOpenInspector}>
          Voir {hiddenCount} relation{hiddenCount > 1 ? "s" : ""} secondaire{hiddenCount > 1 ? "s" : ""}
        </button>
      ) : null}

      <div className={styles.srOnly}>
        <h3>Résumé textuel du graphe</h3>
        <p>Maillon focal : {layout.focal.label}.</p>
        <ul>
          {layout.incoming.map((relation) => (
            <li key={`text-in-${relation.id}`}>{relation.node.label} influence ou alimente le maillon via {relation.label}.</li>
          ))}
          {layout.outgoing.map((relation) => (
            <li key={`text-out-${relation.id}`}>Le maillon alimente ou influence {relation.node.label} via {relation.label}.</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function SectorMapMobile({
  sectorMap,
  initialView = "value",
  initialEcosystemMode = "main",
  initialActivityId,
  focusedCompanyId,
  embedded = false,
}: SectorMapMobileProps) {
  const model = useMemo(() => buildSectorValueDesktopModel(sectorMap), [sectorMap])
  const initialSelection = initialActivityId && model.source.activities.some((activity) => activity.id === initialActivityId)
    ? initialActivityId
    : model.sector.defaultActivityId
  const [selectedActivityId, setSelectedActivityId] = useState(initialSelection)
  const [view, setView] = useState<"value" | "ecosystem">(initialView)
  const [ecosystemMode, setEcosystemMode] = useState<EcosystemGraphMode>(initialEcosystemMode)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const context = useMemo(
    () => getSelectedActivityContext(model, selectedActivityId),
    [model, selectedActivityId],
  )
  const currentStage = model.source.stages.find((stage) => stage.id === context.activity.activity.stageId)
  const stageActivities = model.source.activities.filter((activity) => activity.stageId === currentStage?.id)
  const orderedActivities = model.source.stages.flatMap((stage) => (
    model.source.activities.filter((activity) => activity.stageId === stage.id)
  ))
  const activityIndex = orderedActivities.findIndex((activity) => activity.id === selectedActivityId)
  const previousActivity = activityIndex > 0 ? orderedActivities[activityIndex - 1] : null
  const nextActivity = activityIndex < orderedActivities.length - 1 ? orderedActivities[activityIndex + 1] : null

  function selectStage(stageId: string) {
    const activity = model.source.activities.find((item) => item.stageId === stageId)
    if (activity) setSelectedActivityId(activity.id)
  }

  const PageRoot = embedded ? "section" : "main"

  return (
    <PageRoot
      className={`${styles.page} ${embedded ? styles.pageEmbedded : ""}`}
      data-sector-map-mobile="true"
      data-sector-map-view={view}
      data-selected-activity={selectedActivityId}
    >
      <header className={`${styles.pageHeader} ${embedded ? styles.pageHeaderEmbedded : ""}`}>
        {!embedded ? <><span>Cartographie sectorielle · {formatDate(model.sector.asOf)}</span>
        <h1>{model.sector.name}</h1></> : null}
        <div className={styles.viewTabs} role="tablist" aria-label="Projection sectorielle">
          <button type="button" role="tab" aria-selected={view === "value"} onClick={() => setView("value")}>
            Valeur
          </button>
          <button type="button" role="tab" aria-selected={view === "ecosystem"} onClick={() => setView("ecosystem")}>
            Écosystème
          </button>
        </div>
      </header>

      <nav className={styles.stageNavigation} aria-label="Étapes de la chaîne de valeur">
        <ol>
          {model.source.stages.map((stage) => {
            const hasActivity = model.source.activities.some((activity) => activity.stageId === stage.id)
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  aria-current={stage.id === currentStage?.id ? "step" : undefined}
                  disabled={!hasActivity}
                  onClick={() => selectStage(stage.id)}
                  aria-label={`Étape ${stage.order} : ${stage.label}${hasActivity ? "" : ", non documentée"}`}
                >
                  <strong>{String(stage.order).padStart(2, "0")}</strong>
                  <span>{stage.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <nav className={styles.activityNavigation} aria-label="Activités de l’étape sélectionnée">
        <button
          type="button"
          disabled={!previousActivity}
          onClick={() => previousActivity && setSelectedActivityId(previousActivity.id)}
          aria-label="Activité précédente"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <label>
          <span>Activité {activityIndex + 1} / {orderedActivities.length}</span>
          <select value={selectedActivityId} onChange={(event) => setSelectedActivityId(event.target.value)}>
            {stageActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.label}</option>)}
          </select>
        </label>
        <button
          type="button"
          disabled={!nextActivity}
          onClick={() => nextActivity && setSelectedActivityId(nextActivity.id)}
          aria-label="Activité suivante"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </nav>

      {view === "value" ? (
        <ValueProjection model={model} context={context} focusedCompanyId={focusedCompanyId} onOpenInspector={() => setInspectorOpen(true)} />
      ) : (
        <EcosystemProjection
          sectorMap={model.source}
          selectedActivityId={selectedActivityId}
          mode={ecosystemMode}
          onModeChange={setEcosystemMode}
          onSelectActivity={setSelectedActivityId}
          onOpenInspector={() => setInspectorOpen(true)}
          focusedCompanyId={focusedCompanyId}
        />
      )}

      <AppDrawer
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        title={context.activity.activity.label}
        eyebrow={`${currentStage?.label ?? "Étape non documentée"} · Inspector partagé`}
        side="bottom"
        showMobileCloseButton
        headerClassName={styles.drawerHeader}
        contentClassName={styles.drawerContent}
      >
        <SectorMapInspector
          activity={context.activity}
          summary={context.summary}
          evidence={context.evidence}
          embedded
          focusedCompanyId={focusedCompanyId}
        />
      </AppDrawer>
    </PageRoot>
  )
}
