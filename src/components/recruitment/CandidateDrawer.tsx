'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { CandidateProfileEditor } from '@/components/recruitment/CandidateProfileEditor'
import { CandidateReferenceProfile } from '@/components/recruitment/CandidateReferenceProfile'
import {
  HiringProcessStepper,
  findActiveProcess,
  type HiringProcess,
} from '@/components/recruitment/HiringProcessStepper'
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
    void loadDrawerData(candidateId)
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
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<EditIcon />}
            onClick={() => setEditing(true)}
          >
            Modifier
          </Button>
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
  )
}
