import type { RecruitmentPipeline } from "@/features/consultants/data/consultants-synthese.types"

const VIEW_W = 720
const VIEW_H = 232
const M_TOP = 16
const M_BOTTOM = 44
const M_X = 12
const PLOT_H = VIEW_H - M_TOP - M_BOTTOM

interface RecruitmentPipelineChartProps {
  pipeline: RecruitmentPipeline
}

export function RecruitmentPipelineChart({ pipeline }: RecruitmentPipelineChartProps) {
  const { byStep, totalActive, hiresYearToDate, closedNotHiredYearToDate } = pipeline
  const max = Math.max(1, ...byStep.map((s) => s.count))
  const colW = (VIEW_W - M_X * 2) / byStep.length
  const barW = Math.min(72, colW * 0.56)

  return (
    <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold text-heading">Pipeline de recrutement</h2>
        <p className="text-xs text-muted">
          <span className="font-semibold text-body">{totalActive}</span> en cours ·{" "}
          <span className="font-semibold text-body">{hiresYearToDate}</span> recruté(s) cette année ·{" "}
          <span className="font-semibold text-body">{closedNotHiredYearToDate}</span> sans suite
        </p>
      </div>

      {totalActive === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Aucun processus de recrutement en cours.</p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full min-w-[520px]"
            role="img"
            aria-label="Processus de recrutement actifs par étape"
          >
            <line
              x1={M_X}
              x2={VIEW_W - M_X}
              y1={M_TOP + PLOT_H}
              y2={M_TOP + PLOT_H}
              stroke="var(--color-border)"
              strokeWidth={1.5}
            />
            {byStep.map((stage, i) => {
              const cx = M_X + i * colW + colW / 2
              const barH = stage.count === 0 ? 0 : Math.max(3, (stage.count / max) * PLOT_H)
              const y = M_TOP + PLOT_H - barH
              return (
                <g key={stage.step}>
                  <rect
                    x={cx - barW / 2}
                    y={y}
                    width={barW}
                    height={barH}
                    rx={3}
                    fill="var(--color-primary)"
                    opacity={0.35 + 0.55 * (stage.count / max)}
                  />
                  {stage.count > 0 && (
                    <text
                      x={cx}
                      y={y - 6}
                      textAnchor="middle"
                      fill="var(--color-heading)"
                      fontSize={11}
                      fontWeight={700}
                      fontFamily="inherit"
                    >
                      {stage.count}
                    </text>
                  )}
                  <text
                    x={cx}
                    y={M_TOP + PLOT_H + 16}
                    textAnchor="middle"
                    fill="var(--color-muted)"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily="inherit"
                  >
                    {stage.label.length > 14 ? `${stage.label.slice(0, 13)}…` : stage.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </section>
  )
}
