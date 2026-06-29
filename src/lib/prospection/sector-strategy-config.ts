import type { PracticeKey, SectorStatus } from "@/types/sector"

export interface StrategicSectorConfig {
  name: string
  slug: string
  imageUrl: string
  status: SectorStatus
  attractivenessScore: number
  digitalMaturity: "low" | "medium" | "high"
  practicesFit: Record<PracticeKey, number>
  companiesCount: number
}

export const STRATEGIC_SECTOR_CONFIG: readonly StrategicSectorConfig[] = [
  {
    name: "Luxe, Chimie & Cosmétiques",
    slug: "parfumerie-aromes",
    imageUrl: "/images/sectors/luxe_chimie_cosmetiques.jpeg",
    status: "active",
    attractivenessScore: 4.8,
    digitalMaturity: "low",
    practicesFit: {
      data_ai: 4.8,
      cloud_eng: 4.0,
      product: 3.0,
      cyber: 3.5,
    },
    companiesCount: 7,
  },
  {
    name: "Aéronautique & Défense",
    slug: "aeronautique-defense",
    imageUrl: "/images/sectors/aeronautique_defense.jpeg",
    status: "watch",
    attractivenessScore: 3.8,
    digitalMaturity: "medium",
    practicesFit: {
      data_ai: 3.5,
      cloud_eng: 4.2,
      product: 2.0,
      cyber: 4.5,
    },
    companiesCount: 0,
  },
  {
    name: "Travel Tech & E-Commerce",
    slug: "travel-tech-ecommerce",
    imageUrl: "/images/sectors/travel_tech_ecommerce.jpeg",
    status: "development",
    attractivenessScore: 4.2,
    digitalMaturity: "high",
    practicesFit: {
      data_ai: 4.0,
      cloud_eng: 4.5,
      product: 4.0,
      cyber: 3.0,
    },
    companiesCount: 0,
  },
  {
    name: "Banque, Finance & Assurance",
    slug: "banque-finance-assurance",
    imageUrl: "/images/sectors/banque_finance_assurance.jpeg",
    status: "development",
    attractivenessScore: 4.5,
    digitalMaturity: "medium",
    practicesFit: {
      data_ai: 4.8,
      cloud_eng: 4.0,
      product: 3.5,
      cyber: 4.6,
    },
    companiesCount: 0,
  },
  {
    name: "Secteur Public & Collectivités",
    slug: "secteur-public-collectivites",
    imageUrl: "/images/sectors/secteur_public_collectivites.jpeg",
    status: "watch",
    attractivenessScore: 3.2,
    digitalMaturity: "low",
    practicesFit: {
      data_ai: 2.5,
      cloud_eng: 3.5,
      product: 2.0,
      cyber: 3.8,
    },
    companiesCount: 0,
  },
] as const
