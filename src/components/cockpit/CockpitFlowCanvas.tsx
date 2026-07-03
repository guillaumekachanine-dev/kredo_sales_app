"use client"

import { useEffect, useRef, useState } from "react"
import { StatusPill } from "@/components/ui/StatusPill"
import type { CockpitFlowNode, CockpitStatus } from "@/lib/cockpit/cockpit-data"

type FlowPoint = {
  x: number
  y: number
  radius: number
  labelY: number
  node: CockpitFlowNode
}

function pillVariant(status: CockpitStatus) {
  if (status === "success") return "success" as const
  if (status === "warning") return "warning" as const
  if (status === "danger") return "danger" as const
  return "neutral" as const
}

function toneCopy(status: CockpitStatus) {
  if (status === "success") return "fluide"
  if (status === "danger") return "fragile"
  return "vigilance"
}

function nodeColors(status: CockpitStatus) {
  if (status === "success") {
    return {
      solid: "rgba(47,125,97,0.95)",
      soft: "rgba(47,125,97,0.18)",
      glow: "rgba(47,125,97,0.30)",
    }
  }

  if (status === "danger") {
    return {
      solid: "rgba(190,74,66,0.95)",
      soft: "rgba(190,74,66,0.16)",
      glow: "rgba(190,74,66,0.25)",
    }
  }

  return {
    solid: "rgba(200,154,43,0.95)",
    soft: "rgba(200,154,43,0.16)",
    glow: "rgba(200,154,43,0.28)",
  }
}

