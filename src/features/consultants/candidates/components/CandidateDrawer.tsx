'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { CandidateProfileEditor } from './CandidateProfileEditor'
import { CandidateReferenceProfile } from './CandidateReferenceProfile'
import { ContextualCommunicationButton } from '@/components/communication/ContextualCommunicationButton'
import {
  HiringProcessStepper,
  findActiveProcess,
  type HiringProcess,
} from './HiringProcessStepper'
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from '@/components/agenda/AgendaEventDrawer'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { CandidateReferenceProfileData } from '@/types/candidate-reference-profile'
import type {
  CandidatePracticeOption,
  CandidateSkillOption,
} from '@/types/candidate-profile-form'

interface DrawerCandidateData extends CandidateReferenceProfileData {
  candidate_hiring_processes?: HiringProcess[]
}

interface CandidateDrawerProps {
  candidateId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tab = 'profil' | 'recrutement'

function resolveFullName(data: DrawerCandidateData) {
  if (data.person?.full_name) return data.person.full_name
  return (
    `${data.person?.first_name ?? ''} ${data.person?.last_name ?? ''}`.trim() ||
    'Candidat'
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-large)]', className)}
      style={{ background: 'var(--color-border)' }}
    />
  )
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      <div className="flex gap-4 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
        <SkeletonBlock className="h-3 w-20 rounded" />
        <SkeletonBlock className="h-3 w-16 rounded" />
      </div>
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-36 w-full" />
      <SkeletonBlock className="h-32 w-full" />
    </div>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487 19.5 7.125m-1.638-4.276a1.875 1.875 0 1 1 2.652 2.652L7.125 18.89 3 20l1.11-4.125L17.862 2.85Z" />
    </svg>
  )
}

