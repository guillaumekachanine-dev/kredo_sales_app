'use client'

import type { CSSProperties } from 'react'
import { StatusPill } from '@/components/ui/StatusPill'
import { TimelineRecordDisclosure } from '@/components/staffing/TimelineRecordDisclosure'
import { cn } from '@/lib/utils'

export type HiringStep =
  | 'prequalification'
  | 'entretien_manager'
  | 'tests_techniques'
  | 'proposition'
  | 'signature'
  | 'integration'

export type HiringResult = 'en_attente' | 'valide' | 'refuse' | 'annule'

export interface HiringMilestone {
  id: string
  step: HiringStep
  result: HiringResult
  scheduled_at: string | null
  completed_at: string | null
  calendar_event_id?: string | null
  notes: string | null
}

export interface HiringProcess {
  id: string
  status: string
  current_step: HiringStep
  started_at: string
  closed_at: string | null
  close_reason: string | null
  job_profile: { id: string; title: string } | null
  candidate_hiring_milestones: HiringMilestone[]
}

const HIRING_STEPS: { key: HiringStep; label: string }[] = [
  { key: 'prequalification', label: 'Préqualification' },
  { key: 'entretien_manager', label: 'Entretien manager' },
  { key: 'tests_techniques', label: 'Tests techniques' },
  { key: 'proposition', label: 'Proposition' },
  { key: 'signature', label: 'Signature' },
  { key: 'integration', label: 'Intégration' },
]

const HIRING_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'neutral' | 'warning' | 'danger' }
> = {
  active: { label: 'En cours', variant: 'warning' },
  hired: { label: 'Recruté', variant: 'success' },
  rejected: { label: 'Refusé', variant: 'danger' },
  withdrawn: { label: 'Retiré', variant: 'neutral' },
  cancelled: { label: 'Annulé', variant: 'neutral' },
}

function fmtShortDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function findActiveProcess(
  processes: HiringProcess[] | null | undefined,
): HiringProcess | null {
  if (!processes || processes.length === 0) return null
  return (
    processes.find((process) => process.status === 'active') ??
    [...processes].sort(
      (left, right) =>
        new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
    )[0] ??
    null
  )
}

export function HiringProcessStepper({ process }: { process: HiringProcess }) {
  const currentStepIdx = HIRING_STEPS.findIndex(
    (step) => step.key === process.current_step,
  )
  const statusCfg =
    HIRING_STATUS_CONFIG[process.status] ?? HIRING_STATUS_CONFIG.active

  const milestoneByStep = new Map<HiringStep, HiringMilestone>()
  for (const milestone of process.candidate_hiring_milestones) {
    const existing = milestoneByStep.get(milestone.step as HiringStep)
    if (
      !existing ||
      new Date(milestone.scheduled_at ?? milestone.completed_at ?? 0) >
        new Date(existing.scheduled_at ?? existing.completed_at ?? 0)
    ) {
      milestoneByStep.set(milestone.step as HiringStep, milestone)
    }
  }

  const shineHeight = (currentStepIdx + 1) * 76

  return (
    <>
      <style>{`
        @keyframes kredo-hiring-shine {
          0%   { transform: translateY(-100%); opacity: 0; }
          4%   { opacity: 1; }
          16%  { opacity: 0.7; }
          22%  { transform: translateY(220%); opacity: 0; }
          100% { transform: translateY(220%); opacity: 0; }
        }
        .kredo-hiring-shine-beam {
          position: absolute;
          left: -30%;
          right: -30%;
          height: 55%;
          will-change: transform;
          background: linear-gradient(
            162deg,
            transparent 0%,
            rgba(37, 84, 184, 0.04) 35%,
            rgba(255, 255, 255, 0.24) 50%,
            rgba(37, 84, 184, 0.04) 65%,
            transparent 100%
          );
          animation: kredo-hiring-shine 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 1.2s;
          pointer-events: none;
        }
      `}</style>

      <div className="space-y-4">
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{
            background: 'var(--color-canvas)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="mb-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}
              >
                Processus de recrutement
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--color-heading)' }}
              >
                {process.job_profile?.title ?? 'Poste non spécifié'}
              </p>
            </div>
            <StatusPill
              label={statusCfg.label}
              variant={statusCfg.variant}
              dot={process.status === 'active'}
            />
          </div>
          <div
            className="mt-1.5 flex gap-3 text-[10px]"
            style={{ color: 'var(--color-muted)' }}
          >
            <span>Lancé le {fmtShortDate(process.started_at)}</span>
            {process.closed_at && (
              <span>Clôturé le {fmtShortDate(process.closed_at)}</span>
            )}
          </div>
        </div>

        <div className="relative pl-4">
          {currentStepIdx >= 0 && (
            <div
              className="pointer-events-none absolute left-0 right-0 overflow-hidden"
              style={{ top: 0, height: shineHeight, zIndex: 10 }}
            >
              <div className="kredo-hiring-shine-beam" />
            </div>
          )}

          {HIRING_STEPS.map((step, index) => {
            const milestone = milestoneByStep.get(step.key)
            const isCurrent =
              index === currentStepIdx && process.status === 'active'
            const isPast = milestone?.result === 'valide'
            const isFailed = milestone?.result === 'refuse'
            const isFuture = !isCurrent && !isPast && !isFailed
            const isLast = index === HIRING_STEPS.length - 1

            return (
              <div
                key={step.key}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {!isLast && (
                  <div
                    className="absolute left-[7px] top-[20px] w-0.5"
                    style={{
                      height: 'calc(100% - 12px)',
                      background: isPast
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                    }}
                  />
                )}

                <div
                  className={cn(
                    'relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold',
                    isCurrent && 'ring-2 ring-offset-1',
                  )}
                  style={{
                    borderColor: 'var(--color-primary)',
                    background:
                      isPast || isFailed
                        ? 'var(--color-primary)'
                        : 'var(--color-surface)',
                    color:
                      isPast || isFailed ? 'white' : 'var(--color-primary)',
                    ...(isCurrent
                      ? ({
                          '--tw-ring-color': 'var(--color-primary)',
                          '--tw-ring-offset-color': 'var(--color-surface)',
                        } as CSSProperties)
                      : {}),
                  }}
                >
                  {isPast && '✓'}
                  {isFailed && '✕'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: isFuture
                          ? 'var(--color-muted)'
                          : 'var(--color-primary)',
                      }}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                        style={{
                          background: 'var(--color-primary)',
                          color: 'white',
                        }}
                      >
                        En cours
                      </span>
                    )}
                  </div>

                  {milestone && (
                    <div className="mt-1 space-y-0.5">
                      <div
                        className="flex gap-3 text-[10px]"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {milestone.scheduled_at && (
                          <span>
                            Prévu : {fmtShortDate(milestone.scheduled_at)}
                          </span>
                        )}
                        {milestone.completed_at && (
                          <span style={{ color: 'var(--color-primary)' }}>
                            Réalisé : {fmtShortDate(milestone.completed_at)}
                          </span>
                        )}
                      </div>
                      <TimelineRecordDisclosure notes={milestone.notes} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {process.close_reason && (
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{
              background:
                process.status === 'rejected'
                  ? 'rgba(190,62,62,0.04)'
                  : 'var(--color-canvas)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p
              className="mb-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-muted)' }}
            >
              Motif de clôture
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--color-body)' }}
            >
              {process.close_reason}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
