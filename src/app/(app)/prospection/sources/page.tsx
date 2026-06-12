import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"

const config: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Sources de données & Connecteurs",
  description: "Gestion des sources d'information et des flux d'ingestion de données tiers (LinkedIn, Hunter, etc.).",
  primaryAction: {
    id: "add-source",
    label: "Ajouter une source",
    variant: "primary",
    href: "/prospection/sources/add"
  },
  mainPanel: {
    title: "Flux d'ingestion de données",
    description: "Statut des connecteurs d'API tiers",
    type: "generic"
  }
}

const data: SectionDashboardData = {
  metrics: [
    { id: "so1", label: "Sources actives", value: "3", status: "success" },
    { id: "so2", label: "Volume d'ingestion (24h)", value: "1.2k leads", status: "success" },
    { id: "so3", label: "Erreurs connecteurs", value: "0", status: "success" }
  ],
  alerts: [],
  priorities: [
    {
      id: "sop1",
      title: "Vérifier le quota LinkedIn API",
      description: "Le quota de crédits mensuels Sales Navigator est à 80%.",
      dueLabel: "Sous 3 jours",
      status: "warning"
    }
  ],
  mainInsight: {
    title: "Statut des flux",
    summary: "Les flux d'importation automatique de leads via l'extension LinkedIn Chrome fonctionnent correctement. Le taux de complétion des emails par Hunter est de 74%.",
    recommendations: [
      "Configurer une source d'ingestion d'offres d'emploi complémentaire.",
      "Vérifier la consommation de crédits sur Hunter."
    ]
  },
  table: {
    title: "Connecteurs configurés & Statut",
    description: "État opérationnel",
    columns: [
      { key: "connector", label: "Connecteur", align: "left" },
      { key: "status", label: "Statut", align: "center" },
      { key: "latency", label: "Temps de réponse", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        cells: {
          connector: "LinkedIn extension client",
          status: "Connecté",
          latency: "0.2s"
        }
      },
      {
        id: "r2",
        cells: {
          connector: "Hunter.io Enrichisseur",
          status: "Connecté",
          latency: "0.8s"
        }
      }
    ]
  },
  quickActions: [
    { id: "soqa1", label: "Voir les logs d'ingestion", variant: "secondary", href: "/automations" }
  ],
  syncStatus: {
    source: "Kredo Data Ingestion Service",
    lastSyncLabel: "Synchronisé il y a 2 min",
    status: "ok"
  }
}

export default async function SourcesPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={config}
      data={data}
    />
  )
}