export function CandidateDrawer({
  candidateId,
  open,
  onOpenChange,
}: CandidateDrawerProps) {
  const [drawerData, setDrawerData] = useState<DrawerCandidateData | null>(null)
  const [practices, setPractices] = useState<CandidatePracticeOption[]>([])
  const [skillOptions, setSkillOptions] = useState<CandidateSkillOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('profil')
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [agendaInitialValues, setAgendaInitialValues] = useState<AgendaEventDrawerInitialValues>()

  const loadDrawerData = useCallback(async (nextCandidateId: string) => {
    setLoading(true)
    setFetchError(null)
    setActiveTab('profil')
    setEditing(false)
    setDirty(false)
    setDrawerData(null)

    try {
      const supabase = createClient()
      const [candidateResult, practicesResult, skillsResult] = await Promise.all([
        supabase
          .from('candidates')
          .select(`
            *,
            person:persons (
              id, full_name, first_name, last_name, primary_email, phone, linkedin_url, location, notes,
              person_skills (
                *,
                skill:skills ( id, name, category )
              )
            ),
            candidate_hiring_processes (
              id, status, current_step, started_at, closed_at, close_reason,
              job_profile:job_profiles ( id, title ),
              candidate_hiring_milestones (
                id, step, result, scheduled_at, completed_at, calendar_event_id, notes
              )
            )
          `)
          .eq('id', nextCandidateId)
          .single(),
        supabase
          .from('offer_practices')
          .select('id, name, slug, color_hex')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('skills')
          .select('id, name, category')
          .order('name', { ascending: true }),
      ])

      if (candidateResult.error || !candidateResult.data) {
        throw new Error(candidateResult.error?.message ?? 'Candidat introuvable.')
      }
      if (practicesResult.error) {
        throw new Error(practicesResult.error.message)
      }
      if (skillsResult.error) {
        throw new Error(skillsResult.error.message)
      }

      const model = candidateResult.data as unknown as DrawerCandidateData
      const practice = (practicesResult.data ?? []).find(
        (item) => item.id === model.practice_id,
      )

      setPractices(
        (practicesResult.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
        })),
      )
      setSkillOptions((skillsResult.data ?? []) as CandidateSkillOption[])
      setDrawerData({
        ...model,
        practice: practice ?? null,
      })
    } catch (error: unknown) {
      console.error('[CandidateDrawer] Profile loading error:', error)
      setFetchError('Impossible de charger le profil candidat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !candidateId) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        void loadDrawerData(candidateId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [candidateId, loadDrawerData, open, reloadKey])

  const hiringProcess = drawerData
    ? findActiveProcess(drawerData.candidate_hiring_processes ?? null)
    : null

  const tabs = useMemo(() => {
    const items: { id: Tab; label: string }[] = [
      { id: 'profil', label: 'Profil' },
    ]
    if (hiringProcess) {
      items.push({ id: 'recrutement', label: 'Recrutement' })
    }
    return items
  }, [hiringProcess])

  const name = drawerData ? resolveFullName(drawerData) : '…'
  const subtitle = drawerData
    ? [drawerData.current_title, drawerData.practice?.name]
        .filter(Boolean)
        .join(' · ') || 'Candidat externe'
    : 'Candidat externe'

  const requestClose = () => {
    if (!editing || !dirty) return true
    return window.confirm(
      'Des modifications ne sont pas enregistrées. Fermer le dossier ?',
    )
  }

  return (
    <>
      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        onRequestClose={requestClose}
        dirty={editing && dirty}
        title={name}
        subtitle={editing ? 'Modification du dossier candidat' : subtitle}
        eyebrow="Dossier candidat"
        className="max-w-[620px]"
        headerActions={
          !editing && drawerData && activeTab === 'profil' ? (
            <div className="flex items-center gap-2">
              <ContextualCommunicationButton
                intent="candidate_contact"
                origin="opportunity"
                label="Contacter"
                candidateId={candidateId}
                candidateName={name}
                primaryEntity={candidateId ? { type: 'candidate', id: candidateId } : undefined}
                mustInclude={[
                  `Candidat: ${name}`,
                  subtitle ? `Profil: ${subtitle}` : null,
                  hiringProcess?.job_profile?.title ? `Processus actif: ${hiringProcess.job_profile.title}` : null,
                ].filter(Boolean).join('\n')}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAgendaInitialValues({
                    title: `Entretien · ${name}`,
                    event_type: 'entretien_candidat',
                    candidate_id: candidateId ?? undefined,
                  })
                  setAgendaOpen(true)
                }}
              >
                Planifier
              </Button>
              {drawerData.person?.id ? (
                <Link
                  href={`/consultants?section=candidats&module=matching-profil&person=${drawerData.person.id}`}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[var(--radius-medium)] border border-brand-brass/40 bg-brand-brass/10 px-3 py-1 text-xs font-semibold text-brand-brass transition-colors hover:bg-brand-brass/20"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  Besoins compatibles
                </Link>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<EditIcon />}
                onClick={() => setEditing(true)}
              >
                Modifier
              </Button>
            </div>
          ) : null
        }
      >
        {!loading && drawerData && !editing && (
          <div
            className="-mt-4 mb-4 flex items-center gap-0 border-b"
            style={{ borderColor: 'var(--color-border)' }}
            role="tablist"
          >
            {tabs.map(({ id, label }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(id)}
                  className="cursor-pointer px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none"
                  style={{
                    color: isActive
                      ? 'var(--color-primary)'
                      : 'var(--color-muted)',
                    borderBottom: isActive
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                    marginBottom: '-1px',
                    background: 'transparent',
                  }}
                >
                  {label}
                </button>
              )
            })}
            {activeTab === 'profil' && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ml-auto inline-flex min-h-11 items-center gap-1.5 px-3 text-[11px] font-bold text-primary sm:hidden"
              >
                <span className="size-3.5" aria-hidden="true">
                  <EditIcon />
                </span>
                Modifier
              </button>
            )}
          </div>
        )}

        {loading && <DrawerSkeleton />}

        {fetchError && !loading && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-large)] border border-dashed py-12 text-center"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            <p className="text-sm font-semibold text-heading">Erreur de chargement</p>
            <p className="text-xs">{fetchError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="mt-1 cursor-pointer text-xs text-primary underline underline-offset-2"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !fetchError && drawerData && (
          <div role="tabpanel" className="pb-6">
            {editing ? (
              <CandidateProfileEditor
                data={drawerData}
                practices={practices}
                skillOptions={skillOptions}
                onCancel={() => {
                  if (!dirty || requestClose()) {
                    setEditing(false)
                    setDirty(false)
                  }
                }}
                onSaved={() => {
                  setEditing(false)
                  setDirty(false)
                  setReloadKey((current) => current + 1)
                }}
                onDirtyChange={setDirty}
              />
            ) : (
              <>
                {activeTab === 'profil' && (
                  <CandidateReferenceProfile data={drawerData} />
                )}
                {activeTab === 'recrutement' && hiringProcess && (
                  <HiringProcessStepper process={hiringProcess} />
                )}
              </>
            )}
          </div>
        )}
      </AppDrawer>

      <AgendaEventDrawer
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        event={null}
        onSaved={() => {
          setAgendaOpen(false)
          setReloadKey((current) => current + 1)
        }}
        initialValues={agendaInitialValues}
      />
    </>
  )
}
