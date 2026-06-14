import React from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSectorBySlug } from '@/lib/supabase/sector'
import SectorDetailView from '@/components/sector/SectorDetailView'
import { RegisterBreadcrumbLabel } from '@/components/layout/RegisterBreadcrumbLabel'

export const dynamic = "force-dynamic"

export interface SectorDetailPageProps {
  params: Promise<{ slug: string }>
}

/**
 * generateMetadata - Generates Page metadata for dynamic routes.
 * Awaits params and fetches sector name.
 */
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

/**
 * SectorDetailPage - Dynamic page for a single sector detail study.
 * Renders the SectorDetailView component.
 */
export default async function SectorDetailPage({ params }: SectorDetailPageProps) {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)

  if (!sector) {
    redirect('/prospection/approche-sectorielle')
  }

  return (
    <>
      <RegisterBreadcrumbLabel segment={slug} label={sector.name} />
      <SectorDetailView sector={sector} />
    </>
  )
}
