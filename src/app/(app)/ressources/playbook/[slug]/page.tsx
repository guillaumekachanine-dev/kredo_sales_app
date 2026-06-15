import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSectorBySlug } from '@/lib/supabase/sector'
import PlaybookPage from '@/components/sector/PlaybookPage'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)
  if (!sector) return { title: 'Playbook · Kredo' }
  return { title: `Playbook · ${sector.name} · Kredo` }
}

export default async function PlaybookRoute({ params }: Props) {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)
  if (!sector) redirect('/prospection/approche-sectorielle')
  return <PlaybookPage sector={sector} />
}
