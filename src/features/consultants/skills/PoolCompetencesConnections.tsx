import { cn } from "@/lib/utils"
import type { PracticeTone } from "@/lib/consultants/pool-competences-data"
import { toneClasses } from "./pool-competences-shared"
import type { SceneConnection, SceneSource } from "./types"

type PoolCompetencesConnectionsProps = {
  activeKey: string | null
  connections: SceneConnection[]
  height: number
  practiceKey: string
  reducedMotion: boolean
  source: SceneSource | null
  tone: PracticeTone
  width: number
}

export function PoolCompetencesConnections(props: PoolCompetencesConnectionsProps) {
  const {
    activeKey,
    connections,
    height,
    practiceKey,
    reducedMotion,
    source,
    tone,
    width,
  } = props

  if (!source || connections.length === 0 || width <= 0 || height <= 0) {
    return null
  }

  const toneStyle = toneClasses[tone]

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`pool-source-${practiceKey}`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="var(--color-surface)" stopOpacity="0.96" />
          <stop offset="100%" stopColor="var(--color-surface)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        cx={source.x}
        cy={source.y}
        r="34"
        fill={`url(#pool-source-${practiceKey})`}
      />
      <circle
        cx={source.x}
        cy={source.y}
        r="10"
        className={cn("stroke-[1.2]", toneStyle.svgFill, toneStyle.svgStroke)}
        vectorEffect="non-scaling-stroke"
      />

      {connections.map((connection, index) => {
        const focused = !activeKey || activeKey === connection.category

        return (
          <g
            key={`${practiceKey}-${connection.key}`}
            className="transition-opacity duration-200"
            opacity={focused ? 1 : 0.15}
          >
            <path
              d={connection.path}
              pathLength={1}
              className={cn("fill-none stroke-[1.55]", toneStyle.svgStroke)}
              vectorEffect="non-scaling-stroke"
              style={
                reducedMotion
                  ? undefined
                  : {
                      animation: `pool-competences-draw 560ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 55}ms both`,
                    }
              }
            />
            <circle
              cx={connection.targetX}
              cy={connection.targetY}
              r="4.4"
              className={cn("stroke-[1.2]", toneStyle.svgFill, toneStyle.svgStroke)}
              vectorEffect="non-scaling-stroke"
              style={
                reducedMotion
                  ? undefined
                  : {
                      animation: `pool-competences-card-in 340ms cubic-bezier(0.22, 1, 0.36, 1) ${110 + index * 55}ms both`,
                    }
              }
            />
          </g>
        )
      })}
    </svg>
  )
}
