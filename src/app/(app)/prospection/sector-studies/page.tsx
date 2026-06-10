import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"

const config: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Études sectorielles par IA",
  description: "Génération automatique d'analyses stratégiques et positionnement sectoriel des comptes ciblés.",
  primaryAction: {
    id: "generate-study",
    label: "Générer une nouvelle étude",
    variant: "primary",
    href: "/prospection/sector-studies/new"
  },
  mainPanel: {
    title: "Marchés & Secteurs Analysés",
    description: "Cartographie sectorielle de vos opportunités",
    type: "generic"
  }
}

const data: SectionDashboardData = {
  metrics: [
    { id: "es1", label: "Secteurs étudiés", value: "6", status: "success" },
    { id: "es2", label: "Études complètes", value: "24", status: "success" },
    { id: "es3", label: "Précision du RAG", value: "95.4%", status: "success" }
  ],
  alerts: [],
  priorities: [
    {
      id: "esp1",
      title: "Valider l'étude sectorielle Assurance",
      description: "Relecture de la fiche de cadrage générée par IA.",
      dueLabel: "Sous 2 jours",
      status: "warning"
    }
  ],
  mainInsight: {
    title: "Analyse sectorielle",
    summary: "Le secteur de l'Énergie présente la plus forte maturité digitale cette année, avec un accent particulier mis sur la transition écologique et l'optimisation des ressources cloud.",
    recommendations: [
      "Exporter l'étude Énergie pour le rendez-vous client d'EDF.",
      "Lancer une nouvelle analyse sur le secteur Automobile."
    ]
  },
  table: {
    title: "Études sectorielles disponibles",
    description: "Dernières analyses sectorielles générées",
    columns: [
      { key: "sector", label: "Secteur", align: "left" },
      { key: "count", label: "Comptes liés", align: "right" },
      { key: "score", label: "Score moyen", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        cells: {
          sector: "Assurance & Banque",
          count: "12",
          score: "4.2/5"
        }
      },
      {
        id: "r2",
        cells: {
          sector: "Énergie & Utilities",
          count: "8",
          score: "4.5/5"
        }
      }
    ]
  },
  quickActions: [
    { id: "eq1", label: "Consulter la bibliothèque d'offres", variant: "secondary", href: "/knowledge" }
  ],
  syncStatus: {
    source: "Supabase Vector Hub & GPT-4o",
    lastSyncLabel: "Synchronisé en temps réel",
    status: "ok"
  }
}

export default async function SectorStudiesPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={config}
      data={data}
    />
  )
}
