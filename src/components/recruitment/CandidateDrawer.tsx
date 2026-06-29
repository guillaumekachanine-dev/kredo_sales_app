'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { CandidateReferenceProfile } from '@/components/recruitment/CandidateReferenceProfile'
import {
  HiringProcessStepper,
  findActiveProcess,
  type HiringProcess,
} from '@/components/recruitment/HiringProcessStepper'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { CandidateReferenceProfileData } from '@/types/candidate-reference-profile'

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

export function CandidateDrawer({
  candidateId,
  open,
  onOpenChange,
}: CandidateDrawerProps) {
  const [drawerData, setDrawerData] = useState<DrawerCandidateData | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('profil')
  const [reloadKey, setReloadKey] = useState(0)

  const loadDrawerData = useCallback(async (nextCandidateId: string) => {
    setLoading(true)
    setFetchError(null)
    setActiveTab('profil')
    setDrawerData(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
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
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Candidat introuvable.')
      }

      const model = data as unknown as DrawerCandidateData
      const { data: practice, error: practiceError } = model.practice_id
        ? await supabase
            .from('offer_practices')
            .select('id, name, slug, color_hex')
            .eq('id', model.practice_id)
            .maybeSingle()
        : { data: null, error: null }

      if (practiceError) {
        console.error('[CandidateDrawer] Practice loading error:', practiceError)
      }

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

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      subtitle={subtitle}
      eyebrow="Dossier candidat"
      className="max-w-[520px]"
    >
      {!loading && drawerData && (
        <div
          className="-mt-4 mb-4 flex gap-0 border-b"
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
          {activeTab === 'profil' && (
            <CandidateReferenceProfile data={drawerData} />
          )}
          {activeTab === 'recrutement' && hiringProcess && (
            <HiringProcessStepper process={hiringProcess} />
          )}
        </div>
      )}
    </AppDrawer>
  )
}
