import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"

const config: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Signaux & Veille stratégique",
  description: "Détection automatique des signaux d'affaires faibles et forts (levées de fonds, recrutements, nominations).",
  primaryAction: {
    id: "scan-signals",
    label: "Lancer un scan de veille",
    variant: "primary",
    href: "/prospection/signals/scan"
  },
  mainPanel: {
    title: "Signaux d'affaires détectés",
    description: "Alertes et opportunités de prospection qualifiées",
    type: "generic"
  }
}

const data: SectionDashboardData = {
  metrics: [
    { id: "s1", label: "Signaux détectés (24h)", value: "42", status: "success" },
    { id: "s2", label: "Comptes alertés", value: "8", status: "warning" },
    { id: "s3", label: "Taux de pertinence", value: "89%", status: "success" }
  ],
  alerts: [
    {
      id: "sa1",
      title: "Levée de fonds BNP Paribas",
      description: "BNP annonce un investissement de 50M€ dans son pôle digital.",
      status: "success"
    }
  ],
  priorities: [
    {
      id: "sp1",
      title: "Contacter le nouveau DSI de L'Oréal",
      description: "Nomination détectée ce matin sur LinkedIn.",
      dueLabel: "Aujourd'hui",
      status: "danger"
    }
  ],
  mainInsight: {
    title: "Analyse des signaux",
    summary: "Le secteur de l'Assurance affiche une hausse de 15% des offres d'emploi pour des profils React/Next.js. C'est le moment idéal pour lancer une campagne ciblée.",
    recommendations: [
      "Lancer une séquence d'outreach auprès des DSI du secteur Assurance.",
      "Mettre en place une alerte spécifique sur le mot-clé 'Next.js'."
    ]
  },
  table: {
    title: "Derniers signaux collectés",
    description: "Flux en temps réel",
    columns: [
      { key: "company", label: "Entreprise", align: "left" },
      { key: "type", label: "Type de signal", align: "left" },
      { key: "date", label: "Détecté le", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        cells: {
          company: "AXA Group",
          type: "Recrutement massif Next.js",
          date: "Il y a 2h"
        }
      },
      {
        id: "r2",
        cells: {
          company: "L'Oréal",
          type: "Nomination CTO",
          date: "Hier"
        }
      }
    ]
  },
  quickActions: [
    { id: "q1", label: "Configurer les alertes de veille", variant: "secondary", href: "/automations" }
  ],
  syncStatus: {
    source: "n8n WebScraper & Google News API",
    lastSyncLabel: "Mis à jour il y a 10 min",
    status: "ok"
  }
}

export default async function SignalsPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={config}
      data={data}
    />
  )
}
