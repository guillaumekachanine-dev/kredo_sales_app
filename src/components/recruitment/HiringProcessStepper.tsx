'use client'

import { StatusPill } from '@/components/ui/StatusPill'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Config ───────────────────────────────────────────────────────────────────

const HIRING_STEPS: { key: HiringStep; label: string }[] = [
  { key: 'prequalification',  label: 'Préqualification' },
  { key: 'entretien_manager', label: 'Entretien manager' },
  { key: 'tests_techniques',  label: 'Tests techniques' },
  { key: 'proposition',       label: 'Proposition' },
  { key: 'signature',         label: 'Signature' },
  { key: 'integration',       label: 'Intégration' },
]

const HIRING_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'neutral' | 'warning' | 'danger' }> = {
  active:    { label: 'En cours',   variant: 'warning' },
  hired:     { label: 'Recruté',    variant: 'success' },
  rejected:  { label: 'Refusé',     variant: 'danger' },
  withdrawn: { label: 'Retiré',     variant: 'neutral' },
  cancelled: { label: 'Annulé',     variant: 'neutral' },
}

function fmtShortDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function findActiveProcess(processes: HiringProcess[] | null | undefined): HiringProcess | null {
  if (!processes || processes.length === 0) return null
  return (
    processes.find((p) => p.status === 'active') ??
    [...processes].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] ??
    null
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HiringProcessStepper({ process }: { process: HiringProcess }) {
  const currentStepIdx = HIRING_STEPS.findIndex((s) => s.key === process.current_step)
  const statusCfg = HIRING_STATUS_CONFIG[process.status] ?? HIRING_STATUS_CONFIG.active

  const milestoneByStep = new Map<HiringStep, HiringMilestone>()
  for (const m of process.candidate_hiring_milestones) {
    const existing = milestoneByStep.get(m.step as HiringStep)
    if (!existing || new Date(m.scheduled_at ?? m.completed_at ?? 0) > new Date(existing.scheduled_at ?? existing.completed_at ?? 0)) {
      milestoneByStep.set(m.step as HiringStep, m)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header — statut + profil de poste */}
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)' }}>
              Processus de recrutement
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)' }}>
              {process.job_profile?.title ?? 'Poste non spécifié'}
            </p>
          </div>
          <StatusPill label={statusCfg.label} variant={statusCfg.variant} dot={process.status === 'active'} />
        </div>
        <div className="mt-1.5 flex gap-3 text-[10px]" style={{ color: 'var(--color-muted)' }}>
          <span>Lancé le {fmtShortDate(process.started_at)}</span>
          {process.closed_at && <span>Clôturé le {fmtShortDate(process.closed_at)}</span>}
        </div>
      </div>

      {/* Stepper vertical */}
      <div className="relative pl-4">
        {HIRING_STEPS.map((step, idx) => {
          const milestone = milestoneByStep.get(step.key)
          const isCurrent = idx === currentStepIdx && process.status === 'active'
          const isPast = milestone?.result === 'valide'
          const isFailed = milestone?.result === 'refuse'
          const isFuture = !milestone || milestone.result === 'en_attente'
          const isLast = idx === HIRING_STEPS.length - 1

          let dotColor = 'var(--color-border)'
          let dotBorder = 'var(--color-border)'
          if (isPast) { dotColor = 'var(--color-success)'; dotBorder = 'var(--color-success)' }
          else if (isFailed) { dotColor = 'var(--color-danger)'; dotBorder = 'var(--color-danger)' }
          else if (isCurrent) { dotColor = 'var(--color-primary)'; dotBorder = 'var(--color-primary)' }

          return (
            <div key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[7px] top-[20px] w-0.5"
                  style={{
                    height: 'calc(100% - 12px)',
                    background: isPast ? 'var(--color-success)' : 'var(--color-border)',
                  }}
                />
              )}

              {/* Dot */}
              <div
                className={cn(
                  'relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold',
                  isCurrent && 'ring-2 ring-offset-1',
                )}
                style={{
                  borderColor: dotBorder,
                  background: (isPast || isFailed) ? dotColor : 'var(--color-surface)',
                  color: (isPast || isFailed) ? 'white' : dotColor,
                  ...(isCurrent ? { '--tw-ring-color': 'var(--color-primary)', '--tw-ring-offset-color': 'var(--color-surface)' } as React.CSSProperties : {}),
                }}
              >
                {isPast && '✓'}
                {isFailed && '✕'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isCurrent ? 'var(--color-primary)' : (isFuture && !isCurrent) ? 'var(--color-muted)' : 'var(--color-heading)' }}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                      style={{ background: 'var(--color-primary)', color: 'white' }}
                    >
                      En cours
                    </span>
                  )}
                </div>

                {milestone && (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex gap-3 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                      {milestone.scheduled_at && (
                        <span>Prévu : {fmtShortDate(milestone.scheduled_at)}</span>
                      )}
                      {milestone.completed_at && (
                        <span style={{ color: isPast ? 'var(--color-success)' : isFailed ? 'var(--color-danger)' : undefined }}>
                          Réalisé : {fmtShortDate(milestone.completed_at)}
                        </span>
                      )}
                    </div>
                    {milestone.notes && (
                      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-body)' }}>
                        {milestone.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Close reason */}
      {process.close_reason && (
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{
            background: process.status === 'rejected' ? 'rgba(190,62,62,0.04)' : 'var(--color-canvas)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)' }}>
            Motif de clôture
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-body)' }}>
            {process.close_reason}
          </p>
        </div>
      )}
    </div>
  )
}
