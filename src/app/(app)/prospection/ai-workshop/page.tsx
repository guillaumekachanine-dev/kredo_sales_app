import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"

const config: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Atelier IA & Rédacteur de contenu",
  description: "Génération de messages de prospection ultra-personnalisés par IA, fondés sur l'actualité des entreprises cibles.",
  primaryAction: {
    id: "new-prompt",
    label: "Rédiger un nouveau prompt",
    variant: "primary",
    href: "/prospection/ai-workshop/prompt"
  },
  mainPanel: {
    title: "Générateur de messages personnalisés",
    description: "Modèles d'intelligence artificielle actifs",
    type: "generic"
  }
}

const data: SectionDashboardData = {
  metrics: [
    { id: "ai1", label: "Modèles d'écriture", value: "3", status: "success" },
    { id: "ai2", label: "Générations ce mois", value: "245", status: "neutral" },
    { id: "ai3", label: "Taux de satisfaction", value: "98.2%", status: "success" }
  ],
  alerts: [],
  priorities: [
    {
      id: "aip1",
      title: "Optimiser le prompt LinkedIn Outreach",
      description: "Améliorer l'accroche sur la base des meilleurs taux de clics.",
      dueLabel: "Sous 5 jours",
      status: "neutral"
    }
  ],
  mainInsight: {
    title: "Recommandations IA",
    summary: "Les messages de prospection fondés sur un signal de 'Nomination d'un décideur' convertissent 3 fois mieux que les approches basées sur une actualité de 'Partenariat commercial'.",
    recommendations: [
      "Mettre à jour le template d'approche nominative.",
      "Lancer une itération de test A/B sur le prompt commercial."
    ]
  },
  table: {
    title: "Templates d'écriture configurés",
    description: "État opérationnel des modèles",
    columns: [
      { key: "name", label: "Nom du modèle", align: "left" },
      { key: "tokens", label: "Coût moyen (tokens)", align: "right" },
      { key: "accuracy", label: "Qualité évaluée", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        cells: {
          name: "Accroche LinkedIn Premier Contact",
          tokens: "350",
          accuracy: "98.5%"
        }
      },
      {
        id: "r2",
        cells: {
          name: "Email d'introduction ESN - Offre Cloud",
          tokens: "650",
          accuracy: "96.4%"
        }
      }
    ]
  },
  quickActions: [
    { id: "aiqa1", label: "Tester dans le Playground", variant: "secondary", href: "/prospection/ai-workshop/playground" }
  ],
  syncStatus: {
    source: "OpenAI API & n8n workflow",
    lastSyncLabel: "Synchronisé en temps réel",
    status: "ok"
  }
}

export default async function AiWorkshopPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={config}
      data={data}
    />
  )
}
