import "server-only"

import { createClient } from '@/lib/supabase/server'
import { getDashboardDevice } from '@/lib/dashboard/dashboard-device'
import { ConsultantsSyntheseDesktop } from '@/components/consultants/synthese/ConsultantsSyntheseDesktop'
import { ConsultantsSyntheseMobile } from '@/components/consultants/synthese/ConsultantsSyntheseMobile'
import type { CollaborateurRow } from '@/components/consultants/synthese/ConsultantsSyntheseDesktop'

export default async function ConsultantsPage() {
  const [supabase, device] = await Promise.all([
    createClient(),
    getDashboardDevice(),
  ])

  const { data } = await supabase
    .from('collaborators')
    .select(`
      id,
      status,
      current_title,
      seniority,
      practice,
      exit_date,
      person:persons ( first_name, last_name, full_name ),
      missions (
        id,
        title,
        status,
        start_date,
        end_date,
        tjm,
        cjm,
        gross_margin_pct,
        company:companies ( name )
      )
    `)

  const collaborateurs = (data ?? []) as CollaborateurRow[]

  if (device === 'mobile') {
    return <ConsultantsSyntheseMobile data={collaborateurs} />
  }

  return <ConsultantsSyntheseDesktop data={collaborateurs} />
}
