import type { CSSProperties } from "react"
import { useMemo } from "react"
import {
  buildEcosystemProjection,
  type SectorMap,
  type SectorMapPortfolioStatus,
} from "../model"
import {
  layoutEcosystemGraph,
  type EcosystemGraphMode,
  type EcosystemGraphNode,
} from "./ecosystem-layout"
import styles from "./sector-ecosystem-desktop.module.css"

interface SectorEcosystemDesktopProps {
  sectorMap: SectorMap
  selectedActivityId: string
  mode: EcosystemGraphMode
  onModeChange: (mode: EcosystemGraphMode) => void
  onSelectActivity: (activityId: string) => void
}

function nodeStyle(node: EcosystemGraphNode) {
  return {
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
  } satisfies CSSProperties
}

function actorTone(status: SectorMapPortfolioStatus, isKredo: boolean) {
  if (status === "client") return styles.actorClient
  if (status === "peer_partner") return styles.actorPeer
  if (isKredo) return styles.actorKredo
  return styles.actorExternal
}

function NodeBody({ node }: { node: EcosystemGraphNode }) {
  return (
    <>
      <span className={styles.nodeEyebrow}>{node.eyebrow}</span>
      <strong>{node.label}</strong>
      {node.actors.length > 0 ? (
        <span className={styles.nodeActors}>
          {node.actors.map((actor) => (
            <span key={actor.id} className={actorTone(actor.status, actor.isKredo)}>
              {actor.name}
            </span>
          ))}
          {node.hiddenActorCount > 0 ? <small>+ {node.hiddenActorCount} autres</small> : null}
        </span>
      ) : null}
    </>
  )
}

function GraphNode({
  node,
  onSelectActivity,
}: {
  node: EcosystemGraphNode
  onSelectActivity: (activityId: string) => void
}) {
  const className = [
    styles.graphNode,
    node.side === "focal" ? styles.focalNode : styles.neighborNode,
    node.ref.kind === "ecosystemLayer" ? styles.influenceNode : "",
  ].filter(Boolean).join(" ")
  const dataAttributes = node.layerKind ? { "data-layer-kind": node.layerKind } : {}

  if (node.ref.kind === "activity" && node.side !== "focal") {
    return (
      <button
        type="button"
        className={className}
        style={nodeStyle(node)}
        onClick={() => onSelectActivity(node.ref.id)}
        aria-label={`Sélectionner ${node.label}`}
        {...dataAttributes}
      >
        <NodeBody node={node} />
      </button>
    )
  }

  return (
    <article className={className} style={nodeStyle(node)} {...dataAttributes}>
      <NodeBody node={node} />
      {node.side === "focal" ? <span className={styles.focalBadge}>Maillon focal</span> : null}
    </article>
  )
}

export function SectorEcosystemDesktop({
  sectorMap,
  selectedActivityId,
  mode,
  onModeChange,
  onSelectActivity,
}: SectorEcosystemDesktopProps) {
  const projection = useMemo(
    () => buildEcosystemProjection(sectorMap, selectedActivityId, mode),
    [sectorMap, selectedActivityId, mode],
  )
  const layout = useMemo(
    () => layoutEcosystemGraph(sectorMap, projection),
    [sectorMap, projection],
  )
  const stage = sectorMap.stages.find((item) => item.id === projection.focal.activity.stageId)
  const omittedTotal = layout.omitted.incoming + layout.omitted.outgoing

  return (
    <section
      className={styles.panel}
      aria-label={`Écosystème de ${projection.focal.activity.label}`}
      data-ecosystem-mode={mode}
      data-ecosystem-ready="true"
    >
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.contextLabel}>Maillon sélectionné · {stage?.label ?? "Étape non documentée"}</span>
          <h2>Comment fonctionne ce maillon et qui l’influence ?</h2>
        </div>
        <div className={styles.modeTabs} role="tablist" aria-label="Mode de l’écosystème">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "main"}
            onClick={() => onModeChange("main")}
          >
            Flux principal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "influences"}
            onClick={() => onModeChange("influences")}
          >
            Influences
          </button>
        </div>
        <dl className={styles.flowSummary}>
          <div><dt>Entrantes</dt><dd>{projection.summary.incoming}</dd></div>
          <div><dt>Sortantes</dt><dd>{projection.summary.outgoing}</dd></div>
          <div><dt>Influences</dt><dd>{projection.summary.influences}</dd></div>
        </dl>
      </header>

      <div className={styles.graphScroll}>
        <div
          className={styles.graphCanvas}
          style={{ width: layout.width, height: layout.height }}
          data-node-count={layout.nodes.length}
          data-edge-count={layout.edges.length}
        >
          <div className={styles.columnLabel} data-side="incoming">Relations entrantes</div>
          <div className={styles.columnLabel} data-side="focal">Maillon focal</div>
          <div className={styles.columnLabel} data-side="outgoing">Relations sortantes</div>
          <svg
            className={styles.edges}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-hidden="true"
          >
            <defs>
              <marker id="ecosystem-arrow-main" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={styles.mainArrow} />
              </marker>
              <marker id="ecosystem-arrow-influence" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={styles.influenceArrow} />
              </marker>
            </defs>
            {layout.edges.map((edge) => (
              <g
                key={edge.id}
                className={edge.mode === "main" ? styles.mainEdge : styles.influenceEdge}
                data-intensity={edge.intensity ?? "unknown"}
              >
                <path
                  d={edge.path}
                  markerEnd={`url(#ecosystem-arrow-${edge.mode})`}
                />
                {edge.label ? (
                  <text x={edge.labelX} y={edge.labelY} textAnchor="middle">{edge.label}</text>
                ) : null}
              </g>
            ))}
          </svg>

          {layout.nodes.map((node) => (
            <GraphNode key={node.id} node={node} onSelectActivity={onSelectActivity} />
          ))}
        </div>
      </div>

      <footer className={styles.legend}>
        <span><i className={styles.legendMain} />Flux économique principal</span>
        <span><i className={styles.legendRegulation} />Prescrit</span>
        <span><i className={styles.legendFunding} />Finance</span>
        <span><i className={styles.legendTechnology} />Outille</span>
        <span><i className={styles.legendKredo} />Compte Kredo</span>
        {omittedTotal > 0 ? <strong>{omittedTotal} relation(s) secondaire(s) masquée(s)</strong> : null}
      </footer>
    </section>
  )
}
