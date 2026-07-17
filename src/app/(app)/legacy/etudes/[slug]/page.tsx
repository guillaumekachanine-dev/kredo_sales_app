import React from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSectorBySlug } from '@/lib/supabase/sector'
import { SectorDetailView } from '@/features/legacy/sector-study/SectorDetailView'
import { RegisterBreadcrumbLabel } from '@/components/layout/RegisterBreadcrumbLabel'
import { LegacyBanner } from '@/features/legacy/LegacyBanner'

export const dynamic = "force-dynamic"

export interface SectorDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SectorDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)
  if (!sector) {
    return {
      title: "Secteur introuvable · Kredo",
    }
  }
  return {
    title: `${sector.name} · Kredo`,
  }
}

export default async function LegacySectorDetailPage({ params }: SectorDetailPageProps) {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)

  if (!sector) {
    redirect('/legacy/approche-sectorielle')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <LegacyBanner />
      <div className="flex-1 px-4 lg:px-6 py-5">
        <RegisterBreadcrumbLabel segment={slug} label={sector.name} />
        <SectorDetailView sector={sector} />
      </div>
    </div>
  )
}
