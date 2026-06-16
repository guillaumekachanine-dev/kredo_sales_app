import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardDevice } from '@/lib/dashboard/dashboard-device'
import type { Consultant } from '@/types/consultant'
import { DesktopConsultantProfile } from '@/components/consultants/profile/DesktopConsultantProfile'
import { MobileConsultantProfile } from '@/components/consultants/profile/MobileConsultantProfile'

type Props = { params: Promise<{ id: string }> }

export default async function ConsultantProfilePage({ params }: Props) {
  const { id } = await params

  const [supabase, device] = await Promise.all([
    createClient(),
    getDashboardDevice(),
  ])

  const { data, error } = await supabase
    .from('collaborators')
    .select(`
      id,
      entry_date,
      exit_date,
      status,
      current_title,
      employee_ref,
      metadata,
      person:persons (
        first_name,
        last_name,
        full_name,
        person_skills (
          id,
          level,
          years,
          confidence,
          source,
          skill:skills ( id, name, category )
        )
      ),
      missions (
        id,
        title,
        status,
        start_date,
        end_date,
        tjm,
        cjm,
        gross_margin_pct,
        activity_reports:mission_activity_reports (
          id,
          mission_id,
          period_start,
          period_end,
          business_days,
          billable_days,
          non_billable_days,
          pto_days,
          sick_days,
          tjm_snapshot,
          cjm_snapshot,
          activity_rate_percent,
          status,
          metadata
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const consultant = data as unknown as Consultant

  if (device === 'mobile') {
    return <MobileConsultantProfile data={consultant} />
  }

  return <DesktopConsultantProfile data={consultant} />
}
