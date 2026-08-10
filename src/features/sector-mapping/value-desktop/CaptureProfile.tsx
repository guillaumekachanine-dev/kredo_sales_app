import type { CSSProperties } from "react"
import type { SectorValueColumn } from "./value-desktop-model"
import { buildCaptureProfileSegments } from "./value-desktop-model"
import styles from "./sector-value-desktop.module.css"

interface CaptureProfileProps {
  columns: SectorValueColumn[]
  selectedActivityId: string
  onSelectActivity: (activityId: string) => void
}

const CONFIDENCE_LABELS = {
  high: "haute",
  medium: "moyenne",
  low: "faible",
  unknown: "non documentée",
} as const

export function CaptureProfile({
  columns,
  selectedActivityId,
  onSelectActivity,
}: CaptureProfileProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(8rem, 1fr))`,
  } satisfies CSSProperties
  const segments = buildCaptureProfileSegments(columns)

  return (
    <div className={styles.profileArea}>
      <div className={styles.profileCells} style={gridStyle}>
        {columns.map((column) => {
          if (column.kind === "empty") {
            return (
              <div key={column.id} className={styles.emptyProfileCell}>
                <span>Aucune activité</span>
                <strong>n.d.</strong>
              </div>
            )
          }

          const selected = column.activity.activity.id === selectedActivityId
          const capture = column.activity.capture
          return (
            <button
              key={column.id}
              type="button"
              className={`${styles.profileCell} ${selected ? styles.selectedColumn : ""}`}
              aria-pressed={selected}
              onClick={() => onSelectActivity(column.activity.activity.id)}
            >
              <span className={styles.activityLabel}>{column.activity.activity.label}</span>
              <strong>{capture.value === null ? "n.d." : `${capture.value} / 3`}</strong>
              <small>confiance {CONFIDENCE_LABELS[capture.confidence]}</small>
            </button>
          )
        })}
      </div>

      <svg
        className={styles.captureSvg}
        viewBox={`0 0 ${columns.length * 100} 96`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {segments.map((segment, index) => (
          <polyline
            key={`${segment.points[0]?.x ?? index}-${segment.points.length}`}
            points={segment.points.map((point) => `${point.x},${point.y}`).join(" ")}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {segments.flatMap((segment) => segment.points).map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}
