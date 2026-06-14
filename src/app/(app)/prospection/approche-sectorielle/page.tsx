import React from 'react'
import { getSectors } from '@/lib/supabase/sector'
import { getDashboardDevice } from '@/lib/dashboard/dashboard-device'
import { SectorCardDesktop, SectorCardMobile } from '@/components/sector/SectorCard'
import type { SectorStatus, PracticeKey } from '@/types/sector'

export const dynamic = "force-dynamic"

interface StrategicConfig {
  name: string
  slug: string
  image_url: string
  status: SectorStatus
  attractiveness_score: number
  digital_maturity: 'low' | 'medium' | 'high'
  practices_fit: Record<PracticeKey, number>
  companies_count: number
}

// 5 sectors defined in the Kredo Strategy
const STRATEGIC_SECTORS_CONFIG: StrategicConfig[] = [
  {
    name: "Luxe, Chimie & Cosmétiques",
    slug: "parfumerie-aromes", // Maps to the seeded database sector
    image_url: "/images/sectors/luxe_chimie_cosmetiques.png",
    status: "active",
    attractiveness_score: 4.8,
    digital_maturity: "low",
    practices_fit: {
      data_ai: 4.8,
      cloud_eng: 4.0,
      product: 3.0,
      cyber: 3.5,
    },
    companies_count: 7,
  },
  {
    name: "Aéronautique & Défense",
    slug: "aeronautique-defense",
    image_url: "/images/sectors/aeronautique_defense.png",
    status: "watch",
    attractiveness_score: 3.8,
    digital_maturity: "medium",
    practices_fit: {
      data_ai: 3.5,
      cloud_eng: 4.2,
      product: 2.0,
      cyber: 4.5,
    },
    companies_count: 0,
  },
  {
    name: "Travel Tech & E-Commerce",
    slug: "travel-tech-ecommerce",
    image_url: "/images/sectors/travel_tech_ecommerce.png",
    status: "development",
    attractiveness_score: 4.2,
    digital_maturity: "high",
    practices_fit: {
      data_ai: 4.0,
      cloud_eng: 4.5,
      product: 4.0,
      cyber: 3.0,
    },
    companies_count: 0,
  },
  {
    name: "Banque, Finance & Assurance",
    slug: "banque-finance-assurance",
    image_url: "/images/sectors/banque_finance_assurance.png",
    status: "development",
    attractiveness_score: 4.5,
    digital_maturity: "medium",
    practices_fit: {
      data_ai: 4.8,
      cloud_eng: 4.0,
      product: 3.5,
      cyber: 4.6,
    },
    companies_count: 0,
  },
  {
    name: "Secteur Public & Collectivités",
    slug: "secteur-public-collectivites",
    image_url: "/images/sectors/secteur_public_collectivites.png",
    status: "watch",
    attractiveness_score: 3.2,
    digital_maturity: "low",
    practices_fit: {
      data_ai: 2.5,
      cloud_eng: 3.5,
      product: 2.0,
      cyber: 3.8,
    },
    companies_count: 0,
  },
]

/**
 * ApprocheSectoriellePage - Redesigned premium page for sector intelligence.
 * Renders the 5 strategic sectors with high-impact visual design.
 */
export default async function ApprocheSectoriellePage() {
  const [device, dbSectors] = await Promise.all([
    getDashboardDevice(),
    getSectors(),
  ])

  const isMobile = device === 'mobile'

  // Map strategy sectors to database values if they exist, or fall back to strategy mocks
  const sectors = STRATEGIC_SECTORS_CONFIG.map((config) => {
    const dbSector = dbSectors.find((s) => s.slug === config.slug)
    
    if (dbSector) {
      return {
        id: dbSector.id,
        name: config.name, // Preserve strategic name
        slug: dbSector.slug,
        status: dbSector.status,
        attractiveness_score: dbSector.attractiveness_score ?? config.attractiveness_score,
        digital_maturity: dbSector.digital_maturity ?? config.digital_maturity,
        practices_fit: dbSector.practices_fit || config.practices_fit,
        companies_count: dbSector.companies_count,
        image_url: config.image_url,
      }
    }

    return {
      id: `mock-${config.slug}`,
      name: config.name,
      slug: config.slug,
      status: config.status,
      attractiveness_score: config.attractiveness_score,
      digital_maturity: config.digital_maturity,
      practices_fit: config.practices_fit,
      companies_count: config.companies_count,
      image_url: config.image_url,
    }
  })

  return (
    <div className="space-y-8 pb-8">
      {/* Page Title & Hero Section */}
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-surface p-6 md:p-8 shadow-sm">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none select-none" />
        
        <h1 className="text-xl md:text-2xl font-black text-heading leading-none tracking-tight font-heading">
          Approche Sectorielle
        </h1>
        <p className="text-sm text-body mt-3 leading-relaxed max-w-3xl font-sans">
          Pilotez nos campagnes de prospection et notre stratégie commerciale à travers nos 5 secteurs cibles. 
          Analysez l&apos;attractivité, la maturité digitale globale, les points de douleur critiques et accédez aux playbooks commerciaux de prospection opérationnels.
        </p>
      </div>

      {/* Responsive View Switcher */}
      {isMobile ? (
        <div className="flex flex-col gap-4">
          {sectors.map((sector) => (
            <SectorCardMobile key={sector.id} sector={sector} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sectors.map((sector) => (
            <SectorCardDesktop key={sector.id} sector={sector} />
          ))}
        </div>
      )}
    </div>
  )
}