function flowPoints(flow: CockpitFlowNode[], width: number, height: number) {
  const left = 64
  const right = width - 64
  const baseY = height * 0.5
  const amplitudes = [-54, -12, 32, -20, 40]

  return flow.map((node, index) => {
    const t = flow.length === 1 ? 0 : index / (flow.length - 1)
    const x = left + (right - left) * t
    const y = baseY + (amplitudes[index] ?? 0)
    const radius = node.status === "danger" ? 14 : node.status === "success" ? 12 : 13

    return {
      x,
      y,
      radius,
      labelY: index % 2 === 0 ? y - 58 : y + 52,
      node,
    }
  })
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  points: FlowPoint[],
  width: number,
  phase: number,
) {
  const top = new Path2D()
  const bottom = new Path2D()
  const spread = 32

  points.forEach((point, index) => {
    const prev = points[index - 1]
    const next = points[index + 1]
    const yOffset = Math.sin(phase * 0.9 + index * 0.45) * 3
    const topY = point.y - spread + yOffset
    const bottomY = point.y + spread * 0.72 + yOffset

    if (!prev) {
      top.moveTo(point.x, topY)
      bottom.moveTo(point.x, bottomY)
      return
    }

    const cpX = (prev.x + point.x) / 2
    const cpYTop = (prev.y + point.y) / 2 - spread * (0.85 + index * 0.03)
    const cpYBottom = (prev.y + point.y) / 2 + spread * 0.74
    top.quadraticCurveTo(cpX, cpYTop, point.x, topY)
    bottom.quadraticCurveTo(cpX, cpYBottom, point.x, bottomY)

    if (!next && index === points.length - 1) {
      bottom.lineTo(point.x + 4, bottomY)
      top.lineTo(point.x + 4, topY)
    }
  })

  const ribbon = new Path2D(top)
  const bottomCommands = [...points].reverse()
  bottomCommands.forEach((point, reverseIndex) => {
    if (reverseIndex === 0) return
    const next = bottomCommands[reverseIndex - 1]
    const cpX = (point.x + next.x) / 2
    const cpY = (point.y + next.y) / 2 + spread * 0.84
    ribbon.quadraticCurveTo(cpX, cpY, point.x, point.y + spread * 0.72)
  })
  ribbon.closePath()

  const fill = ctx.createLinearGradient(0, 0, width, 0)
  fill.addColorStop(0, "rgba(37,84,184,0.06)")
  fill.addColorStop(0.2, "rgba(37,84,184,0.13)")
  fill.addColorStop(0.48, "rgba(200,154,43,0.18)")
  fill.addColorStop(0.72, "rgba(37,84,184,0.12)")
  fill.addColorStop(1, "rgba(37,84,184,0.05)")
  ctx.fillStyle = fill
  ctx.fill(ribbon)

  const edge = ctx.createLinearGradient(0, 0, width, 0)
  edge.addColorStop(0, "rgba(37,84,184,0.25)")
  edge.addColorStop(0.5, "rgba(200,154,43,0.55)")
  edge.addColorStop(1, "rgba(37,84,184,0.24)")
  ctx.strokeStyle = edge
  ctx.lineWidth = 1.25
  ctx.stroke(top)

  ctx.save()
  ctx.globalCompositeOperation = "screen"
  for (let i = 0; i < 14; i += 1) {
    const p = (phase * 0.12 + i / 14) % 1
    const x = points[0].x + (points[points.length - 1].x - points[0].x) * p
    const yBase = points[Math.min(points.length - 1, Math.max(0, Math.round(p * (points.length - 1))))]?.y ?? 0
    const y = yBase + Math.sin(p * Math.PI * 8 + phase) * 10
    const r = i % 3 === 0 ? 5 : 3.5
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4.6)
    glow.addColorStop(0, "rgba(255,255,255,0.86)")
    glow.addColorStop(0.4, "rgba(200,154,43,0.28)")
    glow.addColorStop(1, "rgba(200,154,43,0)")
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, r * 4.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  point: FlowPoint,
  hovered: boolean,
) {
  const colors = nodeColors(point.node.status)
  const glowRadius = hovered ? point.radius * 4.8 : point.radius * 3.6
  const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowRadius)
  glow.addColorStop(0, colors.glow)
  glow.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(point.x, point.y, glowRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = colors.soft
  ctx.beginPath()
  ctx.arc(point.x, point.y, point.radius * 1.85, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "rgba(255,255,255,0.96)"
  ctx.beginPath()
  ctx.arc(point.x, point.y, point.radius + 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = colors.solid
  ctx.lineWidth = hovered ? 3 : 2.2
  ctx.beginPath()
  ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = colors.solid
  ctx.beginPath()
  ctx.arc(point.x, point.y, point.radius * 0.54, 0, Math.PI * 2)
  ctx.fill()
}

export function CockpitFlowCanvas({ flow }: { flow: CockpitFlowNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 720, height: 336 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const nextWidth = Math.max(680, Math.round(entry.contentRect.width))
      setSize({ width: nextWidth, height: 336 })
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const points = flowPoints(flow, size.width, size.height)
    let phase = 0

    const render = () => {
      ctx.clearRect(0, 0, size.width, size.height)

      const background = ctx.createLinearGradient(0, 0, size.width, size.height)
      background.addColorStop(0, "rgba(252,251,247,0.98)")
      background.addColorStop(0.5, "rgba(244,242,237,0.92)")
      background.addColorStop(1, "rgba(248,246,240,0.98)")
      roundedRectPath(ctx, 0, 0, size.width, size.height, 8)
      ctx.fillStyle = background
      ctx.fill()

      for (let i = 0; i < 6; i += 1) {
        const waveY = 54 + i * 48 + Math.sin(phase * 0.4 + i) * 3
        ctx.strokeStyle = `rgba(37,84,184,${0.03 + i * 0.006})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(24, waveY)
        ctx.bezierCurveTo(
          size.width * 0.24,
          waveY - 12,
          size.width * 0.62,
          waveY + 12,
          size.width - 24,
          waveY - 3,
        )
        ctx.stroke()
      }

      drawRibbon(ctx, points, size.width, phase)

      points.forEach((point) => drawNode(ctx, point, point.node.id === hoveredId))

      if (!reducedMotion) {
        phase += 0.018
        frameRef.current = window.requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [flow, hoveredId, reducedMotion, size.height, size.width])

  const points = flowPoints(flow, size.width, size.height)

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Flux Business
        </p>
        <h2 className="mt-2 text-xl font-semibold text-heading">
          De l&apos;activation au cash
        </h2>
        <p className="mt-2 max-w-[48rem] text-sm leading-6 text-body">
          Une lecture continue du système. La valeur avance quand l&apos;animation portefeuille, le pipe, la couverture staffing et la continuité delivery restent accordés.
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[var(--radius-large)] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,242,237,0.94))] p-4"
      >
        <canvas
          ref={canvasRef}
          className="block w-full"
          aria-label="Visualisation du flux business, de l'activation des comptes jusqu'au chiffre d'affaires"
        />

        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {points.map((point, index) => (
            <div
              key={point.node.id}
              className="absolute -translate-x-1/2"
              style={{
                left: `${(point.x / size.width) * 100}%`,
                top: `${(point.labelY / size.height) * 100}%`,
              }}
            >
              <div className="rounded-full border border-white/80 bg-white/88 px-3 py-1.5 backdrop-blur-sm shadow-[0_8px_24px_rgba(26,37,64,0.08)]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-semibold text-heading">{point.node.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        {flow.map((node) => (
          <button
            key={node.id}
            type="button"
            onMouseEnter={() => setHoveredId(node.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(node.id)}
            onBlur={() => setHoveredId(null)}
            className="rounded-[var(--radius-large)] border border-border bg-surface/75 px-4 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {node.label}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-heading">
                  {node.value}
                </p>
              </div>
              <StatusPill label={toneCopy(node.status)} variant={pillVariant(node.status)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-body">{node.detail}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
